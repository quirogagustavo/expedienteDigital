-- =====================================================
-- SCRIPT 1 DE 2: Eliminar y crear base de datos
-- =====================================================
-- IMPORTANTE: Ejecutar este script conectado a la base de datos "postgres"
--             NO a "expediente_digital"
-- =====================================================

-- Desconectar usuarios activos (PostgreSQL 9.2+)
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'expediente_digital'
  AND pid <> pg_backend_pid();

-- Eliminar base de datos si existe
DROP DATABASE IF EXISTS expediente_digital;

-- Crear base de datos nueva
CREATE DATABASE expediente_digital
  WITH ENCODING 'UTF8'
  OWNER = postgres;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- Si ves el mensaje "CREATE DATABASE", continúa con el script 02
