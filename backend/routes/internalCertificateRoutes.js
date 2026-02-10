// Rutas para Gestión de Certificados Internos
// Gobierno de San Juan - Auto-provisión de Certificados

import express from 'express';
import { Usuario, Certificado } from '../models/index.js';
import InternalCertificateManager from '../services/InternalCertificateManager.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Endpoint para solicitar certificado interno (auto-generación)
router.post('/request-internal', authenticateToken, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id);
    
    if (!usuario) {
      return res.status(404).json({ 
        error: true, 
        message: 'Usuario no encontrado' 
      });
    }

    // Verificar que el usuario puede tener certificados internos
    if (!['empleado_interno', 'funcionario_oficial', 'administrador'].includes(usuario.rol_usuario)) {
      return res.status(403).json({
        error: true,
        message: 'Su rol no permite solicitar certificados internos'
      });
    }

    // Asegurar que el usuario tenga certificado
    const result = await InternalCertificateManager.ensureUserHasCertificate(usuario);

    // Log de auditoría
    console.log(`[CERT_AUDIT] Solicitud certificado interno - Usuario: ${usuario.email}, Acción: ${result.action}`);

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
    console.error('Error en request-internal:', error);
    res.status(500).json({
      error: true,
      message: 'Error procesando solicitud de certificado',
      details: error.message
    });
  }
});

// Endpoint para ver mis certificados
router.get('/my-certificates', authenticateToken, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id, {
      include: [{
        model: Certificado,
        as: 'certificados',
        attributes: ['id', 'nombre_certificado', 'tipo', 'fecha_emision', 'fecha_vencimiento', 'activo', 'numero_serie']
      }]
    });

    if (!usuario) {
      return res.status(404).json({ error: true, message: 'Usuario no encontrado' });
    }

    // Calcular estado de cada certificado
    const certificadosConEstado = usuario.certificados.map(cert => {
      const ahora = new Date();
      const fechaVencimiento = cert.fecha_vencimiento || cert.fecha_expiracion;
      const diasParaVencer = Math.ceil((fechaVencimiento - ahora) / (1000 * 60 * 60 * 24));

      let estado = 'vigente';
      if (fechaVencimiento < ahora) estado = 'vencido';
      else if (diasParaVencer <= 30) estado = 'por_vencer';
      else if (!cert.activo) estado = 'inactivo';

      // Log para debuggear el estado calculado
      console.log('ESTADO CERTIFICADO (internal):', {
        certificado: cert.nombre_certificado,
        diasParaVencer: diasParaVencer,
        estado: estado,
        activo: cert.activo
      });

      return {
        ...cert.toJSON(),
        diasParaVencer,
        estado
      };
    });

    res.json({
      usuario: {
        nombre: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol_usuario
      },
      certificados: certificadosConEstado,
      resumen: {
        total: certificadosConEstado.length,
        vigentes: certificadosConEstado.filter(c => c.estado === 'vigente').length,
        por_vencer: certificadosConEstado.filter(c => c.estado === 'por_vencer').length,
        vencidos: certificadosConEstado.filter(c => c.estado === 'vencido').length
      }
    });

  } catch (error) {
    console.error('Error obteniendo certificados:', error);
    res.status(500).json({
      error: true,
      message: 'Error obteniendo certificados'
    });
  }
});

// Endpoint para renovar certificado
router.post('/renew/:certificadoId', authenticateToken, async (req, res) => {
  try {
    const certificado = await Certificado.findOne({
      where: {
        id: req.params.certificadoId,
        usuario_id: req.user.id
      }
    });

    if (!certificado) {
      return res.status(404).json({
        error: true,
        message: 'Certificado no encontrado'
      });
    }

    const result = await InternalCertificateManager.renewCertificateIfNeeded(certificado);

    // Log de auditoría
    console.log(`[CERT_AUDIT] Renovación certificado - Usuario: ${req.user.email}, Certificado: ${certificado.id}, Acción: ${result.action}`);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error renovando certificado:', error);
    res.status(500).json({
      error: true,
      message: 'Error renovando certificado',
      details: error.message
    });
  }
});

// Endpoint para verificar estado de certificados automáticamente
router.get('/check-status', authenticateToken, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id);
    
    // Verificar si necesita certificado y crearlo automáticamente
    const result = await InternalCertificateManager.ensureUserHasCertificate(usuario);

    res.json({
      success: true,
      needsAction: result.action === 'created',
      ...result
    });

  } catch (error) {
    console.error('Error verificando estado:', error);
    res.status(500).json({
      error: true,
      message: 'Error verificando estado de certificados'
    });
  }
});

// Endpoint para activar certificado después de generación
router.post('/activate/:certificadoId', authenticateToken, async (req, res) => {
  try {
    const certificado = await Certificado.findOne({
      where: {
        id: req.params.certificadoId,
        usuario_id: req.user.id
      }
    });

    if (!certificado) {
      return res.status(404).json({
        error: true,
        message: 'Certificado no encontrado'
      });
    }

    // Activar certificado
    await certificado.update({ activo: true });

    // Log de auditoría
    console.log(`[CERT_AUDIT] Activación certificado - Usuario: ${req.user.email}, Certificado: ${certificado.id}`);

    res.json({
      success: true,
      message: 'Certificado activado exitosamente',
      certificado: {
        id: certificado.id,
        nombre: certificado.nombre_certificado,
        estado: 'activo'
      }
    });

  } catch (error) {
    console.error('Error activando certificado:', error);
    res.status(500).json({
      error: true,
      message: 'Error activando certificado'
    });
  }
});

export default router;