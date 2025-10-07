module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('expediente_workflow', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      expediente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'expedientes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      oficina_actual_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'oficinas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      oficina_origen_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'oficinas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      estado: {
        type: Sequelize.ENUM(
          'en_tramite',
          'pendiente_revision',
          'con_observaciones',
          'aprobado',
          'rechazado',
          'archivado',
          'derivado'
        ),
        defaultValue: 'en_tramite'
      },
      prioridad: {
        type: Sequelize.ENUM('baja', 'normal', 'alta', 'urgente'),
        defaultValue: 'normal'
      },
      fecha_recepcion: {
        type: Sequelize.DATE,
        allowNull: true
      },
      fecha_vencimiento: {
        type: Sequelize.DATE,
        allowNull: true
      },
      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      usuario_asignado: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('expediente_workflow');
  }
};