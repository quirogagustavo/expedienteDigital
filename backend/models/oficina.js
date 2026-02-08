import { DataTypes } from 'sequelize';

export default function createOficinaModel(sequelize) {
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

  return Oficina;
}
