import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { Certificado, Usuario } from '../models/index.js';
import crypto from 'crypto';
import forge from 'node-forge';

const router = express.Router();

// Configurar multer para upload de certificados
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Validar tipos de archivo permitidos para certificados
    const allowedExtensions = /\.(p12|pfx)$/i;
    const isValidType = allowedExtensions.test(file.originalname);
    
    if (isValidType) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos P12 o PFX'));
    }
  }
});

/**
 * @route GET /api/certificates/my-certificates
 * @desc Obtener certificados del usuario autenticado
 * @access Usuario autenticado
 */
router.get('/my-certificates', authenticateToken, async (req, res) => {
  try {
    const certificados = await Certificado.findAll({
      where: { usuario_id: req.user.id },
      attributes: [
        'id', 
        'nombre_certificado', 
        'tipo',
        'numero_serie',
        'fecha_emision', 
        'fecha_expiracion', 
        'activo',
        'status'
      ],
      order: [['fecha_emision', 'DESC']]
    });

    res.json({
      certificados,
      total: certificados.length
    });

  } catch (error) {
    console.error('Error obteniendo certificados del usuario:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @route POST /api/certificates/import-p12
 * @desc Importar certificado P12/PFX
 * @access Usuario autenticado
 */
router.post('/import-p12', authenticateToken, upload.single('certificate'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Debe proporcionar un archivo de certificado' });
    }

    if (!req.body.password) {
      return res.status(400).json({ error: 'Debe proporcionar la contraseña del certificado' });
    }

    const { password } = req.body;
    const certificateBuffer = req.file.buffer;

    // Intentar parsear el certificado P12/PFX
    let p12Der, p12Asn1, p12, certInfo, privateKey;
    
    try {
      // Convertir buffer a string binario para forge
      const p12String = certificateBuffer.toString('binary');
      p12Asn1 = forge.asn1.fromDer(p12String);
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
      
      // Extraer información del certificado
      const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = bags[forge.pki.oids.certBag][0];
      
      if (!certBag) {
        return res.status(400).json({ error: 'No se encontró certificado en el archivo' });
      }

      const cert = certBag.cert;
      
      // Extraer clave privada
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] && 
                     keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
      
      if (!keyBag) {
        return res.status(400).json({ error: 'No se encontró clave privada en el archivo' });
      }

      privateKey = keyBag.key;

      // Extraer información del certificado
      certInfo = {
        commonName: cert.subject.getField('CN') ? cert.subject.getField('CN').value : 'Certificado Importado',
        serialNumber: cert.serialNumber,
        notBefore: cert.validity.notBefore,
        notAfter: cert.validity.notAfter,
        issuer: cert.issuer.getField('CN') ? cert.issuer.getField('CN').value : 'Autoridad Desconocida'
      };

    } catch (parseError) {
      console.error('Error parseando certificado:', parseError);
      return res.status(400).json({ 
        error: 'Error parseando el certificado. Verifique la contraseña y que el archivo sea válido.',
        details: parseError.message 
      });
    }

    // Verificar que el certificado no esté vencido
    const now = new Date();
    if (certInfo.notAfter < now) {
      return res.status(400).json({ 
        error: 'El certificado está vencido',
        vencimiento: certInfo.notAfter.toISOString()
      });
    }

    // Verificar si ya existe un certificado con el mismo número de serie
    const existingCert = await Certificado.findOne({
      where: { 
        numero_serie: certInfo.serialNumber,
        usuario_id: req.user.id
      }
    });

    if (existingCert) {
      return res.status(409).json({ 
        error: 'Ya existe un certificado con este número de serie',
        certificado_existente: existingCert.nombre_certificado
      });
    }

    // Convertir certificado y clave a PEM
    const certPem = forge.pki.certificateToPem(p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag][0].cert);
    const privateKeyPem = forge.pki.privateKeyToPem(privateKey);

    // Crear registro en la base de datos
    const nuevoCertificado = await Certificado.create({
      usuario_id: req.user.id,
      nombre_certificado: `${certInfo.commonName} (Importado)`,
      tipo: 'government', // Los P12/PFX suelen ser gubernamentales
      numero_serie: certInfo.serialNumber,
      fecha_emision: certInfo.notBefore,
      fecha_expiracion: certInfo.notAfter,
      certificado_pem: certPem,
      clave_privada_pem: privateKeyPem,
      status: 'active',
      activo: true, // Activar automáticamente si es el primero
      emisor: certInfo.issuer,
      metadata: JSON.stringify({
        imported_at: new Date().toISOString(),
        original_filename: req.file.originalname,
        file_size: req.file.size,
        import_method: 'p12_upload'
      })
    });

    // Log de auditoría
    console.log(`[CERT_IMPORT] Usuario ${req.user.id} importó certificado ${certInfo.commonName} (Serie: ${certInfo.serialNumber})`);

    res.json({
      message: 'Certificado importado exitosamente',
      certificado: {
        id: nuevoCertificado.id,
        nombre_certificado: nuevoCertificado.nombre_certificado,
        tipo: nuevoCertificado.tipo,
        numero_serie: nuevoCertificado.numero_serie,
        fecha_emision: nuevoCertificado.fecha_emision,
        fecha_expiracion: nuevoCertificado.fecha_expiracion,
        activo: nuevoCertificado.activo,
        emisor: nuevoCertificado.emisor
      }
    });

  } catch (error) {
    console.error('Error importando certificado P12:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @route POST /api/certificates/generate-internal
 * @desc Generar certificado interno para el usuario
 * @access Usuario autenticado
 */
router.post('/generate-internal', authenticateToken, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id);
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar si ya tiene un certificado interno activo
    const existingInternal = await Certificado.findOne({
      where: {
        usuario_id: req.user.id,
        tipo: 'internal',
        activo: true
      }
    });

    if (existingInternal) {
      return res.status(409).json({ 
        error: 'Ya tiene un certificado interno activo',
        certificado_existente: {
          id: existingInternal.id,
          nombre: existingInternal.nombre_certificado,
          fecha_expiracion: existingInternal.fecha_expiracion
        }
      });
    }

    // Generar par de claves RSA
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    const privateKey = keyPair.privateKey;
    const publicKey = keyPair.publicKey;

    // Crear certificado autoformado
    const cert = forge.pki.createCertificate();
    cert.publicKey = publicKey;
    cert.serialNumber = crypto.randomBytes(16).toString('hex');
    
    const now = new Date();
    cert.validity.notBefore = now;
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(now.getFullYear() + 1); // Válido por 1 año

    // Configurar subject y issuer
    const attrs = [{
      name: 'commonName',
      value: usuario.nombre_completo || usuario.username
    }, {
      name: 'countryName',
      value: 'AR'
    }, {
      name: 'stateOrProvinceName',
      value: 'San Juan'
    }, {
      name: 'localityName',
      value: 'San Juan'
    }, {
      name: 'organizationName',
      value: 'Sistema de Expedientes Digitales'
    }, {
      name: 'emailAddress',
      value: usuario.email
    }];

    cert.setSubject(attrs);
    cert.setIssuer(attrs); // Autofirmado

    // Extensiones del certificado
    cert.setExtensions([{
      name: 'basicConstraints',
      cA: false
    }, {
      name: 'keyUsage',
      keyCertSign: false,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: false,
      dataEncipherment: false
    }, {
      name: 'extKeyUsage',
      serverAuth: false,
      clientAuth: false,
      codeSigning: true,
      timeStamping: true
    }]);

    // Firmar el certificado
    cert.sign(privateKey, forge.md.sha256.create());

    // Convertir a PEM
    const certPem = forge.pki.certificateToPem(cert);
    const privateKeyPem = forge.pki.privateKeyToPem(privateKey);

    // Guardar en la base de datos
    const nuevoCertificado = await Certificado.create({
      usuario_id: req.user.id,
      nombre_certificado: `Certificado Interno - ${usuario.nombre_completo}`,
      tipo: 'internal',
      numero_serie: cert.serialNumber,
      fecha_emision: cert.validity.notBefore,
      fecha_expiracion: cert.validity.notAfter,
      certificado_pem: certPem,
      clave_privada_pem: privateKeyPem,
      status: 'valid',
      activo: true,
      emisor: 'Sistema de Expedientes Digitales',
      metadata: JSON.stringify({
        generated_at: new Date().toISOString(),
        key_algorithm: 'RSA',
        key_size: 2048,
        hash_algorithm: 'SHA-256',
        self_signed: true
      })
    });

    // Log de auditoría
    console.log(`[CERT_INTERNAL] Usuario ${req.user.id} generó certificado interno (Serie: ${cert.serialNumber})`);

    res.json({
      message: 'Certificado interno generado exitosamente',
      certificado: {
        id: nuevoCertificado.id,
        nombre_certificado: nuevoCertificado.nombre_certificado,
        tipo: nuevoCertificado.tipo,
        numero_serie: nuevoCertificado.numero_serie,
        fecha_emision: nuevoCertificado.fecha_emision,
        fecha_expiracion: nuevoCertificado.fecha_expiracion,
        activo: nuevoCertificado.activo,
        emisor: nuevoCertificado.emisor
      }
    });

  } catch (error) {
    console.error('Error generando certificado interno:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @route POST /api/certificates/:id/activate
 * @desc Activar un certificado específico
 * @access Usuario autenticado
 */
router.post('/:id/activate', authenticateToken, async (req, res) => {
  try {
    const certificado = await Certificado.findOne({
      where: {
        id: req.params.id,
        usuario_id: req.user.id
      }
    });

    if (!certificado) {
      return res.status(404).json({ error: 'Certificado no encontrado' });
    }

    // Verificar que no esté vencido
    if (certificado.fecha_expiracion < new Date()) {
      return res.status(400).json({ error: 'No se puede activar un certificado vencido' });
    }

    // Desactivar todos los certificados del mismo tipo
    await Certificado.update(
      { activo: false },
      {
        where: {
          usuario_id: req.user.id,
          tipo: certificado.tipo
        }
      }
    );

    // Activar el certificado seleccionado
    await certificado.update({ activo: true });

    res.json({
      message: 'Certificado activado exitosamente',
      certificado: {
        id: certificado.id,
        nombre_certificado: certificado.nombre_certificado,
        tipo: certificado.tipo,
        activo: true
      }
    });

  } catch (error) {
    console.error('Error activando certificado:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @route DELETE /api/certificates/:id
 * @desc Eliminar un certificado
 * @access Usuario autenticado
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const certificado = await Certificado.findOne({
      where: {
        id: req.params.id,
        usuario_id: req.user.id
      }
    });

    if (!certificado) {
      return res.status(404).json({ error: 'Certificado no encontrado' });
    }

    // Verificar si es el único certificado activo
    const certificadosActivos = await Certificado.count({
      where: {
        usuario_id: req.user.id,
        activo: true
      }
    });

    if (certificado.activo && certificadosActivos === 1) {
      return res.status(400).json({ 
        error: 'No puede eliminar el único certificado activo. Active otro certificado primero.' 
      });
    }

    await certificado.destroy();

    res.json({
      message: 'Certificado eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando certificado:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Middleware de manejo de errores específico para multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'Archivo demasiado grande. Máximo 10MB permitido.' 
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Solo se permite un archivo por vez.' 
      });
    }
  }
  
  if (error.message.includes('Solo se permiten archivos P12 o PFX')) {
    return res.status(400).json({ 
      error: error.message 
    });
  }
  
  next(error);
});

export default router;