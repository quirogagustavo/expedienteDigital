import express from 'express';
import bcrypt from 'bcrypt';
import sequelize from '../models/databaseExtended.js';
import { QueryTypes } from 'sequelize';

const router = express.Router();

// Endpoint temporal para debug de usuarios
router.get('/debug-usuarios', async (req, res) => {
  try {
    const usuarios = await sequelize.query(`
      SELECT id, username, nombre_completo, email, rol_usuario, oficina_id 
      FROM usuarios 
      ORDER BY id
    `, {
      type: QueryTypes.SELECT
    });

    res.json(usuarios);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para verificar contraseñas
router.post('/verify-password', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const usuario = await sequelize.query(`
      SELECT id, username, password_hash 
      FROM usuarios 
      WHERE username = :username
    `, {
      replacements: { username },
      type: QueryTypes.SELECT
    });

    if (!usuario.length) {
      return res.json({ exists: false });
    }

    const user = usuario[0];
    const passwordValido = await bcrypt.compare(password, user.password_hash);
    
    res.json({
      exists: true,
      userId: user.id,
      username: user.username,
      passwordValid: passwordValido
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para crear usuarios de prueba (GET para facilitar testing desde navegador)
router.get('/create-test-users', async (req, res) => {
  try {
    const password_hash = await bcrypt.hash('admin123', 10);
    
    // Crear usuario_legal
    await sequelize.query(`
      INSERT INTO usuarios (username, nombre_completo, email, password_hash, rol_usuario, oficina_id, created_at, updated_at)
      VALUES ('usuario_legal', 'Usuario Área Legal', 'legal@ejemplo.gov.ar', :password_hash, 'empleado_interno', 2, NOW(), NOW())
      ON CONFLICT (username) DO UPDATE SET
        oficina_id = 2,
        password_hash = :password_hash,
        updated_at = NOW()
    `, {
      replacements: { password_hash },
      type: QueryTypes.INSERT
    });

    // Crear usuario_admin
    await sequelize.query(`
      INSERT INTO usuarios (username, nombre_completo, email, password_hash, rol_usuario, oficina_id, created_at, updated_at)
      VALUES ('usuario_admin', 'Usuario Área Administrativa', 'admin_user@ejemplo.gov.ar', :password_hash, 'empleado_interno', 1, NOW(), NOW())
      ON CONFLICT (username) DO UPDATE SET
        oficina_id = 1,
        password_hash = :password_hash,
        updated_at = NOW()
    `, {
      replacements: { password_hash },
      type: QueryTypes.INSERT
    });

    // Verificar que se crearon correctamente
    const usuarios = await sequelize.query(`
      SELECT id, username, nombre_completo, oficina_id 
      FROM usuarios 
      WHERE username IN ('usuario_legal', 'usuario_admin')
      ORDER BY id
    `, {
      type: QueryTypes.SELECT
    });

    res.json({ 
      message: 'Usuarios de prueba creados/actualizados correctamente',
      usuarios: usuarios
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Endpoint para crear usuarios de prueba (POST)
router.post('/create-test-users', async (req, res) => {
  try {
    const password_hash = await bcrypt.hash('admin123', 10);
    
    // Crear usuario_legal
    await sequelize.query(`
      INSERT INTO usuarios (username, nombre_completo, email, password_hash, rol_usuario, oficina_id, created_at, updated_at)
      VALUES ('usuario_legal', 'Usuario Área Legal', 'legal@ejemplo.gov.ar', :password_hash, 'empleado_interno', 2, NOW(), NOW())
      ON CONFLICT (username) DO UPDATE SET
        oficina_id = 2,
        password_hash = :password_hash,
        updated_at = NOW()
    `, {
      replacements: { password_hash },
      type: QueryTypes.INSERT
    });

    // Crear usuario_admin
    await sequelize.query(`
      INSERT INTO usuarios (username, nombre_completo, email, password_hash, rol_usuario, oficina_id, created_at, updated_at)
      VALUES ('usuario_admin', 'Usuario Área Administrativa', 'admin_user@ejemplo.gov.ar', :password_hash, 'empleado_interno', 1, NOW(), NOW())
      ON CONFLICT (username) DO UPDATE SET
        oficina_id = 1,
        password_hash = :password_hash,
        updated_at = NOW()
    `, {
      replacements: { password_hash },
      type: QueryTypes.INSERT
    });

    res.json({ message: 'Usuarios de prueba creados/actualizados correctamente' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

export default router;