
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

import upload from './upload.js';
import { signBuffer, verifyBuffer, signWithPrivateKey } from './signature.js';
import { syncDatabase, Usuario, Certificado, Signature } from './models/index.js';
import { authenticateToken } from './middleware/auth.js';
import { register, login } from './controllers/authController.js';

// Importar nuevas rutas híbridas
import certificateRoutes from './routes/certificateRoutesSimple.js';
import signatureRoutes from './routes/signatureRoutes.js';
// import smartCertificateRoutes from './routes/smartCertificateRoutes.js'; // Comentado temporalmente
// import internalCertificateRoutes from './routes/internalCertificateRoutes.js'; // Comentado temporalmente
// import governmentCertificateRoutes from './routes/governmentCertificateRoutes.js'; // Comentado temporalmente
import { initializeDefaultData } from './models/databaseExtended.js';

const app = express();
const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    // Inicializar base de datos
    await syncDatabase();

    // Inicializar datos predeterminados para CA híbrida
    await initializeDefaultData();

    app.use(cors());
app.use(express.json());

// Rutas de autenticación
app.post('/register', register);
app.post('/login', login);

// Endpoint para obtener perfil del usuario
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id, {
      attributes: ['id', 'username', 'nombre_completo', 'email', 'rol_usuario']
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: usuario });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// Nuevas rutas híbridas para certificados CA
app.use('/api', certificateRoutes);

// Rutas para historial de firmas
app.use('/api/signatures', signatureRoutes);

// Rutas para auto-detección inteligente de certificados
// app.use('/api/certificates', smartCertificateRoutes); // Comentado temporalmente

// Rutas para gestión de certificados internos
// app.use('/api/internal-certificates', internalCertificateRoutes); // Comentado temporalmente

// Rutas para certificados gubernamentales
// app.use('/api/government-certificates', governmentCertificateRoutes); // Comentado temporalmente

// Endpoint para obtener certificados del usuario
app.get('/certificados', authenticateToken, async (req, res) => {
  try {
    const certificados = await Certificado.findAll({
      where: { usuario_id: req.user.id },
      attributes: ['id', 'nombre_certificado', 'fecha_emision', 'fecha_expiracion', 'activo', 'certificado_pem']
    });

    res.json({ certificados });
  } catch (error) {
    console.error('Error al obtener certificados:', error);
    res.status(500).json({ error: 'Error al obtener certificados' });
  }
});

// Endpoint para recibir archivo y simular firma digital
// Endpoint para firmar documentos (requiere autenticación)
app.post('/sign', authenticateToken, upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se envió ningún archivo' });
  }
  
  try {
    // Obtener información del tipo de documento y certificado solicitado
    const { tipo_documento, certificate_type } = req.body;
    
    // Validar tipo de documento
    if (!tipo_documento || !['oficial', 'no_oficial'].includes(tipo_documento)) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }

    // Validar tipo de certificado
    if (!certificate_type || !['internal', 'government'].includes(certificate_type)) {
      return res.status(400).json({ error: 'Tipo de certificado inválido' });
    }

    // Validar combinación documento + certificado
    if (tipo_documento === 'oficial' && certificate_type !== 'government') {
      return res.status(400).json({ 
        error: 'Los documentos oficiales SOLO pueden firmarse con certificado gubernamental' 
      });
    }

    const usuario = await Usuario.findByPk(req.user.id);
    
    // Verificar permisos del usuario para el tipo de certificado
    if (certificate_type === 'government' && !['funcionario_oficial', 'administrador'].includes(usuario.rol_usuario)) {
      return res.status(403).json({
        error: 'Su rol no permite usar certificados gubernamentales'
      });
    }

    // Para certificados internos: asegurar que exista, si no, crearlo automáticamente
    if (certificate_type === 'internal') {
      const { InternalCertificateManager } = await import('./services/InternalCertificateManager.js');
      const certResult = await InternalCertificateManager.ensureUserHasCertificate(usuario);
      
      if (certResult.action === 'created') {
        console.log(`[AUTO_CERT] Certificado interno auto-generado para ${usuario.email}`);
      }
    }

    // Buscar certificado específico del tipo solicitado
    const certificado = await Certificado.findOne({
      where: {
        usuario_id: req.user.id,
        tipo: certificate_type,
        activo: true
      },
      order: [['fecha_emision', 'DESC']] // El más reciente
    });

    if (!certificado) {
      const tipoTexto = certificate_type === 'government' ? 'gubernamental' : 'interno';
      
      if (certificate_type === 'government') {
        return res.status(404).json({ 
          error: `No tiene certificado gubernamental activo. Debe importar su certificado P12/PFX o solicitar uno nuevo desde el panel de Certificados Gubernamentales.`,
          action_required: 'import_or_request_government_certificate',
          redirect_to: '/government-certificates'
        });
      } else {
        return res.status(500).json({ 
          error: `Error generando certificado interno automáticamente. Intente nuevamente.`,
          action_required: 'retry_internal_certificate_generation'
        });
      }
    }

    // Para certificados gubernamentales: verificar estado contra CRL/OCSP
    if (certificate_type === 'government') {
      const { GovernmentCertificateManager } = await import('./services/GovernmentCertificateManager.js');
      const revocationStatus = await GovernmentCertificateManager.checkCertificateRevocationStatus(certificado);
      
      if (revocationStatus.revoked) {
        return res.status(403).json({
          error: 'Su certificado gubernamental ha sido REVOCADO y no puede usarse para firmar',
          revocation_reason: revocationStatus.reason,
          revocation_date: revocationStatus.revocation_date
        });
      }

      // Verificar que no esté vencido
      if (certificado.fecha_expiracion < new Date()) {
        return res.status(403).json({
          error: 'Su certificado gubernamental está VENCIDO. Debe renovar o importar un certificado vigente.',
          expired_date: certificado.fecha_expiracion
        });
      }
    }

    // Firmar con el certificado del usuario
    const signature = signWithPrivateKey(req.file.buffer, certificado.clave_privada_pem);
    
    // Calcular hash del documento para integridad
    const crypto = require('crypto');
    const hashDocumento = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    
    // Registrar la firma en la base de datos
    const nuevaFirma = await Signature.create({
      usuario_id: usuario.id,
      certificado_id: certificado.id,
      nombre_documento: req.file.originalname,
      nombre_archivo_original: req.file.originalname,
      tipo_documento: tipo_documento,
      hash_documento: hashDocumento,
      tamaño_archivo: req.file.size,
      firma_digital: signature.toString('hex'),
      algoritmo_firma: 'RSA-SHA256',
      timestamp_firma: new Date(),
      estado_firma: 'valida',
      verificada: true,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      validez_legal: certificate_type === 'government' ? 'COMPLETA' : 'INTERNA',
      crl_check_status: certificate_type === 'government' ? 'valid' : 'not_checked'
    });
    
    // Log de auditoría completo
    const auditLog = {
      timestamp: new Date().toISOString(),
      signature_id: nuevaFirma.id,
      usuario_id: usuario.id,
      usuario_email: usuario.email,
      usuario_rol: usuario.rol_usuario,
      documento_nombre: req.file.originalname,
      documento_hash: hashDocumento,
      documento_tipo: tipo_documento,
      certificado_id: certificado.id,
      certificado_tipo: certificate_type,
      certificado_serie: certificado.numero_serie,
      ip: req.ip,
      user_agent: req.get('User-Agent')
    };

    console.log(`[FIRMA_COMPLETA_AUDIT]`, JSON.stringify(auditLog));
    
    res.json({
      message: `Documento firmado digitalmente con certificado ${certificate_type === 'government' ? 'gubernamental' : 'interno'}`,
      filename: req.file.originalname,
      size: req.file.size,
      fileBase64: req.file.buffer.toString('base64'),
      signature,
      publicKeyPem: certificado.certificado_pem,
      // Información del documento
      documento: {
        tipo_documento,
        certificate_type,
        estado_firma: certificate_type === 'government' ? 'firmado_gubernamental' : 'firmado_interno',
        validez_legal: certificate_type === 'government' ? 'COMPLETA' : 'INTERNA',
        hash_documento: hashDocumento
      },
      // Información de la firma registrada
      firma: {
        id: nuevaFirma.id,
        timestamp: nuevaFirma.timestamp_firma,
        algoritmo: nuevaFirma.algoritmo_firma,
        estado: nuevaFirma.estado_firma,
        verificada: nuevaFirma.verificada
      },
      usuario: {
        id: req.user.id,
        username: req.user.username,
        nombre_completo: req.user.nombre_completo,
        rol: usuario.rol_usuario
      },
      certificado: {
        id: certificado.id,
        nombre_certificado: certificado.nombre_certificado,
        tipo: certificado.tipo,
        numero_serie: certificado.numero_serie,
        fecha_emision: certificado.fecha_emision,
        fecha_expiracion: certificado.fecha_expiracion,
        dias_para_vencer: Math.ceil((certificado.fecha_expiracion - new Date()) / (1000 * 60 * 60 * 24))
      },
      auditoria: {
        timestamp: auditLog.timestamp,
        firma_id: `FIRMA_${Date.now()}`
      }
    });
  } catch (err) {
    console.error('Error al firmar:', err);
    res.status(500).json({ error: 'Error al firmar el documento', details: err.message });
  }
});

// Endpoint para validar la firma digital
app.post('/verify', upload.single('document'), (req, res) => {
  const { signature, publicKeyPem } = req.body;
  if (!req.file || !signature || !publicKeyPem) {
    return res.status(400).json({ error: 'Faltan datos para la validación' });
  }
  try {
    const isValid = verifyBuffer(req.file.buffer, signature, publicKeyPem);
    res.json({
      valid: isValid,
      message: isValid ? 'La firma es válida' : 'La firma NO es válida'
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al validar la firma', details: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('API de Firma Digital funcionando');
});

    app.listen(PORT, () => {
      console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Iniciar el servidor
startServer();
