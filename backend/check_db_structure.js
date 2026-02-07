import sequelize from './models/database.js';

async function checkStructure() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la base de datos');

    // Ver columnas de la tabla usuarios
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'usuarios'
      ORDER BY ordinal_position;
    `);

    console.log('\n=== Columnas de la tabla usuarios ===');
    console.log(JSON.stringify(results, null, 2));

    // Ver si la tabla existe
    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'usuarios'
      );
    `);

    console.log('\n=== ¿Existe la tabla usuarios? ===');
    console.log(tableExists[0].exists);

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkStructure();
