import { DataTypes } from 'sequelize';

export default function createWorkflowMovimientoModel(sequelize) {
  const WorkflowMovimiento = sequelize.define('WorkflowMovimiento', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    expediente_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    oficina_origen_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    oficina_destino_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    estado_anterior: {
      type: DataTypes.STRING,
      allowNull: true
    },
    estado_nuevo: {
      type: DataTypes.STRING,
      allowNull: false
    },
    motivo: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    usuario_movimiento: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fecha_movimiento: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    documentos_agregados: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'workflow_movimientos',
    underscored: true,
    timestamps: true
  });

  return WorkflowMovimiento;
}
