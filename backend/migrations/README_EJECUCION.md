# 📋 Instrucciones de Ejecución - Inicialización Completa

## 🎯 Scripts de Inicialización

Se divide en 2 scripts para evitar errores de sintaxis:

### Script 1: `01_drop_create_database.sql`
- Elimina la base de datos `expediente_digital` (si existe)
- Crea la base de datos nueva

### Script 2: `02_create_tables_and_data.sql`
- Crea todas las tablas del sistema
- Integración con Laravel
- Usuario de servicio `eduge_service`
- Datos iniciales

---

## ⚠️ ADVERTENCIA

**Estos scripts ELIMINARÁN toda la base de datos actual y sus datos.**

Solo ejecutar si:
- La base de datos está vacía o
- Quieres reiniciar completamente el sistema

---

## 🚀 Método 1: pgAdmin (Recomendado - SIN ERRORES)

### Paso 1: Eliminar/Crear Base de Datos

1. Abrir **pgAdmin**
2. Conectarse al servidor PostgreSQL
3. Click derecho en **Databases** → Seleccionar base de datos **postgres**
4. Click en **Tools** → **Query Tool**
5. Abrir el archivo `01_drop_create_database.sql`
6. Hacer click en **Execute** (F5)
7. ✅ Verificar que aparece "CREATE DATABASE"

### Paso 2: Crear Tablas y Datos

1. En pgAdmin, click derecho en **Databases** → **Refresh**
2. Seleccionar la base de datos **expediente_digital** (recién creada)
3. Click en **Tools** → **Query Tool**
4. Abrir el archivo `02_create_tables_and_data.sql`
5. Hacer click en **Execute** (F5)
6. ✅ Verificar que al final aparece el resumen con usuarios y tablas

---

## 🚀 Método 2: Ejecutar con psql (Línea de comandos)

### En Windows con WAMP:

```cmd
# Navegar a la carpeta de PostgreSQL
cd C:\wamp64\bin\postgresql\postgresql[VERSION]\bin

# Paso 1: Eliminar y crear base de datos
psql.exe -U postgres -f C:\wamp64\www\expedienteDigital\backend\migrations\01_drop_create_database.sql

# Paso 2: Crear tablas y datos
psql.exe -U postgres -d expediente_digital -f C:\wamp64\www\expedienteDigital\backend\migrations\02_create_tables_and_data.sql
```

### En Linux/Mac:

```bash
# Paso 1: Eliminar y crear base de datos
psql -U postgres -f /ruta/al/proyecto/backend/migrations/01_drop_create_database.sql

# Paso 2: Crear tablas y datos
psql -U postgres -d expediente_digital -f /ruta/al/proyecto/backend/migrations/02_create_tables_and_data.sql
```

---

## ✅ Verificación Post-Ejecución

Después de ejecutar ambos scripts, deberías ver al final del script 02:

Después de ejecutar el script, verificar:

```sql
-- Conectarse a la base de datos
\c expediente_digital

-- Ver todas las tablas
\dt

-- Verificar usuarios creados
SELECT id, username, email, rol_usuario FROM usuarios;

-- Verificar usuario de servicio Laravel
SELECT username, email FROM usuarios WHERE username = 'eduge_service';

-- Ver estadísticas
SELECT
  (SELECT COUNT(*) FROM usuarios) as usuarios,
  (SELECT COUNT(*) FROM oficinas) as oficinas,
  (SELECT COUNT(*) FROM certificados) as certificados,
  (SELECT COUNT(*) FROM signatures) as firmas;
```

**Salida esperada:**
```
 usuarios | oficinas | certificados | firmas
----------+----------+--------------+--------
        2 |        2 |            0 |      0
```

---

## 🔐 Usuarios Creados

El script crea automáticamente estos usuarios:

### 1. Usuario de Servicio Laravel
```
Username: eduge_service
Email: eduge.service@sistema.gob.ar
Password: 99ccb70b4e4d5e391ccb732e500544b34cdb1a2c7779be0916babd104fdba8b7
Rol: administrador
```

### 2. Usuario Administrador Demo
```
Username: admin
Email: admin@expediente.gob.ar
Password: admin123
Rol: administrador
```

⚠️ **Cambiar la contraseña del admin en producción**

---

## 🏢 Oficinas Creadas

- **Oficina Central** (código: `CENTRAL`)
- **Mesa de Entradas** (código: `MESA_ENTRADAS`)

---

## 🔧 Siguientes Pasos

Una vez ejecutado el script:

1. ✅ Verificar que las tablas se crearon correctamente
2. ✅ Configurar el archivo `.env` del backend Node.js
3. ✅ Iniciar el backend: `npm start`
4. ✅ Probar la autenticación:
   ```bash
   curl -X POST http://localhost:4000/api/login \
     -H "Content-Type: application/json" \
     -d '{"username":"eduge_service","password":"99ccb70b4e4d5e391ccb732e500544b34cdb1a2c7779be0916babd104fdba8b7"}'
   ```
5. ✅ Configurar Laravel con las credenciales del usuario de servicio

---

## 🆘 Troubleshooting

### Error: "no se puede eliminar la base de datos porque hay usuarios conectados"
**Solución:** El script 01 ya incluye `pg_terminate_backend`. Si persiste, cerrar todas las conexiones abiertas en pgAdmin y volver a intentar.

### Error: "no existe la extensión uuid-ossp"
**Solución:** En el script 02, comentar la línea:
```sql
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error al ejecutar script 02: "la base de datos expediente_digital no existe"
**Solución:** Asegurarse de haber ejecutado primero el script 01 y que terminó con "CREATE DATABASE".

---

## 📞 Soporte

Para más información, consultar:
- `documentacion/INTEGRACION_LARAVEL.md` - Integración completa con Laravel
- `documentacion/CONFIG_EDUGE_TESTING.md` - Configuración de entorno testing

---

**Última actualización:** 2026-02-07
**Versión del script:** 1.0
