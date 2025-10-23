// Reutilizar la instancia principal de sequelize en lugar de crear una nueva
import sequelize from './database.js';

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