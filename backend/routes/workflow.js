import express from 'express';
import sequelize from '../models/databaseExtended.js';
import { QueryTypes } from 'sequelize';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { contarPaginasPDF } from '../utils/pdfUtils.js';

const router = express.Router();

// Configuración de multer para archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/expedientes';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Enviar expediente a oficina
router.post('/:expedienteId/enviar-a-oficina', async (req, res) => {
  try {
    const { expedienteId } = req.params;
    const { oficina_destino_id, motivo, observaciones, usuario_movimiento, prioridad = 'normal' } = req.body;
    
    if (!oficina_destino_id || !usuario_movimiento) {
      return res.status(400).json({ error: 'Oficina destino y usuario son requeridos' });
    }
    
    // Comenzar transacción
    await sequelize.query('BEGIN');
    
    try {
      // Obtener expediente actual
      const [expediente] = await sequelize.query(`
        SELECT * FROM expedientes WHERE id = $1
      `, {
        bind: [expedienteId]
      });
      
      if (expediente.length === 0) {
        throw new Error('Expediente no encontrado');
      }
      
      const oficina_origen_id = expediente[0].oficina_actual_id;
      const estado_anterior = expediente[0].estado_workflow;
      
      // Actualizar expediente
      await sequelize.query(`
        UPDATE expedientes 
        SET oficina_actual_id = $1, estado_workflow = 'en_tramite', updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, {
        bind: [oficina_destino_id, expedienteId]
      });
      
      // Crear registro de workflow si no existe
      const [workflowExistente] = await sequelize.query(`
        SELECT id FROM expediente_workflow WHERE expediente_id = $1
      `, {
        bind: [expedienteId]
      });
      
      if (workflowExistente.length === 0) {
        await sequelize.query(`
          INSERT INTO expediente_workflow (
            expediente_id, oficina_actual_id, oficina_origen_id, 
            estado, prioridad, fecha_recepcion, usuario_asignado
          ) VALUES ($1, $2, $3, 'en_tramite', $4, CURRENT_TIMESTAMP, $5)
        `, {
          bind: [expedienteId, oficina_destino_id, oficina_origen_id, prioridad, usuario_movimiento]
        });
      } else {
        await sequelize.query(`
          UPDATE expediente_workflow 
          SET oficina_actual_id = $1, oficina_origen_id = $2, 
              estado = 'en_tramite', prioridad = $3, 
              fecha_recepcion = CURRENT_TIMESTAMP, usuario_asignado = $4
          WHERE expediente_id = $5
        `, {
          bind: [oficina_destino_id, oficina_origen_id, prioridad, usuario_movimiento, expedienteId]
        });
      }
      
      // Registrar movimiento
      await sequelize.query(`
        INSERT INTO workflow_movimientos (
          expediente_id, oficina_origen_id, oficina_destino_id, 
          estado_anterior, estado_nuevo, motivo, observaciones, 
          usuario_movimiento, fecha_movimiento
        ) VALUES ($1, $2, $3, $4, 'en_tramite', $5, $6, $7, CURRENT_TIMESTAMP)
      `, {
        bind: [expedienteId, oficina_origen_id, oficina_destino_id, estado_anterior, motivo, observaciones, usuario_movimiento]
      });
      
      await sequelize.query('COMMIT');
      
      res.json({ 
        mensaje: 'Expediente enviado correctamente',
        expediente_id: expedienteId,
        oficina_destino_id,
        estado: 'en_tramite'
      });
      
    } catch (error) {
      await sequelize.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error al enviar expediente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambiar estado de expediente
router.put('/:expedienteId/cambiar-estado', async (req, res) => {
  try {
    const { expedienteId } = req.params;
    const { nuevo_estado, observaciones, usuario_movimiento } = req.body;
    
    if (!nuevo_estado || !usuario_movimiento) {
      return res.status(400).json({ error: 'Estado y usuario son requeridos' });
    }
    
    await sequelize.query('BEGIN');
    
    try {
      // Obtener estado actual
      const [expediente] = await sequelize.query(`
        SELECT estado_workflow, oficina_actual_id FROM expedientes WHERE id = $1
      `, [expedienteId]);
      
      if (expediente.length === 0) {
        throw new Error('Expediente no encontrado');
      }
      
      const estado_anterior = expediente[0].estado_workflow;
      const oficina_actual_id = expediente[0].oficina_actual_id;
      
      // Actualizar estado del expediente
      await sequelize.query(`
        UPDATE expedientes 
        SET estado_workflow = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [nuevo_estado, expedienteId]);
      
      // Actualizar workflow
      await sequelize.query(`
        UPDATE expediente_workflow 
        SET estado = $1, observaciones = $2, updated_at = CURRENT_TIMESTAMP
        WHERE expediente_id = $3
      `, [nuevo_estado, observaciones, expedienteId]);
      
      // Registrar movimiento interno
      await sequelize.query(`
        INSERT INTO workflow_movimientos (
          expediente_id, oficina_origen_id, oficina_destino_id, 
          estado_anterior, estado_nuevo, motivo, observaciones, 
          usuario_movimiento, fecha_movimiento
        ) VALUES ($1, $2, $2, $3, $4, 'Cambio de estado', $5, $6, CURRENT_TIMESTAMP)
      `, [expedienteId, oficina_actual_id, estado_anterior, nuevo_estado, observaciones, usuario_movimiento]);
      
      await sequelize.query('COMMIT');
      
      res.json({ 
        mensaje: 'Estado actualizado correctamente',
        expediente_id: expedienteId,
        estado_anterior,
        estado_nuevo: nuevo_estado
      });
      
    } catch (error) {
      await sequelize.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Agregar documento a expediente (desde oficina)
router.post('/:expedienteId/agregar-documento', upload.single('documento'), async (req, res) => {
  try {
    const { expedienteId } = req.params;
    const { 
      documento_nombre, 
      documento_tipo, 
      oficina_id, 
      usuario_agregado,
      observaciones 
    } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo es requerido' });
    }
    
    await sequelize.query('BEGIN');
    
    try {
      // Verificar que el expediente existe
      const [expediente] = await sequelize.query(`
        SELECT * FROM expedientes WHERE id = $1
      `, [expedienteId]);
      
      if (expediente.length === 0) {
        throw new Error('Expediente no encontrado');
      }
      
      // Obtener el siguiente número de foja
      const [ultimaFoja] = await sequelize.query(`
        SELECT MAX(foja_final) as ultima_foja 
        FROM expediente_documentos 
        WHERE expediente_id = $1
      `, [expedienteId]);
      
      let siguiente_foja = 1;
      if (ultimaFoja[0] && ultimaFoja[0].ultima_foja) {
        siguiente_foja = ultimaFoja[0].ultima_foja + 1;
      }
      
      // Contar páginas del PDF
      const cantidadPaginas = await contarPaginasPDF(req.file.path);
      const foja_final = siguiente_foja + cantidadPaginas - 1;
      
      // Obtener el siguiente orden secuencial
      const [ultimoOrden] = await sequelize.query(`
        SELECT MAX(orden_secuencial) as ultimo_orden 
        FROM expediente_documentos 
        WHERE expediente_id = $1
      `, [expedienteId]);
      
      const siguiente_orden = ultimoOrden[0] && ultimoOrden[0].ultimo_orden 
        ? ultimoOrden[0].ultimo_orden + 1 
        : 1;
      
      // Insertar documento
      const [nuevoDocumento] = await sequelize.query(`
        INSERT INTO expediente_documentos (
          expediente_id, numero_foja, foja_inicial, foja_final, cantidad_paginas,
          documento_nombre, documento_tipo, archivo_path, hash_documento,
          orden_secuencial, fecha_agregado, usuario_agregado, oficina_agregado_id,
          usuario_agregado_workflow, observaciones
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, $11, $12, $13, $14)
        RETURNING *
      `, [
        expedienteId, siguiente_foja, siguiente_foja, foja_final, cantidadPaginas,
        documento_nombre, documento_tipo, req.file.path, 'hash_temporal',
        siguiente_orden, usuario_agregado, oficina_id, usuario_agregado, observaciones
      ]);
      
      // Registrar en workflow_movimientos
      await sequelize.query(`
        INSERT INTO workflow_movimientos (
          expediente_id, oficina_origen_id, oficina_destino_id, 
          estado_anterior, estado_nuevo, motivo, observaciones, 
          usuario_movimiento, fecha_movimiento, documentos_agregados
        ) VALUES ($1, $2, $2, 'en_tramite', 'en_tramite', 'Documento agregado', $3, $4, CURRENT_TIMESTAMP, $5)
      `, [expedienteId, oficina_id, `Documento agregado: ${documento_nombre}`, usuario_agregado, JSON.stringify([nuevoDocumento[0].id])]);
      
      await sequelize.query('COMMIT');
      
      res.status(201).json({
        mensaje: 'Documento agregado correctamente',
        documento: nuevoDocumento[0]
      });
      
    } catch (error) {
      await sequelize.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error al agregar documento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener historial de movimientos de un expediente
router.get('/:expedienteId/historial', async (req, res) => {
  try {
    const { expedienteId } = req.params;
    
    const historial = await sequelize.query(`
      SELECT wm.*, 
             oo.nombre as oficina_origen_nombre,
             od.nombre as oficina_destino_nombre
      FROM workflow_movimientos wm
      LEFT JOIN oficinas oo ON wm.oficina_origen_id = oo.id
      LEFT JOIN oficinas od ON wm.oficina_destino_id = od.id
      WHERE wm.expediente_id = $1
      ORDER BY wm.fecha_movimiento DESC
    `, {
      bind: [expedienteId],
      type: QueryTypes.SELECT
    });
    
    res.json(historial);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener estado actual del workflow de un expediente
router.get('/:expedienteId/estado-workflow', async (req, res) => {
  try {
    const { expedienteId } = req.params;
    
    let workflow = await sequelize.query(`
      SELECT ew.*, 
             e.numero_expediente, e.titulo,
             oa.nombre as oficina_actual_nombre,
             oo.nombre as oficina_origen_nombre
      FROM expediente_workflow ew
      JOIN expedientes e ON ew.expediente_id = e.id
      LEFT JOIN oficinas oa ON ew.oficina_actual_id = oa.id
      LEFT JOIN oficinas oo ON ew.oficina_origen_id = oo.id
      WHERE ew.expediente_id = $1
    `, {
      bind: [expedienteId],
      type: QueryTypes.SELECT
    });
    
    if (workflow.length === 0) {
      // Si no existe workflow, crear uno inicial con la primera oficina (Mesa de Entradas)
      const expediente = await sequelize.query(`
        SELECT * FROM expedientes WHERE id = $1
      `, {
        bind: [expedienteId],
        type: QueryTypes.SELECT
      });
      
      if (expediente.length === 0) {
        return res.status(404).json({ error: 'Expediente no encontrado' });
      }
      
      // Crear registro inicial de workflow
      await sequelize.query(`
        INSERT INTO expediente_workflow (
          expediente_id, estado, prioridad, oficina_origen_id, 
          oficina_actual_id, observaciones, created_at, updated_at
        ) VALUES ($1, 'en_tramite', 'normal', 1, 1, 'Workflow iniciado automáticamente', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, {
        bind: [expedienteId],
        type: QueryTypes.INSERT
      });
      
      // Obtener el workflow recién creado
      workflow = await sequelize.query(`
        SELECT ew.*, 
               e.numero_expediente, e.titulo,
               oa.nombre as oficina_actual_nombre,
               oo.nombre as oficina_origen_nombre
        FROM expediente_workflow ew
        JOIN expedientes e ON ew.expediente_id = e.id
        LEFT JOIN oficinas oa ON ew.oficina_actual_id = oa.id
        LEFT JOIN oficinas oo ON ew.oficina_origen_id = oo.id
        WHERE ew.expediente_id = $1
      `, {
        bind: [expedienteId],
        type: QueryTypes.SELECT
      });
    }
    
    res.json(workflow[0]);
  } catch (error) {
    console.error('Error al obtener estado workflow:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Alias para compatibilidad con el frontend - enviar expediente
router.post('/:expedienteId/enviar', async (req, res) => {
  try {
    const { expedienteId } = req.params;
    const { oficina_destino_id, prioridad = 'normal', motivo, observaciones } = req.body;

    if (!oficina_destino_id) {
      return res.status(400).json({ error: 'Se requiere especificar la oficina destino' });
    }

    // Verificar si existe el expediente
    const expediente = await sequelize.query(
      `SELECT id, numero_expediente, titulo FROM expedientes WHERE id = :expedienteId`,
      {
        replacements: { expedienteId },
        type: QueryTypes.SELECT
      }
    );

    if (expediente.length === 0) {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }

    // Verificar si existe la oficina destino
    const oficina = await sequelize.query(
      `SELECT id, nombre FROM oficinas WHERE id = :oficina_destino_id AND activa = true`,
      {
        replacements: { oficina_destino_id },
        type: QueryTypes.SELECT
      }
    );

    if (oficina.length === 0) {
      return res.status(404).json({ error: 'Oficina destino no encontrada o inactiva' });
    }

    // Verificar si ya existe un workflow para este expediente
    let workflowExistente = await sequelize.query(
      `SELECT id, oficina_actual_id FROM expediente_workflow WHERE expediente_id = :expedienteId`,
      {
        replacements: { expedienteId },
        type: QueryTypes.SELECT
      }
    );

    let workflowId;
    let oficina_origen_id = 1; // Mesa de Entradas por defecto

    if (workflowExistente.length === 0) {
      // Crear nuevo workflow
      const nuevoWorkflow = await sequelize.query(
        `INSERT INTO expediente_workflow 
         (expediente_id, oficina_actual_id, oficina_origen_id, estado, prioridad, fecha_recepcion, observaciones) 
         VALUES (:expediente_id, :oficina_destino_id, :oficina_origen_id, 'en_tramite', :prioridad, NOW(), :observaciones)
         RETURNING id`,
        {
          replacements: {
            expediente_id: expedienteId,
            oficina_destino_id,
            oficina_origen_id,
            prioridad,
            observaciones
          },
          type: QueryTypes.INSERT
        }
      );
      workflowId = nuevoWorkflow[0][0].id;
    } else {
      // Actualizar workflow existente
      oficina_origen_id = workflowExistente[0].oficina_actual_id;
      
      await sequelize.query(
        `UPDATE expediente_workflow 
         SET oficina_actual_id = :oficina_destino_id, 
             oficina_origen_id = :oficina_origen_id,
             prioridad = :prioridad,
             observaciones = :observaciones,
             updated_at = NOW()
         WHERE expediente_id = :expedienteId`,
        {
          replacements: {
            oficina_destino_id,
            oficina_origen_id,
            prioridad,
            observaciones,
            expedienteId
          },
          type: QueryTypes.UPDATE
        }
      );
      workflowId = workflowExistente[0].id;
    }

    // Registrar el movimiento en el historial (comentado temporalmente)
    // TODO: Arreglar estructura de la tabla workflow_movimientos
    // await sequelize.query(
    //   `INSERT INTO workflow_movimientos 
    //    (expediente_id, oficina_origen_id, oficina_destino_id)
    //    VALUES (:expediente_id, :oficina_origen_id, :oficina_destino_id)`,
    //   {
    //     replacements: {
    //       expediente_id: expedienteId,
    //       oficina_origen_id,
    //       oficina_destino_id
    //     },
    //     type: QueryTypes.INSERT
    //   }
    // );

    res.json({ 
      message: 'Expediente enviado exitosamente',
      workflowId,
      expediente: expediente[0],
      oficina_destino: oficina[0]
    });

  } catch (error) {
    console.error('Error al enviar expediente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;