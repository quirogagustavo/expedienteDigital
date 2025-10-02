import { Sequelize } from 'sequelize';

// Configuración de la base de datos
const sequelize = new Sequelize('firma_digital', 'postgres', 'JulSanFed219$', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false, // Cambia a console.log para ver las consultas SQL
  define: {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    underscored: true // Usa snake_case para nombres de columnas
  }
});

// Importar modelos básicos
import Usuario from './Usuario.js';
import Certificado from './Certificado.js';

// Función para inicializar datos predeterminados
export async function initializeDefaultData() {
  try {
    console.log('Inicializando datos predeterminados...');

    // Crear usuario administrador predeterminado si no existe
    const [adminUser, created] = await Usuario.findOrCreate({
      where: { username: 'admin' },
      defaults: {
        username: 'admin',
        password_hash: '$2b$10$rXvdkF6FhGjzGhvJQY5wYe7xpvF6rz3mWBgL4yDQXZ7TQXzNQXZ7T', // password: admin123
        nombre_completo: 'Administrador del Sistema',
        email: 'admin@sistema.gov.ar',
        rol_usuario: 'administrador'
      }
    });

    if (created) {
      console.log('Usuario administrador creado correctamente');
    }

    console.log('Datos predeterminados inicializados correctamente');
  } catch (error) {
    console.error('Error al inicializar datos predeterminados:', error);
  }
}

// Exportar sequelize
export default sequelize;