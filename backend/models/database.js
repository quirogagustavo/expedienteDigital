import { Sequelize } from 'sequelize';

// Configuración de la base de datos
const sequelize = new Sequelize('firma_digital', 'postgres', 'JulSanFed219$', {
  host: 'localhost',
  dialect: 'postgres',
  logging: console.log, // Ver las consultas SQL para debug
  define: {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    underscored: true // Usa snake_case para nombres de columnas
  }
});

export default sequelize;