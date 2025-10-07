import { UsuarioFirma, FirmaHistorial, Usuario } from '../models/index.js';
import FirmaService from '../services/FirmaService.js';

/**
 * Listar todas las firmas de un usuario específico (ADMIN)
 * GET /api/admin/usuarios/:id/firmas
 */
export const listarFirmasUsuario = async (req, res) => {
  try {
    const { id: usuarioId } = req.params;
    const { incluir_inactivas = false } = req.query;

    console.log(`=== LISTANDO FIRMAS PARA USUARIO ${usuarioId} ===`);

    // Verificar que el usuario existe
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Construir filtros
    const whereClause = { usuario_id: usuarioId };
    if (!incluir_inactivas) {
      whereClause.activa = true;
    }

    // Obtener firmas
    const firmas = await UsuarioFirma.findAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'subidaPor',
          attributes: ['id', 'nombre_completo', 'email']
        }
      ],
      order: [
        ['es_predeterminada', 'DESC'],
        ['fecha_subida', 'DESC']
      ]
    });

    // Formatear respuesta (sin incluir el buffer de imagen por performance)
    const firmasFormateadas = firmas.map(firma => ({
      id: firma.id,
      nombre: firma.firma_nombre,
      tipo: firma.firma_tipo,
      tamaño_archivo: firma.tamaño_archivo,
      dimensiones: {
        ancho: firma.ancho_pixels,
        alto: firma.alto_pixels
      },
      activa: firma.activa,
      es_predeterminada: firma.es_predeterminada,
      fecha_subida: firma.fecha_subida,
      subida_por: firma.subidaPor,
      metadatos: firma.metadatos
    }));

    res.json({
      usuario: {
        id: usuario.id,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email
      },
      firmas: firmasFormateadas,
      total: firmasFormateadas.length
    });

  } catch (error) {
    console.error('Error listando firmas de usuario:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};

/**
 * Subir nueva firma para usuario (ADMIN)
 * POST /api/admin/usuarios/:id/firmas
 */
export const subirFirmaUsuario = async (req, res) => {
  try {
    const { id: usuarioId } = req.params;
    const { nombre_firma, es_predeterminada = false } = req.body;

    console.log(`=== SUBIENDO FIRMA PARA USUARIO ${usuarioId} ===`);

    if (!req.file) {
      return res.status(400).json({ error: 'Debe proporcionar un archivo de imagen' });
    }

    // Verificar que el usuario existe
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Validar archivo
    const validacion = FirmaService.validarImagenFirma(req.file);
    if (!validacion.valido) {
      return res.status(400).json({ 
        error: 'Archivo inválido',
        detalles: validacion.errores 
      });
    }

    // Procesar imagen
    const imagenProcesada = await FirmaService.procesarImagen(
      req.file.buffer, 
      req.file.mimetype
    );

    // Crear registro en BD
    const nuevaFirma = await UsuarioFirma.create({
      usuario_id: usuarioId,
      firma_nombre: nombre_firma || req.file.originalname,
      firma_imagen: imagenProcesada.buffer,
      firma_tipo: imagenProcesada.tipo,
      tamaño_archivo: imagenProcesada.tamaño,
      ancho_pixels: imagenProcesada.ancho,
      alto_pixels: imagenProcesada.alto,
      es_predeterminada: es_predeterminada === 'true',
      subida_por: req.user.id,
      metadatos: {
        formato_original: req.file.mimetype,
        tamaño_original: req.file.size,
        procesada: true,
        fecha_procesamiento: new Date().toISOString()
      }
    });

    console.log(`✅ Firma creada con ID: ${nuevaFirma.id}`);

    res.status(201).json({
      message: 'Firma subida exitosamente',
      firma: {
        id: nuevaFirma.id,
        nombre: nuevaFirma.firma_nombre,
        tipo: nuevaFirma.firma_tipo,
        dimensiones: {
          ancho: nuevaFirma.ancho_pixels,
          alto: nuevaFirma.alto_pixels
        },
        es_predeterminada: nuevaFirma.es_predeterminada,
        fecha_subida: nuevaFirma.fecha_subida
      }
    });

  } catch (error) {
    console.error('Error subiendo firma:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};

/**
 * Obtener imagen de firma específica
 * GET /api/admin/usuarios/:id/firmas/:firmaId/imagen
 */
export const obtenerImagenFirma = async (req, res) => {
  try {
    const { id: usuarioId, firmaId } = req.params;

    const firma = await UsuarioFirma.findOne({
      where: {
        id: firmaId,
        usuario_id: usuarioId
      }
    });

    if (!firma) {
      return res.status(404).json({ error: 'Firma no encontrada' });
    }

    // Configurar headers para imagen
    res.set({
      'Content-Type': `image/${firma.firma_tipo}`,
      'Content-Length': firma.tamaño_archivo,
      'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
      'Content-Disposition': `inline; filename="${firma.firma_nombre}.${firma.firma_tipo}"`
    });

    res.send(firma.firma_imagen);

  } catch (error) {
    console.error('Error obteniendo imagen de firma:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};

/**
 * Establecer firma como predeterminada
 * PUT /api/admin/usuarios/:id/firmas/:firmaId/predeterminada
 */
export const establecerFirmaPredeterminada = async (req, res) => {
  try {
    const { id: usuarioId, firmaId } = req.params;

    console.log(`=== ESTABLECIENDO FIRMA ${firmaId} COMO PREDETERMINADA ===`);

    // Verificar que la firma existe y pertenece al usuario
    const firma = await UsuarioFirma.findOne({
      where: {
        id: firmaId,
        usuario_id: usuarioId,
        activa: true
      }
    });

    if (!firma) {
      return res.status(404).json({ error: 'Firma no encontrada o inactiva' });
    }

    // Usar método del modelo para establecer predeterminada
    await UsuarioFirma.establecerPredeterminada(firmaId, usuarioId);

    console.log(`✅ Firma ${firmaId} establecida como predeterminada`);

    res.json({
      message: 'Firma establecida como predeterminada',
      firma_id: firmaId
    });

  } catch (error) {
    console.error('Error estableciendo firma predeterminada:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};

/**
 * Eliminar firma de usuario
 * DELETE /api/admin/usuarios/:id/firmas/:firmaId
 */
export const eliminarFirma = async (req, res) => {
  try {
    const { id: usuarioId, firmaId } = req.params;

    console.log(`=== ELIMINANDO FIRMA ${firmaId} DEL USUARIO ${usuarioId} ===`);

    const firma = await UsuarioFirma.findOne({
      where: {
        id: firmaId,
        usuario_id: usuarioId
      }
    });

    if (!firma) {
      return res.status(404).json({ error: 'Firma no encontrada' });
    }

    // Si es la predeterminada, no permitir eliminar si hay otras firmas
    if (firma.es_predeterminada) {
      const otrasFirmas = await UsuarioFirma.count({
        where: {
          usuario_id: usuarioId,
          activa: true,
          id: { [UsuarioFirma.sequelize.Sequelize.Op.ne]: firmaId }
        }
      });

      if (otrasFirmas > 0) {
        return res.status(400).json({ 
          error: 'No se puede eliminar la firma predeterminada. Establezca otra como predeterminada primero.' 
        });
      }
    }

    // Marcar como inactiva en lugar de eliminar (para preservar historial)
    await firma.update({ activa: false });

    console.log(`✅ Firma ${firmaId} marcada como inactiva`);

    res.json({
      message: 'Firma eliminada exitosamente',
      firma_id: firmaId
    });

  } catch (error) {
    console.error('Error eliminando firma:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};

/**
 * Obtener firma del usuario autenticado (USUARIO NORMAL)
 * GET /api/usuarios/mi-firma
 */
export const obtenerMiFirma = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    console.log(`=== OBTENIENDO FIRMA DEL USUARIO ${usuarioId} ===`);

    // Buscar firma predeterminada
    const firmaPredeterminada = await UsuarioFirma.findFirmaPredeterminada(usuarioId);

    if (!firmaPredeterminada) {
      return res.json({
        tiene_firma: false,
        message: 'Usuario no tiene firma configurada'
      });
    }

    res.json({
      tiene_firma: true,
      firma: {
        id: firmaPredeterminada.id,
        nombre: firmaPredeterminada.firma_nombre,
        tipo: firmaPredeterminada.firma_tipo,
        dimensiones: {
          ancho: firmaPredeterminada.ancho_pixels,
          alto: firmaPredeterminada.alto_pixels
        },
        fecha_subida: firmaPredeterminada.fecha_subida
      }
    });

  } catch (error) {
    console.error('Error obteniendo mi firma:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};

/**
 * Subir mi firma (USUARIO NORMAL)
 * POST /api/usuarios/mi-firma
 */
export const subirMiFirma = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { nombre_firma } = req.body;

    console.log(`=== USUARIO ${usuarioId} SUBIENDO SU FIRMA ===`);

    if (!req.file) {
      return res.status(400).json({ error: 'Debe proporcionar un archivo de imagen' });
    }

    // Validar archivo
    const validacion = FirmaService.validarImagenFirma(req.file);
    if (!validacion.valido) {
      return res.status(400).json({ 
        error: 'Archivo inválido',
        detalles: validacion.errores 
      });
    }

    // Procesar imagen
    const imagenProcesada = await FirmaService.procesarImagen(
      req.file.buffer, 
      req.file.mimetype
    );

    // Verificar si ya tiene firma predeterminada
    const firmaExistente = await UsuarioFirma.findFirmaPredeterminada(usuarioId);
    const esPredeterminada = !firmaExistente; // Si no tiene, esta será la predeterminada

    // Crear registro en BD
    const nuevaFirma = await UsuarioFirma.create({
      usuario_id: usuarioId,
      firma_nombre: nombre_firma || req.file.originalname,
      firma_imagen: imagenProcesada.buffer,
      firma_tipo: imagenProcesada.tipo,
      tamaño_archivo: imagenProcesada.tamaño,
      ancho_pixels: imagenProcesada.ancho,
      alto_pixels: imagenProcesada.alto,
      es_predeterminada: esPredeterminada,
      subida_por: usuarioId, // Usuario subió su propia firma
      metadatos: {
        formato_original: req.file.mimetype,
        tamaño_original: req.file.size,
        procesada: true,
        subida_por_usuario: true,
        fecha_procesamiento: new Date().toISOString()
      }
    });

    console.log(`✅ Usuario subió su firma con ID: ${nuevaFirma.id}`);

    res.status(201).json({
      message: 'Firma subida exitosamente',
      firma: {
        id: nuevaFirma.id,
        nombre: nuevaFirma.firma_nombre,
        tipo: nuevaFirma.firma_tipo,
        dimensiones: {
          ancho: nuevaFirma.ancho_pixels,
          alto: nuevaFirma.alto_pixels
        },
        es_predeterminada: nuevaFirma.es_predeterminada,
        fecha_subida: nuevaFirma.fecha_subida
      }
    });

  } catch (error) {
    console.error('Error subiendo mi firma:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};