-- Script para eliminar completamente las referencias a costos
-- Sistema Gubernamental de San Juan - Limpieza de campos de costo

-- Eliminar columna cost si existe
ALTER TABLE certificate_types DROP COLUMN IF EXISTS cost;

-- Actualizar descripciones para eliminar referencias a "gratuito"
UPDATE certificate_types 
SET description = 'Certificado interno para documentos corporativos'
WHERE name = 'internal';

UPDATE certificate_types 
SET description = 'Certificado oficial gubernamental para empleados públicos'
WHERE name = 'official_government';

UPDATE certificate_types 
SET description = 'Certificado alternativo para sistema interno'
WHERE name = 'commercial_ca';

-- Confirmar que los cambios se aplicaron
SELECT name, description, validity_level, processing_time 
FROM certificate_types;