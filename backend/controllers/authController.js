import bcrypt from 'bcryptjs';
import { Usuario, Certificado } from '../models/index.js';
import { generateToken } from '../middleware/auth.js';
import { signBuffer } from '../signature.js';
import { Op } from 'sequelize';

// Registro de usuario
export const register = async (req, res) => {
  try {
    const { username, password, nombre_completo, email, rol_usuario } = req.body;

    // Verificar que el usuario no exista
    const usuarioExistente = await Usuario.findOne({ 
      where: { 
        [Op.or]: [
          { username },
          { email }
        ]
      } 
    });
    
    if (usuarioExistente) {
      return res.status(400).json({ 
        message: 'El usuario o email ya existe' 
      });
    }

    // Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear el usuario
    const usuario = await Usuario.create({
      username,
      password_hash: hashedPassword,
      nombre_completo,
      email,
      rol_usuario
    });

    // No devolver la contraseña en la respuesta
    const { password_hash, ...usuarioSinPassword } = usuario.toJSON();

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      usuario: usuarioSinPassword
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error.message 
    });
  }
};

// Login de usuario
export const login = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!password || (!username && !email)) {
      return res.status(400).json({ error: 'Faltan credenciales' });
    }
    // Buscar usuario por username o email
    const usuario = await Usuario.findOne({
      where: {
        [Op.or]: [
          username ? { username } : {},
          email ? { email } : {}
        ]
      }
    });
    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    // Generar token JWT
    const token = generateToken(usuario.id);
    res.json({
      token,
      user: {
        id: usuario.id,
        username: usuario.username,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email,
        rol_usuario: usuario.rol_usuario
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};