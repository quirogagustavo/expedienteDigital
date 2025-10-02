-- Script rápido para eliminar certificado comercial de la base de datos actual
-- Ejecutar este script en la base de datos

-- Desactivar certificado comercial
UPDATE certificate_types 
SET is_active = false 
WHERE name = 'commercial_ca';

-- O eliminarlo completamente
DELETE FROM certificate_types 
WHERE name = 'commercial_ca';

-- Verificar que solo queden los certificados correctos
SELECT name, description, validity_level, is_active 
FROM certificate_types 
WHERE is_active = true;