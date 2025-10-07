import jwt from 'jsonwebtoken';
import { Usuario } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura';

// Middleware para verificar token JWT
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('--- AUTH ---');
  console.log('Token recibido:', token);

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findByPk(decoded.userId);

    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    console.log('Usuario autenticado:', usuario.id, usuario.username, usuario.oficina_id);
    req.user = usuario;
    next();
  } catch (error) {
    console.log('Error autenticando token:', error.message);
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar que el usuario sea administrador
export const requireAdmin = (req, res, next) => {
  if (req.user.rol_usuario !== 'administrador') {
    return res.status(403).json({ 
      error: 'Acceso denegado. Solo los administradores pueden realizar esta acción.',
      rol_actual: req.user.rol_usuario 
    });
  }
  next();
};

// Generar token JWT
export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};