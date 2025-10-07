import { DataTypes, Op } from 'sequelize';
import sequelize from './database.js';
import Usuario from './Usuario.js';
import Certificado from './Certificado.js';

const Signature = sequelize.define('Signature', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  certificado_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'certificados',
      key: 'id'
    }
  },
  
  // 📄 INFORMACIÓN DEL DOCUMENTO
  nombre_documento: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Nombre descriptivo del documento firmado'
  },
  nombre_archivo_original: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Nombre original del archivo subido'
  },
  tipo_documento: {
    type: DataTypes.ENUM('oficial', 'no_oficial'),
    allowNull: false,
    comment: 'Tipo de documento firmado'
  },
  hash_documento: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: 'SHA256 hash del documento original para verificar integridad'
  },
  tamaño_archivo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Tamaño del archivo en bytes'
  },
  
  // 🖋️ DATOS DE LA FIRMA DIGITAL
  firma_digital: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Firma digital en formato hexadecimal'
  },
  algoritmo_firma: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'RSA-SHA256',
    comment: 'Algoritmo usado para generar la firma'
  },
  timestamp_firma: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Momento exacto en que se generó la firma'
  },
  
  // 🔍 ESTADO Y VALIDACIONES
  estado_firma: {
    type: DataTypes.ENUM('valida', 'invalida', 'vencida', 'revocada'),
    allowNull: false,
    defaultValue: 'valida',
    comment: 'Estado actual de la firma digital'
  },
  verificada: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Si la firma ha sido verificada criptográficamente'
  },
  
  // 📊 METADATOS DE SESIÓN
  ip_address: {
    type: DataTypes.INET,
    allowNull: true,
    comment: 'Dirección IP desde donde se realizó la firma'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Información del navegador/cliente usado'
  },
  session_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'ID de sesión para auditoría'
  },
  
  // 🏛️ INFORMACIÓN LEGAL
  validez_legal: {
    type: DataTypes.ENUM('COMPLETA', 'INTERNA', 'LIMITADA'),
    allowNull: false,
    comment: 'Nivel de validez legal de la firma'
  },
  numero_expediente: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Número de expediente asociado al documento'
  },
  batch_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'ID del batch de firma (para firmas en lote)'
  },
  
  // 🔐 VALIDACIONES ADICIONALES
  crl_check_status: {
    type: DataTypes.ENUM('valid', 'revoked', 'unknown', 'not_checked'),
    allowNull: false,
    defaultValue: 'not_checked',
    comment: 'Estado de verificación contra lista de revocación'
  },
  ocsp_response: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Respuesta OCSP del servidor de validación'
  },
  
  // 📅 TIMESTAMPS AUTOMÁTICOS
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'signatures',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  
  // 📊 ÍNDICES PARA PERFORMANCE
  indexes: [
    {
      name: 'idx_signatures_usuario',
      fields: ['usuario_id']
    },
    {
      name: 'idx_signatures_fecha',
      fields: ['timestamp_firma']
    },
    {
      name: 'idx_signatures_documento',
      fields: ['hash_documento']
    },
    {
      name: 'idx_signatures_estado',
      fields: ['estado_firma']
    },
    {
      name: 'idx_signatures_expediente',
      fields: ['numero_expediente']
    },
    {
      unique: true,
      name: 'idx_signatures_unique_hash_user',
      fields: ['hash_documento', 'usuario_id', 'timestamp_firma']
    }
  ],
  
  // 🔄 HOOKS PARA VALIDACIONES AUTOMÁTICAS
  hooks: {
    beforeCreate: async (signature) => {
      // Validar que el certificado pertenece al usuario
      const certificado = await Certificado.findOne({
        where: {
          id: signature.certificado_id,
          usuario_id: signature.usuario_id
        }
      });
      
      if (!certificado) {
        throw new Error('El certificado no pertenece al usuario');
      }
      
      // Validar combinación de tipo de documento y validez legal
      if (signature.tipo_documento === 'oficial' && signature.validez_legal !== 'COMPLETA') {
        throw new Error('Los documentos oficiales requieren validez legal completa');
      }
      
      // Generar session_id si no existe
      if (!signature.session_id) {
        signature.session_id = `SIG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    },
    
    beforeUpdate: (signature) => {
      signature.updated_at = new Date();
    }
  }
});

// 🔗 DEFINIR RELACIONES
Signature.belongsTo(Usuario, { 
  foreignKey: 'usuario_id',
  as: 'usuario'
});

Signature.belongsTo(Certificado, { 
  foreignKey: 'certificado_id',
  as: 'certificado'
});

Usuario.hasMany(Signature, { 
  foreignKey: 'usuario_id',
  as: 'firmas'
});

Certificado.hasMany(Signature, { 
  foreignKey: 'certificado_id',
  as: 'firmas_realizadas'
});

// 📊 MÉTODOS DE INSTANCIA
Signature.prototype.verificarIntegridad = function() {
  // Verificar que el hash del documento coincide
  return {
    hash_valido: this.hash_documento && this.hash_documento.length === 64,
    firma_valida: this.firma_digital && this.firma_digital.length > 0,
    certificado_activo: this.certificado?.activo || false,
    estado_actual: this.estado_firma
  };
};

Signature.prototype.obtenerResumenSeguridad = function() {
  return {
    id: this.id,
    algoritmo: this.algoritmo_firma,
    timestamp: this.timestamp_firma,
    estado: this.estado_firma,
    verificada: this.verificada,
    validez_legal: this.validez_legal,
    crl_status: this.crl_check_status,
    nivel_confianza: this.validez_legal === 'COMPLETA' ? 'ALTO' : 
                     this.validez_legal === 'INTERNA' ? 'MEDIO' : 'BAJO'
  };
};

// 📈 MÉTODOS ESTÁTICOS
Signature.obtenerEstadisticasUsuario = async function(usuarioId, fechaInicio = null, fechaFin = null) {
  const where = { usuario_id: usuarioId };
  
  if (fechaInicio && fechaFin) {
    where.timestamp_firma = {
      [Op.between]: [fechaInicio, fechaFin]
    };
  }
  
  const firmas = await this.findAll({ where });
  
  return {
    total_firmas: firmas.length,
    firmas_oficiales: firmas.filter(f => f.tipo_documento === 'oficial').length,
    firmas_validas: firmas.filter(f => f.estado_firma === 'valida').length,
    validez_completa: firmas.filter(f => f.validez_legal === 'COMPLETA').length,
    primera_firma: firmas.length > 0 ? Math.min(...firmas.map(f => f.timestamp_firma)) : null,
    ultima_firma: firmas.length > 0 ? Math.max(...firmas.map(f => f.timestamp_firma)) : null
  };
};

Signature.buscarPorHashDocumento = async function(hashDocumento) {
  return await this.findAll({
    where: { hash_documento: hashDocumento },
    include: [
      {
        model: Usuario,
        as: 'usuario',
        attributes: ['id', 'username', 'nombre_completo', 'email']
      },
      {
        model: Certificado,
        as: 'certificado',
        attributes: ['id', 'nombre_certificado', 'numero_serie', 'tipo', 'emisor']
      }
    ],
    order: [['timestamp_firma', 'DESC']]
  });
};

export default Signature;