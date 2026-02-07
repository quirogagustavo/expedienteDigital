/**
 * =====================================================
 * RUTAS DE INTEGRACIÓN CON LARAVEL
 * =====================================================
 * Endpoints específicos para que Laravel consuma la API
 * usando un usuario de servicio técnico
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Signature, Certificado, Usuario } from '../models/index.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * Middleware para validar que sea el usuario de servicio Eduge/Laravel
 */
const requireServiceAccount = (req, res, next) => {
  if (req.user.username !== 'eduge_service') {
    return res.status(403).json({
      error: 'Este endpoint solo está disponible para el usuario de servicio Eduge',
      usuario_actual: req.user.username
    });
  }
  next();
};

/**
 * Middleware para validar datos de usuario Laravel
 */
const validateLaravelUser = (req, res, next) => {
  const { laravelUser } = req.body;

  if (!laravelUser) {
    return res.status(400).json({
      error: 'Se requiere el objeto laravelUser',
      ejemplo: {
        laravelUser: {
          id: 123,
          email: 'usuario@example.com',
          name: 'Juan Pérez'
        }
      }
    });
  }

  if (!laravelUser.id || !laravelUser.email) {
    return res.status(400).json({
      error: 'laravelUser debe contener al menos id y email',
      recibido: laravelUser
    });
  }

  next();
};

// =====================================================
// ENDPOINT: Firmar documento desde Laravel
// =====================================================
/**
 * POST /api/laravel/signatures/sign
 *
 * Firma un documento enviando los datos del usuario real de Laravel
 *
 * Body:
 * {
 *   "laravelUser": {
 *     "id": 101,              // ID en Laravel
 *     "email": "juan@gov.ar",
 *     "name": "Juan Pérez"
 *   },
 *   "documentData": {
 *     "nombre": "Contrato.pdf",
 *     "hash": "abc123...",
 *     "tipo": "oficial",      // oficial | no_oficial
 *     "tamaño": 245678
 *   },
 *   "signatureData": {
 *     "firma_digital": "hex_signature_data",
 *     "algoritmo": "RSA-SHA256",
 *     "certificado_id": 5
 *   },
 *   "metadata": {             // Opcional
 *     "ip_address": "192.168.1.1",
 *     "user_agent": "Mozilla/5.0...",
 *     "numero_expediente": "EXP-2024-001"
 *   }
 * }
 */
router.post('/signatures/sign',
  authenticateToken,
  requireServiceAccount,
  validateLaravelUser,
  async (req, res) => {
    try {
      const { laravelUser, documentData, signatureData, metadata = {} } = req.body;

      // Validar certificado
      const certificado = await Certificado.findByPk(signatureData.certificado_id);
      if (!certificado) {
        return res.status(404).json({ error: 'Certificado no encontrado' });
      }

      if (!certificado.activo) {
        return res.status(400).json({ error: 'El certificado no está activo' });
      }

      // Determinar validez legal según el tipo de certificado
      const validez_legal = certificado.tipo === 'governmental' ? 'COMPLETA' :
        certificado.tipo === 'internal' ? 'INTERNA' : 'LIMITADA';

      // Crear la firma
      const signature = await Signature.create({
        // Usuario técnico del sistema Node.js
        usuario_id: req.user.id,
        certificado_id: signatureData.certificado_id,

        // 👤 DATOS DEL USUARIO REAL DE LARAVEL
        laravel_user_id: laravelUser.id,
        laravel_user_email: laravelUser.email,
        laravel_user_name: laravelUser.name || laravelUser.email,
        sistema_origen: 'laravel',

        // Datos del documento
        nombre_documento: documentData.nombre,
        nombre_archivo_original: documentData.nombre,
        tipo_documento: documentData.tipo,
        hash_documento: documentData.hash,
        tamaño_archivo: documentData.tamaño || 0,

        // Datos de la firma
        firma_digital: signatureData.firma_digital,
        algoritmo_firma: signatureData.algoritmo || 'RSA-SHA256',
        timestamp_firma: new Date(),
        estado_firma: 'valida',
        verificada: true,
        validez_legal,

        // Metadata adicional
        ip_address: metadata.ip_address || req.ip,
        user_agent: metadata.user_agent || req.headers['user-agent'],
        session_id: metadata.session_id || `LARAVEL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        numero_expediente: metadata.numero_expediente,

        // Guardar metadata completa
        metadatos_externos: {
          origen: 'laravel',
          timestamp_laravel: new Date().toISOString(),
          laravel_session: metadata.laravel_session,
          additional_data: metadata.additional_data
        }
      });

      console.log(`✅ Firma creada para usuario Laravel ${laravelUser.email} (ID: ${laravelUser.id})`);

      res.status(201).json({
        success: true,
        message: 'Documento firmado exitosamente',
        signature: {
          id: signature.id,
          hash_documento: signature.hash_documento,
          timestamp_firma: signature.timestamp_firma,
          estado_firma: signature.estado_firma,
          validez_legal: signature.validez_legal,
          laravel_user: {
            id: signature.laravel_user_id,
            email: signature.laravel_user_email,
            name: signature.laravel_user_name
          },
          certificado: {
            id: certificado.id,
            nombre: certificado.nombre_certificado,
            tipo: certificado.tipo
          }
        }
      });

    } catch (error) {
      console.error('❌ Error firmando documento desde Laravel:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }
);

// =====================================================
// ENDPOINT: Obtener firmas de un usuario de Laravel
// =====================================================
/**
 * GET /api/laravel/signatures/user/:laravelUserId
 *
 * Obtiene todas las firmas de un usuario específico de Laravel
 */
router.get('/signatures/user/:laravelUserId',
  authenticateToken,
  requireServiceAccount,
  async (req, res) => {
    try {
      const { laravelUserId } = req.params;
      const { page = 1, limit = 50, estado = null } = req.query;

      const where = { laravel_user_id: parseInt(laravelUserId) };
      if (estado) {
        where.estado_firma = estado;
      }

      const offset = (page - 1) * limit;

      const { rows: firmas, count: total } = await Signature.findAndCountAll({
        where,
        include: [
          {
            model: Certificado,
            as: 'certificado',
            attributes: ['id', 'nombre_certificado', 'tipo', 'numero_serie']
          }
        ],
        order: [['timestamp_firma', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: firmas.map(f => ({
          id: f.id,
          nombre_documento: f.nombre_documento,
          hash_documento: f.hash_documento,
          timestamp_firma: f.timestamp_firma,
          estado_firma: f.estado_firma,
          validez_legal: f.validez_legal,
          tipo_documento: f.tipo_documento,
          certificado: f.certificado,
          metadata: f.metadatos_externos
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo firmas:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }
);

// =====================================================
// ENDPOINT: Verificar firma
// =====================================================
/**
 * GET /api/laravel/signatures/:signatureId/verify
 *
 * Verifica el estado de una firma
 */
router.get('/signatures/:signatureId/verify',
  authenticateToken,
  requireServiceAccount,
  async (req, res) => {
    try {
      const { signatureId } = req.params;

      const signature = await Signature.findByPk(signatureId, {
        include: [
          {
            model: Certificado,
            as: 'certificado'
          },
          {
            model: Usuario,
            as: 'usuario',
            attributes: ['id', 'username', 'email']
          }
        ]
      });

      if (!signature) {
        return res.status(404).json({ error: 'Firma no encontrada' });
      }

      const verificacion = signature.verificarIntegridad();

      res.json({
        success: true,
        signature: {
          id: signature.id,
          hash_documento: signature.hash_documento,
          timestamp_firma: signature.timestamp_firma,
          estado_firma: signature.estado_firma,
          validez_legal: signature.validez_legal,
          laravel_user: {
            id: signature.laravel_user_id,
            email: signature.laravel_user_email,
            name: signature.laravel_user_name
          },
          verificacion,
          certificado: signature.certificado
        }
      });

    } catch (error) {
      console.error('❌ Error verificando firma:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }
);

// =====================================================
// ENDPOINT: Estadísticas de usuario Laravel
// =====================================================
/**
 * GET /api/laravel/users/:laravelUserId/stats
 *
 * Obtiene estadísticas de firmas de un usuario de Laravel
 */
router.get('/users/:laravelUserId/stats',
  authenticateToken,
  requireServiceAccount,
  async (req, res) => {
    try {
      const { laravelUserId } = req.params;

      const stats = await Signature.obtenerEstadisticasUsuario(parseInt(laravelUserId));

      res.json({
        success: true,
        laravel_user_id: parseInt(laravelUserId),
        statistics: stats
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }
);

// =====================================================
// ENDPOINT: Health check
// =====================================================
/**
 * GET /api/laravel/health
 *
 * Verificar que la integración esté funcionando
 */
router.get('/health', authenticateToken, requireServiceAccount, (req, res) => {
  res.json({
    success: true,
    message: 'Integración Laravel funcionando correctamente',
    service_user: req.user.username,
    timestamp: new Date().toISOString()
  });
});

export default router;
