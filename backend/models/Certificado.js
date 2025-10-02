import { DataTypes } from 'sequelize';
import sequelize from './database.js';
import Usuario from './Usuario.js';

const Certificado = sequelize.define('Certificado', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre_certificado: {
    type: DataTypes.STRING(200)
  },
  certificado_pem: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  clave_privada_pem: {
    type: DataTypes.TEXT,
    allowNull: true // Puede ser null para certificados oficiales
  },
  fecha_emision: {
    type: DataTypes.DATE
  },
  fecha_expiracion: {
    type: DataTypes.DATE
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  status: {
    type: DataTypes.ENUM,
    values: ['pending', 'active', 'expired', 'revoked', 'rejected'],
    defaultValue: 'active'
  },
  validation_data: {
    type: DataTypes.JSON,
    allowNull: true // Datos de validación de identidad
  },
  serial_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  issuer_dn: {
    type: DataTypes.TEXT,
    allowNull: true // Distinguished Name del emisor
  },
  subject_dn: {
    type: DataTypes.TEXT,
    allowNull: true // Distinguished Name del sujeto
  },
  tipo: {
    type: DataTypes.ENUM,
    values: ['internal', 'government'],
    defaultValue: 'internal'
  },
  numero_serie: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emisor: {
    type: DataTypes.STRING,
    allowNull: true
  },
  clave_publica_pem: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'certificados'
});

// Definir relaciones
Certificado.belongsTo(Usuario, { 
  foreignKey: 'usuario_id',
  as: 'usuario'
});

Usuario.hasMany(Certificado, { 
  foreignKey: 'usuario_id',
  as: 'certificados'
});

export default Certificado;