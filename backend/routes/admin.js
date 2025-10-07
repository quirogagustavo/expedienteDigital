import express from 'express';
import bcrypt from 'bcrypt';
import sequelize from '../models/databaseExtended.js';
import { QueryTypes } from 'sequelize';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware para verificar que el usuario es administrador
const verificarAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const [usuario] = await sequelize.query(
      `SELECT rol_usuario FROM usuarios WHERE id = :userId`,
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );

    if (!usuario || usuario.rol_usuario !== 'administrador') {
      return res.status(403).json({ 
        error: 'Acceso denegado. Solo administradores pueden gestionar usuarios.' 
      });
    }

    next();
  } catch (error) {
    console.error('Error en verificación de administrador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener todos los usuarios con información de oficinas
router.get('/usuarios', authenticateToken, verificarAdmin, async (req, res) => {
  try {
    const [usuarios] = await sequelize.query(`
      SELECT 
        u.id,
        u.username,
        u.nombre_completo,
        u.email,
        u.rol_usuario,
        u.oficina_id,
        o.nombre as oficina_nombre,
        u.created_at
      FROM usuarios u
      LEFT JOIN oficinas o ON u.oficina_id = o.id
      ORDER BY u.created_at DESC
    `, {
      type: QueryTypes.SELECT
    });

    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo usuario
router.post('/usuarios', authenticateToken, verificarAdmin, async (req, res) => {
  try {
    const { username, nombre_completo, email, password, rol_usuario, oficina_id } = req.body;

    // Validaciones básicas
    if (!username || !nombre_completo || !email || !password) {
      return res.status(400).json({ 
        error: 'Username, nombre completo, email y contraseña son obligatorios' 
      });
    }

    // Verificar que el username no exista
    const [usuarioExistente] = await sequelize.query(
      `SELECT id FROM usuarios WHERE username = :username OR email = :email`,
      {
        replacements: { username, email },
        type: QueryTypes.SELECT
      }
    );

    if (usuarioExistente.length > 0) {
      return res.status(400).json({ 
        error: 'Ya existe un usuario con ese username o email' 
      });
    }

    // Verificar que la oficina exista si se proporciona
    if (oficina_id) {
      const [oficina] = await sequelize.query(
        `SELECT id FROM oficinas WHERE id = :oficina_id AND activa = true`,
        {
          replacements: { oficina_id },
          type: QueryTypes.SELECT
        }
      );

      if (oficina.length === 0) {
        return res.status(400).json({ 
          error: 'La oficina especificada no existe o no está activa' 
        });
      }
    }

    // Hashear la contraseña
    const password_hash = await bcrypt.hash(password, 10);

    // Crear el usuario
    const [nuevoUsuario] = await sequelize.query(`
      INSERT INTO usuarios (username, nombre_completo, email, password_hash, rol_usuario, oficina_id)
      VALUES (:username, :nombre_completo, :email, :password_hash, :rol_usuario, :oficina_id)
      RETURNING id, username, nombre_completo, email, rol_usuario, oficina_id
    `, {
      replacements: {
        username,
        nombre_completo,
        email,
        password_hash,
        rol_usuario: rol_usuario || 'empleado_interno',
        oficina_id: oficina_id || null
      },
      type: QueryTypes.INSERT
    });

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      usuario: nuevoUsuario[0]
    });

  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar usuario
router.put('/usuarios/:id', authenticateToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_completo, email, rol_usuario, oficina_id } = req.body;

    // Verificar que el usuario existe
    const [usuarioExistente] = await sequelize.query(
      `SELECT id FROM usuarios WHERE id = :id`,
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );

    if (usuarioExistente.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que la oficina exista si se proporciona
    if (oficina_id) {
      const [oficina] = await sequelize.query(
        `SELECT id FROM oficinas WHERE id = :oficina_id AND activa = true`,
        {
          replacements: { oficina_id },
          type: QueryTypes.SELECT
        }
      );

      if (oficina.length === 0) {
        return res.status(400).json({ 
          error: 'La oficina especificada no existe o no está activa' 
        });
      }
    }

    // Actualizar el usuario
    await sequelize.query(`
      UPDATE usuarios 
      SET 
        nombre_completo = :nombre_completo,
        email = :email,
        rol_usuario = :rol_usuario,
        oficina_id = :oficina_id,
        updated_at = NOW()
      WHERE id = :id
    `, {
      replacements: {
        id,
        nombre_completo,
        email,
        rol_usuario,
        oficina_id
      },
      type: QueryTypes.UPDATE
    });

    res.json({ message: 'Usuario actualizado exitosamente' });

  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar usuario
router.delete('/usuarios/:id', authenticateToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el usuario existe
    const [usuarioExistente] = await sequelize.query(
      `SELECT id, username FROM usuarios WHERE id = :id`,
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );

    if (usuarioExistente.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // No permitir eliminar el usuario admin
    if (usuarioExistente[0].username === 'admin') {
      return res.status(400).json({ 
        error: 'No se puede eliminar el usuario administrador principal' 
      });
    }

    // Eliminar el usuario
    await sequelize.query(`
      DELETE FROM usuarios WHERE id = :id
    `, {
      replacements: { id },
      type: QueryTypes.DELETE
    });

    res.json({ message: 'Usuario eliminado exitosamente' });

  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambiar contraseña de usuario
router.put('/usuarios/:id/password', authenticateToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'La contraseña es obligatoria' });
    }

    // Verificar que el usuario existe
    const [usuarioExistente] = await sequelize.query(
      `SELECT id FROM usuarios WHERE id = :id`,
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );

    if (usuarioExistente.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Hashear la nueva contraseña
    const password_hash = await bcrypt.hash(password, 10);

    // Actualizar la contraseña
    await sequelize.query(`
      UPDATE usuarios 
      SET password_hash = :password_hash, updated_at = NOW()
      WHERE id = :id
    `, {
      replacements: { id, password_hash },
      type: QueryTypes.UPDATE
    });

    res.json({ message: 'Contraseña actualizada exitosamente' });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;