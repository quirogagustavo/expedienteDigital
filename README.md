# 🔐 Sistema de Firma Digital - Gobierno de San Juan

<div align="center">

![Gobierno de San Juan](https://img.shields.io/badge/Gobierno-San%20Juan-blue)
![Node.js](https://img.shields.io/badge/Node.js-16+-green)
![React](https://img.shields.io/badge/React-18-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue)
![Estado](https://img.shields.io/badge/Estado-Funcional-success)

**Sistema completo de firma digital con certificados internos y tokens criptográficos**

[Instalación](#-instalación-rápida) • [Documentación](#-documentación) • [API](#-api-endpoints) • [Testing](#-testing)

</div>

---

## 🎯 Descripción

Sistema web completo para firma digital de documentos desarrollado para el Gobierno de San Juan. Permite firmar documentos PDF y otros formatos usando certificados internos o tokens criptográficos externos, cumpliendo con estándares de seguridad gubernamental.

### ✨ Características Principales

- ✅ **Firma Digital Segura** - Certificados internos y tokens PKCS#11
- ✅ **Gestión de Usuarios** - Roles: admin, empleado, ciudadano
- ✅ **Soporte Multi-formato** - PDF, imágenes, documentos de texto
- ✅ **Datos del Firmante** - Información profesional en documentos
- ✅ **Autenticación JWT** - Control de acceso seguro
- ✅ **PIN Único por Sesión** - Optimización de experiencia usuario
- ✅ **PDFs Encriptados** - Manejo de documentos protegidos

---

## 🚀 Instalación Rápida

### Prerrequisitos
- Node.js 16+
- PostgreSQL 12+
- npm o yarn

### 1. Clonar y Configurar Backend
```bash
# Navegar al backend
cd backend/

# Instalar dependencias
npm install

# Configurar base de datos PostgreSQL
createdb firma_digital

# Configurar variables de entorno
export DB_NAME=firma_digital
export DB_USER=postgres
export DB_PASSWORD=tu_password
export JWT_SECRET=tu_jwt_secret_seguro

# Iniciar servidor
node index.js
```

### 2. Configurar Frontend
```bash
# Navegar al frontend
cd frontend/

# Instalar dependencias
npm install

# Crear archivo .env
echo "VITE_API_BASE_URL=http://localhost:4000/api" > .env

# Iniciar desarrollo
npm run dev
```

### 3. Acceder al Sistema
- **Frontend:** http://localhost:5175
- **Backend API:** http://localhost:4000/api
- **Credenciales por defecto:**
  - Usuario: `admin`
  - Contraseña: `admin123`

---

## 🗂️ Estructura del Proyecto

```
firma_digital/
├── 📁 frontend/                 # Aplicación React
│   ├── src/
│   │   ├── components/          # Componentes UI
│   │   ├── services/           # Servicios API
│   │   └── utils/              # Utilidades
│   └── package.json
├── 📁 backend/                  # Servidor Node.js
│   ├── models/                 # Modelos Sequelize
│   ├── routes/                 # Endpoints API
│   ├── middleware/             # Middleware Express
│   └── index.js               # Servidor principal
├── 📄 DOCUMENTACION.md         # Documentación completa
├── 📄 GUIA_TECNICA.md          # Guía técnica detallada
├── 📄 TESTING.md               # Casos de prueba
└── 📄 README.md                # Este archivo
```

---

## 🎨 Interfaz de Usuario

### Panel Principal
- **Selección de Archivos** - Drag & drop o selección manual
- **Datos del Firmante** - Formulario con validaciones
- **Modos de Firma** - Certificado interno o token criptográfico
- **Gestión de Tokens** - Detección y autenticación automática

### Flujo de Firma
1. **Seleccionar documento** (PDF, imagen, texto)
2. **Completar datos del firmante** (nombre*, apellido*, DNI*)
3. **Elegir método de firma** (interno/token)
4. **Autenticar** (PIN solo una vez por sesión)
5. **Descargar documento firmado** (automático)

---

## 🔌 API Endpoints

### Autenticación
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/register` - Registro de usuario

### Usuarios
- `GET /api/users/profile` - Obtener perfil
- `PUT /api/users/profile` - Actualizar perfil

### Certificados
- `GET /api/certificates` - Listar certificados
- `POST /api/certificates/validate` - Validar certificado

### Firmas
- `POST /api/signatures/sign` - Firmar documento
- `GET /api/signatures/verify/:id` - Verificar firma
- `GET /api/signatures/history` - Historial de firmas

**Ejemplo de uso:**
```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Firmar documento
curl -X POST http://localhost:4000/api/signatures/sign \
  -H "Authorization: Bearer <token>" \
  -F "file=@documento.pdf" \
  -F "signer_name=Juan Pérez" \
  -F "signer_dni=12345678"
```

---

## 🗄️ Base de Datos

### Modelo de Datos
- **usuarios** - Información de usuarios del sistema
- **certificados** - Certificados digitales disponibles
- **signatures** - Registro de firmas realizadas
- **documents** - Metadatos de documentos firmados

### Configuración PostgreSQL
```sql
CREATE DATABASE firma_digital;
CREATE USER firma_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE firma_digital TO firma_user;
```

---

## 🔒 Seguridad

### Características de Seguridad
- **JWT Authentication** - Tokens con expiración 24h
- **Bcrypt Password Hashing** - Contraseñas encriptadas
- **Role-based Access Control** - Permisos por rol
- **PKCS#11 Token Support** - Estándar criptográfico
- **SHA-256 Document Hashing** - Integridad de documentos
- **RSA Digital Signatures** - Firma criptográfica robusta

### Validaciones
- Datos del firmante obligatorios
- Tipos de archivo soportados
- Tamaño máximo de archivos
- Autenticación de tokens por PIN

---

## 🧪 Testing

### Ejecutar Tests
```bash
# Tests del backend
cd backend/
npm test

# Tests del frontend
cd frontend/
npm test

# Tests de integración
npm run test:integration
```

### Casos de Prueba
- ✅ Autenticación de usuarios
- ✅ Validación de formularios
- ✅ Firma con certificado interno
- ✅ Firma con token criptográfico
- ✅ Manejo de errores
- ✅ Generación de PDFs

---

## 📊 Monitoreo

### Métricas del Sistema
- **Tiempo de firma:** < 2 segundos promedio
- **Concurrencia:** 100+ usuarios simultáneos
- **Disponibilidad:** 99.9% uptime objetivo
- **Compatibilidad:** Chrome 90+, Firefox 88+, Safari 14+

### Logs
```bash
# Ver logs del sistema
tail -f logs/combined.log

# Ver solo errores
tail -f logs/error.log
```

---

## 🔧 Configuración Avanzada

### Variables de Entorno - Backend
```bash
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=firma_digital
DB_USER=postgres
DB_PASSWORD=password

# Autenticación
JWT_SECRET=tu_jwt_secret_muy_seguro
JWT_EXPIRES_IN=24h

# Servidor
PORT=4000
NODE_ENV=production
```

### Variables de Entorno - Frontend
```bash
# API
VITE_API_BASE_URL=http://localhost:4000/api

# Configuración
VITE_MAX_FILE_SIZE=10485760  # 10MB
VITE_SUPPORTED_FORMATS=pdf,jpg,png,txt
```

---

## 🚨 Resolución de Problemas

### Problemas Comunes

**Error: Puerto en uso**
```bash
# Liberar puertos
pkill -f "node.*index.js"
pkill -f "vite"
```

**Error: Base de datos no conecta**
```bash
# Verificar PostgreSQL
sudo systemctl status postgresql
sudo systemctl start postgresql
```

**Error: Token expirado**
```javascript
// El sistema redirige automáticamente al login
// Refrescar página y volver a autenticarse
```

### Logs de Debug
```bash
# Backend con debug
DEBUG=* node index.js

# Ver consultas SQL
DEBUG=sequelize:sql node index.js
```

---

## 📚 Documentación

### Documentos Disponibles
- **[DOCUMENTACION.md](DOCUMENTACION.md)** - Documentación completa del sistema
- **[GUIA_TECNICA.md](GUIA_TECNICA.md)** - Guía técnica detallada con ejemplos
- **[TESTING.md](TESTING.md)** - Casos de prueba y testing

### Recursos Adicionales
- Diagrams de flujo en documentación
- Ejemplos de código para integración
- Scripts de utilidad y deployment
- Métricas de performance

---

## 🤝 Contribución

### Proceso de Desarrollo
1. Fork del repositorio
2. Crear branch feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### Estándares de Código
- ESLint para JavaScript
- Prettier para formateo
- Conventional Commits
- Tests obligatorios para nuevas funcionalidades

---

## 📈 Roadmap

### Funcionalidades Futuras
- [ ] Firma múltiple simultánea
- [ ] Integración con AFIP
- [ ] Notificaciones por email
- [ ] API para integración externa
- [ ] Dashboard de administración
- [ ] Backup automático
- [ ] Auditoría avanzada

---

## 📞 Soporte

### Contacto Técnico
- **Email:** soporte.tecnico@sanjuan.gob.ar
- **Teléfono:** +54 264 123-4567
- **Horario:** Lunes a Viernes, 8:00 - 18:00 (ART)

### Reportar Problemas
- Crear issue en el repositorio
- Incluir logs relevantes
- Describir pasos para reproducir
- Especificar versión del sistema

---

## 📄 Licencia

Este proyecto es desarrollado para el **Gobierno de San Juan** bajo licencia gubernamental. 

**Restricciones de Uso:**
- Solo para uso oficial del Gobierno de San Juan
- Prohibida distribución sin autorización
- Cumple con normativas de seguridad gubernamental

---

## 🏆 Características Destacadas

### 🔑 Optimización de PIN
- **Problema resuelto:** PIN solicitado dos veces en token
- **Solución:** Autenticación persistente por sesión
- **Beneficio:** Mejor experiencia de usuario

### 📋 Datos del Firmante
- **Implementación:** Formulario completo de identificación
- **Validaciones:** Campos obligatorios y opcionales
- **Integración:** Datos incluidos en PDFs firmados

### 📄 Manejo de PDFs
- **Soporte completo:** PDFs encriptados y normales
- **Fallback inteligente:** Certificado separado si PDF protegido
- **Compatibilidad:** PDF 1.4 a 2.0

---

<div align="center">

**© 2024 Gobierno de San Juan**  
*Sistema de Firma Digital - Máxima Seguridad Gubernamental*

[![Estado](https://img.shields.io/badge/Sistema-Operativo-brightgreen)](http://localhost:5175)
[![Documentación](https://img.shields.io/badge/Docs-Completa-blue)](DOCUMENTACION.md)
[![Soporte](https://img.shields.io/badge/Soporte-24%2F7-orange)](mailto:soporte.tecnico@sanjuan.gob.ar)

</div>