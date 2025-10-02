# 🔐 Sistema de Firma Digital - Gobierno de San Juan

<div align="center">

![Estado](https://img.shields.io/badge/Estado-Funcional-success)
![Node.js](https://img.shields.io/badge/Node.js-16+-green)
![React](https://img.shields.io/badge/React-18-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue)

**Sistema completo de firma digital con certificados internos y tokens criptográficos**

</div>

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 16+
- PostgreSQL 12+
- npm

### Instalación

#### Backend
```bash
cd backend/
npm install
createdb firma_digital
export DB_NAME=firma_digital
export DB_USER=postgres
export DB_PASSWORD=tu_password
export JWT_SECRET=tu_jwt_secret
node index.js
```

#### Frontend
```bash
cd frontend/
npm install
echo "VITE_API_BASE_URL=http://localhost:4000/api" > .env
npm run dev
```

### Acceso
- **Frontend:** http://localhost:5175
- **Usuario:** admin / admin123

## ✨ Características

- ✅ Firma digital con certificados internos
- ✅ Soporte para tokens criptográficos PKCS#11
- ✅ Gestión de usuarios con roles
- ✅ Datos completos del firmante
- ✅ Manejo de PDFs encriptados
- ✅ PIN único por sesión de token
- ✅ Autenticación JWT segura

## 📁 Estructura

```
firma_digital/
├── frontend/          # Aplicación React
├── backend/           # Servidor Node.js + Express
├── DOCUMENTACION.md   # Documentación completa
├── GUIA_TECNICA.md    # Guía técnica detallada
└── TESTING.md         # Casos de prueba
```

## 📚 Documentación

- **[Documentación Completa](DOCUMENTACION.md)** - Arquitectura, API, flujos
- **[Guía Técnica](GUIA_TECNICA.md)** - Ejemplos de código y endpoints
- **[Testing](TESTING.md)** - Casos de prueba y QA

## 🔒 Seguridad

- Autenticación JWT
- Encriptación bcrypt
- Control de roles
- Firmas SHA-256 + RSA
- Validación de tokens PKCS#11

## 📞 Soporte

- **Email:** soporte.tecnico@sanjuan.gob.ar
- **Desarrollado para:** Gobierno de San Juan

---

**© 2024 Gobierno de San Juan - Sistema de Firma Digital**