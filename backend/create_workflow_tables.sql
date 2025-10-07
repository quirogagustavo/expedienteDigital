-- Crear tablas para el sistema de workflow

-- Tabla de oficinas
CREATE TABLE IF NOT EXISTS oficinas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    responsable VARCHAR(255),
    email VARCHAR(255),
    telefono VARCHAR(20),
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de expediente_workflow
CREATE TABLE IF NOT EXISTS expediente_workflow (
    id SERIAL PRIMARY KEY,
    expediente_id INTEGER NOT NULL,
    oficina_actual_id INTEGER REFERENCES oficinas(id),
    oficina_origen_id INTEGER REFERENCES oficinas(id),
    estado VARCHAR(50) DEFAULT 'en_tramite',
    prioridad VARCHAR(50) DEFAULT 'normal',
    fecha_recepcion TIMESTAMP DEFAULT NOW(),
    fecha_vencimiento TIMESTAMP,
    observaciones TEXT,
    usuario_asignado VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de movimientos de workflow
CREATE TABLE IF NOT EXISTS workflow_movimientos (
    id SERIAL PRIMARY KEY,
    expediente_id INTEGER NOT NULL,
    oficina_origen_id INTEGER REFERENCES oficinas(id),
    oficina_destino_id INTEGER REFERENCES oficinas(id),
    usuario_id INTEGER,
    accion VARCHAR(100) NOT NULL,
    motivo TEXT,
    observaciones TEXT,
    fecha_movimiento TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar oficinas predeterminadas
INSERT INTO oficinas (nombre, descripcion, codigo, responsable, email, telefono) VALUES
('Mesa de Entradas', 'Oficina encargada de la recepción inicial de expedientes', 'ME001', 'Juan Pérez', 'mesa.entradas@gobierno.com', '1234567890'),
('Área Legal', 'Departamento de asuntos legales y jurídicos', 'AL002', 'María García', 'legal@gobierno.com', '1234567891'),
('Contaduría', 'Área de control y gestión financiera', 'CT003', 'Carlos López', 'contaduria@gobierno.com', '1234567892'),
('Recursos Humanos', 'Gestión de personal y recursos humanos', 'RH004', 'Ana Martínez', 'rrhh@gobierno.com', '1234567893'),
('Dirección General', 'Dirección general y toma de decisiones finales', 'DG005', 'Roberto Fernández', 'direccion@gobierno.com', '1234567894')
ON CONFLICT (codigo) DO NOTHING;