# CLAUDE.md - Sistema de Expediente Digital con Firma Digital

> **Proyecto:** Sistema de Expediente Digital y Firma Digital
> **Cliente:** Gobierno de San Juan, Argentina
> **Base de datos:** expediente_digital (PostgreSQL)
> **Última actualización:** Febrero 2026

---

## 🎯 Descripción General

Sistema web completo para gestión de expedientes digitales con firma digital de documentos, desarrollado para el Gobierno de San Juan. El sistema permite:

- **Firma digital de documentos** (PDF, imágenes, texto) con certificados internos o tokens PKCS#11
- **Gestión de expedientes digitales** con workflow de movimiento entre oficinas
- **Sistema de roles y permisos** (administrador, funcionario, empleado)
- **Integración con sistema Laravel legacy** (migración en progreso)
- **Firmas visuales** con almacenamiento de imágenes de firma
- **Historial completo** de movimientos y operaciones

---

## 🏗️ Arquitectura Técnica

### Stack Backend
- **Node.js 16+** con Express 5
- **PostgreSQL 12+** con Sequelize ORM
- **Autenticación:** JWT (jsonwebtoken)
- **Firma digital:** node-forge, @signpdf, pdf-lib
- **Migraciones:** Umzug (manejo manual de migraciones)
- **Encriptación:** bcrypt para passwords

### Stack Frontend
- **React 18** con Vite
- **Estado:** Context API + hooks
- **HTTP:** axios
- **UI:** Componentes propios

### Servicios Externos
- **Sistema Laravel legacy:** Integración bidireccional via API REST

---

## 📁 Estructura del Proyecto

```
expedienteDigital/
├── backend/
│   ├── controllers/          # Lógica de negocio
│   ├── models/              # Modelos Sequelize (ver sección Models)
│   ├── routes/              # Endpoints API (ver sección Routes)
│   ├── middleware/          # Auth, validaciones
│   ├── services/            # Service Account Pattern (en migración)
│   ├── migrations/          # Migraciones de BD (Umzug)
│   ├── signature.js         # Lógica de firma digital
│   ├── upload.js           # Configuración Multer
│   └── index.js            # Servidor Express principal
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── services/       # Servicios API
│   │   └── utils/          # Utilidades
│   └── package.json
├── documentacion/           # Documentación extensa (ver README.md)
└── scripts/                # Scripts de utilidad
```

### Modelos Principales (backend/models/)
- `Usuario.js` - Usuarios del sistema con roles
- `Certificado.js` - Certificados digitales
- `Signature.js` - Registro de firmas realizadas
- `Expediente.js` - Expedientes digitales
- `ExpedienteDocumento.js` - Documentos de expedientes
- `Oficina.js` - Oficinas gubernamentales
- `WorkflowMovimiento.js` - Movimientos de expedientes
- `UsuarioFirma.js` - Firmas visuales de usuarios
- `FirmaHistorial.js` - Historial de firmas

### Rutas Principales (backend/routes/)
- `usuarios.js` - CRUD de usuarios
- `certificados.js` - Gestión de certificados
- `firmas.js` - Firma de documentos
- `expedientes.js` - Gestión de expedientes
- `workflow.js` - Workflow de movimientos
- `oficinas.js` - Gestión de oficinas
- `admin.js` - Funciones administrativas
- `laravelIntegration.js` - Integración con Laravel

---

## 🔑 Patrones y Convenciones

### Patrón en Migración: Service Account Pattern
**Estado actual:** En proceso de migración hacia Service Account Pattern

```javascript
// ❌ Patrón anterior (directo en routes)
router.get('/expedientes', async (req, res) => {
  const expedientes = await Expediente.findAll();
  res.json(expedientes);
});

// ✅ Patrón objetivo (Service Account Pattern)
router.get('/expedientes', async (req, res) => {
  const expedientes = await expedienteService.getAll();
  res.json(expedientes);
});
```

**IMPORTANTE:** Al escribir nuevas funcionalidades, usar Service Account Pattern. Al modificar código existente, considerar refactorizar si es apropiado.

### Convenciones de Código

#### ESM (ES Modules)
El proyecto usa **ESM** (no CommonJS):
```javascript
// ✅ Correcto
import express from 'express';
export default router;

// ❌ Incorrecto
const express = require('express');
module.exports = router;
```

#### Modelos Sequelize
```javascript
// Estructura estándar de modelo
import { DataTypes } from 'sequelize';

export default function defineModel(sequelize) {
  const Model = sequelize.define('ModelName', {
    // definición
  });
  return Model;
}
```

#### Autenticación
Todas las rutas protegidas usan middleware `authenticateToken`:
```javascript
import { authenticateToken } from '../middleware/auth.js';
router.get('/protected', authenticateToken, async (req, res) => {
  const userId = req.user.id; // Disponible después de auth
});
```

#### Manejo de Errores
```javascript
try {
  // lógica
  res.json({ success: true, data });
} catch (error) {
  console.error('Error en operación:', error);
  res.status(500).json({
    error: 'Mensaje descriptivo',
    details: error.message
  });
}
```

---

## ⚙️ Comandos Importantes

### Backend
```bash
cd backend/
npm install                    # Instalar dependencias
node index.js                  # Iniciar servidor (puerto 4000)
npm run dev                    # Desarrollo con nodemon

# Migraciones (NO usar sequelize-cli, usar Umzug manual)
node migrations/runMigrations.js
```

### Frontend
```bash
cd frontend/
npm install                    # Instalar dependencias
npm run dev                    # Desarrollo (puerto 5175)
npm run build                  # Build producción
```

### Base de Datos
```bash
# Crear base de datos
createdb expediente_digital

# Conectar a PostgreSQL
psql -U postgres -d expediente_digital
```

### Git
```bash
git status                     # Ver cambios
git log --oneline -10          # Últimos 10 commits
git diff                       # Ver diferencias
```

---

## 🚨 Consideraciones Especiales

### 1. Migraciones de Base de Datos
**MUY IMPORTANTE:**
- ✅ Usar Umzug para migraciones (no sequelize-cli)
- ✅ NO usar `sync({ force: true })` - destruye datos
- ✅ NO usar `sync({ alter: true })` - puede perder datos
- ✅ Crear migración manual para cada cambio de esquema

### 2. Sistema de Firma Digital

**Flujo de Firma:**
1. Usuario selecciona documento
2. Sistema valida tipo de archivo
3. Usuario elige certificado (interno/token)
4. Sistema genera hash del documento
5. Hash se firma con clave privada
6. Documento firmado se descarga

**Tipos de Certificado:**
- `internal` - Certificados generados internamente
- `government` - Certificados gubernamentales oficiales
- Tokens PKCS#11 externos

### 3. Workflow de Expedientes

**Estados de Expediente:**
- `activo` - En uso normal
- `archivado` - Cerrado
- `en_tramite` - En proceso

**Movimientos:**
- Se registran en `workflow_movimientos`
- Incluyen: oficina origen, destino, usuario, fecha, observaciones
- Trazabilidad completa

### 4. Integración con Laravel
- Sistema legacy en proceso de migración
- API `/api/laravel-integration/*`
- Sincronización bidireccional de datos
- Mantener compatibilidad durante transición

### 5. Seguridad

**Autenticación:**
- JWT con expiración 24h
- Tokens en header: `Authorization: Bearer <token>`
- Renovación automática en frontend

**Roles:**
- `administrador` - Acceso total
- `funcionario_oficial` - Puede firmar con certificados gubernamentales
- `empleado_interno` - Puede firmar con certificados internos

**Permisos por Rol:**
```javascript
administrador → Gestión total del sistema
funcionario_oficial → Firma con cert. gubernamentales + gestión expedientes
empleado_interno → Firma con cert. internos + consulta expedientes
```

### 6. Firmas Visuales
- Almacenadas en `usuarios_firmas` (base64)
- Historial en `firmas_historial`
- Soporte para múltiples firmas por usuario
- Pueden ser dibujadas o cargadas como imagen

---

## 🔄 Flujos de Trabajo Clave

### Crear Expediente
1. POST `/api/expedientes` con datos del expediente
2. Se crea registro en tabla `expedientes`
3. Se crea entrada inicial en `expediente_workflow`
4. Se asocia a oficina del usuario creador

### Firmar Documento
1. POST `/api/firmas/sign` con archivo y datos
2. Sistema valida usuario y certificado
3. Genera hash SHA-256 del documento
4. Firma hash con clave privada
5. Almacena firma en BD (`signatures`)
6. Retorna documento firmado

### Mover Expediente (Workflow)
1. POST `/api/workflow/mover` con expediente_id y oficina_destino
2. Valida permisos del usuario
3. Crea registro en `workflow_movimientos`
4. Actualiza `expediente_workflow.oficina_actual_id`
5. Registra fecha, usuario, observaciones

---

## 📝 Información de Desarrollo

### Variables de Entorno - Backend
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expediente_digital
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
PORT=4000
NODE_ENV=development
```

### Variables de Entorno - Frontend
```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### Endpoints Principales
- **Auth:** `/api/auth/login`, `/api/auth/register`
- **Usuarios:** `/api/usuarios/*`
- **Expedientes:** `/api/expedientes/*`
- **Firmas:** `/api/firmas/*`
- **Workflow:** `/api/workflow/*`
- **Oficinas:** `/api/oficinas/*`

### Documentación Adicional
Ver carpeta `documentacion/` para:
- `ESTRUCTURA_BASE_DATOS.md` - Esquema completo de BD
- `FIRMA_DIGITAL_API.md` - API de firma digital
- `DEPLOYMENT_*.md` - Guías de deployment
- Múltiples archivos de referencia técnica

---

## 🎯 Prioridades de Desarrollo Actuales

1. **Migración a Service Account Pattern** - Refactorizar lógica a servicios
2. **Optimización de Performance** - Índices, queries optimizadas
3. **Completar Workflow** - Notificaciones, alertas, reportes
4. **Mejorar Integración Laravel** - Sincronización más robusta

---

## ⚠️ Cambios Recientes (últimos commits)

```
b7d81f1 - Cambios hacia el patron Service Account Pattern
dc93447 - Historial de movimientos de expedientes
ac1c687 - Optimizar performance del proyecto en VS Code
aad3ee3 - Documentación de API de firma digital y BD
50fc896 - Configurar frontend para usar backend de producción
```

**Archivos modificados recientemente:**
- `backend/models/oficina.js`
- `backend/models/workflowMovimiento.js`
- `documentacion/api/api-spec.json`
- `documentacion/api/postman-collection.json`

---

## 💡 Tips para Trabajar en el Proyecto

1. **Antes de modificar BD:** Crear migración, NO usar sync()
2. **Nuevas rutas:** Aplicar `authenticateToken` middleware
3. **Nuevos modelos:** Seguir patrón export default + función
4. **Testing:** Probar con Postman (collection en documentacion/api/)
5. **Logs:** Revisar consola del backend para errores
6. **Commits:** Mensajes descriptivos en español
7. **Refactoring:** Preferir Service Account Pattern para nueva lógica

---

## 📚 Recursos

- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Sequelize Docs:** https://sequelize.org/docs/
- **Express Docs:** https://expressjs.com/
- **React Docs:** https://react.dev/

---

**Última actualización:** 2026-02-07
**Mantenedor:** Equipo de Desarrollo - Gobierno de San Juan
