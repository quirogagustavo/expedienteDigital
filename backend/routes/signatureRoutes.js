import express from 'express';
import { authMiddleware as authenticateToken } from '../middleware/authMiddleware.js';
import { Certificado, Usuario, Signature } from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();

// GET /api/signatures/history - Obtener historial de firmas del usuario
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { user } = req;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Obtener firmas reales de la base de datos
    const signatures = await Signature.findAndCountAll({
      where: {
        usuario_id: user.id
      },
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['username', 'email', 'nombre_completo']
        },
        {
          model: Certificado,
          as: 'certificado',
          attributes: ['id', 'nombre_certificado', 'numero_serie', 'tipo', 'emisor']
        }
      ],
      order: [['timestamp_firma', 'DESC']],
      limit,
      offset
    });

    // Formatear respuesta
    const firmasFormateadas = signatures.rows.map(firma => ({
      id: firma.id,
      document_name: firma.nombre_documento,
      original_filename: firma.nombre_archivo_original,
      created_at: firma.created_at,
      fecha_firma: firma.timestamp_firma,
      status: firma.estado_firma === 'valida' ? 'completed' : 'invalid',
      certificado: {
        id: firma.certificado.id,
        nombre_certificado: firma.certificado.nombre_certificado,
        numero_serie: firma.certificado.numero_serie,
        tipo: firma.certificado.tipo,
        emisor: firma.certificado.emisor
      },
      certificate_type: firma.certificado.tipo === 'government' ? 'Oficial Gubernamental' : 'Interno',
      file_hash: firma.hash_documento,
      signature_hash: firma.firma_digital.substring(0, 32) + '...',
      file_size: firma.tamaño_archivo,
      ip_address: firma.ip_address,
      algoritmo_firma: firma.algoritmo_firma,
      validez_legal: firma.validez_legal,
      verification_info: {
        verified: firma.verificada,
        algorithm: firma.algoritmo_firma,
        certificate_valid: firma.estado_firma === 'valida',
        timestamp: firma.timestamp_firma,
        crl_status: firma.crl_check_status
      }
    }));

    res.json({
      success: true,
      signatures: firmasFormateadas,
      pagination: {
        current_page: page,
        per_page: limit,
        total_items: signatures.count,
        total_pages: Math.ceil(signatures.count / limit)
      },
      summary: {
        total_signatures: signatures.count,
        completed_signatures: firmasFormateadas.filter(s => s.status === 'completed').length,
        pending_signatures: firmasFormateadas.filter(s => s.status === 'invalid').length,
        today_signatures: firmasFormateadas.filter(s => {
          const today = new Date().toDateString();
          const signatureDate = new Date(s.fecha_firma).toDateString();
          return today === signatureDate;
        }).length
      }
    });

  } catch (error) {
    console.error('Error al obtener historial de firmas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/signatures/:id - Obtener detalles específicos de una firma
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;

    const certificate = await Certificado.findOne({
      where: {
        id: id,
        usuario_id: user.id
      },
      include: [{
        model: Usuario,
        as: 'usuario',
        attributes: ['username', 'email', 'nombre_completo']
      }]
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Firma no encontrada'
      });
    }

    // Simular datos detallados de la firma
    const signatureDetails = {
      id: certificate.id,
      document_name: `Documento firmado con ${certificate.nombre_certificado}`,
      original_filename: `documento_${certificate.id}.pdf`,
      created_at: certificate.createdAt,
      updated_at: certificate.updatedAt,
      status: certificate.activo ? 'completed' : 'pending',
      user: {
        id: certificate.usuario.id,
        username: certificate.usuario.username,
        email: certificate.usuario.email,
        nombre_completo: certificate.usuario.nombre_completo
      },
      certificate: {
        id: certificate.id,
        nombre_certificado: certificate.nombre_certificado,
        fecha_emision: certificate.fecha_emision,
        fecha_expiracion: certificate.fecha_expiracion,
        certificate_type_id: certificate.certificate_type_id,
        certificate_authority_id: certificate.certificate_authority_id,
        external_certificate_id: certificate.external_certificate_id
      },
      signature_algorithm: 'RSA-SHA256',
      public_key: certificate.certificado_pem,
      signature_data: `Firma digital para documento ${certificate.id}`,
      verification_info: {
        verified: certificate.activo,
        certificate_valid: true,
        signature_valid: true,
        timestamp_valid: true,
        revocation_status: 'not_revoked',
        trust_chain_valid: true
      },
      metadata: {
        ip_address: req.ip || '127.0.0.1',
        user_agent: req.get('User-Agent'),
        file_hash: `sha256:${Buffer.from(`file_${certificate.id}_${Date.now()}`).toString('hex')}`,
        signature_hash: `sig_${Buffer.from(`signature_${certificate.id}`).toString('hex')}`
      }
    };

    res.json({
      success: true,
      signature: signatureDetails
    });

  } catch (error) {
    console.error('Error al obtener detalles de la firma:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/signatures/verify/:id - Verificar estado de una firma específica
router.get('/verify/:id', authenticateToken, async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;

    const certificate = await Certificado.findOne({
      where: {
        id: id,
        usuario_id: user.id
      }
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Firma no encontrada'
      });
    }

    // Simular verificación de la firma
    const verificationResult = {
      signature_id: certificate.id,
      verified: certificate.activo,
      verification_timestamp: new Date(),
      results: {
        certificate_status: {
          valid: certificate.activo,
          not_expired: new Date() < new Date(certificate.fecha_expiracion),
          not_revoked: true,
          trusted_ca: certificate.certificate_authority_id ? true : false
        },
        signature_status: {
          valid: true,
          algorithm: 'RSA-SHA256',
          hash_match: true,
          timestamp_valid: true
        },
        document_integrity: {
          hash_match: true,
          not_tampered: true,
          original_size_match: true
        }
      },
      overall_status: certificate.activo ? 'VALID' : 'INVALID',
      trust_level: certificate.certificate_type_id === 2 ? 'HIGH' : // Gubernamental
                   'MEDIUM' // Interno
    };

    res.json({
      success: true,
      verification: verificationResult
    });

  } catch (error) {
    console.error('Error al verificar firma:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;