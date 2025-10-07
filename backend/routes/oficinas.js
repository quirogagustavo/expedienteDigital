import express from 'express';
import sequelize from '../models/databaseExtended.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// CRUD de oficinas

// Obtener todas las oficinas (solo administradores)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [oficinas] = await sequelize.query(`
      SELECT * FROM oficinas 
      WHERE activa = true 
      ORDER BY nombre
    `);
    
    res.json(oficinas);
  } catch (error) {
    console.error('Error al obtener oficinas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener oficinas disponibles para envío (excluyendo la actual del usuario) - Requiere autenticación
router.get('/disponibles/:oficina_actual_id', authenticateToken, async (req, res) => {
  try {
    const { oficina_actual_id } = req.params;
    console.log('Debug - oficina_actual_id recibida:', oficina_actual_id);
    
    if (!oficina_actual_id || oficina_actual_id === 'undefined') {
      return res.status(400).json({ error: 'oficina_actual_id es requerida y válida' });
    }
    
    const [oficinas] = await sequelize.query(`
      SELECT id, nombre, descripcion FROM oficinas 
      WHERE activa = true AND id != $1
      ORDER BY nombre
    `, {
      bind: [oficina_actual_id]
    });
    
    console.log('Debug - oficinas encontradas:', oficinas.length);
    res.json(oficinas);
  } catch (error) {
    console.error('Error al obtener oficinas disponibles:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener una oficina por ID (solo administradores)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [oficina] = await sequelize.query(`
      SELECT * FROM oficinas WHERE id = $1
    `, {
      bind: [id]
    });
    
    if (oficina.length === 0) {
      return res.status(404).json({ error: 'Oficina no encontrada' });
    }
    
    res.json(oficina[0]);
  } catch (error) {
    console.error('Error al obtener oficina:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nueva oficina (solo administradores)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, codigo, responsable, email, telefono } = req.body;
    
    if (!nombre || !codigo) {
      return res.status(400).json({ error: 'Nombre y código son requeridos' });
    }
    
    const [nuevaOficina] = await sequelize.query(`
      INSERT INTO oficinas (nombre, descripcion, codigo, responsable, email, telefono)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, {
      bind: [nombre, descripcion, codigo, responsable, email, telefono]
    });
    
    res.status(201).json(nuevaOficina[0]);
  } catch (error) {
    console.error('Error al crear oficina:', error);
    if (error.code === '23505') { // Código único duplicado
      return res.status(400).json({ error: 'El código de oficina ya existe' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar oficina (solo administradores)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, codigo, responsable, email, telefono, activa } = req.body;
    
    const [oficinaActualizada] = await sequelize.query(`
      UPDATE oficinas 
      SET nombre = $1, descripcion = $2, codigo = $3, responsable = $4, 
          email = $5, telefono = $6, activa = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, {
      bind: [nombre, descripcion, codigo, responsable, email, telefono, activa, id]
    });
    
    if (oficinaActualizada.length === 0) {
      return res.status(404).json({ error: 'Oficina no encontrada' });
    }
    
    res.json(oficinaActualizada[0]);
  } catch (error) {
    console.error('Error al actualizar oficina:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El código de oficina ya existe' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Desactivar oficina (solo administradores)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [oficinaDesactivada] = await sequelize.query(`
      UPDATE oficinas 
      SET activa = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, {
      bind: [id]
    });
    
    if (oficinaDesactivada.length === 0) {
      return res.status(404).json({ error: 'Oficina no encontrada' });
    }
    
    res.json({ mensaje: 'Oficina desactivada correctamente' });
  } catch (error) {
    console.error('Error al desactivar oficina:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener expedientes de una oficina (solo administradores)
router.get('/:id/expedientes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.query;
    
    let query = `
      SELECT e.*, o.nombre as oficina_nombre,
             COUNT(ed.id) as total_documentos
      FROM expedientes e
      LEFT JOIN oficinas o ON e.oficina_actual_id = o.id
      LEFT JOIN expediente_documentos ed ON e.id = ed.expediente_id
      WHERE e.oficina_actual_id = $1
    `;
    
    const params = [id];
    
    if (estado) {
      query += ` AND e.estado_workflow = $2`;
      params.push(estado);
    }
    
    query += ` GROUP BY e.id, o.nombre ORDER BY e.updated_at DESC`;
    
    const [expedientes] = await sequelize.query(query, {
      bind: params
    });
    
    res.json(expedientes);
  } catch (error) {
    console.error('Error al obtener expedientes de oficina:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;