// Ruta para Auto-detección Inteligente de Certificados
// Gobierno de San Juan - API Segura

import express from 'express';
import { Usuario, CertificateType } from '../models/index.js';
import CertificateAutoDetection from '../services/CertificateAutoDetection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Endpoint para sugerencia inteligente de certificados
router.post('/smart-suggest', authenticateToken, async (req, res) => {
  try {
    const { tipoDocumento, userId } = req.body;
    
    // Obtener usuario con su rol
    const usuario = await Usuario.findByPk(userId);
    if (!usuario) {
      return res.status(404).json({ 
        error: true, 
        mensaje: 'Usuario no encontrado' 
      });
    }

    // Ejecutar workflow de seguridad
    const workflow = CertificateAutoDetection.getSecureWorkflow(usuario, tipoDocumento);
    
    // Log de auditoría para gobierno
    console.log(`[AUDIT] Sugerencia certificado - Usuario: ${usuario.email}, Rol: ${usuario.rol_usuario}, Documento: ${tipoDocumento}, Sugerido: ${workflow.certificadoSugerido}`);

    res.json(workflow);

  } catch (error) {
    console.error('Error en smart-suggest:', error);
    res.status(500).json({ 
      error: true, 
      mensaje: 'Error interno del servidor' 
    });
  }
});

// Endpoint para confirmar firma con auditoría
router.post('/confirm-signature', authenticateToken, async (req, res) => {
  try {
    const { documentoId, certificadoTipo, confirmacionExplicita } = req.body;
    const usuario = await Usuario.findByPk(req.user.id);

    // Validar permisos nuevamente (doble verificación)
    if (!CertificateAutoDetection.canUseCertificate(usuario, certificadoTipo)) {
      return res.status(403).json({
        error: true,
        mensaje: 'Usuario no tiene permisos para este tipo de certificado'
      });
    }

    // Log de auditoría COMPLETO para gobierno
    const auditLog = {
      timestamp: new Date().toISOString(),
      usuario_id: usuario.id,
      usuario_email: usuario.email,
      usuario_rol: usuario.rol_usuario,
      documento_id: documentoId,
      certificado_tipo: certificadoTipo,
      confirmacion_explicita: confirmacionExplicita,
      ip: req.ip,
      user_agent: req.get('User-Agent')
    };

    console.log(`[FIRMA_AUDIT]`, JSON.stringify(auditLog));

    // TODO: Aquí iría la lógica real de firma del documento
    // Integración con el sistema de firma digital

    res.json({
      success: true,
      mensaje: 'Documento firmado exitosamente',
      firma_id: `FIRMA_${Date.now()}`,
      auditoria: auditLog.timestamp
    });

  } catch (error) {
    console.error('Error en confirm-signature:', error);
    res.status(500).json({ 
      error: true, 
      mensaje: 'Error en el proceso de firma' 
    });
  }
});

// Endpoint para obtener historial de firmas del usuario (transparencia gubernamental)
router.get('/my-signatures', authenticateToken, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id);
    
    // TODO: Obtener firmas reales de la base de datos
    // Por ahora devolvemos estructura de ejemplo
    
    const firmas = [
      // Estructura de ejemplo - reemplazar con datos reales
    ];

    res.json({
      usuario: {
        nombre: usuario.nombre,
        rol: usuario.rol_usuario
      },
      total_firmas: firmas.length,
      firmas: firmas
    });

  } catch (error) {
    console.error('Error obteniendo firmas:', error);
    res.status(500).json({ 
      error: true, 
      mensaje: 'Error obteniendo historial' 
    });
  }
});

export default router;