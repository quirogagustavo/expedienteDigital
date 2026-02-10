import { DataTypes } from 'sequelize';
import sequelize from './database.js';
import Usuario from './Usuario.js';

const Certificado = sequelize.define('Certificado', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
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
  fecha_vencimiento: {
    type: DataTypes.DATE,
    allowNull: true // Permitir null temporalmente durante migración
  },
  fecha_expiracion: {
    type: DataTypes.VIRTUAL,
    get() {
      // Alias para compatibilidad con código legacy
      return this.getDataValue('fecha_vencimiento');
    },
    set(value) {
      this.setDataValue('fecha_vencimiento', value);
    }
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'active',
    allowNull: true
    // Valores válidos del enum certificado_status_enum: 'pending', 'active', 'expired', 'revoked', 'rejected'
    // IMPORTANTE: El enum en BD no incluye 'valid', usar 'active' para certificados válidos/activos
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
    type: DataTypes.STRING(50),
    defaultValue: 'internal',
    allowNull: true
    // Valores esperados: 'internal', 'government'
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