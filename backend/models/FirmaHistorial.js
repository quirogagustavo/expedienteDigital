import { DataTypes } from 'sequelize';

const createFirmaHistorialModel = (sequelize) => {
  const FirmaHistorial = sequelize.define('FirmaHistorial', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    usuario_firma_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'usuarios_firmas',
        key: 'id'
      },
      allowNull: true // Puede ser null si la firma se eliminó
    },
    documento_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'expediente_documentos',
        key: 'id'
      },
      allowNull: false
    },
    expediente_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'expedientes',
        key: 'id'
      },
      allowNull: false
    },
    accion: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['aplicada', 'removida', 'actualizada', 'regenerada']]
      }
    },
    posicion_x: {
      type: DataTypes.INTEGER,
      validate: {
        min: 0,
        max: 1000
      }
    },
    posicion_y: {
      type: DataTypes.INTEGER,
      validate: {
        min: 0,
        max: 1000
      }
    },
    tamaño_aplicado: {
      type: DataTypes.STRING(20),
      validate: {
        isIn: [['pequeño', 'mediano', 'grande', 'custom']]
      }
    },
    pagina_numero: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    fecha_aplicacion: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    aplicada_por: {
      type: DataTypes.INTEGER,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false
    }
  }, {
    tableName: 'firmas_historial',
    underscored: true,
    timestamps: false, // Usamos fecha_aplicacion en su lugar
    
    // Métodos de instancia
    instanceMethods: {
      // Obtener información completa del historial
      getInfoCompleta() {
        return {
          id: this.id,
          accion: this.accion,
          posicion: {
            x: this.posicion_x,
            y: this.posicion_y
          },
          tamaño: this.tamaño_aplicado,
          pagina: this.pagina_numero,
          fecha: this.fecha_aplicacion,
          metadata: this.metadata
        };
      }
    }
  });

  // Métodos de clase
  FirmaHistorial.registrarAplicacion = function(datos) {
    return this.create({
      usuario_firma_id: datos.firmaId,
      documento_id: datos.documentoId,
      expediente_id: datos.expedienteId,
      accion: 'aplicada',
      posicion_x: datos.posicion?.x || 50,
      posicion_y: datos.posicion?.y || 50,
      tamaño_aplicado: datos.tamaño || 'mediano',
      pagina_numero: datos.pagina || 1,
      aplicada_por: datos.usuarioId,
      metadata: datos.metadata || {}
    });
  };

  FirmaHistorial.obtenerHistorialDocumento = function(documentoId) {
    return this.findAll({
      where: { documento_id: documentoId },
      order: [['fecha_aplicacion', 'DESC']],
      include: [
        {
          association: 'usuarioFirma',
          attributes: ['firma_nombre', 'firma_tipo']
        },
        {
          association: 'aplicadoPor',
          attributes: ['nombre_completo', 'email']
        }
      ]
    });
  };

  return FirmaHistorial;
};

export default createFirmaHistorialModel;