import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Expediente, ExpedienteDocumento, FirmaBatch, Usuario, Signature, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import { authenticateToken } from '../middleware/auth.js';
import { verificarAccesoAdministrador, verificarAccesoExpediente } from '../middleware/oficinasAuth.js';
//import { Op } from 'sequelize';
import { generateSignedPDF } from '../utils/pdfSigner.js';
import { contarPaginasPDF, calcularSiguienteFoja, calcularRangoFojas } from '../utils/pdfUtils.js';

const router = express.Router();

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/documentos';
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  },
  fileFilter: function (req, file, cb) {
    // Validar tipos de archivo permitidos
    const allowedTypes = /pdf|doc|docx|png|jpg|jpeg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF, DOC, DOCX, PNG, JPG, JPEG'));
    }
  }
});

// Crear nuevo expediente
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('=== CREAR EXPEDIENTE ===');
    console.log('Usuario autenticado:', req.user);
    console.log('Body recibido:', req.body);
    
    const { titulo, descripcion, reparticion, estado = 'borrador', prioridad = 'normal', metadatos = {} } = req.body;
    
    console.log('Datos a procesar:', { titulo, descripcion, reparticion, estado, prioridad, metadatos });
    
    // Generar número de expediente único
    const year = new Date().getFullYear();
    const lastExpediente = await Expediente.findOne({
      where: {
        numero_expediente: {
          [Op.like]: `${year}%`
        }
      },
      order: [['numero_expediente', 'DESC']]
    });
    
    let numeroSecuencial = 1;
    if (lastExpediente) {
      const lastNumber = parseInt(lastExpediente.numero_expediente.split('-')[1]);
      numeroSecuencial = lastNumber + 1;
    }
    
    const numeroExpediente = `${year}-${numeroSecuencial.toString().padStart(6, '0')}`;
    
    console.log('Número de expediente generado:', numeroExpediente);
    
    const expediente = await Expediente.create({
      numero_expediente: numeroExpediente,
      titulo,
      descripcion,
      reparticion,
      estado,
      prioridad,
      metadatos,
      usuario_responsable: req.user.id,
      oficina_actual_id: req.user.oficina_id
    });
    
    console.log('Expediente creado:', expediente.toJSON());
    
    const expedienteCompleto = await Expediente.findByPk(expediente.id, {
      include: [
        {
          model: Usuario,
          as: 'responsable',
          attributes: ['id', 'nombre_completo', 'email']
        }
      ]
    });
    
    console.log('Expediente completo:', expedienteCompleto?.toJSON());
    
    res.status(201).json({
      expediente: expedienteCompleto,
      message: 'Expediente creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando expediente:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Obtener expedientes del usuario
router.get('/', authenticateToken, verificarAccesoAdministrador, async (req, res) => {
  try {
    console.log('=== OBTENIENDO EXPEDIENTES ===');
    console.log('Usuario autenticado:', req.user);
    
    const { estado, prioridad, page = 1, limit = 10 } = req.query;
    
    console.log('Parámetros recibidos:', { estado, prioridad, page, limit });
    
    const whereClause = {};
    
    // Si es administrador, puede ver todos los expedientes
    if (!req.user.esAdministrador) {
      // Si no es administrador, solo puede ver expedientes de su oficina
      whereClause.oficina_actual_id = req.user.oficina_id;
    }
    
    if (estado) whereClause.estado = estado;
    if (prioridad) whereClause.prioridad = prioridad;
    
  console.log('Cláusula WHERE:', whereClause);
  console.log('Usuario actual:', req.user.id, 'Oficina usuario:', req.user.oficina_id);
    
    const offset = (page - 1) * limit;
    
    const { count, rows: expedientes } = await Expediente.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'responsable',
          attributes: ['id', 'nombre_completo', 'email']
        },
        {
          model: ExpedienteDocumento,
          as: 'documentos',
          attributes: ['id', 'numero_foja', 'documento_nombre', 'estado_firma']
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit: parseInt(limit)
    });
    
    console.log('Expedientes encontrados:', expedientes.length);
    console.log('Total de expedientes:', count);
    
    res.json({
      expedientes,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo expedientes:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Obtener detalles completos del expediente con firmas (DEBE IR ANTES QUE /:id)
router.get('/:id/firmas', authenticateToken, async (req, res) => {
  try {
    console.log('=== OBTENIENDO DETALLES DE FIRMAS ===');
    console.log('Expediente ID:', req.params.id);
    console.log('Usuario solicitante:', req.user ? req.user.id : 'NO AUTENTICADO');
    
    if (!req.user) {
      console.log('ERROR: Usuario no autenticado');
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    // Buscar el expediente con documentos y detalles de firma
    const expediente = await Expediente.findOne({
      where: {
        id: req.params.id,
        // Permitir si es responsable o si está en la misma oficina
        [Op.or]: [
          { usuario_responsable: req.user.id },
          { oficina_actual_id: req.user.oficina_id }
        ]
      },
      include: [
        {
          model: Usuario,
          as: 'responsable',
          attributes: ['id', 'nombre_completo', 'email', 'rol_usuario']
        },
        {
          model: ExpedienteDocumento,
          as: 'documentos',
          include: [
            {
              model: Usuario,
              as: 'firmante',
              attributes: ['id', 'nombre_completo', 'email'],
              required: false
            }
          ]
        }
      ]
    });
    if (expediente) {
      console.log('DEBUG: usuario.oficina_id =', req.user.oficina_id, 'expediente.oficina_actual_id =', expediente.oficina_actual_id);
    } else {
      console.log('DEBUG: No se encontró expediente. usuario.oficina_id =', req.user.oficina_id);
    }
    
    console.log('Expediente encontrado:', expediente ? 'SÍ' : 'NO');
    
    if (!expediente) {
      console.log('ERROR: Expediente no encontrado o sin permisos');
      return res.status(404).json({ error: 'Expediente no encontrado o sin permisos' });
    }
    
    // Formatear la respuesta con detalles de firma
    const expedienteConFirmas = {
      id: expediente.id,
      numero_expediente: expediente.numero_expediente,
      titulo: expediente.titulo,
      descripcion: expediente.descripcion,
      estado: expediente.estado,
      tipo_expediente: expediente.tipo_expediente,
      prioridad: expediente.prioridad,
      fecha_creacion: expediente.fecha_creacion,
      responsable: expediente.responsable,
      documentos: expediente.documentos.map(doc => ({
        id: doc.id,
        numero_foja: doc.numero_foja,
        documento_nombre: doc.documento_nombre,
        documento_tipo: doc.documento_tipo,
        estado_firma: doc.estado_firma,
        archivo_path: doc.archivo_path,
        hash_documento: doc.hash_documento,
        firma: doc.estado_firma === 'firmado' ? {
          fecha_firma: doc.fecha_firma,
          hash_firma: doc.hash_firma,
          usuario_firmante: doc.firmante ? {
            id: doc.firmante.id,
            nombre_completo: doc.firmante.nombre_completo,
            email: doc.firmante.email
          } : null
        } : null,
        created_at: doc.created_at
      }))
    };
    
    res.json(expedienteConFirmas);
    
  } catch (error) {
    console.error('Error obteniendo detalles de firmas:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Servir archivo de documento para visualización/descarga
router.get('/:id/documentos/:docId/archivo', authenticateToken, async (req, res) => {
  try {
    console.log('=== SIRVIENDO ARCHIVO DE DOCUMENTO ===');
    console.log('Expediente ID:', req.params.id);
    console.log('Documento ID:', req.params.docId);
    console.log('Usuario solicitante:', req.user.id);
    
    // Verificar que el usuario tenga acceso al expediente
    const expediente = await Expediente.findOne({
      where: {
        id: req.params.id,
        [sequelize.Op.or]: [
          { usuario_responsable: req.user.id },
          { oficina_actual_id: req.user.oficina_id }
        ]
      }
    });
    
    if (!expediente) {
      return res.status(404).json({ error: 'Expediente no encontrado o sin permisos' });
    }
    
    // Buscar el documento específico
    const documento = await ExpedienteDocumento.findOne({
      where: {
        id: req.params.docId,
        expediente_id: req.params.id
      }
    });
    
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    
    // Obtener información del archivo
    const fileName = documento.documento_nombre;
    const fileExtension = path.extname(fileName).toLowerCase();
    
    // Verificar que el archivo existe
    let archivoPath = documento.archivo_path;
    
    // Si el documento está firmado y existe archivo firmado, usar ese archivo
    if (documento.estado_firma === 'firmado' && documento.archivo_firmado_path) {
      if (fs.existsSync(documento.archivo_firmado_path)) {
        archivoPath = documento.archivo_firmado_path;
        console.log('Sirviendo archivo firmado:', documento.archivo_firmado_path);
      } else {
        console.warn('Archivo firmado no encontrado, sirviendo original');
      }
    }
    
    if (!fs.existsSync(archivoPath)) {
      console.error('Archivo no encontrado en:', archivoPath);
      return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
    }
    
    // Obtener información del archivo
    
    // Configurar headers según el tipo de archivo
    let contentType = 'application/octet-stream';
    let disposition = 'attachment'; // Por defecto descargar
    
    switch (fileExtension) {
      case '.pdf':
        contentType = 'application/pdf';
        disposition = 'inline'; // Mostrar en navegador
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        disposition = 'inline';
        break;
      case '.png':
        contentType = 'image/png';
        disposition = 'inline';
        break;
      case '.gif':
        contentType = 'image/gif';
        disposition = 'inline';
        break;
      case '.txt':
        contentType = 'text/plain';
        disposition = 'inline';
        break;
      case '.doc':
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case '.xls':
      case '.xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
    }
    
    // Configurar headers de respuesta
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    console.log('Sirviendo archivo:', fileName, 'Tipo:', contentType, 'Disposición:', disposition);
    
    // Enviar el archivo
    res.sendFile(path.resolve(archivoPath));
    
  } catch (error) {
    console.error('Error sirviendo archivo:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Obtener expediente específico
router.get('/:id', authenticateToken, verificarAccesoExpediente, async (req, res) => {
  try {
    console.log('=== OBTENIENDO EXPEDIENTE POR ID ===');
    console.log('ID solicitado:', req.params.id);
    console.log('Usuario autenticado:', req.user.id);
    console.log('Oficina del usuario:', req.user.oficina_id);
    
    const whereClause = {
      id: req.params.id
    };
    
    // El middleware ya verificó que el expediente está en la oficina del usuario
    // No necesitamos filtrar por usuario_responsable ya que ahora filtramos por oficina
    
    const expediente = await Expediente.findOne({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'responsable',
          attributes: ['id', 'nombre_completo', 'email']
        },
        {
          model: ExpedienteDocumento,
          as: 'documentos',
          attributes: ['id', 'numero_foja', 'documento_nombre', 'documento_tipo', 'estado_firma', 'archivo_path', 'created_at']
        }
      ]
    });
    
    console.log('Expediente encontrado:', expediente ? 'Sí' : 'No');
    
    if (!expediente) {
      console.log('Expediente no encontrado para usuario:', req.user.id);
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }
    
    console.log('Enviando expediente:', expediente.id);
    res.json({ expediente });
  } catch (error) {
    console.error('Error obteniendo expediente:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Agregar documento a expediente
router.post('/:id/documentos', authenticateToken, upload.single('archivo'), async (req, res) => {
  console.log('DEBUG: usuario.id =', req.user.id, 'usuario.oficina_id =', req.user.oficina_id, 'expediente_id =', req.params.id);
  try {
    console.log('=== AGREGAR DOCUMENTO ===');
    console.log('Body:', req.body);
    console.log('File:', req.file);
    
    const { documento_nombre, documento_tipo, numero_foja } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Debe seleccionar un archivo' });
    }
    
    const expediente = await Expediente.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [
          { usuario_responsable: req.user.id },
          { oficina_actual_id: req.user.oficina_id }
        ]
      }
    });
    
    if (!expediente) {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }
    
    if (expediente.estado === 'cerrado') {
      return res.status(400).json({ error: 'No se pueden agregar documentos a un expediente cerrado' });
    }

    // Construir la ruta absoluta del archivo
    const absolutePath = path.resolve(req.file.path);
    console.log('Ruta del archivo:', absolutePath);

    // Contar páginas del PDF
    let numeroPaginas = 1;
    try {
      if (req.file.mimetype === 'application/pdf') {
        numeroPaginas = await contarPaginasPDF(absolutePath);
        console.log(`Páginas obtenidas del PDF: ${numeroPaginas}`);
      }
    } catch (error) {
      console.error('Error contando páginas:', error);
      numeroPaginas = 1; // Default a 1 página si hay error
    }

    // Validar que numeroPaginas sea un número válido
    if (!numeroPaginas || isNaN(numeroPaginas) || numeroPaginas < 1) {
      console.log(`Número de páginas inválido (${numeroPaginas}), usando valor por defecto: 1`);
      numeroPaginas = 1;
    }

    // Obtener documentos existentes para calcular fojas
    const documentosExistentes = await ExpedienteDocumento.findAll({
      where: { expediente_id: req.params.id },
      order: [['orden_secuencial', 'ASC']]
    });

    // Calcular siguiente foja disponible
    const fojaInicial = calcularSiguienteFoja(documentosExistentes);
    
    // Calcular rango de fojas basado en el número de páginas
    const rangoFojas = calcularRangoFojas(fojaInicial, numeroPaginas);

    // Usar el número de foja del frontend como foja inicial si se proporciona
    let fojaInicialFinal = fojaInicial;
    let fojaFinalFinal = rangoFojas.foja_final;
    
    if (numero_foja && parseInt(numero_foja) > 0) {
      fojaInicialFinal = parseInt(numero_foja);
      const rangoPersonalizado = calcularRangoFojas(fojaInicialFinal, numeroPaginas);
      fojaFinalFinal = rangoPersonalizado.foja_final;
    }    const crypto = await import('crypto');
    const fs = await import('fs');
    
    // Calcular hash del documento
    let hashDocumento;
    try {
      const fileBuffer = await fs.promises.readFile(absolutePath);
      console.log('Buffer leído, tamaño:', fileBuffer.length);
      hashDocumento = crypto.default.createHash('sha256').update(fileBuffer).digest('hex');
      console.log('Hash calculado:', hashDocumento);
    } catch (error) {
      console.error('Error leyendo archivo para hash:', error);
      // Si falla, usar el nombre del archivo como hash temporal
      hashDocumento = crypto.default.createHash('sha256').update(req.file.filename).digest('hex');
    }

    // Validar que todos los valores sean válidos antes de crear el documento
    console.log('=== VALORES ANTES DE CREAR DOCUMENTO ===');
    console.log(`fojaInicialFinal: ${fojaInicialFinal}`);
    console.log(`fojaFinalFinal: ${fojaFinalFinal}`);
    console.log(`numeroPaginas: ${numeroPaginas}`);
    
    // Asegurar que no haya valores NaN o undefined
    const fojaInicialSegura = isNaN(fojaInicialFinal) ? 1 : fojaInicialFinal;
    const fojaFinalSegura = isNaN(fojaFinalFinal) ? fojaInicialSegura : fojaFinalFinal;
    const paginasSeguras = isNaN(numeroPaginas) ? 1 : numeroPaginas;

    const documento = await ExpedienteDocumento.create({
      expediente_id: req.params.id,
      numero_foja: fojaInicialSegura,
      foja_inicial: fojaInicialSegura,
      foja_final: fojaFinalSegura,
      cantidad_paginas: paginasSeguras,
      documento_nombre,
      documento_tipo,
      archivo_path: req.file.path,
      hash_documento: hashDocumento,
      orden_secuencial: fojaInicialFinal,
      estado_firma: 'pendiente',
      usuario_agregado: req.user.id
    });
    
    res.status(201).json({
      documento,
      message: `Documento agregado exitosamente. Fojas: ${fojaInicialSegura}-${fojaFinalSegura} (${paginasSeguras} páginas)`
    });
  } catch (error) {
    console.error('Error agregando documento:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Actualizar estado del expediente
router.patch('/:id/estado', authenticateToken, async (req, res) => {
  try {
  const { estado, oficina_destino_id } = req.body;
    
    const validStates = ['borrador', 'en_proceso', 'consolidado', 'cerrado'];
    if (!validStates.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    
    const expediente = await Expediente.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [
          { usuario_responsable: req.user.id },
          { oficina_actual_id: req.user.oficina_id }
        ]
      }
    });
    
    if (!expediente) {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }
    
    // Validaciones de transición de estado
    if (estado === 'consolidado') {
      const documentosPendientes = await ExpedienteDocumento.count({
        where: {
          expediente_id: req.params.id,
          estado_firma: 'pendiente'
        }
      });
      
      if (documentosPendientes > 0) {
        return res.status(400).json({ 
          error: 'No se puede consolidar un expediente con documentos sin firmar' 
        });
      }
    }
    
    // Log para depuración
    console.log('Valor recibido oficina_destino_id:', oficina_destino_id);
    // Actualizar oficina si se envía oficina_destino_id
    if (oficina_destino_id) {
      const result = await expediente.update({ estado, oficina_actual_id: oficina_destino_id });
      console.log('Resultado actualización:', result);
    } else {
      const result = await expediente.update({ estado });
      console.log('Resultado actualización solo estado:', result);
    }
    
    res.json({
      expediente: await expediente.reload(),
      message: `Estado del expediente actualizado a: ${estado}`
    });
  } catch (error) {
    console.error('Error actualizando estado:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Eliminar documento del expediente
router.delete('/:id/documentos/:docId', authenticateToken, async (req, res) => {
  try {
    const expediente = await Expediente.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [
          { usuario_responsable: req.user.id },
          { oficina_actual_id: req.user.oficina_id }
        ]
      }
    });
    
    if (!expediente) {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }
    
    if (expediente.estado === 'cerrado') {
      return res.status(400).json({ error: 'No se pueden eliminar documentos de un expediente cerrado' });
    }
    
    const documento = await ExpedienteDocumento.findOne({
      where: {
        id: req.params.docId,
        expediente_id: req.params.id
      }
    });
    
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    
    if (documento.estado_firma === 'firmado') {
      return res.status(400).json({ error: 'No se puede eliminar un documento firmado' });
    }
    
    // Eliminar archivo físico si existe
    try {
      if (documento.archivo_path && fs.existsSync(documento.archivo_path)) {
        fs.unlinkSync(documento.archivo_path);
        console.log('Archivo físico eliminado:', documento.archivo_path);
      }
    } catch (fileError) {
      console.warn('No se pudo eliminar el archivo físico:', fileError.message);
      // Continuar con la eliminación del registro aunque falle la eliminación del archivo
    }
    
    await documento.destroy();
    
    res.json({ 
      message: 'Documento eliminado exitosamente',
      documento: {
        id: documento.id,
        nombre: documento.documento_nombre
      }
    });
  } catch (error) {
    console.error('Error eliminando documento:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Firmar documento
router.post('/:id/documentos/:docId/firmar', authenticateToken, async (req, res) => {
  console.log('=== FIRMAR DOCUMENTO - ENTRADA ===');
  console.log('Expediente ID:', req.params.id);
  console.log('Documento ID:', req.params.docId);
  console.log('Usuario firmante:', req.user?.id);
  try {
    // Verificar que el expediente existe y pertenece al usuario
    const expediente = await Expediente.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [
          { usuario_responsable: req.user.id },
          { oficina_actual_id: req.user.oficina_id }
        ]
      }
    });
    if (!expediente) {
      return res.status(404).json({ error: 'Expediente no encontrado o sin permisos' });
    }
    // Buscar el documento
    const documento = await ExpedienteDocumento.findOne({
      where: {
        id: req.params.docId,
        expediente_id: req.params.id
      }
    });
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    if (documento.estado_firma !== 'pendiente') {
      return res.status(400).json({ error: `No se puede firmar un documento en estado: ${documento.estado_firma}` });
    }
    // Determinar método de firma
    const { metodo, firma_token, info_token } = req.body;
    const timestamp = new Date().toISOString();
    let hashFirma = null;
    let archivoFirmadoPath = null;
    if (metodo === 'token') {
      // Validar firma_token y hash_documento
      if (!firma_token || !info_token) {
        return res.status(400).json({ error: 'Faltan datos de firma con token' });
      }
      // Validar hash del documento
      if (info_token.hash_documento !== documento.hash_documento) {
        return res.status(400).json({ error: 'El hash del documento no coincide' });
      }
      // Aquí podrías validar la firma_token usando la clave pública del token
      // (omitir validación real para ejemplo)
      hashFirma = firma_token;
      // Actualizar documento
      await documento.update({
        estado_firma: 'firmado',
        hash_firma: hashFirma,
        fecha_firma: timestamp,
        usuario_firmante: req.user.id,
        archivo_firmado_path: archivoFirmadoPath
      });
      return res.json({
        message: 'Documento firmado exitosamente con token',
        documento: {
          id: documento.id,
          estado_firma: 'firmado',
          fecha_firma: timestamp,
          hash_firma: hashFirma
        }
      });
    } else {
      // Firma interna o certificado propio (flujo original)
      const crypto = await import('crypto');
      const firmaData = {
        documento_id: documento.id,
        usuario_id: req.user.id,
        timestamp: timestamp,
        hash_documento: documento.hash_documento
      };
      hashFirma = crypto.default.createHash('sha256')
        .update(JSON.stringify(firmaData))
        .digest('hex');
      // Generar archivo firmado si es PDF
      try {
        if (documento.archivo_path && path.extname(documento.archivo_path).toLowerCase() === '.pdf') {
          const archivoOriginal = documento.archivo_path;
          const directorioBase = path.dirname(archivoOriginal);
          const nombreArchivo = path.basename(archivoOriginal, '.pdf');
          archivoFirmadoPath = path.join(directorioBase, `${nombreArchivo}_firmado.pdf`);
          const usuarioFirmante = await Usuario.findByPk(req.user.id);
          const signatureData = {
            firmante: usuarioFirmante.nombre_completo,
            fechaFirma: timestamp,
            hashFirma: hashFirma
          };
          await generateSignedPDF(archivoOriginal, archivoFirmadoPath, signatureData);
        }
      } catch (pdfError) {
        archivoFirmadoPath = null;
      }
      await documento.update({
        estado_firma: 'firmado',
        hash_firma: hashFirma,
        fecha_firma: timestamp,
        usuario_firmante: req.user.id,
        archivo_firmado_path: archivoFirmadoPath
      });
      return res.json({
        message: 'Documento firmado exitosamente',
        documento: {
          id: documento.id,
          estado_firma: 'firmado',
          fecha_firma: timestamp,
          hash_firma: hashFirma
        }
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Enviar expediente a otra oficina
router.post('/:id/enviar', authenticateToken, async (req, res) => {
  try {
    const { oficina_destino_id, comentario } = req.body;
    const expedienteId = req.params.id;
    
    // Verificar que el expediente existe y pertenece a la oficina del usuario
    const expediente = await Expediente.findOne({
      where: {
        id: expedienteId,
        oficina_actual_id: req.user.oficina_id
      }
    });
    
    if (!expediente) {
      return res.status(404).json({ error: 'Expediente no encontrado o sin permisos' });
    }

    // Verificar que todos los documentos estén firmados antes de enviar
    console.log('=== VALIDANDO DOCUMENTOS ANTES DEL ENVÍO ===');
    console.log('Expediente ID:', expedienteId);
    
    const documentosPendientes = await ExpedienteDocumento.count({
      where: {
        expediente_id: expedienteId,
        estado_firma: 'pendiente'
      }
    });
    
    console.log('Documentos pendientes encontrados:', documentosPendientes);
    
    if (documentosPendientes > 0) {
      console.log('BLOQUEANDO ENVÍO - Documentos pendientes:', documentosPendientes);
      return res.status(400).json({ 
        error: 'No se puede enviar el expediente',
        message: `El expediente contiene ${documentosPendientes} documento${documentosPendientes > 1 ? 's' : ''} sin firmar. Todos los documentos deben estar firmados antes del envío.`,
        documentosPendientes
      });
    }
    
    console.log('VALIDACIÓN APROBADA - Todos los documentos están firmados');
    
    // Verificar que la oficina destino existe (usando consulta directa por ahora)
    const oficinaCheck = await sequelize.query(
      'SELECT id, nombre FROM oficinas WHERE id = ? AND activa = true',
      {
        replacements: [oficina_destino_id],
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (!oficinaCheck || oficinaCheck.length === 0) {
      return res.status(404).json({ error: 'Oficina destino no encontrada' });
    }
    
    // Crear movimiento en el historial usando consulta directa
    await sequelize.query(
      `INSERT INTO workflow_movimientos 
       (expediente_id, oficina_origen_id, oficina_destino_id, estado_anterior, estado_nuevo, motivo, observaciones, usuario_movimiento, fecha_movimiento, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      {
        replacements: [
          expedienteId,
          req.user.oficina_id,
          oficina_destino_id,
          expediente.estado,
          expediente.estado,
          'Envío entre oficinas',
          comentario || '',
          req.user.nombre_completo,
          new Date()
        ]
      }
    );
    
    // Actualizar oficina actual del expediente
    await expediente.update({
      oficina_actual_id: oficina_destino_id
    });
    
    res.json({
      message: 'Expediente enviado exitosamente',
      expediente: {
        id: expediente.id,
        titulo: expediente.titulo,
        oficina_actual_id: oficina_destino_id
      }
    });
    
  } catch (error) {
    console.error('Error enviando expediente:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Obtener previsualización completa del expediente
router.get('/:id/preview', authenticateToken, async (req, res) => {
  console.log('=== INICIO ENDPOINT PREVIEW ===');
  try {
    const { id } = req.params;
    const { page = 1, limit = 5, includeContent = 'true' } = req.query;
    
    console.log(`=== OBTENIENDO PREVISUALIZACIÓN COMPLETA DEL EXPEDIENTE ${id} ===`);
    console.log(`Página: ${page}, Límite: ${limit}, Incluir contenido: ${includeContent}`);
    console.log('Params:', req.params);
    console.log('Query:', req.query);
    
    // Buscar el expediente con todos sus documentos
    console.log('Buscando expediente en base de datos...');
    const expediente = await Expediente.findByPk(id, {
      include: [{
        model: ExpedienteDocumento,
        as: 'documentos',
        order: [['orden_secuencial', 'ASC'], ['fecha_agregado', 'ASC']]
      }]
    });

    console.log('Resultado de búsqueda:', expediente ? 'Encontrado' : 'No encontrado');

    if (!expediente) {
      console.log('Expediente no encontrado, enviando 404');
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }

    console.log(`Expediente encontrado: ${expediente.numero_expediente}`);
    console.log(`Documentos en expediente: ${expediente.documentos ? expediente.documentos.length : 0}`);
    
    // Calcular estadísticas simples por ahora
    const totalDocumentos = expediente.documentos ? expediente.documentos.length : 0;
    const documentosFirmados = expediente.documentos ? expediente.documentos.filter(doc => doc.archivo_firmado_path).length : 0;
    
    console.log(`Total documentos: ${totalDocumentos}, Firmados: ${documentosFirmados}`);

    // Procesar documentos según paginación
    const inicio = (parseInt(page) - 1) * parseInt(limit);
    const fin = inicio + parseInt(limit);
    const documentosPagina = expediente.documentos ? expediente.documentos.slice(inicio, fin) : [];
    
    console.log(`Procesando documentos ${inicio} a ${fin}, Total en página: ${documentosPagina.length}`);

    // Procesar cada documento
    const documentosConPDF = [];
    
    for (const documento of documentosPagina) {
      try {
        console.log(`Procesando documento: ${documento.documento_nombre}`);
        
        // Información básica del documento (siempre incluida)
        const documentoInfo = {
          id: documento.id,
          nombre: documento.documento_nombre,
          tipo: documento.documento_tipo,
          foja_inicial: documento.foja_inicial || documento.numero_foja,
          foja_final: documento.foja_final || documento.numero_foja,
          cantidad_paginas: documento.cantidad_paginas || 1,
          fecha_agregado: documento.fecha_agregado,
          orden_secuencial: documento.orden_secuencial,
          estado_firma: documento.estado_firma,
          firmado: !!documento.archivo_firmado_path
        };

        // Solo incluir contenido PDF si se solicita explícitamente
        if (includeContent === 'true') {
          // Ruta del archivo PDF (usar el firmado si existe, sino el original)
          const archivoPDF = documento.archivo_firmado_path || documento.archivo_path;
          
          console.log(`Ruta del archivo: ${archivoPDF}`);
          
          if (!archivoPDF || !fs.existsSync(archivoPDF)) {
            console.warn(`Archivo no encontrado para documento ${documento.id}: ${archivoPDF}`);
            documentoInfo.error = 'Archivo no encontrado';
          } else {
            // Leer el archivo y convertir a base64
            console.log('Leyendo archivo PDF...');
            const pdfBuffer = fs.readFileSync(archivoPDF);
            documentoInfo.contenido_base64 = pdfBuffer.toString('base64');
            documentoInfo.tamaño_archivo = pdfBuffer.length;
            
            console.log(`Documento procesado: ${documento.documento_nombre} (${documentoInfo.cantidad_paginas} páginas, ${documentoInfo.tamaño_archivo} bytes)`);
          }
        }
        
        documentosConPDF.push(documentoInfo);
        
      } catch (error) {
        console.error(`Error procesando documento ${documento.id}:`, error);
        // Incluir documento con información de error
        documentosConPDF.push({
          id: documento.id,
          nombre: documento.documento_nombre || 'Documento sin nombre',
          error: 'Error al procesar documento'
        });
      }
    }

    console.log(`Previsualización generada con ${documentosConPDF.length} documentos`);

    // Calcular total de páginas
    const totalPaginas = expediente.documentos ? 
      expediente.documentos.reduce((sum, doc) => sum + (doc.cantidad_paginas || 1), 0) : 0;
    
    const respuesta = {
      expediente: {
        id: expediente.id,
        numero_expediente: expediente.numero_expediente,
        nombre_solicitante: expediente.nombre_solicitante,
        descripcion: expediente.descripcion,
        estado: expediente.estado,
        fecha_creacion: expediente.fecha_creacion,
        estadisticas: {
          total_documentos: totalDocumentos,
          total_paginas: totalPaginas,
          documentos_firmados: documentosFirmados,
          documentos_pendientes: totalDocumentos - documentosFirmados
        }
      },
      documentos: documentosConPDF,
      paginacion: {
        pagina_actual: parseInt(page),
        documentos_por_pagina: parseInt(limit),
        total_documentos: totalDocumentos,
        total_paginas: Math.ceil(totalDocumentos / parseInt(limit)),
        tiene_siguiente: parseInt(page) * parseInt(limit) < totalDocumentos,
        tiene_anterior: parseInt(page) > 1
      }
    };

    console.log('Enviando respuesta al frontend...');
    console.log('Expediente ID:', respuesta.expediente.id);
    console.log('Total documentos en respuesta:', respuesta.documentos.length);
    
    res.json(respuesta);
    
  } catch (error) {
    console.error('Error obteniendo previsualización del expediente:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});



export default router;