import sequelize from './database.js';
import Usuario from './Usuario.js';
import Certificado from './Certificado.js';
import Document from './Document.js';
import Signature from './Signature.js';
import sequelizeExtended, { initializeDefaultData } from './databaseExtended.js';

// Sincronizar todos los modelos con la base de datos
const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');
    
    // Sincronizar modelos básicos sin alterar estructura existente
    await sequelize.sync({ force: false });
    console.log('Tablas básicas sincronizadas correctamente.');

    // Sincronizar modelos extendidos para CA híbrida
    await sequelizeExtended.authenticate();
    console.log('Conexión extendida a la base de datos establecida.');
    
    await sequelizeExtended.sync({ force: false });
    console.log('Tablas extendidas sincronizadas correctamente.');
    
    // Inicializar datos predeterminados
    await initializeDefaultData();
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
    throw error; // Re-lanzar el error para que el servidor no se inicie si la BD falla
  }
};

export {
  sequelize,
  Usuario,
  Certificado,
  Document,
  Signature,
  syncDatabase
};