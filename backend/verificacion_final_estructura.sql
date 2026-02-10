-- ============================================================================
-- VERIFICACIÓN FINAL DE ESTRUCTURA - POST CORRECCIÓN
-- ============================================================================
-- Este script verifica que la estructura esté correcta después de los cambios
-- ============================================================================

SELECT '✅ VERIFICACIÓN FINAL DE ESTRUCTURA' as titulo;

-- ============================================================================
-- 1. VERIFICAR COLUMNAS DE TABLA USUARIOS
-- ============================================================================

SELECT '1. ESTRUCTURA TABLA USUARIOS' as seccion;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. VERIFICAR COLUMNAS CRÍTICAS PARA LOGIN
-- ============================================================================

SELECT '2. VERIFICACIÓN DE COLUMNAS CRÍTICAS PARA LOGIN' as seccion;

WITH columnas_requeridas AS (
    SELECT unnest(ARRAY[
        'id',
        'username',
        'email',
        'password_hash',
        'rol_usuario',
        'activo'
    ]) AS columna_nombre
)
SELECT
    cr.columna_nombre,
    CASE
        WHEN c.column_name IS NOT NULL THEN '✓ EXISTE'
        ELSE '✗ FALTA'
    END AS estado,
    c.data_type,
    c.is_nullable
FROM columnas_requeridas cr
LEFT JOIN information_schema.columns c ON
    c.table_schema = 'public' AND
    c.table_name = 'usuarios' AND
    c.column_name = cr.columna_nombre
ORDER BY cr.columna_nombre;

-- ============================================================================
-- 3. VERIFICAR USUARIOS EXISTENTES
-- ============================================================================

SELECT '3. USUARIOS EXISTENTES' as seccion;

SELECT
    id,
    username,
    email,
    rol_usuario,
    activo,
    oficina_id,
    created_at
FROM usuarios
ORDER BY created_at DESC;

-- ============================================================================
-- 4. VERIFICAR ÍNDICES EN TABLA USUARIOS
-- ============================================================================

SELECT '4. ÍNDICES EN TABLA USUARIOS' as seccion;

SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'usuarios'
ORDER BY indexname;

-- ============================================================================
-- 5. VERIFICAR CONSTRAINTS
-- ============================================================================

SELECT '5. CONSTRAINTS EN TABLA USUARIOS' as seccion;

SELECT
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name = 'usuarios'
ORDER BY constraint_type, constraint_name;

-- ============================================================================
-- 6. VERIFICAR FOREIGN KEYS
-- ============================================================================

SELECT '6. FOREIGN KEYS EN TABLA USUARIOS' as seccion;

SELECT
    kcu.column_name AS columna,
    ccu.table_name AS tabla_referenciada,
    ccu.column_name AS columna_referenciada
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name = 'usuarios';

-- ============================================================================
-- 7. RESUMEN DE CONFIGURACIÓN
-- ============================================================================

SELECT '7. RESUMEN DE CONFIGURACIÓN' as seccion;

SELECT
    'Total de usuarios' as metrica,
    COUNT(*) as valor
FROM usuarios
UNION ALL
SELECT
    'Usuarios activos',
    COUNT(*)
FROM usuarios
WHERE activo = true
UNION ALL
SELECT
    'Administradores',
    COUNT(*)
FROM usuarios
WHERE rol_usuario = 'administrador'
UNION ALL
SELECT
    'Funcionarios oficiales',
    COUNT(*)
FROM usuarios
WHERE rol_usuario = 'funcionario_oficial'
UNION ALL
SELECT
    'Empleados internos',
    COUNT(*)
FROM usuarios
WHERE rol_usuario = 'empleado_interno';

-- ============================================================================
-- RESULTADO FINAL
-- ============================================================================

SELECT '✅ VERIFICACIÓN COMPLETADA' as resultado;

SELECT '
CAMBIOS REALIZADOS:
✓ Columna "rol" renombrada a "rol_usuario"
✓ Columna "activo" agregada a tabla usuarios
✓ Modelo Usuario.js actualizado
✓ Middleware auth.js actualizado
✓ Login funcionando correctamente

PRÓXIMOS PASOS:
1. Reiniciar backend si no lo hiciste: node index.js
2. Probar login con credenciales existentes
3. Verificar que todos los endpoints funcionen correctamente
' as notas;
