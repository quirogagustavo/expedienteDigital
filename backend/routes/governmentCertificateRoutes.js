// Rutas para Certificados Gubernamentales
// Gobierno de San Juan - Gestión de Certificados Oficiales

import express from 'express';
import multer from 'multer';
import { Usuario, Certificado } from '../models/index.js';
import GovernmentCertificateManager from '../services/GovernmentCertificateManager.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configurar multer para subida de archivos P12/PFX
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.p12', '.pfx'];
    const fileExtension = file.originalname.toLowerCase().slice(-4);
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .p12 o .pfx'), false);
    }
  }
});

// Endpoint para solicitar certificado gubernamental
router.post('/request-government', authenticateToken, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id);
    
    if (!usuario) {
      return res.status(404).json({ 
        error: true, 
        message: 'Usuario no encontrado' 
      });
    }

    // Verificar permisos para certificados gubernamentales
    if (!['funcionario_oficial', 'administrador'].includes(usuario.rol_usuario)) {
      return res.status(403).json({
        error: true,
        message: 'Su rol no permite solicitar certificados gubernamentales'
      });
    }

    const { documentos_identidad } = req.body;

    // Procesar solicitud
    const result = await GovernmentCertificateManager.requestGovernmentCertificate(
      usuario, 
      documentos_identidad
    );

    // Log de auditoría
    console.log(`[GOV_CERT_AUDIT] Solicitud certificado gubernamental - Usuario: ${usuario.email}, Solicitud: ${result.solicitud_id}`);

    res.json({
      success: true,
      ...result,
      usuario: {
        nombre: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol_usuario
      }
    });

  } catch (error) {
    console.error('Error en request-government:', error);
    res.status(500).json({
      error: true,
      message: 'Error procesando solicitud de certificado gubernamental',
      details: error.message
    });
  }
});

// Endpoint para importar certificado gubernamental (P12/PFX)
router.post('/import-p12', authenticateToken, upload.single('certificate'), async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id);
    
    if (!usuario) {
      return res.status(404).json({ 
        error: true, 
        message: 'Usuario no encontrado' 
      });
    }

    // Verificar permisos
    if (!['funcionario_oficial', 'administrador'].includes(usuario.rol_usuario)) {
      return res.status(403).json({
        error: true,
        message: 'Su rol no permite importar certificados gubernamentales'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: 'Archivo de certificado requerido'
      });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: true,
        message: 'Password del certificado requerido'
      });
    }

    // Importar certificado
    const result = await GovernmentCertificateManager.importGovernmentCertificate(
      usuario,
      {
        name: req.file.originalname,
        buffer: req.file.buffer
      },
      password
    );

    // Log de auditoría
    console.log(`[GOV_CERT_AUDIT] Certificado gubernamental importado - Usuario: ${usuario.email}, Archivo: ${req.file.originalname}`);

    res.json({
      success: true,
      message: 'Certificado gubernamental importado exitosamente',
      certificado: {
        id: result.certificado.id,
        nombre: result.certificado.nombre_certificado,
        tipo: result.certificado.tipo,
        numero_serie: result.certificado.numero_serie,
        validez: result.validez
      }
    });

  } catch (error) {
    console.error('Error importando P12:', error);
    res.status(500).json({
      error: true,
      message: 'Error importando certificado',
      details: error.message
    });
  }
});

// Endpoint para verificar estado de certificado gubernamental
router.get('/verify/:certificadoId', authenticateToken, async (req, res) => {
  try {
    const certificado = await Certificado.findOne({
      where: {
        id: req.params.certificadoId,
        usuario_id: req.user.id,
        tipo: 'government'
      }
    });

    if (!certificado) {
      return res.status(404).json({
        error: true,
        message: 'Certificado gubernamental no encontrado'
      });
    }

    // Verificar estado de revocación
    const revocationStatus = await GovernmentCertificateManager.checkCertificateRevocationStatus(certificado);

    // Calcular estado general
    const ahora = new Date();
    const diasParaVencer = Math.ceil((certificado.fecha_expiracion - ahora) / (1000 * 60 * 60 * 24));
    
    let estado = 'vigente';
    if (revocationStatus.revoked) estado = 'revocado';
    else if (certificado.fecha_expiracion < ahora) estado = 'vencido';
    else if (diasParaVencer <= 30) estado = 'por_vencer';
    else if (!certificado.activo) estado = 'inactivo';

    res.json({
      certificado: {
        id: certificado.id,
        nombre: certificado.nombre_certificado,
        numero_serie: certificado.numero_serie,
        emisor: certificado.emisor,
        estado: estado,
        diasParaVencer: diasParaVencer,
        fecha_emision: certificado.fecha_emision,
        fecha_expiracion: certificado.fecha_expiracion
      },
      revocation_status: revocationStatus,
      valid_for_signing: estado === 'vigente' && !revocationStatus.revoked,
      last_verification: new Date()
    });

  } catch (error) {
    console.error('Error verificando certificado:', error);
    res.status(500).json({
      error: true,
      message: 'Error verificando certificado gubernamental'
    });
  }
});

// Endpoint para obtener certificados gubernamentales del usuario
router.get('/my-government-certificates', authenticateToken, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id, {
      include: [{
        model: Certificado,
        as: 'certificados',
        where: { tipo: 'government' },
        required: false,
        attributes: ['id', 'nombre_certificado', 'tipo', 'fecha_emision', 'fecha_expiracion', 'activo', 'numero_serie', 'emisor', 'status']
      }]
    });

    if (!usuario) {
      return res.status(404).json({ error: true, message: 'Usuario no encontrado' });
    }

    // Procesar certificados con estado detallado
    const certificadosConEstado = await Promise.all(
      usuario.certificados.map(async (cert) => {
        const ahora = new Date();
        const diasParaVencer = Math.ceil((cert.fecha_expiracion - ahora) / (1000 * 60 * 60 * 24));
        
        // Verificar estado de revocación
        const revocationStatus = await GovernmentCertificateManager.checkCertificateRevocationStatus(cert);
        
        let estado = 'vigente';
        if (revocationStatus.revoked) estado = 'revocado';
        else if (cert.fecha_expiracion < ahora) estado = 'vencido';
        else if (diasParaVencer <= 30) estado = 'por_vencer';
        else if (!cert.activo) estado = 'inactivo';

        return {
          ...cert.toJSON(),
          diasParaVencer,
          estado,
          revoked: revocationStatus.revoked,
          valid_for_signing: estado === 'vigente' && !revocationStatus.revoked
        };
      })
    );

    res.json({
      usuario: {
        nombre: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol_usuario
      },
      certificados_gubernamentales: certificadosConEstado,
      resumen: {
        total: certificadosConEstado.length,
        vigentes: certificadosConEstado.filter(c => c.estado === 'vigente' && !c.revoked).length,
        por_vencer: certificadosConEstado.filter(c => c.estado === 'por_vencer').length,
        vencidos: certificadosConEstado.filter(c => c.estado === 'vencido').length,
        revocados: certificadosConEstado.filter(c => c.revoked).length
      }
    });

  } catch (error) {
    console.error('Error obteniendo certificados gubernamentales:', error);
    res.status(500).json({
      error: true,
      message: 'Error obteniendo certificados gubernamentales'
    });
  }
});

// Endpoint para activar certificado después de validación administrativa
router.post('/activate/:certificadoId', authenticateToken, async (req, res) => {
  try {
    const certificado = await Certificado.findOne({
      where: {
        id: req.params.certificadoId,
        usuario_id: req.user.id,
        tipo: 'government'
      }
    });

    if (!certificado) {
      return res.status(404).json({
        error: true,
        message: 'Certificado gubernamental no encontrado'
      });
    }

    // Activar certificado
    await certificado.update({ 
      activo: true,
      status: 'active'
    });

    // Log de auditoría
    console.log(`[GOV_CERT_AUDIT] Certificado gubernamental activado - Usuario: ${req.user.email}, Certificado: ${certificado.id}`);

    res.json({
      success: true,
      message: 'Certificado gubernamental activado exitosamente',
      certificado: {
        id: certificado.id,
        nombre: certificado.nombre_certificado,
        estado: 'activo',
        tipo: 'government'
      }
    });

  } catch (error) {
    console.error('Error activando certificado gubernamental:', error);
    res.status(500).json({
      error: true,
      message: 'Error activando certificado gubernamental'
    });
  }
});

export default router;