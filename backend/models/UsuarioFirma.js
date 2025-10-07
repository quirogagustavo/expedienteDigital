import { DataTypes } from 'sequelize';

const createUsuarioFirmaModel = (sequelize) => {
  const UsuarioFirma = sequelize.define('UsuarioFirma', {
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
      },
      onDelete: 'CASCADE'
    },
    firma_nombre: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    firma_imagen: {
      type: DataTypes.BLOB,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    firma_tipo: {
      type: DataTypes.ENUM('png', 'jpg', 'jpeg', 'svg'),
      allowNull: false,
      validate: {
        isIn: [['png', 'jpg', 'jpeg', 'svg']]
      }
    },
    tamaño_archivo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5242880 // 5MB máximo
      }
    },
    ancho_pixels: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 2000
      }
    },
    alto_pixels: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 500
      }
    },
    activa: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    es_predeterminada: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    fecha_subida: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    subida_por: {
      type: DataTypes.INTEGER,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      allowNull: true
    },
    metadatos: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false
    }
  }, {
    tableName: 'usuarios_firmas',
    underscored: true,
    timestamps: true,
    
    // Hooks para validaciones adicionales
    hooks: {
      beforeCreate: async (usuarioFirma) => {
        // Si se marca como predeterminada, desmarcar las demás
        if (usuarioFirma.es_predeterminada) {
          await UsuarioFirma.update(
            { es_predeterminada: false },
            { where: { usuario_id: usuarioFirma.usuario_id } }
          );
        }
      },
      
      beforeUpdate: async (usuarioFirma) => {
        // Si se marca como predeterminada, desmarcar las demás
        if (usuarioFirma.es_predeterminada) {
          await UsuarioFirma.update(
            { es_predeterminada: false },
            { 
              where: { 
                usuario_id: usuarioFirma.usuario_id,
                id: { [sequelize.Sequelize.Op.ne]: usuarioFirma.id }
              } 
            }
          );
        }
      }
    },
    
    // Métodos de instancia
    instanceMethods: {
      // Obtener URL de la imagen (base64)
      getImagenBase64() {
        if (this.firma_imagen) {
          return `data:image/${this.firma_tipo};base64,${this.firma_imagen.toString('base64')}`;
        }
        return null;
      },
      
      // Verificar si la firma está activa
      estaActiva() {
        return this.activa === true;
      },
      
      // Obtener información completa de la firma
      getInfo() {
        return {
          id: this.id,
          nombre: this.firma_nombre,
          tipo: this.firma_tipo,
          tamaño: this.tamaño_archivo,
          dimensiones: {
            ancho: this.ancho_pixels,
            alto: this.alto_pixels
          },
          activa: this.activa,
          predeterminada: this.es_predeterminada,
          fechaSubida: this.fecha_subida,
          metadatos: this.metadatos
        };
      }
    }
  });

  // Métodos de clase (estáticos)
  UsuarioFirma.findFirmaPredeterminada = function(usuarioId) {
    return this.findOne({
      where: {
        usuario_id: usuarioId,
        es_predeterminada: true,
        activa: true
      }
    });
  };

  UsuarioFirma.findFirmasActivas = function(usuarioId) {
    return this.findAll({
      where: {
        usuario_id: usuarioId,
        activa: true
      },
      order: [
        ['es_predeterminada', 'DESC'],
        ['fecha_subida', 'DESC']
      ]
    });
  };

  UsuarioFirma.establecerPredeterminada = async function(firmaId, usuarioId) {
    // Primero desmarcar todas las firmas predeterminadas del usuario
    await this.update(
      { es_predeterminada: false },
      { where: { usuario_id: usuarioId } }
    );
    
    // Luego marcar la nueva como predeterminada
    return await this.update(
      { es_predeterminada: true },
      { where: { id: firmaId, usuario_id: usuarioId } }
    );
  };

  return UsuarioFirma;
};

export default createUsuarioFirmaModel;