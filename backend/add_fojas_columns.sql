-- Agregar nuevas columnas para el manejo automático de fojas
ALTER TABLE expediente_documentos 
ADD COLUMN IF NOT EXISTS foja_inicial INTEGER,
ADD COLUMN IF NOT EXISTS foja_final INTEGER,
ADD COLUMN IF NOT EXISTS cantidad_paginas INTEGER DEFAULT 1;

-- Actualizar registros existentes con valores por defecto
UPDATE expediente_documentos 
SET 
    foja_inicial = numero_foja,
    foja_final = numero_foja,
    cantidad_paginas = 1
WHERE foja_inicial IS NULL;

-- Agregar comentarios para documentar las columnas
COMMENT ON COLUMN expediente_documentos.foja_inicial IS 'Foja inicial del documento en el expediente';
COMMENT ON COLUMN expediente_documentos.foja_final IS 'Foja final del documento en el expediente';
COMMENT ON COLUMN expediente_documentos.cantidad_paginas IS 'Cantidad de páginas del documento PDF';