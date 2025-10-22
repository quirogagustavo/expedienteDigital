import dotenv from 'dotenv';
import path from 'path';

// Try loading .env from a few sensible locations: current working dir and backend/
// This makes the config work whether commands are run from repo root or from backend/
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

const getDbConfig = (env) => {
  const prefix = env ? `${env.toUpperCase()}_` : '';

  return {
    username: String(process.env[`${prefix}DB_USER`] || process.env.DB_USER || ''),
    password: String(process.env[`${prefix}DB_PASS`] || process.env.DB_PASS || ''),
    database: String(process.env[`${prefix}DB_NAME`] || process.env.DB_NAME || ''),
    host: process.env[`${prefix}DB_HOST`] || process.env.DB_HOST || '127.0.0.1',
    dialect: process.env[`${prefix}DB_DIALECT`] || process.env.DB_DIALECT || 'postgres',
    port: process.env[`${prefix}DB_PORT`] ? parseInt(process.env[`${prefix}DB_PORT`], 10) : (process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined),
    logging: false
  };
};

export default {
  development: getDbConfig('development'),
  test: getDbConfig('test'),
  production: getDbConfig('production')
};
