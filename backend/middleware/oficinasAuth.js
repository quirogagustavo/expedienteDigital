import sequelize from '../models/databaseExtended.js';
import { QueryTypes } from 'sequelize';

// Middleware para verificar que el usuario pueda acceder solo a expedientes de su oficina
export const verificarAccesoOficina = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Obtener la oficina del usuario
    const [usuario] = await sequelize.query(
      `SELECT oficina_id FROM usuarios WHERE id = :userId`,
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );

    if (!usuario || !usuario.oficina_id) {
      return res.status(403).json({ 
        error: 'Usuario no tiene oficina asignada. Contacte al administrador.' 
      });
    }

    // Agregar la oficina del usuario al request para uso posterior
    req.user.oficina_id = usuario.oficina_id;
    next();
    
  } catch (error) {
    console.error('Error en verificación de oficina:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Middleware para verificar acceso a un expediente específico
export const verificarAccesoExpediente = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const expedienteId = req.params.id;
    
    // Obtener la oficina del usuario
    const [usuario] = await sequelize.query(
      `SELECT oficina_id FROM usuarios WHERE id = :userId`,
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );

    if (!usuario || !usuario.oficina_id) {
      return res.status(403).json({ 
        error: 'Usuario no tiene oficina asignada. Contacte al administrador.' 
      });
    }

    // Verificar que el expediente esté en la oficina del usuario, o que el usuario sea responsable, o tenga rol administrador
    const [expediente] = await sequelize.query(
      `SELECT oficina_actual_id, usuario_responsable FROM expedientes WHERE id = :expedienteId`,
      {
        replacements: { expedienteId },
        type: QueryTypes.SELECT
      }
    );

    if (!expediente) {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }

    // Permitir si el usuario es responsable del expediente
    if (expediente.usuario_responsable === userId) {
      req.user.oficina_id = usuario.oficina_id;
      return next();
    }

    // Permitir si el usuario tiene rol administrador
    if (req.user.rol_usuario === 'administrador') {
      req.user.oficina_id = usuario.oficina_id;
      return next();
    }

    // Permitir si el expediente está en la oficina del usuario
    if (expediente.oficina_actual_id === usuario.oficina_id) {
      req.user.oficina_id = usuario.oficina_id;
      return next();
    }

    // Si no cumple ninguna condición, denegar acceso
    return res.status(403).json({ 
      error: 'No tiene permisos para acceder a este expediente.' 
    });
    
  } catch (error) {
    console.error('Error en verificación de acceso a expediente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Middleware para administradores (pueden ver todos los expedientes)
export const verificarAccesoAdministrador = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Verificar si el usuario es administrador
    const [usuario] = await sequelize.query(
      `SELECT rol_usuario, oficina_id FROM usuarios WHERE id = :userId`,
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Si es administrador, puede acceder a todo
    if (usuario.rol_usuario === 'administrador') {
      req.user.esAdministrador = true;
      req.user.oficina_id = usuario.oficina_id;
      return next();
    }

    // Si no es administrador, aplicar verificación normal de oficina
    if (!usuario.oficina_id) {
      return res.status(403).json({ 
        error: 'Usuario no tiene oficina asignada. Contacte al administrador.' 
      });
    }

    req.user.oficina_id = usuario.oficina_id;
    req.user.esAdministrador = false;
    next();
    
  } catch (error) {
    console.error('Error en verificación de administrador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};