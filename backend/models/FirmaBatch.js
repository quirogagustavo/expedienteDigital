import { DataTypes } from 'sequelize';

const createFirmaBatchModel = (sequelize) => {
  const FirmaBatch = sequelize.define('FirmaBatch', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    batch_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    expediente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'expedientes',
        key: 'id'
      }
    },
    usuario_firmante: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    tipo_firma: {
      type: DataTypes.ENUM('batch', 'validez_extendida', 'escalonada'),
      allowNull: false
    },
    signature_data: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Firma digital del batch'
    },
    hash_combinado: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'Hash combinado de todos los documentos'
    },
    timestamp_firma: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    cantidad_documentos: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    datos_firmante: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Información del firmante'
    },
    certificado_usado: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'certificados',
        key: 'id'
      }
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'firma_batch',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['batch_id']
      },
      {
        fields: ['expediente_id']
      },
      {
        fields: ['usuario_firmante']
      },
      {
        fields: ['timestamp_firma']
      }
    ]
  });

  return FirmaBatch;
};

export default createFirmaBatchModel;