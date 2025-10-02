-- Script de limpieza para eliminar certificados comerciales
-- Sistema Gubernamental de San Juan - Solo certificados oficiales

-- Eliminar certificados comerciales existentes
DELETE FROM certificate_types WHERE name = 'commercial_ca';
DELETE FROM certificate_types WHERE validity_level = 'legal';

-- Eliminar autoridades certificadoras comerciales si existen
DELETE FROM certificate_authorities WHERE type = 'commercial';

-- Actualizar enum de validity_level para solo permitir valores gubernamentales
-- (Esto requiere recrear la columna en PostgreSQL)
-- ALTER TYPE validity_level_enum RENAME TO validity_level_enum_old;
-- CREATE TYPE validity_level_enum AS ENUM ('corporate', 'government');
-- ALTER TABLE certificate_types ALTER COLUMN validity_level TYPE validity_level_enum USING validity_level::text::validity_level_enum;
-- DROP TYPE validity_level_enum_old;

-- Verificar que solo existan certificados gubernamentales
SELECT 
    name, 
    description, 
    validity_level, 
    processing_time,
    CASE 
        WHEN validity_level = 'corporate' THEN '🔹 Interno'
        WHEN validity_level = 'government' THEN '🏛️ Gubernamental'
        ELSE '❌ No válido'
    END as tipo_display
FROM certificate_types 
WHERE is_active = true
ORDER BY validity_level;