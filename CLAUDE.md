# CLAUDE.md - Sistema de Expediente Digital con Firma Digital

> **Proyecto:** Sistema de Expediente Digital y Firma Digital
> **Cliente:** Gobierno de San Juan, Argentina
> **Base de datos:** expediente_digital (PostgreSQL)
> **Última actualización:** 2026-02-10

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
│   ├── services/            # Service Account Pattern (7 servicios implementados)
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
│   └── laravel_integration/ # Guías e implementación para Laravel
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
- `FirmaBatch.js` - Firmas en lote
- `Document.js` - Documentos generales
- `CertificateAuthority.js` - Autoridades certificadoras
- `CertificateType.js` - Tipos de certificados
- `expedienteWorkflow.js` - Workflow de expedientes
- `database.js` - Configuración de base de datos Sequelize
- `databaseExtended.js` - Extensión de configuración BD
- `index.js` - Exportación centralizada de modelos

### Rutas Principales (backend/routes/)
- `usuarios.js` - CRUD de usuarios
- `login.js` - Autenticación y login
- `certificados.js` - Gestión de certificados (legacy)
- `certificateRoutes.js` - Rutas de certificados modernas
- `certificateRoutesSimple.js` - Rutas simplificadas de certificados
- `governmentCertificateRoutes.js` - Certificados gubernamentales
- `internalCertificateRoutes.js` - Certificados internos
- `smartCertificateRoutes.js` - Detección inteligente de certificados
- `firmas.js` - Firma de documentos
- `firmaDocumentos.js` - Firma de documentos específicos
- `signatureRoutes.js` - Rutas de firmas avanzadas
- `expedientes.js` - Gestión de expedientes
- `workflow.js` - Workflow de movimientos
- `oficinas.js` - Gestión de oficinas
- `admin.js` - Funciones administrativas
- `laravelIntegration.js` - Integración con Laravel
- `debug.js` - Rutas de debugging (desarrollo)

### Servicios Implementados (backend/services/)
**Service Account Pattern** - Lógica de negocio encapsulada:
- `CertificadoService.js` - Gestión de certificados digitales
- `CertificateAuthorityService.js` - Autoridad certificadora
- `CertificateAutoDetection.js` - Detección automática de certificados
- `FirmaDigitalService.js` - Servicio de firma digital
- `FirmaService.js` - Gestión de firmas realizadas
- `GovernmentCertificateManager.js` - Certificados gubernamentales
- `InternalCertificateManager.js` - Certificados internos

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

**⚠️ Importante - Compatibilidad de Exportación:**
Algunos modelos usan export dual para mayor compatibilidad:
```javascript
// Patrón de export dual (Oficina.js, otros modelos)
export default defineOficina;
export { defineOficina };
```
Esto permite importar tanto con `import Oficina from './Oficina.js'` como con `import { defineOficina }`, resolviendo problemas de compatibilidad con Sequelize y rutas.

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

### 2. Sistema de Firma Digital y Certificados

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

**Sistema de Certificados (Multi-ruta):**
El sistema implementa múltiples endpoints para gestión de certificados:
- `certificateRoutes.js` - API moderna de certificados
- `certificateRoutesSimple.js` - API simplificada
- `governmentCertificateRoutes.js` - Específica para certificados gubernamentales
- `internalCertificateRoutes.js` - Específica para certificados internos
- `smartCertificateRoutes.js` - Detección automática de tipo de certificado

**⚠️ Fix Reciente (commit 11bdc78):**
Se corrigieron errores en la creación de certificados relacionados con:
- Validación de datos de entrada
- Generación de claves privadas/públicas
- Almacenamiento en base de datos

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
**Estado:** Documentación completa e implementación lista para integración

**Archivos disponibles en `documentacion/laravel_integration/`:**
- `ExpedienteDigitalService.php` - Servicio Laravel completo para integración
- `README_INSTALACION_LARAVEL.md` - Guía paso a paso de instalación
- `ejemplo_uso_controller.php` - Controlador Laravel de ejemplo
- `config_services.php` - Configuración de servicios
- `env_example.txt` - Variables de entorno requeridas
- `rutas_example.php` - Rutas API de ejemplo

**Características de la integración:**
- Service Account Pattern - Un usuario técnico (`laravel_service`) autentica Laravel
- Trazabilidad completa - Cada firma guarda `laravel_user_id` y `laravel_user_email`
- Cache automático de tokens JWT (23 horas)
- Health check y verificación de firmas
- Soporte para firma de documentos desde Laravel
- Estadísticas y listados de firmas por usuario

**API disponible:** `/api/laravel-integration/*`
- POST `/auth` - Autenticación con credenciales de servicio
- POST `/firmar` - Registrar firma desde Laravel
- GET `/mis-firmas/:laravelUserId` - Listar firmas de un usuario
- GET `/verificar-firma/:signatureId` - Verificar estado de firma
- GET `/estadisticas/:laravelUserId` - Estadísticas de usuario

**Documentación adicional:**
- `documentacion/INTEGRACION_LARAVEL.md` - Documentación técnica completa
- `documentacion/CONFIG_EDUGE_TESTING.md` - Configuración de testing

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

### 7. Optimización de Performance (commit ac1c687)
**Configuración VS Code:**
- Exclusión de `node_modules` en búsquedas
- Deshabilitación de watchers innecesarios
- Configuración de memory limits
- Optimización de indexación de archivos

**Consideraciones:**
- Base de datos: usar índices en columnas frecuentemente consultadas
- Queries: preferir `findOne` sobre `findAll` cuando sea posible
- Joins: limitar profundidad de asociaciones
- Cache: implementar cache de JWT tokens (integración Laravel)

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
- **Certificados:** `/api/certificados/*`, `/api/certificates/*`, `/api/government-certificates/*`, `/api/internal-certificates/*`, `/api/smart-certificates/*`
- **Firmas:** `/api/firmas/*`, `/api/firma-documentos/*`, `/api/signatures/*`
- **Expedientes:** `/api/expedientes/*`
- **Workflow:** `/api/workflow/*`
- **Oficinas:** `/api/oficinas/*`
- **Admin:** `/api/admin/*`
- **Laravel Integration:** `/api/laravel-integration/*`
- **Debug:** `/api/debug/*` (solo desarrollo)

### Documentación Adicional
Ver carpeta `documentacion/` para:
- `ESTRUCTURA_BASE_DATOS.md` - Esquema completo de BD
- `FIRMA_DIGITAL_API.md` - API de firma digital
- `INTEGRACION_LARAVEL.md` - Documentación técnica de integración Laravel
- `CONFIG_EDUGE_TESTING.md` - Configuración de testing
- `DEPLOYMENT_*.md` - Guías de deployment
- `laravel_integration/` - Archivos e instalación para Laravel
- Múltiples archivos de referencia técnica

---

## 🎯 Prioridades de Desarrollo Actuales

1. **✅ Integración con Laravel** - Documentación completa y servicio PHP listo para implementar
2. **🔄 Migración a Service Account Pattern** - 7 servicios implementados, continuar refactorización de rutas legacy
3. **✅ Sistema de Certificados Mejorado** - Múltiples rutas para certificados (government, internal, smart detection)
4. **✅ Fix de Certificados** - Corrección de errores en creación de certificados (commit 11bdc78)
5. **📝 Documentación IA** - CLAUDE.md implementado para mejor colaboración con herramientas IA
6. **Optimización de Performance** - Índices, queries optimizadas, configuración VS Code mejorada
7. **Completar Workflow** - Notificaciones, alertas, reportes
8. **Testing de Integración Laravel** - Probar implementación en sistema legacy

---

## ⚠️ Cambios Recientes (últimos commits)

```
11bdc78 - fix - para corregir errores al crear certificado
6b6e30d - add - claude.md (documentación para IA)
f39d0fd - feat - cambios de logica y arquitectura del proyecto
b7d81f1 - Cambios hacia el patron Service Account Pattern
dc93447 - Historial de movimientos de expedientes
ac1c687 - Optimizar performance del proyecto en VS Code
aad3ee3 - Documentación de API de firma digital y BD
50fc896 - Configurar frontend para usar backend de producción
3afcfd1 - Usar sequelize en lugar de modelo Oficina (workaround export issue)
417565d - Export default y por nombre para Oficina y modelos (compatibilidad ESM)
```

**Archivos modificados recientemente:**
- `CLAUDE.md` - Documentación para IA (agregada en commit 6b6e30d)
- `backend/services/` - 7 servicios implementados con Service Account Pattern
- `backend/routes/` - 17 rutas totales (certificados, firmas, workflow, Laravel integration)
- `backend/models/` - 17 modelos (agregados FirmaBatch, CertificateAuthority, CertificateType)
- `backend/models/Oficina.js` - Compatibilidad ESM con export default + named export
- `backend/models/WorkflowMovimiento.js` - Modelo de movimientos de workflow
- `documentacion/laravel_integration/` - Guías completas de integración Laravel
- `documentacion/INTEGRACION_LARAVEL.md` - Documentación técnica de integración
- `documentacion/CONFIG_EDUGE_TESTING.md` - Configuración de testing
- `frontend/` - Configurado para usar backend de producción

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

**Última actualización:** 2026-02-10
**Mantenedor:** Equipo de Desarrollo - Gobierno de San Juan

---

## 📊 Estadísticas del Proyecto

- **Total de Modelos:** 17 modelos Sequelize
- **Total de Rutas:** 17 archivos de rutas (endpoints)
- **Total de Servicios:** 7 servicios implementados (Service Account Pattern)
- **Migraciones:** Sistema Umzug (manual, sin sequelize-cli)
- **Estado del Repositorio:** Working tree clean
- **Branch Principal:** main
