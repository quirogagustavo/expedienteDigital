# Configurar Frontend para usar Backend de Producción

## ✅ Cambios Realizados

### Archivos Actualizados para usar Variables de Entorno:

1. **`frontend/src/services/uploadService.js`** - Ahora usa `VITE_API_BASE_URL`
2. **`frontend/src/services/authService.js`** - Ahora usa `VITE_API_BASE_URL`
3. **`frontend/src/context/AuthContext.jsx`** - Ahora usa `VITE_API_BASE_URL`
4. **`frontend/src/utils/api.js`** - Ya estaba correcto ✅

### Nuevo Archivo Creado:

5. **`frontend/src/config/api.js`** - Helper centralizado para URLs

## 📋 Pasos para Ejecutar Frontend con Backend de Producción

### Opción 1: Desarrollo Local apuntando a Producción (RECOMENDADO)

El archivo `.env.development` ya está configurado correctamente:

```bash
cd frontend
npm run dev
```

El frontend correrá en `http://localhost:5174` y consumirá el backend en `http://10.64.160.220:4000`.

### Opción 2: Build de Producción

```bash
cd frontend
npm run build
```

Esto genera el directorio `dist/` con los archivos estáticos optimizados.

## ⚠️ Archivos que Todavía Tienen URLs Hardcodeadas

Los siguientes archivos **aún tienen** `http://localhost:4000` hardcodeado y necesitan actualización manual:

### Componentes con URLs hardcodeadas:

1. **`frontend/src/components/ExpedienteManager.jsx`** (9 ocurrencias)
   - Líneas: 740, 767, 789, 813, 827, 840, 908, 919, 930

2. **`frontend/src/components/GestionFirmasFixed.jsx`** (2 ocurrencias)
   - Líneas: 378, 521

3. **`frontend/src/components/WorkflowManagerSimple.jsx`** (6 ocurrencias)
   - Líneas: 64, 65, 66, 90

4. **`frontend/src/components/UsuariosAdmin.jsx`** (6 ocurrencias)
   - Líneas: 30, 33, 55, 79, 97

5. **`frontend/src/components/TestGestionFirmas.jsx`** (1 ocurrencia)
   - Línea: 31

### Cómo Corregirlos:

Reemplaza todas las ocurrencias de `http://localhost:4000` con el helper centralizado:

```javascript
// ANTES (❌):
import axios from 'axios';
const response = await axios.get('http://localhost:4000/api/oficinas');
const imgSrc = `http://localhost:4000/api/usuarios/mi-firma/imagen`;

// DESPUÉS (✅):
import axios from 'axios';
import { getApiURL, getResourceURL } from '../config/api';

const response = await axios.get(getApiURL('/api/oficinas'));
const imgSrc = getResourceURL('/api/usuarios/mi-firma/imagen');
```

## 🔧 Configuración CORS en el Backend

El backend en producción debe permitir peticiones desde tu máquina local. Verifica que el archivo `backend/.env` en el servidor tenga:

```bash
NODE_ENV=production
FRONTEND_URL=http://localhost:5174
```

Y el código de CORS en `backend/index.js` debe incluir:

```javascript
const allowedOrigins = [
  'http://localhost:5174',
  'http://localhost:5175',
  'http://10.64.160.220',  // Si el frontend está en el mismo servidor
];
```

## 🧪 Probar la Configuración

### 1. Verificar que el backend está corriendo:

```bash
curl http://10.64.160.220:4000/
```

Debe responder: `"API de Firma Digital funcionando"`

### 2. Probar login desde frontend:

```bash
# Desde tu máquina local
cd frontend
npm run dev
```

Abre `http://localhost:5174` y prueba login con:
- Username: `admin`
- Password: (necesitas resetear primero, ver más abajo)

### 3. Si el login falla "Contraseña incorrecta":

Ejecuta en el servidor de producción:

```bash
cd /var/www/expediente-digital/backend
HASH=$(node -e "const b=require('bcryptjs'); console.log(b.hashSync('admin123', 10))")
sudo -u postgres psql -v hash="$HASH" -d expediente_digital -c "UPDATE usuarios SET password_hash = :'hash' WHERE username='admin';"
```

## 🚀 Desplegar Frontend en Producción (Opcional)

Si quieres hospedar el frontend en el mismo servidor:

### 1. Build del frontend:

```bash
cd frontend
npm run build
```

### 2. Copiar archivos al servidor:

```bash
scp -r dist/* administrator@10.64.160.220:/var/www/expediente-digital-frontend/
```

### 3. Configurar Nginx:

```nginx
server {
    listen 80;
    server_name 10.64.160.220;

    # Frontend estático
    location / {
        root /var/www/expediente-digital-frontend;
        try_files $uri $uri/ /index.html;
    }

    # Proxy al backend
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Archivos uploads
    location /uploads/ {
        proxy_pass http://localhost:4000;
    }
}
```

### 4. Recargar Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 📝 Resumen de Variables de Entorno

### `.env.development` (para desarrollo local):
```bash
VITE_API_BASE_URL=http://10.64.160.220:4000
```

### `.env.production` (para frontend hosteado en servidor):
```bash
VITE_API_BASE_URL=/api
```

## ✨ Próximos Pasos

1. ✅ Ya puedes ejecutar `npm run dev` y usar el backend de producción
2. ⏳ Actualiza los componentes con URLs hardcodeadas (opcional pero recomendado)
3. ⏳ Si quieres, despliega el frontend en el servidor de producción

## 🐛 Troubleshooting

### Error de CORS:
- Verifica que `FRONTEND_URL` en backend `.env` incluye el origen del frontend
- Revisa los logs de PM2: `pm2 logs firma-digital-backend`

### Error 401 Unauthorized:
- Resetea la contraseña del admin (ver sección "Probar la Configuración")
- Verifica que el token se guarda en localStorage del navegador

### Error de conexión:
- Verifica que PM2 está corriendo: `pm2 status`
- Prueba curl directo al backend: `curl http://10.64.160.220:4000/`
