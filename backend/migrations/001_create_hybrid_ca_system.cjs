module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;
    // Helper para comprobar existencia de tabla/columna
    const hasTable = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch (e) {
        return false;
      }
    };

    // Crear tabla certificate_types si no existe
    if (!(await hasTable('certificate_types'))){
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
        type: DataTypes.ENUM('corporate', 'government'),
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
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
  });
  }

    // Crear tabla certificate_authorities si no existe
    if (!(await hasTable('certificate_authorities'))){
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
        type: DataTypes.ENUM('internal', 'government', 'commercial'),
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
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
  });
  }

    // Añadir nuevas columnas a la tabla certificados (si no existen)
    const hasColumn = async (tableName, columnName) => {
      try {
        const desc = await queryInterface.describeTable(tableName);
        return !!desc[columnName];
      } catch (e) {
        return false;
      }
    };

    if (!(await hasColumn('certificados', 'certificate_type_id'))){
      await queryInterface.addColumn('certificados', 'certificate_type_id', {
        type: DataTypes.INTEGER,
        allowNull: true, // Temporal para migración
        references: {
          model: 'certificate_types',
          key: 'id'
        }
      });
    }

    if (!(await hasColumn('certificados', 'certificate_authority_id'))){
      await queryInterface.addColumn('certificados', 'certificate_authority_id', {
        type: DataTypes.INTEGER,
        allowNull: true, // Temporal para migración
        references: {
          model: 'certificate_authorities',
          key: 'id'
        }
      });
    }

    if (!(await hasColumn('certificados', 'external_certificate_id'))){
      await queryInterface.addColumn('certificados', 'external_certificate_id', {
        type: DataTypes.STRING,
        allowNull: true
      });
    }

    if (!(await hasColumn('certificados', 'status'))){
      await queryInterface.addColumn('certificados', 'status', {
        type: DataTypes.ENUM('pending', 'active', 'expired', 'revoked', 'rejected'),
        defaultValue: 'active'
      });
    }

    if (!(await hasColumn('certificados', 'validation_data'))){
      await queryInterface.addColumn('certificados', 'validation_data', {
        type: DataTypes.JSON,
        allowNull: true
      });
    }

    if (!(await hasColumn('certificados', 'serial_number'))){
      await queryInterface.addColumn('certificados', 'serial_number', {
        type: DataTypes.STRING,
        allowNull: true
      });
    }

    if (!(await hasColumn('certificados', 'issuer_dn'))){
      await queryInterface.addColumn('certificados', 'issuer_dn', {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }

    if (!(await hasColumn('certificados', 'subject_dn'))){
      await queryInterface.addColumn('certificados', 'subject_dn', {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
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
  }
};
