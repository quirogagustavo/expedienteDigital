-- =====================================================
-- MIGRACIÓN: Integración con Laravel (Service Account)
-- Fecha: 2026-02-07
-- Propósito: Permitir que Laravel use un solo usuario técnico
--            pero mantenga referencias a usuarios reales de Laravel
-- =====================================================

-- 1. Agregar campos de integración a la tabla signatures
ALTER TABLE signatures
ADD COLUMN IF NOT EXISTS laravel_user_id INTEGER,
ADD COLUMN IF NOT EXISTS laravel_user_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS laravel_user_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS sistema_origen VARCHAR(50) DEFAULT 'interno',
ADD COLUMN IF NOT EXISTS metadatos_externos JSONB DEFAULT '{}';

-- Comentarios para documentación
COMMENT ON COLUMN signatures.laravel_user_id IS 'ID del usuario en el sistema Laravel (origen externo)';
COMMENT ON COLUMN signatures.laravel_user_email IS 'Email del usuario real de Laravel';
COMMENT ON COLUMN signatures.laravel_user_name IS 'Nombre completo del usuario de Laravel';
COMMENT ON COLUMN signatures.sistema_origen IS 'Sistema de origen: interno, laravel, otro';
COMMENT ON COLUMN signatures.metadatos_externos IS 'Datos adicionales del sistema externo';

-- 2. Agregar campos de integración a expediente_documentos
ALTER TABLE expediente_documentos
ADD COLUMN IF NOT EXISTS laravel_user_id INTEGER,
ADD COLUMN IF NOT EXISTS laravel_user_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS sistema_origen VARCHAR(50) DEFAULT 'interno';

COMMENT ON COLUMN expediente_documentos.laravel_user_id IS 'ID del usuario en Laravel que subió el documento';
COMMENT ON COLUMN expediente_documentos.laravel_user_email IS 'Email del usuario de Laravel';
COMMENT ON COLUMN expediente_documentos.sistema_origen IS 'interno o laravel';

-- 3. Agregar campos de integración a usuarios_firmas (firmas visuales)
-- Solo si la tabla existe
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usuarios_firmas') THEN
    ALTER TABLE usuarios_firmas
    ADD COLUMN IF NOT EXISTS laravel_user_id INTEGER,
    ADD COLUMN IF NOT EXISTS sistema_origen VARCHAR(50) DEFAULT 'interno';

    COMMENT ON COLUMN usuarios_firmas.laravel_user_id IS 'ID del usuario en Laravel';
    COMMENT ON COLUMN usuarios_firmas.sistema_origen IS 'interno o laravel';

    RAISE NOTICE 'Tabla usuarios_firmas modificada correctamente';
  ELSE
    RAISE NOTICE 'Tabla usuarios_firmas no existe, saltando modificación (no es crítico)';
  END IF;
END $$;

-- 4. Agregar índices para mejorar performance de búsquedas
CREATE INDEX IF NOT EXISTS idx_signatures_laravel_user
ON signatures(laravel_user_id) WHERE laravel_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_signatures_sistema_origen
ON signatures(sistema_origen);

CREATE INDEX IF NOT EXISTS idx_expediente_docs_laravel_user
ON expediente_documentos(laravel_user_id) WHERE laravel_user_id IS NOT NULL;

-- Índice para usuarios_firmas solo si existe la tabla
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usuarios_firmas') THEN
    CREATE INDEX IF NOT EXISTS idx_usuarios_firmas_laravel_user
    ON usuarios_firmas(laravel_user_id) WHERE laravel_user_id IS NOT NULL;
    RAISE NOTICE 'Índice en usuarios_firmas creado correctamente';
  END IF;
END $$;

-- 5. Crear vista para consultas de firmas de Laravel
CREATE OR REPLACE VIEW v_firmas_laravel AS
SELECT
  s.id,
  s.nombre_documento,
  s.tipo_documento,
  s.timestamp_firma,
  s.estado_firma,
  s.validez_legal,
  s.laravel_user_id,
  s.laravel_user_email,
  s.laravel_user_name,
  s.hash_documento,
  s.algoritmo_firma,
  s.numero_expediente,
  u.username as usuario_tecnico,
  c.nombre_certificado,
  c.tipo as tipo_certificado
FROM signatures s
LEFT JOIN usuarios u ON s.usuario_id = u.id
LEFT JOIN certificados c ON s.certificado_id = c.id
WHERE s.sistema_origen = 'laravel'
ORDER BY s.timestamp_firma DESC;

COMMENT ON VIEW v_firmas_laravel IS 'Vista optimizada para consultas de firmas originadas en Laravel';

-- 6. Función para obtener estadísticas por usuario de Laravel
CREATE OR REPLACE FUNCTION get_laravel_user_stats(p_laravel_user_id INTEGER)
RETURNS TABLE (
  total_firmas BIGINT,
  firmas_validas BIGINT,
  firmas_oficiales BIGINT,
  primera_firma TIMESTAMP,
  ultima_firma TIMESTAMP,
  documentos_firmados TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_firmas,
    COUNT(*) FILTER (WHERE estado_firma = 'valida')::BIGINT as firmas_validas,
    COUNT(*) FILTER (WHERE tipo_documento = 'oficial')::BIGINT as firmas_oficiales,
    MIN(timestamp_firma) as primera_firma,
    MAX(timestamp_firma) as ultima_firma,
    ARRAY_AGG(DISTINCT nombre_documento) as documentos_firmados
  FROM signatures
  WHERE laravel_user_id = p_laravel_user_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para validar que si viene de Laravel debe tener laravel_user_id
CREATE OR REPLACE FUNCTION validate_laravel_signature()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sistema_origen = 'laravel' AND NEW.laravel_user_id IS NULL THEN
    RAISE EXCEPTION 'Las firmas de Laravel deben tener laravel_user_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_laravel_signature
BEFORE INSERT OR UPDATE ON signatures
FOR EACH ROW
EXECUTE FUNCTION validate_laravel_signature();

-- 8. Datos predeterminados: Crear usuario de servicio Laravel
INSERT INTO usuarios (username, nombre_completo, email, rol_usuario, password_hash, oficina_id)
VALUES (
  'eduge_service',
  'Usuario de Servicio Eduge',
  'eduge.service@sistema.gob.ar',
  'administrador',
  '$2b$10$6gX2S54jlXNbhmZpvaxsxuoUUUhLLCJMxbJLeUoGlcV9f4Ezrf/Jm',
  NULL
)
ON CONFLICT (username) DO NOTHING;

COMMENT ON TABLE usuarios IS 'Tabla de usuarios. El usuario eduge_service es técnico para integraciones.';

-- 9. Ver resumen de cambios
SELECT
  'Migración completada' as status,
  (SELECT COUNT(*) FROM signatures WHERE laravel_user_id IS NOT NULL) as firmas_laravel,
  (SELECT username FROM usuarios WHERE username = 'eduge_service') as usuario_servicio;
