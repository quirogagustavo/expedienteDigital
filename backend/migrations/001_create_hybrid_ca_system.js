// Migración para crear las tablas del sistema de CA híbrida
import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface) => {
  // Crear tabla certificate_types
  await queryInterface.createTable('certificate_types', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    validity_level: {
      type: Sequelize.ENUM('corporate', 'government'),
      allowNull: false
    },
    processing_time: {
      type: DataTypes.STRING,
      allowNull: false
    },
    requires_identity_verification: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  // Crear tabla certificate_authorities
  await queryInterface.createTable('certificate_authorities', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    country: {
      type: DataTypes.STRING(2),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM,
      values: ['internal', 'government', 'commercial'],
      allowNull: false
    },
    api_endpoint: {
      type: DataTypes.STRING,
      allowNull: true
    },
    api_key: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_trusted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  // Añadir nuevas columnas a la tabla certificados
  await queryInterface.addColumn('certificados', 'certificate_type_id', {
    type: DataTypes.INTEGER,
    allowNull: true, // Temporal para migración
    references: {
      model: 'certificate_types',
      key: 'id'
    }
  });

  await queryInterface.addColumn('certificados', 'certificate_authority_id', {
    type: DataTypes.INTEGER,
    allowNull: true, // Temporal para migración
    references: {
      model: 'certificate_authorities',
      key: 'id'
    }
  });

  await queryInterface.addColumn('certificados', 'external_certificate_id', {
    type: DataTypes.STRING,
    allowNull: true
  });

  await queryInterface.addColumn('certificados', 'status', {
    type: DataTypes.ENUM,
    values: ['pending', 'active', 'expired', 'revoked', 'rejected'],
    defaultValue: 'active'
  });

  await queryInterface.addColumn('certificados', 'validation_data', {
    type: DataTypes.JSON,
    allowNull: true
  });

  await queryInterface.addColumn('certificados', 'serial_number', {
    type: DataTypes.STRING,
    allowNull: true
  });

  await queryInterface.addColumn('certificados', 'issuer_dn', {
    type: DataTypes.TEXT,
    allowNull: true
  });

  await queryInterface.addColumn('certificados', 'subject_dn', {
    type: DataTypes.TEXT,
    allowNull: true
  });
};

export const down = async (queryInterface) => {
  // Remover columnas añadidas a certificados
  await queryInterface.removeColumn('certificados', 'certificate_type_id');
  await queryInterface.removeColumn('certificados', 'certificate_authority_id');
  await queryInterface.removeColumn('certificados', 'external_certificate_id');
  await queryInterface.removeColumn('certificados', 'status');
  await queryInterface.removeColumn('certificados', 'validation_data');
  await queryInterface.removeColumn('certificados', 'serial_number');
  await queryInterface.removeColumn('certificados', 'issuer_dn');
  await queryInterface.removeColumn('certificados', 'subject_dn');

  // Eliminar tablas
  await queryInterface.dropTable('certificate_authorities');
  await queryInterface.dropTable('certificate_types');
};