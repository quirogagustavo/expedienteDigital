-- =====================================================
-- SCRIPT 2 DE 2: Crear todas las tablas y datos
-- =====================================================
-- IMPORTANTE: Ejecutar este script conectado a la base de datos "expediente_digital"
--             (después de ejecutar el script 01)
-- =====================================================

-- =====================================================
-- PASO 1: CREAR EXTENSIONES
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- PASO 2: CREAR TABLAS BASE
-- =====================================================

-- Tabla: oficinas
CREATE TABLE oficinas (
  id SERIAL PRIMARY KEY,
  nombre_oficina VARCHAR(200) NOT NULL,
  codigo_oficina VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  activa BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE oficinas IS 'Oficinas del sistema gubernamental';

-- Tabla: usuarios
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  nombre_completo VARCHAR(200),
  email VARCHAR(255) UNIQUE NOT NULL,
  rol_usuario VARCHAR(50) NOT NULL DEFAULT 'empleado_interno',
  certificado_preferido VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  oficina_id INTEGER REFERENCES oficinas(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT chk_rol_usuario CHECK (
    rol_usuario IN ('empleado_interno', 'funcionario_oficial', 'administrador')
  ),
  CONSTRAINT chk_certificado_preferido CHECK (
    certificado_preferido IS NULL OR
    certificado_preferido IN ('internal', 'government', 'governmental')
  )
);

COMMENT ON TABLE usuarios IS 'Usuarios del sistema. Incluye usuarios técnicos de integración.';
COMMENT ON COLUMN usuarios.rol_usuario IS 'Define qué tipo de certificados puede usar';
COMMENT ON COLUMN usuarios.oficina_id IS 'Oficina a la que pertenece el usuario';

-- Índices para usuarios
CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_oficina ON usuarios(oficina_id);

-- Tabla: certificate_authorities
CREATE TABLE certificate_authorities (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50) NOT NULL,
  pais VARCHAR(2) DEFAULT 'AR',
  activa BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT chk_ca_tipo CHECK (tipo IN ('governmental', 'commercial', 'internal'))
);

COMMENT ON TABLE certificate_authorities IS 'Autoridades certificadoras';

-- Tabla: certificados
CREATE TABLE certificados (
  id SERIAL PRIMARY KEY,
  nombre_certificado VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  numero_serie VARCHAR(100) UNIQUE NOT NULL,
  fecha_emision TIMESTAMP NOT NULL,
  fecha_vencimiento TIMESTAMP NOT NULL,
  emisor_id INTEGER REFERENCES certificate_authorities(id),
  clave_publica TEXT NOT NULL,
  huella_digital VARCHAR(64) UNIQUE NOT NULL,
  activo BOOLEAN DEFAULT true NOT NULL,
  revocado BOOLEAN DEFAULT false NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT chk_cert_tipo CHECK (tipo IN ('governmental', 'commercial', 'internal'))
);

COMMENT ON TABLE certificados IS 'Certificados digitales del sistema';
COMMENT ON COLUMN certificados.tipo IS 'governmental: validez legal completa | commercial: limitada | internal: solo interna';

-- Índices para certificados
CREATE INDEX idx_certificados_activo ON certificados(activo);
CREATE INDEX idx_certificados_tipo ON certificados(tipo);
CREATE INDEX idx_certificados_vencimiento ON certificados(fecha_vencimiento);

-- Tabla: signatures (firmas digitales)
CREATE TABLE signatures (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  certificado_id INTEGER NOT NULL REFERENCES certificados(id),

  -- Información del documento
  nombre_documento VARCHAR(255) NOT NULL,
  nombre_archivo_original VARCHAR(255) NOT NULL,
  tipo_documento VARCHAR(50) NOT NULL,
  hash_documento VARCHAR(64) NOT NULL,
  tamaño_archivo INTEGER NOT NULL,

  -- Datos de la firma digital
  firma_digital TEXT NOT NULL,
  algoritmo_firma VARCHAR(50) NOT NULL DEFAULT 'RSA-SHA256',
  timestamp_firma TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Estado y validaciones
  estado_firma VARCHAR(50) NOT NULL DEFAULT 'valida',
  verificada BOOLEAN NOT NULL DEFAULT true,
  validez_legal VARCHAR(50),

  -- Metadatos de sesión
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),

  -- Información de expediente (opcional)
  numero_expediente VARCHAR(100),
  expediente_id INTEGER,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT chk_tipo_documento CHECK (tipo_documento IN ('oficial', 'no_oficial')),
  CONSTRAINT chk_estado_firma CHECK (estado_firma IN ('valida', 'invalida', 'vencida', 'revocada')),
  CONSTRAINT chk_validez_legal CHECK (
    validez_legal IS NULL OR
    validez_legal IN ('COMPLETA', 'LIMITADA', 'INTERNA', 'NO_RECONOCIDA')
  )
);

COMMENT ON TABLE signatures IS 'Registro de firmas digitales aplicadas a documentos';

-- Índices para signatures
CREATE INDEX idx_signatures_usuario ON signatures(usuario_id);
CREATE INDEX idx_signatures_certificado ON signatures(certificado_id);
CREATE INDEX idx_signatures_hash ON signatures(hash_documento);
CREATE INDEX idx_signatures_timestamp ON signatures(timestamp_firma DESC);
CREATE INDEX idx_signatures_expediente ON signatures(expediente_id) WHERE expediente_id IS NOT NULL;
CREATE INDEX idx_signatures_numero_exp ON signatures(numero_expediente) WHERE numero_expediente IS NOT NULL;

-- Tabla: expedientes
CREATE TABLE expedientes (
  id SERIAL PRIMARY KEY,
  numero_expediente VARCHAR(100) UNIQUE NOT NULL,
  asunto TEXT NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'activo',
  prioridad VARCHAR(20) DEFAULT 'normal',
  oficina_actual_id INTEGER REFERENCES oficinas(id),
  oficina_origen_id INTEGER REFERENCES oficinas(id),
  usuario_creador_id INTEGER REFERENCES usuarios(id),
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_ultima_modificacion TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT chk_estado_expediente CHECK (
    estado IN ('activo', 'archivado', 'finalizado', 'en_transito')
  ),
  CONSTRAINT chk_prioridad CHECK (
    prioridad IN ('baja', 'normal', 'alta', 'urgente')
  )
);

COMMENT ON TABLE expedientes IS 'Expedientes administrativos';

-- Índices para expedientes
CREATE INDEX idx_expedientes_numero ON expedientes(numero_expediente);
CREATE INDEX idx_expedientes_estado ON expedientes(estado);
CREATE INDEX idx_expedientes_oficina_actual ON expedientes(oficina_actual_id);

-- Tabla: expediente_documentos
CREATE TABLE expediente_documentos (
  id SERIAL PRIMARY KEY,
  expediente_id INTEGER NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo_archivo VARCHAR(50),
  tamaño_bytes INTEGER,
  hash_archivo VARCHAR(64),
  ruta_almacenamiento TEXT,
  usuario_subida_id INTEGER REFERENCES usuarios(id),
  fecha_subida TIMESTAMP DEFAULT NOW(),
  descripcion TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE expediente_documentos IS 'Documentos adjuntos a expedientes';

-- Índices para expediente_documentos
CREATE INDEX idx_exp_docs_expediente ON expediente_documentos(expediente_id);
CREATE INDEX idx_exp_docs_hash ON expediente_documentos(hash_archivo);

-- Tabla: workflow_movimientos
CREATE TABLE workflow_movimientos (
  id SERIAL PRIMARY KEY,
  expediente_id INTEGER NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  oficina_origen_id INTEGER REFERENCES oficinas(id),
  oficina_destino_id INTEGER REFERENCES oficinas(id),
  usuario_movimiento_id INTEGER REFERENCES usuarios(id),
  fecha_movimiento TIMESTAMP DEFAULT NOW(),
  observaciones TEXT,
  estado_movimiento VARCHAR(50) DEFAULT 'en_transito',
  fecha_recepcion TIMESTAMP,
  usuario_recepcion_id INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT chk_estado_movimiento CHECK (
    estado_movimiento IN ('en_transito', 'recibido', 'rechazado')
  )
);

COMMENT ON TABLE workflow_movimientos IS 'Historial de movimientos de expedientes entre oficinas';

-- Índices para workflow_movimientos
CREATE INDEX idx_workflow_expediente ON workflow_movimientos(expediente_id);
CREATE INDEX idx_workflow_origen ON workflow_movimientos(oficina_origen_id);
CREATE INDEX idx_workflow_destino ON workflow_movimientos(oficina_destino_id);

-- Tabla: expediente_workflow
CREATE TABLE expediente_workflow (
  id SERIAL PRIMARY KEY,
  expediente_id INTEGER NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50) NOT NULL,
  usuario_cambio_id INTEGER REFERENCES usuarios(id),
  fecha_cambio TIMESTAMP DEFAULT NOW(),
  motivo TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE expediente_workflow IS 'Historial de cambios de estado de expedientes';

-- Tabla: usuarios_firmas (firmas visuales/imágenes)
CREATE TABLE usuarios_firmas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  firma_nombre VARCHAR(255) NOT NULL,
  firma_imagen BYTEA NOT NULL,
  firma_tipo VARCHAR(10) NOT NULL,
  tamaño_archivo INTEGER NOT NULL,
  ancho_pixels INTEGER,
  alto_pixels INTEGER,
  activa BOOLEAN DEFAULT true NOT NULL,
  es_predeterminada BOOLEAN DEFAULT false NOT NULL,
  fecha_subida TIMESTAMP DEFAULT NOW(),
  subida_por INTEGER REFERENCES usuarios(id),
  metadatos JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT chk_firma_tipo CHECK (firma_tipo IN ('png', 'jpg', 'jpeg', 'svg')),
  CONSTRAINT chk_tamaño_archivo CHECK (tamaño_archivo <= 5242880) -- 5MB max
);

COMMENT ON TABLE usuarios_firmas IS 'Firmas visuales (imágenes) de usuarios';

-- Índices para usuarios_firmas
CREATE INDEX idx_usuarios_firmas_usuario ON usuarios_firmas(usuario_id);
CREATE INDEX idx_usuarios_firmas_activa ON usuarios_firmas(activa) WHERE activa = true;

-- Tabla: firmas_historial
CREATE TABLE firmas_historial (
  id SERIAL PRIMARY KEY,
  signature_id INTEGER NOT NULL REFERENCES signatures(id),
  accion VARCHAR(50) NOT NULL,
  usuario_id INTEGER REFERENCES usuarios(id),
  timestamp_accion TIMESTAMP DEFAULT NOW(),
  detalles JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT chk_accion CHECK (
    accion IN ('creacion', 'verificacion', 'revocacion', 'validacion', 'modificacion')
  )
);

COMMENT ON TABLE firmas_historial IS 'Auditoría de acciones sobre firmas digitales';

-- Tabla: firma_batch
CREATE TABLE firma_batch (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  nombre_batch VARCHAR(255) NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente',
  total_documentos INTEGER DEFAULT 0,
  documentos_completados INTEGER DEFAULT 0,
  fecha_inicio TIMESTAMP DEFAULT NOW(),
  fecha_finalizacion TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT chk_estado_batch CHECK (
    estado IN ('pendiente', 'procesando', 'completado', 'error', 'cancelado')
  )
);

COMMENT ON TABLE firma_batch IS 'Procesamiento por lotes de firmas digitales';

-- Tabla: documents (documentos genéricos)
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50),
  tamaño INTEGER,
  hash VARCHAR(64),
  ruta TEXT,
  usuario_id INTEGER REFERENCES usuarios(id),
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE documents IS 'Documentos genéricos del sistema';

-- =====================================================
-- PASO 3: INTEGRACIÓN LARAVEL
-- =====================================================

-- 1. Agregar campos de integración a la tabla signatures
ALTER TABLE signatures
ADD COLUMN laravel_user_id INTEGER,
ADD COLUMN laravel_user_email VARCHAR(255),
ADD COLUMN laravel_user_name VARCHAR(200),
ADD COLUMN sistema_origen VARCHAR(50) DEFAULT 'interno',
ADD COLUMN metadatos_externos JSONB DEFAULT '{}';

-- Comentarios para documentación
COMMENT ON COLUMN signatures.laravel_user_id IS 'ID del usuario en el sistema Laravel (origen externo)';
COMMENT ON COLUMN signatures.laravel_user_email IS 'Email del usuario real de Laravel';
COMMENT ON COLUMN signatures.laravel_user_name IS 'Nombre completo del usuario de Laravel';
COMMENT ON COLUMN signatures.sistema_origen IS 'Sistema de origen: interno, laravel, otro';
COMMENT ON COLUMN signatures.metadatos_externos IS 'Datos adicionales del sistema externo';

-- 2. Agregar campos de integración a expediente_documentos
ALTER TABLE expediente_documentos
ADD COLUMN laravel_user_id INTEGER,
ADD COLUMN laravel_user_email VARCHAR(255),
ADD COLUMN sistema_origen VARCHAR(50) DEFAULT 'interno';

COMMENT ON COLUMN expediente_documentos.laravel_user_id IS 'ID del usuario en Laravel que subió el documento';
COMMENT ON COLUMN expediente_documentos.laravel_user_email IS 'Email del usuario de Laravel';
COMMENT ON COLUMN expediente_documentos.sistema_origen IS 'interno o laravel';

-- 3. Agregar campos de integración a usuarios_firmas (firmas visuales)
ALTER TABLE usuarios_firmas
ADD COLUMN laravel_user_id INTEGER,
ADD COLUMN sistema_origen VARCHAR(50) DEFAULT 'interno';

COMMENT ON COLUMN usuarios_firmas.laravel_user_id IS 'ID del usuario en Laravel';
COMMENT ON COLUMN usuarios_firmas.sistema_origen IS 'interno o laravel';

-- 4. Agregar índices para mejorar performance de búsquedas
CREATE INDEX idx_signatures_laravel_user
ON signatures(laravel_user_id) WHERE laravel_user_id IS NOT NULL;

CREATE INDEX idx_signatures_sistema_origen
ON signatures(sistema_origen);

CREATE INDEX idx_expediente_docs_laravel_user
ON expediente_documentos(laravel_user_id) WHERE laravel_user_id IS NOT NULL;

CREATE INDEX idx_usuarios_firmas_laravel_user
ON usuarios_firmas(laravel_user_id) WHERE laravel_user_id IS NOT NULL;

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

-- =====================================================
-- PASO 4: DATOS INICIALES
-- =====================================================

-- Crear oficinas por defecto
INSERT INTO oficinas (nombre_oficina, codigo_oficina, descripcion)
VALUES
  ('Oficina Central', 'CENTRAL', 'Oficina principal del sistema'),
  ('Mesa de Entradas', 'MESA_ENTRADAS', 'Oficina de recepción de expedientes');

-- Crear usuario de servicio Laravel/Eduge
INSERT INTO usuarios (username, nombre_completo, email, rol_usuario, password_hash, oficina_id)
VALUES (
  'eduge_service',
  'Usuario de Servicio Eduge',
  'eduge.service@sistema.gob.ar',
  'administrador',
  '$2b$10$6gX2S54jlXNbhmZpvaxsxuoUUUhLLCJMxbJLeUoGlcV9f4Ezrf/Jm',
  NULL
);

-- Crear usuario administrador demo (password: admin123)
INSERT INTO usuarios (username, nombre_completo, email, rol_usuario, password_hash, oficina_id)
VALUES (
  'admin',
  'Administrador del Sistema',
  'admin@expediente.gob.ar',
  'administrador',
  '$2b$10$rI0Y8YSXNQxPqYfY9YhfTeVqE1DlY0pNqY3KQxNjXYvYqNwY5Ye5u',
  1
);

-- =====================================================
-- PASO 5: RESUMEN Y VERIFICACIÓN
-- =====================================================

SELECT
  'Base de datos creada exitosamente' as status,
  (SELECT COUNT(*) FROM usuarios) as total_usuarios,
  (SELECT COUNT(*) FROM oficinas) as total_oficinas,
  (SELECT username FROM usuarios WHERE username = 'eduge_service') as usuario_servicio;

-- Listar todas las tablas creadas
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
