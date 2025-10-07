import multer from 'multer';
import forge from 'node-forge';
import { Certificado } from '../models/index.js';

class CertificadoService {
  
  /**
   * Procesar y validar un certificado P12/PFX subido por el usuario
   */
  static async procesarCertificadoP12(buffer, password, usuarioId) {
    try {
      // Convertir buffer a base64 para forge
      const p12Der = forge.util.encode64(buffer);
      const p12Asn1 = forge.asn1.fromDer(forge.util.decode64(p12Der));
      
      // Desencriptar el certificado P12 con la contraseña
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
      
      // Extraer el certificado y la clave privada
      const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      
      if (!bags[forge.pki.oids.certBag] || bags[forge.pki.oids.certBag].length === 0) {
        throw new Error('No se encontró certificado en el archivo P12');
      }
      
      if (!keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || keyBags[forge.pki.oids.pkcs8ShroudedKeyBag].length === 0) {
        throw new Error('No se encontró clave privada en el archivo P12');
      }
      
      const cert = bags[forge.pki.oids.certBag][0].cert;
      const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;
      
      // Validar que el certificado no esté vencido
      const now = new Date();
      if (cert.validity.notAfter < now) {
        throw new Error('El certificado ha expirado');
      }
      
      if (cert.validity.notBefore > now) {
        throw new Error('El certificado aún no es válido');
      }
      
      // Extraer información del certificado
      const subject = cert.subject.attributes;
      const issuer = cert.issuer.attributes;
      
      const commonName = subject.find(attr => attr.name === 'commonName')?.value || 'Sin nombre';
      const organization = subject.find(attr => attr.name === 'organizationName')?.value || '';
      const country = subject.find(attr => attr.name === 'countryName')?.value || '';
      const email = subject.find(attr => attr.name === 'emailAddress')?.value || '';
      
      const issuerCN = issuer.find(attr => attr.name === 'commonName')?.value || 'Emisor desconocido';
      
      // Generar número de serie
      const serialNumber = cert.serialNumber || forge.util.bytesToHex(forge.random.getBytesSync(8));
      
      // Convertir a PEM
      const certificadoPem = forge.pki.certificateToPem(cert);
      const clavePrivadaPem = forge.pki.privateKeyToPem(privateKey);
      
      // Verificar que el certificado y la clave privada coincidan
      const testData = 'test-data-for-verification';
      const testSignature = privateKey.sign(forge.md.sha256.create().update(testData).digest());
      const isValid = cert.publicKey.verify(
        forge.md.sha256.create().update(testData).digest().bytes(),
        testSignature
      );
      
      if (!isValid) {
        throw new Error('El certificado y la clave privada no coinciden');
      }
      
      return {
        certificado_pem: certificadoPem,
        clave_privada_pem: clavePrivadaPem,
        nombre_certificado: `${commonName} - ${issuerCN}`,
        numero_serie: serialNumber,
        fecha_emision: cert.validity.notBefore,
        fecha_expiracion: cert.validity.notAfter,
        emisor: issuerCN,
        sujeto: commonName,
        organizacion: organization,
        pais: country,
        email_certificado: email,
        algoritmo: cert.signatureAlgorithm,
        huella_digital: forge.md.sha1.create().update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()).digest().toHex(),
        tipo: 'personal', // Certificado personal subido por el usuario
        metadatos: {
          subido_por_usuario: true,
          archivo_original: 'certificado.p12',
          validado: true,
          fecha_subida: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Error procesando certificado P12:', error);
      throw new Error(`Error procesando certificado: ${error.message}`);
    }
  }

  /**
   * Validar un archivo de certificado antes de procesarlo
   */
  static validarArchivoCertificado(file) {
    const errores = [];
    
    if (!file) {
      errores.push('Debe proporcionar un archivo de certificado');
      return { valido: false, errores };
    }
    
    // Validar extensión
    const allowedExtensions = ['.p12', '.pfx'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      errores.push('Solo se permiten archivos .p12 o .pfx');
    }
    
    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      errores.push('El archivo no puede superar los 5MB');
    }
    
    // Validar que no esté vacío
    if (file.size === 0) {
      errores.push('El archivo está vacío');
    }
    
    return {
      valido: errores.length === 0,
      errores
    };
  }

  /**
   * Verificar si el usuario ya tiene un certificado activo del mismo tipo
   */
  static async verificarCertificadoExistente(usuarioId, numeroSerie) {
    const certificadoExistente = await Certificado.findOne({
      where: {
        usuario_id: usuarioId,
        numero_serie: numeroSerie,
        activo: true
      }
    });
    
    return certificadoExistente;
  }
}

export default CertificadoService;