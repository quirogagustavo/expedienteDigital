module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hasColumn = async (tableName, columnName) => {
      try {
        const desc = await queryInterface.describeTable(tableName);
        return !!desc[columnName];
      } catch (e) {
        return false;
      }
    };

    if (!(await hasColumn('expedientes', 'oficina_actual_id'))){
      await queryInterface.addColumn('expedientes', 'oficina_actual_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'oficinas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    if (!(await hasColumn('expedientes', 'estado_workflow'))){
      await queryInterface.addColumn('expedientes', 'estado_workflow', {
        type: Sequelize.ENUM(
          'iniciado',
          'en_tramite', 
          'pendiente_revision',
          'con_observaciones',
          'aprobado',
          'rechazado',
          'archivado'
        ),
        defaultValue: 'iniciado'
      });
    }

    if (!(await hasColumn('expediente_documentos', 'oficina_agregado_id'))){
      await queryInterface.addColumn('expediente_documentos', 'oficina_agregado_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'oficinas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    if (!(await hasColumn('expediente_documentos', 'usuario_agregado'))){
      await queryInterface.addColumn('expediente_documentos', 'usuario_agregado', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('expedientes', 'oficina_actual_id');
    await queryInterface.removeColumn('expedientes', 'estado_workflow');
    await queryInterface.removeColumn('expediente_documentos', 'oficina_agregado_id');
    await queryInterface.removeColumn('expediente_documentos', 'usuario_agregado');
  }
};
