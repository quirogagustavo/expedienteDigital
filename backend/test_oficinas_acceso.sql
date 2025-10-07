-- Script para configurar usuarios con oficinas y probar el sistema de control de acceso
-- Fecha: 6 de octubre de 2025

-- 1. Verificar que existen oficinas
SELECT * FROM oficinas LIMIT 5;

-- 2. Asignar usuarios a oficinas (ejemplo)
-- Asignar usuario admin a la primera oficina
UPDATE usuarios 
SET oficina_id = (SELECT id FROM oficinas WHERE activa = true ORDER BY id LIMIT 1)
WHERE username = 'admin';

-- 3. Crear usuarios de prueba para diferentes oficinas si no existen
-- Usuario para Área Legal (oficina id = 2)
INSERT INTO usuarios (username, nombre_completo, email, password_hash, rol_usuario, oficina_id)
VALUES (
  'usuario_legal',
  'Usuario Área Legal',
  'legal@ejemplo.gov.ar',
  '$2b$10$rXvdkF6FhGjzGhvJQY5wYe7xpvF6rz3mWBgL4yDQXZ7TQXzNQXZ7T',
  'empleado_interno',
  2
) ON CONFLICT (username) DO NOTHING;

-- Usuario para Área Administrativa (oficina id = 1)  
INSERT INTO usuarios (username, nombre_completo, email, password_hash, rol_usuario, oficina_id)
VALUES (
  'usuario_admin',
  'Usuario Área Administrativa',
  'admin@ejemplo.gov.ar',
  '$2b$10$rXvdkF6FhGjzGhvJQY5wYe7xpvF6rz3mWBgL4yDQXZ7TQXzNQXZ7T',
  'empleado_interno',
  1
) ON CONFLICT (username) DO NOTHING;

-- 4. Crear expedientes de prueba en diferentes oficinas
-- Expediente en oficina 1 (Área Administrativa)
INSERT INTO expedientes (
  numero_expediente, 
  titulo, 
  descripcion, 
  usuario_responsable, 
  reparticion, 
  oficina_actual_id,
  estado_workflow
) VALUES (
  '2025-TEST-001',
  'Expediente de prueba - Área Administrativa',
  'Expediente para probar control de acceso por oficina',
  (SELECT id FROM usuarios WHERE username = 'usuario_admin'),
  'Ministerio de Gobierno',
  1,
  'iniciado'
) ON CONFLICT (numero_expediente) DO NOTHING;

-- Expediente en oficina 2 (Área Legal)
INSERT INTO expedientes (
  numero_expediente, 
  titulo, 
  descripcion, 
  usuario_responsable, 
  reparticion, 
  oficina_actual_id,
  estado_workflow
) VALUES (
  '2025-TEST-002',
  'Expediente de prueba - Área Legal',
  'Expediente para probar control de acceso por oficina',
  (SELECT id FROM usuarios WHERE username = 'usuario_legal'),
  'Ministerio de Justicia',
  2,
  'iniciado'
) ON CONFLICT (numero_expediente) DO NOTHING;

-- 5. Verificar la configuración
SELECT 
  u.username,
  u.nombre_completo,
  u.oficina_id,
  o.nombre as oficina_nombre
FROM usuarios u
LEFT JOIN oficinas o ON u.oficina_id = o.id
WHERE u.username IN ('admin', 'usuario_legal', 'usuario_admin');

-- 6. Verificar expedientes con sus oficinas
SELECT 
  e.numero_expediente,
  e.titulo,
  e.oficina_actual_id,
  o.nombre as oficina_nombre,
  u.username as responsable
FROM expedientes e
LEFT JOIN oficinas o ON e.oficina_actual_id = o.id
LEFT JOIN usuarios u ON e.usuario_responsable = u.id
WHERE e.numero_expediente LIKE '2025-TEST-%';