-- Script para verificar y crear usuarios de prueba
-- Verificar usuarios existentes
SELECT id, username, nombre_completo, email, rol_usuario, oficina_id FROM usuarios ORDER BY id;

-- Crear usuario_legal si no existe (con oficina_id = 2)
INSERT INTO usuarios (username, nombre_completo, email, password_hash, rol_usuario, oficina_id)
VALUES (
  'usuario_legal',
  'Usuario Área Legal',
  'legal@ejemplo.gov.ar',
  '$2b$10$rXvdkF6FhGjzGhvJQY5wYe7xpvF6rz3mWBgL4yDQXZ7TQXzNQXZ7T',
  'empleado_interno',
  2
) ON CONFLICT (username) DO UPDATE SET
  oficina_id = 2,
  email = 'legal@ejemplo.gov.ar';

-- Crear usuario_admin si no existe (con oficina_id = 1)
INSERT INTO usuarios (username, nombre_completo, email, password_hash, rol_usuario, oficina_id)
VALUES (
  'usuario_admin',
  'Usuario Área Administrativa',
  'admin_user@ejemplo.gov.ar',
  '$2b$10$rXvdkF6FhGjzGhvJQY5wYe7xpvF6rz3mWBgL4yDQXZ7TQXzNQXZ7T',
  'empleado_interno',
  1
) ON CONFLICT (username) DO UPDATE SET
  oficina_id = 1,
  email = 'admin_user@ejemplo.gov.ar';

-- Verificar los usuarios después de la inserción
SELECT id, username, nombre_completo, email, rol_usuario, oficina_id FROM usuarios ORDER BY id;