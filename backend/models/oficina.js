module.exports = (sequelize, DataTypes) => {
  const Oficina = sequelize.define('Oficina', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    codigo: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true
    },
    responsable: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    telefono: {
      type: DataTypes.STRING,
      allowNull: true
    },
    activa: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'oficinas',
    underscored: true,
    timestamps: true
  });

  Oficina.associate = function(models) {
    // Una oficina puede tener muchos expedientes actualmente
    Oficina.hasMany(models.Expediente, {
      foreignKey: 'oficina_actual_id',
      as: 'expedientes_actuales'
    });

    // Una oficina puede ser origen/destino de muchos movimientos
    Oficina.hasMany(models.WorkflowMovimiento, {
      foreignKey: 'oficina_origen_id',
      as: 'movimientos_enviados'
    });

    Oficina.hasMany(models.WorkflowMovimiento, {
      foreignKey: 'oficina_destino_id',
      as: 'movimientos_recibidos'
    });

    // Una oficina puede agregar muchos documentos
    Oficina.hasMany(models.ExpedienteDocumento, {
      foreignKey: 'oficina_agregado_id',
      as: 'documentos_agregados'
    });
  };

  return Oficina;
};