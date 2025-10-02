import { Umzug, SequelizeStorage } from 'umzug';
import sequelize from './models/database.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, 'migrations', '*.js'),
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

// Función para ejecutar migraciones pendientes
export const runMigrations = async () => {
  try {
    console.log('Ejecutando migraciones...');
    const migrations = await umzug.up();
    console.log('Migraciones ejecutadas:', migrations.map(m => m.name));
  } catch (error) {
    console.error('Error al ejecutar migraciones:', error);
    throw error;
  }
};

// Función para revertir migraciones
export const revertMigrations = async () => {
  try {
    console.log('Revirtiendo migraciones...');
    const migrations = await umzug.down();
    console.log('Migraciones revertidas:', migrations.map(m => m.name));
  } catch (error) {
    console.error('Error al revertir migraciones:', error);
    throw error;
  }
};

// Si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'up':
      await runMigrations();
      break;
    case 'down':
      await revertMigrations();
      break;
    default:
      console.log('Uso: node migrate.js [up|down]');
  }
  
  process.exit(0);
}