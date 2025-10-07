import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { verificarAccesoAdministrador } from '../middleware/oficinasAuth.js';
import {
  listarFirmasUsuario,
  subirFirmaUsuario,
  obtenerImagenFirma,
  establecerFirmaPredeterminada,
  eliminarFirma,
  obtenerMiFirma,
  subirMiFirma
} from '../controllers/firmasController.js';

const router = express.Router();

// Configurar multer para upload de imágenes de firma
const storage = multer.memoryStorage(); // Almacenar en memoria para procesamiento

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Validar tipos de archivo permitidos
    const allowedTypes = /jpeg|jpg|png|svg/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (PNG, JPG, SVG)'));
    }
  }
});

// Middleware para verificar rol de administrador
const verificarAdmin = async (req, res, next) => {
  try {
    if (req.user.rol_usuario !== 'administrador') {
      return res.status(403).json({ 
        error: 'Acceso denegado. Se requieren permisos de administrador.' 
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error verificando permisos' });
  }
};

// ========================================
// RUTAS PARA ADMINISTRADORES
// ========================================

/**
 * @route GET /api/admin/usuarios/:id/firmas
 * @desc Listar todas las firmas de un usuario específico
 * @access Admin
 */
router.get(
  '/admin/usuarios/:id/firmas',
  authenticateToken,
  verificarAdmin,
  listarFirmasUsuario
);

/**
 * @route POST /api/admin/usuarios/:id/firmas
 * @desc Subir nueva firma para un usuario
 * @access Admin
 */
router.post(
  '/admin/usuarios/:id/firmas',
  authenticateToken,
  verificarAdmin,
  upload.single('firma'),
  subirFirmaUsuario
);

/**
 * @route GET /api/admin/usuarios/:id/firmas/:firmaId/imagen
 * @desc Obtener imagen de una firma específica
 * @access Admin
 */
router.get(
  '/admin/usuarios/:id/firmas/:firmaId/imagen',
  authenticateToken,
  verificarAdmin,
  obtenerImagenFirma
);

/**
 * @route PUT /api/admin/usuarios/:id/firmas/:firmaId/predeterminada
 * @desc Establecer una firma como predeterminada para el usuario
 * @access Admin
 */
router.put(
  '/admin/usuarios/:id/firmas/:firmaId/predeterminada',
  authenticateToken,
  verificarAdmin,
  establecerFirmaPredeterminada
);

/**
 * @route DELETE /api/admin/usuarios/:id/firmas/:firmaId
 * @desc Eliminar (desactivar) una firma de usuario
 * @access Admin
 */
router.delete(
  '/admin/usuarios/:id/firmas/:firmaId',
  authenticateToken,
  verificarAdmin,
  eliminarFirma
);

// ========================================
// RUTAS PARA USUARIOS NORMALES
// ========================================

/**
 * @route GET /api/usuarios/mi-firma
 * @desc Obtener la firma predeterminada del usuario autenticado
 * @access Usuario autenticado
 */
router.get(
  '/usuarios/mi-firma',
  authenticateToken,
  obtenerMiFirma
);

/**
 * @route POST /api/usuarios/mi-firma
 * @desc Subir firma propia del usuario autenticado
 * @access Usuario autenticado
 */
router.post(
  '/usuarios/mi-firma',
  authenticateToken,
  upload.single('firma'),
  subirMiFirma
);

/**
 * @route POST /api/usuarios/generar-firma-digital
 * @desc Generar firma digital automática para el usuario
 * @access Usuario autenticado
 */
router.post('/usuarios/generar-firma-digital', authenticateToken, async (req, res) => {
  try {
    const { texto, estilo = 'elegante' } = req.body;
    const usuarioId = req.user.id;

    console.log(`=== GENERANDO FIRMA DIGITAL PARA USUARIO ${usuarioId} ===`);

    // Usar nombre del usuario si no se proporciona texto
    const textoFirma = texto || req.user.nombre_completo;

    // Importar servicio de firma digital
    const { default: FirmaDigitalService } = await import('../services/FirmaDigitalService.js');

    // Validar parámetros
    const validacion = FirmaDigitalService.validarParametrosFirma(textoFirma, estilo);
    if (!validacion.valido) {
      return res.status(400).json({ 
        error: 'Parámetros inválidos',
        detalles: validacion.errores 
      });
    }

    // Generar firma digital
    const firmaGenerada = await FirmaDigitalService.generarFirmaAutomatica(textoFirma, estilo);

    // Importar modelo
    const { UsuarioFirma } = await import('../models/index.js');

    // Verificar si ya tiene firma digital generada
    const firmaExistente = await UsuarioFirma.findOne({
      where: {
        usuario_id: usuarioId,
        'metadatos.generada_automaticamente': true,
        activa: true
      }
    });

    if (firmaExistente) {
      // Actualizar firma existente
      await firmaExistente.update({
        firma_imagen: firmaGenerada.buffer,
        firma_tipo: firmaGenerada.tipo,
        tamaño_archivo: firmaGenerada.tamaño,
        ancho_pixels: firmaGenerada.dimensiones.ancho,
        alto_pixels: firmaGenerada.dimensiones.alto,
        metadatos: {
          ...firmaGenerada.metadatos,
          actualizada: new Date().toISOString()
        }
      });

      console.log(`✅ Firma digital actualizada para usuario ${usuarioId}`);

      return res.json({
        message: 'Firma digital regenerada exitosamente',
        firma: {
          id: firmaExistente.id,
          nombre: `Firma Digital - ${textoFirma}`,
          tipo: firmaGenerada.tipo,
          dimensiones: firmaGenerada.dimensiones,
          es_predeterminada: firmaExistente.es_predeterminada,
          fecha_subida: firmaExistente.fecha_subida
        }
      });
    } else {
      // Crear nueva firma digital
      const nuevaFirma = await UsuarioFirma.create({
        usuario_id: usuarioId,
        firma_nombre: `Firma Digital - ${textoFirma}`,
        firma_imagen: firmaGenerada.buffer,
        firma_tipo: firmaGenerada.tipo,
        tamaño_archivo: firmaGenerada.tamaño,
        ancho_pixels: firmaGenerada.dimensiones.ancho,
        alto_pixels: firmaGenerada.dimensiones.alto,
        es_predeterminada: false, // No establecer como predeterminada automáticamente
        subida_por: usuarioId,
        metadatos: firmaGenerada.metadatos
      });

      console.log(`✅ Nueva firma digital generada con ID: ${nuevaFirma.id}`);

      return res.status(201).json({
        message: 'Firma digital generada exitosamente',
        firma: {
          id: nuevaFirma.id,
          nombre: nuevaFirma.firma_nombre,
          tipo: nuevaFirma.firma_tipo,
          dimensiones: firmaGenerada.dimensiones,
          es_predeterminada: nuevaFirma.es_predeterminada,
          fecha_subida: nuevaFirma.fecha_subida
        }
      });
    }

  } catch (error) {
    console.error('Error generando firma digital:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/usuarios/mi-firma-digital
 * @desc Obtener la firma digital generada del usuario
 * @access Usuario autenticado
 */
router.get('/usuarios/mi-firma-digital', authenticateToken, async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const { UsuarioFirma } = await import('../models/index.js');

    const firmaDigital = await UsuarioFirma.findOne({
      where: {
        usuario_id: usuarioId,
        'metadatos.generada_automaticamente': true,
        activa: true
      }
    });

    if (!firmaDigital) {
      return res.json({
        tiene_firma: false,
        message: 'Usuario no tiene firma digital generada'
      });
    }

    res.json({
      tiene_firma: true,
      firma: {
        id: firmaDigital.id,
        nombre: firmaDigital.firma_nombre,
        tipo: firmaDigital.firma_tipo,
        dimensiones: {
          ancho: firmaDigital.ancho_pixels,
          alto: firmaDigital.alto_pixels
        },
        fecha_subida: firmaDigital.fecha_subida,
        metadatos: firmaDigital.metadatos
      }
    });

  } catch (error) {
    console.error('Error obteniendo firma digital:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/usuarios/mi-firma-digital/imagen
 * @desc Obtener imagen de la firma digital del usuario
 * @access Usuario autenticado
 */
router.get('/usuarios/mi-firma-digital/imagen', authenticateToken, async (req, res) => {
  try {
    const { UsuarioFirma } = await import('../models/index.js');
    
    const firmaDigital = await UsuarioFirma.findOne({
      where: {
        usuario_id: req.user.id,
        'metadatos.generada_automaticamente': true,
        activa: true
      }
    });
    
    if (!firmaDigital) {
      return res.status(404).json({ error: 'Usuario no tiene firma digital generada' });
    }

    // Configurar headers para imagen
    res.set({
      'Content-Type': `image/${firmaDigital.firma_tipo}`,
      'Content-Length': firmaDigital.tamaño_archivo,
      'Cache-Control': 'public, max-age=3600',
      'Content-Disposition': `inline; filename="firma_digital.${firmaDigital.firma_tipo}"`
    });

    res.send(firmaDigital.firma_imagen);

  } catch (error) {
    console.error('Error obteniendo imagen de firma digital:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @route DELETE /api/usuarios/mi-firma-digital/:id
 * @desc Eliminar firma digital del usuario
 * @access Usuario autenticado
 */
router.delete('/usuarios/mi-firma-digital/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.id;

    const { UsuarioFirma } = await import('../models/index.js');

    const firmaDigital = await UsuarioFirma.findOne({
      where: {
        id: id,
        usuario_id: usuarioId,
        'metadatos.generada_automaticamente': true
      }
    });

    if (!firmaDigital) {
      return res.status(404).json({ error: 'Firma digital no encontrada' });
    }

    // Marcar como inactiva
    await firmaDigital.update({ activa: false });

    res.json({
      message: 'Firma digital eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando firma digital:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/usuarios/mi-firma/imagen
 * @desc Obtener imagen de la firma del usuario autenticado
 * @access Usuario autenticado
 */
router.get('/usuarios/mi-firma/imagen', authenticateToken, async (req, res) => {
  try {
    const { UsuarioFirma } = await import('../models/index.js');
    
    const firma = await UsuarioFirma.findFirmaPredeterminada(req.user.id);
    
    if (!firma) {
      return res.status(404).json({ error: 'Usuario no tiene firma configurada' });
    }

    // Configurar headers para imagen
    res.set({
      'Content-Type': `image/${firma.firma_tipo}`,
      'Content-Length': firma.tamaño_archivo,
      'Cache-Control': 'public, max-age=3600',
      'Content-Disposition': `inline; filename="mi_firma.${firma.firma_tipo}"`
    });

    res.send(firma.firma_imagen);

  } catch (error) {
    console.error('Error obteniendo mi imagen de firma:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @route DELETE /api/usuarios/mi-firma/:id
 * @desc Eliminar mi firma manuscrita
 * @access Usuario autenticado
 */
router.delete('/usuarios/mi-firma/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.id;

    const { UsuarioFirma } = await import('../models/index.js');

    const firma = await UsuarioFirma.findOne({
      where: {
        id: id,
        usuario_id: usuarioId,
        'metadatos.generada_automaticamente': { [UsuarioFirma.sequelize.Sequelize.Op.ne]: true }
      }
    });

    if (!firma) {
      return res.status(404).json({ error: 'Firma manuscrita no encontrada' });
    }

    // Marcar como inactiva
    await firma.update({ activa: false });

    res.json({
      message: 'Firma manuscrita eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando firma manuscrita:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// ========================================
// RUTAS DE UTILIDAD
// ========================================

/**
 * @route GET /api/firmas/tipos-permitidos
 * @desc Obtener tipos de archivo permitidos para firmas
 * @access Público (para usuarios autenticados)
 */
router.get('/firmas/tipos-permitidos', authenticateToken, (req, res) => {
  res.json({
    tipos_permitidos: ['png', 'jpg', 'jpeg', 'svg'],
    tamaño_maximo: '5MB',
    dimensiones_recomendadas: {
      ancho_maximo: 800,
      alto_maximo: 200
    },
    formatos_recomendados: [
      'PNG con fondo transparente para mejor calidad',
      'JPG para archivos más pequeños',
      'SVG para firmas vectoriales escalables'
    ]
  });
});

/**
 * @route POST /api/firmas/validar
 * @desc Validar un archivo de firma sin subirlo
 * @access Usuario autenticado
 */
router.post('/firmas/validar', authenticateToken, upload.single('firma'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Debe proporcionar un archivo' });
    }

    const { default: FirmaService } = await import('../services/FirmaService.js');
    
    const validacion = FirmaService.validarImagenFirma(req.file);
    
    if (validacion.valido) {
      // Si es válido, procesar para obtener información
      const imagenProcesada = await FirmaService.procesarImagen(
        req.file.buffer, 
        req.file.mimetype
      );

      res.json({
        valido: true,
        archivo_original: {
          nombre: req.file.originalname,
          tamaño: req.file.size,
          tipo: req.file.mimetype
        },
        archivo_procesado: {
          tamaño: imagenProcesada.tamaño,
          dimensiones: {
            ancho: imagenProcesada.ancho,
            alto: imagenProcesada.alto
          },
          tipo_final: imagenProcesada.tipo
        },
        recomendaciones: []
      });
    } else {
      res.status(400).json({
        valido: false,
        errores: validacion.errores
      });
    }

  } catch (error) {
    console.error('Error validando firma:', error);
    res.status(500).json({ 
      error: 'Error validando archivo',
      details: error.message 
    });
  }
});

// Middleware de manejo de errores específico para multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'Archivo demasiado grande. Máximo 5MB permitido.' 
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Solo se permite un archivo por vez.' 
      });
    }
  }
  
  if (error.message.includes('Solo se permiten archivos de imagen')) {
    return res.status(400).json({ 
      error: error.message 
    });
  }
  
  next(error);
});

export default router;