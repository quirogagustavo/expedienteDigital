import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Cargar variables de entorno desde backend/.env si existe
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const DB_NAME = process.env.DB_NAME || 'expediente_digital';
const DB_USER = process.env.DB_USER || 'expediente_user';
const DB_PASS = process.env.DB_PASS || 'MMineria$2017';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_DIALECT = process.env.DB_DIALECT || 'postgres';

// Configuración de la base de datos (usa variables de entorno)
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  dialect: DB_DIALECT,
  logging: false, // Deshabilitar logs SQL en producción
  define: {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    underscored: true, // Usa snake_case para nombres de columnas
    freezeTableName: true // No pluralizar nombres de tablas automáticamente
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

export default sequelize;