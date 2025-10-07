import { DataTypes } from 'sequelize';

const createExpedienteModel = (sequelize) => {
  const Expediente = sequelize.define('Expediente', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    numero_expediente: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    titulo: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    estado: {
      type: DataTypes.ENUM('borrador', 'en_proceso', 'consolidado', 'cerrado'),
      defaultValue: 'borrador'
    },
    tipo_expediente: {
      type: DataTypes.ENUM('licitacion', 'contratacion', 'administrativo', 'juridico', 'tecnico', 'otro'),
      defaultValue: 'administrativo'
    },
    prioridad: {
      type: DataTypes.ENUM('baja', 'normal', 'alta', 'urgente'),
      defaultValue: 'normal'
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    fecha_consolidacion: {
      type: DataTypes.DATE,
      allowNull: true
    },
    fecha_cierre: {
      type: DataTypes.DATE,
      allowNull: true
    },
    usuario_responsable: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    reparticion: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    archivo_consolidado: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Ruta del PDF consolidado final'
    },
    hash_consolidado: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'Hash SHA-256 del expediente consolidado'
    },
    metadatos: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Información adicional específica del tipo de expediente'
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    oficina_actual_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'oficinas',
        key: 'id'
      }
    },
    estado_workflow: {
      type: DataTypes.ENUM('iniciado', 'en_tramite', 'pendiente_revision', 'con_observaciones', 'aprobado', 'rechazado', 'archivado'),
      defaultValue: 'iniciado'
    }
  }, {
    tableName: 'expedientes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['numero_expediente']
      },
      {
        fields: ['estado']
      },
      {
        fields: ['usuario_responsable']
      },
      {
        fields: ['reparticion']
      },
      {
        fields: ['fecha_creacion']
      }
    ]
  });

  return Expediente;
};

export default createExpedienteModel;