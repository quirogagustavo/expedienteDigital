import { DataTypes } from 'sequelize';

// Proveedores de CA (Autoridades Certificadoras)
const CertificateAuthority = (sequelize) => {
  return sequelize.define('CertificateAuthority', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
      // 'Internal CA', 'AFIP Argentina', 'ONTI', 'DigiCert', 'GlobalSign'
    },
    country: {
      type: DataTypes.STRING(2), // ISO country code
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM,
      values: ['internal', 'government', 'commercial'],
      allowNull: false
    },
    api_endpoint: {
      type: DataTypes.STRING,
      allowNull: true // Solo para CAs externas
    },
    api_key: {
      type: DataTypes.TEXT,
      allowNull: true // Solo para CAs externas (encriptada)
    },
    is_trusted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false // Indicador de confianza (gubernamental, comercial verificado)
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'certificate_authorities'
  });
};

export default CertificateAuthority;