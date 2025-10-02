import { DataTypes } from 'sequelize';

// Tipos de certificados disponibles
const CertificateType = (sequelize) => {
  return sequelize.define('CertificateType', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
      // 'internal', 'official_government', 'commercial_ca'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    validity_level: {
      type: DataTypes.ENUM,
      values: ['corporate', 'government'],
      allowNull: false
    },
    processing_time: {
      type: DataTypes.STRING, // '5min', '24h', '5-7days'
      allowNull: false
    },
    requires_identity_verification: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });
};

export default CertificateType;