-- Script para crear las tablas del sistema de CA híbrida

-- Crear tabla certificate_types
CREATE TABLE IF NOT EXISTS certificate_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    validity_level ENUM('corporate', 'government') NOT NULL,
    cost DECIMAL(10, 2) DEFAULT 0.00,
    processing_time VARCHAR(255) NOT NULL,
    requires_identity_verification BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Crear tabla certificate_authorities
CREATE TABLE IF NOT EXISTS certificate_authorities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('internal', 'government', 'commercial')),
    api_endpoint VARCHAR(255),
    api_key TEXT,
    is_trusted BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Agregar nuevas columnas a la tabla certificados
DO $$
BEGIN
    -- Agregar certificate_type_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='certificados' AND column_name='certificate_type_id') THEN
        ALTER TABLE certificados ADD COLUMN certificate_type_id INTEGER;
    END IF;

    -- Agregar certificate_authority_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='certificados' AND column_name='certificate_authority_id') THEN
        ALTER TABLE certificados ADD COLUMN certificate_authority_id INTEGER;
    END IF;

    -- Agregar external_certificate_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='certificados' AND column_name='external_certificate_id') THEN
        ALTER TABLE certificados ADD COLUMN external_certificate_id VARCHAR(255);
    END IF;

    -- Crear ENUM para status si no existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certificados_status_enum') THEN
        CREATE TYPE certificados_status_enum AS ENUM ('pending', 'active', 'expired', 'revoked', 'rejected');
    END IF;

    -- Agregar status si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='certificados' AND column_name='status') THEN
        ALTER TABLE certificados ADD COLUMN status certificados_status_enum DEFAULT 'active';
    END IF;

    -- Agregar validation_data si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='certificados' AND column_name='validation_data') THEN
        ALTER TABLE certificados ADD COLUMN validation_data JSONB;
    END IF;

    -- Agregar serial_number si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='certificados' AND column_name='serial_number') THEN
        ALTER TABLE certificados ADD COLUMN serial_number VARCHAR(255);
    END IF;

    -- Agregar issuer_dn si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='certificados' AND column_name='issuer_dn') THEN
        ALTER TABLE certificados ADD COLUMN issuer_dn TEXT;
    END IF;

    -- Agregar subject_dn si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='certificados' AND column_name='subject_dn') THEN
        ALTER TABLE certificados ADD COLUMN subject_dn TEXT;
    END IF;
END
$$;

-- Insertar datos predeterminados
INSERT INTO certificate_types (name, description, validity_level, processing_time, requires_identity_verification, is_active)
VALUES 
    ('internal', 'Certificado interno para documentos corporativos', 'corporate', 'Inmediato', false, true),
    ('official_government', 'Certificado oficial gubernamental para empleados públicos', 'government', '3-5 días hábiles', true, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO certificate_authorities (name, country, type, api_endpoint, api_key, is_trusted, is_active)
VALUES 
    ('Internal CA', 'AR', 'internal', NULL, NULL, true, true),
    ('AFIP Argentina', 'AR', 'government', 'https://auth.afip.gob.ar/sitio/cdByC/api', NULL, true, true),
    ('ONTI Argentina', 'AR', 'government', 'https://pki.mininterior.gob.ar/api', NULL, true, true)
ON CONFLICT (name) DO NOTHING;

-- Actualizar certificados existentes para que tengan los nuevos campos
UPDATE certificados 
SET 
    certificate_type_id = (SELECT id FROM certificate_types WHERE name = 'internal' LIMIT 1),
    certificate_authority_id = (SELECT id FROM certificate_authorities WHERE name = 'Internal CA' LIMIT 1)
WHERE certificate_type_id IS NULL AND certificate_authority_id IS NULL;

-- Agregar foreign keys después de que los datos estén actualizados
DO $$
BEGIN
    -- Agregar foreign key para certificate_type_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name='certificados' AND constraint_name='fk_certificados_certificate_type') THEN
        ALTER TABLE certificados 
        ADD CONSTRAINT fk_certificados_certificate_type 
        FOREIGN KEY (certificate_type_id) REFERENCES certificate_types(id);
    END IF;

    -- Agregar foreign key para certificate_authority_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name='certificados' AND constraint_name='fk_certificados_certificate_authority') THEN
        ALTER TABLE certificados 
        ADD CONSTRAINT fk_certificados_certificate_authority 
        FOREIGN KEY (certificate_authority_id) REFERENCES certificate_authorities(id);
    END IF;
END
$$;

-- Hacer NOT NULL después de actualizar datos existentes
ALTER TABLE certificados ALTER COLUMN certificate_type_id SET NOT NULL;
ALTER TABLE certificados ALTER COLUMN certificate_authority_id SET NOT NULL;

COMMIT;