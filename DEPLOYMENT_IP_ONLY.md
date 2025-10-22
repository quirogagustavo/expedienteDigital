# Guía Rápida - Despliegue Backend Solo con IP

## Para usar el backend en producción sin dominio/SSL (acceso por IP)

---

## Pasos en tu Máquina Local

### 1. Commitear y subir cambios

```bash
cd /home/gustavo/Documentos/firma_digital

# Ver qué archivos se van a subir
git status

# Agregar todos los cambios
git add .

# Commit
git commit -m "Preparar backend para producción (sin SSL)"

# Subir a GitHub
git push origin main
```

---

## Pasos en el Servidor de Producción

### 1. Conectar al servidor

```bash
ssh tu-usuario@IP-DEL-SERVIDOR
```

### 2. Instalar prerrequisitos (si no están instalados)

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version
npm --version

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Verificar PostgreSQL
sudo systemctl status postgresql
```

### 3. Configurar PostgreSQL

```bash
# Conectar a PostgreSQL
sudo -u postgres psql

# Crear usuario y base de datos
CREATE USER expediente_user WITH PASSWORD 'tu_password_seguro_aqui';
CREATE DATABASE expediente_digital OWNER expediente_user;
GRANT ALL PRIVILEGES ON DATABASE expediente_digital TO expediente_user;
\q

# Probar conexión
psql -U expediente_user -d expediente_digital -h 127.0.0.1
# Contraseña: la que pusiste arriba
# Si funciona, escribe \q para salir
```

### 4. Clonar el repositorio

```bash
# Crear directorio
sudo mkdir -p /var/www/expediente-digital
sudo chown $USER:$USER /var/www/expediente-digital

# Clonar desde GitHub
git clone https://github.com/quirogagustavo/expedienteDigital.git /var/www/expediente-digital

cd /var/www/expediente-digital
```

### 5. Configurar variables de entorno

```bash
cd backend

# Copiar ejemplo
cp .env.example .env

# Editar con tus credenciales REALES
nano .env
```

**Contenido del .env (ejemplo):**
```bash
NODE_ENV=production
PORT=4000

DB_USER=expediente_user
DB_PASS=tu_password_seguro_aqui
DB_NAME=expediente_digital
DB_HOST=127.0.0.1
DB_DIALECT=postgres
DB_PORT=5432
```

**Guardar:** Ctrl+O, Enter, Ctrl+X

### 6. Ejecutar script de despliegue

```bash
cd /var/www/expediente-digital

# Dar permisos (si no los tiene)
chmod +x deploy-production-simple.sh

# Ejecutar
./deploy-production-simple.sh
```

El script hará automáticamente:
- ✅ Instalar dependencias
- ✅ Ejecutar migraciones de DB
- ✅ Configurar PM2 (autoarranque)
- ✅ Configurar Nginx (HTTP)
- ✅ Configurar firewall

### 7. Verificar que funciona

```bash
# Ver estado de PM2
pm2 status

# Ver logs en tiempo real
pm2 logs firma-digital-backend

# Probar localmente
curl http://localhost:4000/

# Probar por IP (desde el servidor)
curl http://$(hostname -I | awk '{print $1}')
```

---

## Probar desde tu Máquina de Desarrollo

### En tu navegador o terminal local:

```bash
# Reemplaza con la IP real de tu servidor
curl http://IP-DEL-SERVIDOR

# Ejemplo
curl http://192.168.1.100
```

### En tu frontend (desarrollo):

Actualiza la URL del API para apuntar a la IP del servidor:

```javascript
// En tu archivo de configuración del frontend
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://tudominio.com/api'
  : 'http://IP-DEL-SERVIDOR';  // IP del servidor

// O si usas axios
axios.defaults.baseURL = 'http://IP-DEL-SERVIDOR';
```

---

## Comandos Útiles

### PM2 (Gestión de la aplicación)

```bash
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs firma-digital-backend

# Ver logs específicos (últimas 100 líneas)
pm2 logs firma-digital-backend --lines 100

# Reiniciar aplicación
pm2 restart firma-digital-backend

# Detener aplicación
pm2 stop firma-digital-backend

# Iniciar aplicación
pm2 start firma-digital-backend

# Ver información detallada
pm2 show firma-digital-backend

# Monitorear recursos (CPU, RAM)
pm2 monit
```

### Nginx

```bash
# Ver estado
sudo systemctl status nginx

# Verificar configuración
sudo nginx -t

# Recargar configuración
sudo systemctl reload nginx

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs
sudo tail -f /var/log/nginx/expediente-digital-access.log
sudo tail -f /var/log/nginx/expediente-digital-error.log
```

### Base de Datos

```bash
# Conectar a la base de datos
psql -U expediente_user -d expediente_digital -h 127.0.0.1

# Ver tablas
\dt

# Salir
\q

# Crear backup
pg_dump -U expediente_user -h localhost expediente_digital > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql -U expediente_user -h localhost expediente_digital < backup_20251022.sql
```

---

## Actualizar la Aplicación

Cuando hagas cambios en tu código:

```bash
# En el servidor
cd /var/www/expediente-digital

# Obtener últimos cambios
git pull origin main

# Si hay nuevas dependencias
cd backend
npm install --production

# Si hay nuevas migraciones
NODE_ENV=production npx sequelize-cli db:migrate --config config/config.js

# Reiniciar aplicación
pm2 restart firma-digital-backend

# Ver logs para verificar
pm2 logs firma-digital-backend
```

---

## Troubleshooting

### La aplicación no responde

```bash
# Ver si PM2 está corriendo
pm2 status

# Ver logs de errores
pm2 logs firma-digital-backend --err

# Reiniciar
pm2 restart firma-digital-backend
```

### Error de conexión a base de datos

```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Verificar credenciales en .env
cat /var/www/expediente-digital/backend/.env

# Probar conexión manual
psql -U expediente_user -d expediente_digital -h 127.0.0.1
```

### Nginx devuelve 502 Bad Gateway

```bash
# Verificar que la app esté corriendo
pm2 status

# Verificar que escuche en el puerto 4000
sudo netstat -tlnp | grep 4000

# Ver logs de Nginx
sudo tail -f /var/log/nginx/expediente-digital-error.log
```

### Firewall bloquea el acceso

```bash
# Ver estado del firewall
sudo ufw status

# Permitir HTTP
sudo ufw allow 'Nginx HTTP'

# Verificar reglas
sudo ufw status numbered
```

---

## Configurar Dominio y SSL Más Adelante

Cuando tengas un dominio listo:

1. Apunta el dominio a la IP del servidor (registro A en tu DNS)
2. Espera a que propague (puede tardar hasta 24h)
3. Ejecuta el script completo:

```bash
cd /var/www/expediente-digital
export DOMAIN="tudominio.com"
export EMAIL="tu-email@ejemplo.com"
./deploy-production.sh
```

---

## Contacto

- **Repositorio:** https://github.com/quirogagustavo/expedienteDigital
- **Documentación completa:** DEPLOYMENT_BACKEND_PRODUCTION.md
