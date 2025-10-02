-- Migración para campos de certificados internos
-- Gobierno de San Juan - Gestión de Certificados

-- Agregar campos para certificados internos
ALTER TABLE certificados 
ADD COLUMN IF NOT EXISTS tipo ENUM('internal', 'government') DEFAULT 'internal',
ADD COLUMN IF NOT EXISTS numero_serie VARCHAR(255),
ADD COLUMN IF NOT EXISTS emisor VARCHAR(255),
ADD COLUMN IF NOT EXISTS clave_publica_pem TEXT;

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_certificados_tipo ON certificados(tipo);
CREATE INDEX IF NOT EXISTS idx_certificados_activo ON certificados(activo);
CREATE INDEX IF NOT EXISTS idx_certificados_fecha_expiracion ON certificados(fecha_expiracion);
CREATE INDEX IF NOT EXISTS idx_certificados_numero_serie ON certificados(numero_serie);

-- Actualizar certificados existentes para que tengan tipo 'internal' por defecto
UPDATE certificados 
SET tipo = 'internal' 
WHERE tipo IS NULL;

-- Asegurar que todos los certificados existentes tengan valores apropiados
UPDATE certificados 
SET emisor = 'CA Interna - Gobierno San Juan'
WHERE emisor IS NULL AND tipo = 'internal';

-- Log de la migración
INSERT INTO migration_log (migration_name, executed_at, description) 
VALUES (
  'add_internal_certificate_fields', 
  NOW(), 
  'Agregados campos para gestión de certificados internos: tipo, numero_serie, emisor, clave_publica_pem'
) ON DUPLICATE KEY UPDATE executed_at = NOW();

-- Comentarios para documentación
COMMENT ON COLUMN certificados.tipo IS 'Tipo de certificado: internal para documentos no oficiales, government para documentos oficiales';
COMMENT ON COLUMN certificados.numero_serie IS 'Número de serie único del certificado';
COMMENT ON COLUMN certificados.emisor IS 'Autoridad certificadora que emitió el certificado';
COMMENT ON COLUMN certificados.clave_publica_pem IS 'Clave pública en formato PEM';