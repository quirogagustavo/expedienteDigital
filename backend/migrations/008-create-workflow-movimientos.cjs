module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('workflow_movimientos', {
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
      oficina_destino_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'oficinas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      estado_anterior: {
        type: Sequelize.STRING,
        allowNull: true
      },
      estado_nuevo: {
        type: Sequelize.STRING,
        allowNull: false
      },
      motivo: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      usuario_movimiento: {
        type: Sequelize.STRING,
        allowNull: false
      },
      fecha_movimiento: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      documentos_agregados: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'IDs de documentos agregados en este movimiento'
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
    await queryInterface.dropTable('workflow_movimientos');
  }
};
