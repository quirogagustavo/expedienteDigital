import express from 'express';
import { ExpedienteDocumento, Expediente, FirmaBatch, Signature, Usuario } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Firmar documento individual
router.post('/:id/firmar', authenticateToken, async (req, res) => {
  try {
    const { signatureData, certificateData } = req.body;
    
    const documento = await ExpedienteDocumento.findByPk(req.params.id, {
      include: [
        {
          model: Expediente,
          as: 'expediente',
          where: { usuario_creador: req.user.id }
        }
      ]
    });
    
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    
    if (documento.estado_firma === 'firmado') {
      return res.status(400).json({ error: 'El documento ya está firmado' });
    }
    
    // Crear registro de firma
    const signature = await Signature.create({
      document_hash: documento.hash_documento,
      signature_data: signatureData,
      signer_name: req.user.name,
      signer_email: req.user.email,
      certificate_data: certificateData,
      user_id: req.user.id
    });
    
    // Actualizar documento
    await documento.update({
      estado_firma: 'firmado',
      signature_id: signature.id,
      fecha_firma: new Date()
    });
    
    res.json({
      documento: await documento.reload({
        include: [
          {
            model: Signature,
            as: 'signature',
            attributes: ['id', 'timestamp', 'signer_name']
          }
        ]
      }),
      message: 'Documento firmado exitosamente'
    });
  } catch (error) {
    console.error('Error firmando documento:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Firma batch de expediente
router.post('/batch/:expedienteId', authenticateToken, async (req, res) => {
  try {
    const { signatureData, certificateData, tipoFirma = 'batch' } = req.body;
    
    const expediente = await Expediente.findOne({
      where: {
        id: req.params.expedienteId,
        usuario_creador: req.user.id
      },
      include: [
        {
          model: ExpedienteDocumento,
          as: 'documentos',
          where: { estado_firma: 'pendiente' }
        }
      ]
    });
    
    if (!expediente) {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }
    
    if (!expediente.documentos || expediente.documentos.length === 0) {
      return res.status(400).json({ error: 'No hay documentos pendientes de firma' });
    }
    
    // Generar hash combinado de todos los documentos
    const hashes = expediente.documentos.map(doc => doc.hash_documento).sort();
    const hashCombinado = crypto.createHash('sha256')
      .update(hashes.join(''))
      .digest('hex');
    
    // Generar ID único para el batch
    const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Crear registro de firma batch
    const firmaBatch = await FirmaBatch.create({
      batch_id: batchId,
      expediente_id: req.params.expedienteId,
      usuario_firmante: req.user.id,
      tipo_firma: tipoFirma,
      signature_data: signatureData,
      hash_combinado: hashCombinado,
      cantidad_documentos: expediente.documentos.length,
      datos_firmante: {
        name: req.user.name,
        email: req.user.email,
        timestamp: new Date().toISOString()
      },
      certificado_usado: certificateData?.id || null
    });
    
    // Crear firmas individuales para cada documento
    const firmasIndividuales = await Promise.all(
      expediente.documentos.map(async (doc) => {
        const signature = await Signature.create({
          document_hash: doc.hash_documento,
          signature_data: signatureData,
          signer_name: req.user.name,
          signer_email: req.user.email,
          certificate_data: certificateData,
          user_id: req.user.id,
          batch_id: batchId
        });
        
        await doc.update({
          estado_firma: 'firmado',
          signature_id: signature.id,
          fecha_firma: new Date()
        });
        
        return signature;
      })
    );
    
    // Actualizar estado del expediente
    await expediente.update({ estado: 'en_proceso' });
    
    res.json({
      firmaBatch,
      documentosFirmados: firmasIndividuales.length,
      expediente: await expediente.reload({
        include: [
          {
            model: ExpedienteDocumento,
            as: 'documentos',
            include: [
              {
                model: Signature,
                as: 'signature',
                attributes: ['id', 'timestamp', 'signer_name', 'batch_id']
              }
            ]
          }
        ]
      }),
      message: `Expediente firmado en batch. ${firmasIndividuales.length} documentos firmados.`
    });
  } catch (error) {
    console.error('Error en firma batch:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Verificar firma de documento
router.get('/:id/verificar', authenticateToken, async (req, res) => {
  try {
    const documento = await ExpedienteDocumento.findByPk(req.params.id, {
      include: [
        {
          model: Signature,
          as: 'signature'
        },
        {
          model: Expediente,
          as: 'expediente',
          include: [
            {
              model: FirmaBatch,
              as: 'firmasBatch',
              where: { usuario_firmante: req.user.id },
              required: false
            }
          ]
        }
      ]
    });
    
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    
    if (!documento.signature) {
      return res.status(400).json({ error: 'Documento no firmado' });
    }
    
    const verificacion = {
      documento_id: documento.id,
      nombre_archivo: documento.nombre_archivo,
      estado_firma: documento.estado_firma,
      fecha_firma: documento.fecha_firma,
      firmante: {
        name: documento.signature.signer_name,
        email: documento.signature.signer_email
      },
      hash_documento: documento.hash_documento,
      signature_timestamp: documento.signature.timestamp,
      es_firma_batch: !!documento.signature.batch_id,
      batch_info: documento.signature.batch_id ? {
        batch_id: documento.signature.batch_id,
        firma_batch: documento.expediente.firmasBatch?.find(
          fb => fb.batch_id === documento.signature.batch_id
        )
      } : null
    };
    
    res.json({
      verificacion,
      valida: true,
      message: 'Firma verificada correctamente'
    });
  } catch (error) {
    console.error('Error verificando firma:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Obtener historial de firmas del expediente
router.get('/expediente/:expedienteId/historial', authenticateToken, async (req, res) => {
  try {
    const expediente = await Expediente.findOne({
      where: {
        id: req.params.expedienteId,
        usuario_creador: req.user.id
      },
      include: [
        {
          model: ExpedienteDocumento,
          as: 'documentos',
          include: [
            {
              model: Signature,
              as: 'signature'
            }
          ]
        },
        {
          model: FirmaBatch,
          as: 'firmasBatch',
          include: [
            {
              model: Usuario,
              as: 'firmante',
              attributes: ['id', 'nombre_completo', 'email']
            }
          ]
        }
      ]
    });
    
    if (!expediente) {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }
    
    const historial = {
      expediente_id: expediente.id,
      numero_expediente: expediente.numero_expediente,
      estado: expediente.estado,
      firmas_individuales: expediente.documentos
        .filter(doc => doc.signature && !doc.signature.batch_id)
        .map(doc => ({
          documento_id: doc.id,
          nombre_archivo: doc.nombre_archivo,
          numero_foja: doc.numero_foja,
          firmante: doc.signature.signer_name,
          fecha_firma: doc.signature.timestamp
        })),
      firmas_batch: expediente.firmasBatch.map(batch => ({
        batch_id: batch.batch_id,
        tipo_firma: batch.tipo_firma,
        firmante: batch.firmante.name,
        cantidad_documentos: batch.cantidad_documentos,
        fecha_firma: batch.timestamp_firma
      }))
    };
    
    res.json({ historial });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

export default router;