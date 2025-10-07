import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('firma_digital', 'postgres', 'JulSanFed219$', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

async function crearTablaFirmas() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');
    
    // Crear tabla usuarios_firmas
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS usuarios_firmas (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        firma_nombre VARCHAR(255) NOT NULL,
        firma_imagen BYTEA NOT NULL,
        firma_tipo VARCHAR(10) NOT NULL CHECK (firma_tipo IN ('png', 'jpg', 'jpeg', 'svg')),
        tamaño_archivo INTEGER NOT NULL CHECK (tamaño_archivo <= 5242880),
        ancho_pixels INTEGER,
        alto_pixels INTEGER,
        activa BOOLEAN DEFAULT true,
        es_predeterminada BOOLEAN DEFAULT false,
        fecha_subida TIMESTAMP DEFAULT NOW(),
        subida_por INTEGER REFERENCES usuarios(id),
        metadatos JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Tabla usuarios_firmas creada');
    
    // Crear índices
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_usuarios_firmas_usuario_id ON usuarios_firmas(usuario_id)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_usuarios_firmas_activa ON usuarios_firmas(activa)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_usuarios_firmas_predeterminada ON usuarios_firmas(es_predeterminada)');
    
    console.log('✅ Índices creados');
    
    // Crear tabla de historial
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS firmas_historial (
        id SERIAL PRIMARY KEY,
        usuario_firma_id INTEGER REFERENCES usuarios_firmas(id),
        documento_id INTEGER REFERENCES expediente_documentos(id),
        expediente_id INTEGER REFERENCES expedientes(id),
        accion VARCHAR(50) NOT NULL,
        posicion_x INTEGER,
        posicion_y INTEGER,
        tamaño_aplicado VARCHAR(20),
        pagina_numero INTEGER DEFAULT 1,
        fecha_aplicacion TIMESTAMP DEFAULT NOW(),
        aplicada_por INTEGER REFERENCES usuarios(id),
        metadata JSONB DEFAULT '{}'
      )
    `);
    
    console.log('✅ Tabla firmas_historial creada');
    
    // Verificar estructura
    const [tablas] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%firma%'"
    );
    
    console.log('\n📋 Tablas de firmas creadas:');
    tablas.forEach(tabla => console.log('- ' + tabla.table_name));
    
    await sequelize.close();
    console.log('\n🎉 Base de datos lista para gestión de firmas!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
  }
}

crearTablaFirmas();