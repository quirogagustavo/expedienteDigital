import { DataTypes } from 'sequelize';
import sequelize from './database.js';

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre_documento: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tipo_documento: {
    type: DataTypes.ENUM('oficial', 'no_oficial'),
    allowNull: false,
    comment: 'oficial: requiere firma gubernamental, no_oficial: permite firma local'
  },
  requiere_firma_gubernamental: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ruta_archivo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  hash_documento: {
    type: DataTypes.STRING,
    allowNull: true
  },
  estado_firma: {
    type: DataTypes.ENUM('sin_firmar', 'firmado_local', 'firmado_gubernamental'),
    allowNull: false,
    defaultValue: 'sin_firmar'
  },
  expediente_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID del expediente al que pertenece este documento'
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  fecha_firma: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: false,
  tableName: 'documents',
  hooks: {
    // Hook para determinar automáticamente si requiere firma gubernamental
    beforeCreate: (document) => {
      document.requiere_firma_gubernamental = document.tipo_documento === 'oficial';
    },
    beforeUpdate: (document) => {
      if (document.changed('tipo_documento')) {
        document.requiere_firma_gubernamental = document.tipo_documento === 'oficial';
      }
    }
  }
});

// Método para determinar el tipo de certificado requerido
Document.prototype.getTipoFirmaRequerida = function() {
  return this.tipo_documento === 'oficial' ? 'gubernamental' : 'local';
};

// Método para validar si puede firmarse con un tipo de certificado específico
Document.prototype.puedeSerFirmadoCon = function(tipoCertificado) {
  if (this.tipo_documento === 'oficial') {
    return tipoCertificado === 'gubernamental';
  } else {
    return true; // Los documentos no oficiales pueden firmarse con cualquier tipo
  }
};

export default Document;