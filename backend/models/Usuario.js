import { DataTypes } from 'sequelize';
import sequelize from './database.js';

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false
  },
  nombre_completo: {
    type: DataTypes.STRING(200)
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  rol_usuario: {
    type: DataTypes.ENUM('empleado_interno', 'funcionario_oficial', 'administrador'),
    allowNull: false,
    defaultValue: 'empleado_interno',
    comment: 'Define qué tipo de certificados puede usar'
  },
  certificado_preferido: {
    type: DataTypes.ENUM('internal', 'government'),
    allowNull: true,
    comment: 'Certificado sugerido automáticamente según el rol'
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  oficina_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'oficinas',
      key: 'id'
    },
    comment: 'Oficina a la que pertenece el usuario para control de acceso'
  }
}, {
  tableName: 'usuarios'
});

export default Usuario;