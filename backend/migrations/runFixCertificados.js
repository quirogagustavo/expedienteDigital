#!/usr/bin/env node

/**
 * Script para ejecutar la migración de corrección del esquema de certificados
 * Fecha: 2026-02-10
 * Uso: node runFixCertificados.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import pg from 'pg';
const { Client } = pg;

// Obtener directorio actual en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración de conexión a PostgreSQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'expediente_digital',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
};

async function runMigration() {
  const client = new Client(dbConfig);

  try {
    console.log('\n🔄 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado exitosamente\n');

    // Leer el archivo SQL
    const sqlPath = join(__dirname, 'fix_certificados_schema.sql');
    console.log(`📄 Leyendo migración: ${sqlPath}\n`);
    const sql = readFileSync(sqlPath, 'utf8');

    // Ejecutar la migración
    console.log('⚙️  Ejecutando migración...\n');
    await client.query(sql);

    console.log('\n✅ Migración ejecutada exitosamente\n');
    console.log('📋 Verificando columnas de la tabla certificados:\n');

    // Verificar el esquema actualizado
    const result = await client.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'certificados'
      ORDER BY ordinal_position;
    `);

    console.table(result.rows);

    console.log('\n✨ Proceso completado exitosamente\n');

  } catch (error) {
    console.error('\n❌ Error ejecutando la migración:', error);
    console.error('\nDetalles:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada\n');
  }
}

// Ejecutar migración
runMigration();
