import { DataTypes } from 'sequelize';

const createExpedienteDocumentoModel = (sequelize) => {
  const ExpedienteDocumento = sequelize.define('ExpedienteDocumento', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    expediente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'expedientes',
        key: 'id'
      }
    },
    numero_foja: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Número de foja dentro del expediente'
    },
    foja_inicial: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Foja inicial del documento en el expediente'
    },
    foja_final: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Foja final del documento en el expediente'
    },
    cantidad_paginas: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: 'Cantidad de páginas del documento PDF'
    },
    documento_nombre: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    documento_tipo: {
      type: DataTypes.ENUM('iniciacion', 'informe', 'dictamen', 'resolucion', 'anexo', 'notificacion', 'otro'),
      allowNull: false
    },
    archivo_path: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Ruta del archivo original'
    },
    archivo_firmado_path: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Ruta del archivo firmado'
    },
    hash_documento: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'Hash SHA-256 del documento original'
    },
    orden_secuencial: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Orden dentro del expediente'
    },
    fecha_agregado: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    usuario_agregado: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    estado_firma: {
      type: DataTypes.ENUM('pendiente', 'firmado', 'rechazado'),
      defaultValue: 'pendiente'
    },
    fecha_firma: {
      type: DataTypes.DATE,
      allowNull: true
    },
    hash_firma: {
      type: DataTypes.STRING(512),
      allowNull: true,
      comment: 'Hash de la firma digital del documento'
    },
    usuario_firmante: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Usuario que firmó el documento'
    },
    signature_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'signatures',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Referencia a la tabla signatures'
    },
    requiere_firma: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    visible_publico: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si el documento es visible al público'
    },
    metadatos: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Información adicional del documento'
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    oficina_agregado_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'oficinas',
        key: 'id'
      },
      comment: 'Oficina que agregó este documento'
    },
    usuario_agregado_workflow: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Usuario que agregó el documento en el workflow'
    }
  }, {
    tableName: 'expediente_documentos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['expediente_id', 'numero_foja']
      },
      {
        fields: ['expediente_id', 'orden_secuencial']
      },
      {
        fields: ['estado_firma']
      },
      {
        fields: ['documento_tipo']
      },
      {
        fields: ['signature_id']
      }
    ]
  });

  return ExpedienteDocumento;
};

export default createExpedienteDocumentoModel;