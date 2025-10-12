import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sequelize from '../models/databaseExtended.js';
import { QueryTypes } from 'sequelize';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura';

// Endpoint de login: recibe username/email y password, devuelve token JWT
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!password || (!username && !email)) {
      return res.status(400).json({ error: 'Faltan credenciales' });
    }
    // Buscar usuario por username o email
    const usuarios = await sequelize.query(
      `SELECT id, username, email, password_hash FROM usuarios WHERE username = :username OR email = :email LIMIT 1`,
      {
        replacements: { username: username || '', email: email || '' },
        type: QueryTypes.SELECT
      }
    );
    if (!usuarios.length) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    const user = usuarios[0];
    const passwordValido = await bcrypt.compare(password, user.password_hash);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    // Generar token JWT
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
