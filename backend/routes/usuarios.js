import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Certificado } from '../models/index.js';

const router = express.Router();

// Obtener firma manuscrita del usuario
router.get('/mi-firma', authenticateToken, async (req, res) => {
  try {
    // Por ahora retornamos una respuesta vacía pero válida
    res.json({ firma: null, certificados: [] });
  } catch (error) {
    console.error('Error obteniendo firma del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Obtener firma digital del usuario
router.get('/mi-firma-digital', authenticateToken, async (req, res) => {
  try {
    // Por ahora retornamos una respuesta vacía pero válida
    res.json({ firma: null });
  } catch (error) {
    console.error('Error obteniendo firma digital del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Obtener certificados del usuario autenticado
console.log('[ROUTE] GET /api/usuarios/mis-certificados');
router.get('/mis-certificados', authenticateToken, async (req, res) => {
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

    // Calcular estado de cada certificado
    const certificadosConEstado = certificados.map(cert => {
      const ahora = new Date();
      const diasParaVencer = Math.ceil((cert.fecha_expiracion - ahora) / (1000 * 60 * 60 * 24));
      
      let estado = 'vigente';
      if (cert.fecha_expiracion < ahora) estado = 'vencido';
      else if (diasParaVencer <= 30) estado = 'por_vencer';
      else if (!cert.activo) estado = 'inactivo';

      // Log para debuggear el estado calculado
      console.log('ESTADO CERTIFICADO:', {
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

    res.json({ certificados: certificadosConEstado, total: certificadosConEstado.length });
  } catch (error) {
    console.error('Error obteniendo certificados del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Ruta pública para desarrollo - obtener todos los certificados sin autenticación
router.get('/certificados-publicos', async (req, res) => {
  try {
    console.log('[ROUTE] GET /api/usuarios/certificados-publicos - SIN AUTENTICACIÓN');
    
    const certificados = await Certificado.findAll({
      attributes: [
        'id',
        'nombre_certificado',
        'tipo',
        'numero_serie',
        'fecha_emision',
        'fecha_expiracion',
        'activo',
        'status',
        'emisor'
      ],
      order: [['fecha_emision', 'DESC']]
    });

    // Calcular estado de cada certificado
    const certificadosConEstado = certificados.map(cert => {
      const ahora = new Date();
      const diasParaVencer = Math.ceil((cert.fecha_expiracion - ahora) / (1000 * 60 * 60 * 24));
      
      let estado = 'vigente';
      if (cert.fecha_expiracion < ahora) estado = 'vencido';
      else if (diasParaVencer <= 30) estado = 'por_vencer';

      return {
        ...cert.toJSON(),
        diasParaVencer,
        estado,
        activo: cert.activo && diasParaVencer > 0
      };
    });

    console.log('ESTADO CERTIFICADO:', {
      total: certificadosConEstado.length,
      vigentes: certificadosConEstado.filter(c => c.estado === 'vigente').length
    });

    res.json({ certificados: certificadosConEstado, total: certificadosConEstado.length });
  } catch (error) {
    console.error('Error obteniendo certificados públicos:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

export default router;
