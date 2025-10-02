// Servicio de Gestión de Certificados Internos
// Gobierno de San Juan - Auto-generación y Gestión

import crypto from 'crypto';

class InternalCertificateManager {
  
  // Generar certificado interno automáticamente
  static async generateInternalCertificate(usuario) {
    try {
      // Generar par de claves RSA
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // Crear certificado X.509 simplificado para uso interno
      const certificateData = {
        subject: {
          commonName: usuario.nombre_completo || usuario.username,
          organizationName: 'Gobierno de San Juan',
          organizationalUnitName: 'Empleados Internos',
          countryName: 'AR',
          stateOrProvinceName: 'San Juan',
          localityName: 'San Juan Capital'
        },
        issuer: {
          commonName: 'CA Interna - Gobierno San Juan',
          organizationName: 'Gobierno de San Juan',
          countryName: 'AR'
        },
        serialNumber: this.generateSerialNumber(),
        validFrom: new Date(),
        validTo: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // 1 año
        publicKey: publicKey
      };

      // Crear certificado PEM simplificado (para demo)
      const certificatePem = this.createSimplifiedPEM(certificateData);

      return {
        certificado_pem: certificatePem,
        clave_privada_pem: privateKey,
        clave_publica_pem: publicKey,
        metadata: certificateData
      };

    } catch (error) {
      console.error('Error generando certificado interno:', error);
      throw new Error('Error en la generación del certificado');
    }
  }

  // Generar número de serie único
  static generateSerialNumber() {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  // Crear certificado PEM simplificado (para demostración)
  static createSimplifiedPEM(data) {
    const header = '-----BEGIN CERTIFICATE-----';
    const footer = '-----END CERTIFICATE-----';
    
    // Codificar datos básicos del certificado
    const certData = Buffer.from(JSON.stringify({
      subject: data.subject,
      issuer: data.issuer,
      serialNumber: data.serialNumber,
      validFrom: data.validFrom.toISOString(),
      validTo: data.validTo.toISOString(),
      publicKey: data.publicKey
    })).toString('base64');

    // Formatear en líneas de 64 caracteres
    const formattedData = certData.match(/.{1,64}/g).join('\n');
    
    return `${header}\n${formattedData}\n${footer}`;
  }

  // Validar si un certificado está vigente
  static isCertificateValid(certificado) {
    try {
      const now = new Date();
      return (
        certificado.fecha_emision <= now &&
        certificado.fecha_expiracion > now &&
        certificado.activo === true
      );
    } catch (error) {
      return false;
    }
  }

  // Verificar si el usuario necesita certificado
  static async userNeedsCertificate(usuario) {
    // Verificar si el usuario tiene certificados internos activos
    const certificadosActivos = await usuario.getCertificados({
      where: {
        tipo: 'internal',
        activo: true
      }
    });

    // Filtrar certificados vigentes
    const certificadosVigentes = certificadosActivos.filter(cert => 
      this.isCertificateValid(cert)
    );

    return certificadosVigentes.length === 0;
  }

  // Proceso completo de provisión de certificado
  static async ensureUserHasCertificate(usuario) {
    try {
      // Verificar si necesita certificado
      const needsCertificate = await this.userNeedsCertificate(usuario);
      
      if (!needsCertificate) {
        console.log(`Usuario ${usuario.email} ya tiene certificado vigente`);
        return { 
          action: 'existing',
          message: 'Usuario ya tiene certificado vigente' 
        };
      }

      // Solo empleados internos y funcionarios pueden tener certificados internos
      if (!['empleado_interno', 'funcionario_oficial', 'administrador'].includes(usuario.rol_usuario)) {
        throw new Error('Usuario no autorizado para certificados internos');
      }

      // Generar nuevo certificado
      console.log(`Generando certificado interno para ${usuario.email}`);
      const certificateData = await this.generateInternalCertificate(usuario);

      // Guardar en base de datos
      const nuevoCertificado = await usuario.createCertificado({
        nombre_certificado: `Certificado Interno - ${usuario.nombre_completo}`,
        tipo: 'internal',
        certificado_pem: certificateData.certificado_pem,
        clave_privada_pem: certificateData.clave_privada_pem,
        clave_publica_pem: certificateData.clave_publica_pem,
        fecha_emision: new Date(),
        fecha_expiracion: certificateData.metadata.validTo,
        activo: true,
        numero_serie: certificateData.metadata.serialNumber,
        emisor: 'CA Interna - Gobierno San Juan'
      });

      console.log(`Certificado interno creado: ID ${nuevoCertificado.id}`);

      return {
        action: 'created',
        message: 'Certificado interno generado exitosamente',
        certificado: nuevoCertificado
      };

    } catch (error) {
      console.error('Error en ensureUserHasCertificate:', error);
      throw error;
    }
  }

  // Renovar certificado próximo a vencer
  static async renewCertificateIfNeeded(certificado) {
    const diasParaVencer = Math.ceil(
      (certificado.fecha_expiracion - new Date()) / (1000 * 60 * 60 * 24)
    );

    // Renovar si faltan menos de 30 días
    if (diasParaVencer <= 30) {
      const usuario = await certificado.getUsuario();
      
      // Desactivar certificado actual
      await certificado.update({ activo: false });
      
      // Generar nuevo certificado
      return await this.ensureUserHasCertificate(usuario);
    }

    return { action: 'no_renewal_needed', diasParaVencer };
  }
}

export default InternalCertificateManager;