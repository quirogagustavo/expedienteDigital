// Rutas básicas para certificados - versión simplificada
import express from 'express';
import { Op } from 'sequelize';
import Certificado from '../models/Certificado.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/certificates - Obtener certificados del usuario
router.get('/certificates', authenticateToken, async (req, res) => {
  try {
    const certificados = await Certificado.findAll({
      where: { 
        usuario_id: req.user.id,
        activo: true 
      },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      certificates: certificados
    });
  } catch (error) {
    console.error('Error al obtener certificados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/certificate-types - Obtener tipos de certificados disponibles
router.get('/certificate-types', authenticateToken, async (req, res) => {
  try {
    const certificateTypes = [
      {
        id: 1,
        name: 'internal',
        description: 'Certificado interno del sistema para documentos corporativos y procesos administrativos internos.',
        validity_level: 'corporate',
        processing_time: 'Inmediato',
        requires_identity_verification: false
      },
      {
        id: 2,
        name: 'official_government',
        description: 'Certificado oficial gubernamental para documentos legales y trámites oficiales con validez jurídica completa.',
        validity_level: 'government',
        processing_time: '3-5 días hábiles',
        requires_identity_verification: true
      }
    ];

    res.json({
      success: true,
      certificate_types: certificateTypes
    });
  } catch (error) {
    console.error('Error al obtener tipos de certificados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/certificate-authorities - Obtener autoridades certificadoras
router.get('/certificate-authorities', authenticateToken, async (req, res) => {
  try {
    const authorities = [
      {
        id: 1,
        name: 'CA Gobierno de San Juan',
        country: 'Argentina',
        type: 'government',
        isTrusted: true
      },
      {
        id: 2,
        name: 'CA Interna del Sistema',
        country: 'Argentina',
        type: 'internal',
        isTrusted: true
      },
      {
        id: 3,
        name: 'AC Provincia de San Juan',
        country: 'Argentina',
        type: 'government',
        isTrusted: true
      }
    ];

    res.json({
      success: true,
      authorities: authorities
    });
  } catch (error) {
    console.error('Error al obtener autoridades certificadoras:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;