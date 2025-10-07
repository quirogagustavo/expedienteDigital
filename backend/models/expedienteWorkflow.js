module.exports = (sequelize, DataTypes) => {
  const ExpedienteWorkflow = sequelize.define('ExpedienteWorkflow', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    expediente_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    oficina_actual_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    oficina_origen_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    estado: {
      type: DataTypes.ENUM(
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
      type: DataTypes.ENUM('baja', 'normal', 'alta', 'urgente'),
      defaultValue: 'normal'
    },
    fecha_recepcion: {
      type: DataTypes.DATE,
      allowNull: true
    },
    fecha_vencimiento: {
      type: DataTypes.DATE,
      allowNull: true
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    usuario_asignado: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'expediente_workflow',
    underscored: true,
    timestamps: true
  });

  ExpedienteWorkflow.associate = function(models) {
    // Pertenece a un expediente
    ExpedienteWorkflow.belongsTo(models.Expediente, {
      foreignKey: 'expediente_id',
      as: 'expediente'
    });

    // Pertenece a una oficina actual
    ExpedienteWorkflow.belongsTo(models.Oficina, {
      foreignKey: 'oficina_actual_id',
      as: 'oficina_actual'
    });

    // Pertenece a una oficina origen
    ExpedienteWorkflow.belongsTo(models.Oficina, {
      foreignKey: 'oficina_origen_id',
      as: 'oficina_origen'
    });
  };

  return ExpedienteWorkflow;
};