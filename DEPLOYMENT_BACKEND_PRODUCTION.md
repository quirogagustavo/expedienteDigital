# Guía de Despliegue Backend en Producción

## Expediente Digital - Backend Node.js + Express + PostgreSQL

Esta guía cubre el despliegue del backend en un servidor Ubuntu de producción con PM2, Nginx y SSL.

---

## Tabla de Contenidos

1. [Prerrequisitos](#prerrequisitos)
2. [Preparación Local](#preparación-local)
3. [Transferir Archivos al Servidor](#transferir-archivos-al-servidor)
4. [Configuración en el Servidor](#configuración-en-el-servidor)
5. [Despliegue Automatizado](#despliegue-automatizado)
6. [Despliegue Manual](#despliegue-manual)
7. [Verificación y Pruebas](#verificación-y-pruebas)
8. [Mantenimiento](#mantenimiento)
9. [Troubleshooting](#troubleshooting)

---

## Prerrequisitos

### En el servidor de producción:
- Ubuntu 20.04 LTS o superior
- Usuario con privilegios sudo (NO root)
- Node.js 18+ y npm instalados
- PostgreSQL 12+ instalado y configurado
- Dominio apuntando a la IP del servidor (registros A y AAAA)
- Puertos 80 y 443 abiertos en firewall/proveedor cloud

### En tu máquina local:
- Git configurado
- Acceso SSH al servidor
- Archivos del proyecto actualizados

---

## Preparación Local

### 1. Verificar configuración de variables de entorno

Asegúrate de que `backend/.env.example` tenga todas las variables necesarias:

```bash
NODE_ENV=production
PORT=4000

# Database
DB_USER=expediente_user
DB_PASS=tu_password_seguro
DB_NAME=expediente_digital
DB_HOST=127.0.0.1
DB_DIALECT=postgres
DB_PORT=5432

# JWT (opcional, si usas autenticación)
JWT_SECRET=tu_secreto_muy_seguro_aqui

# Otros
FRONTEND_URL=https://tudominio.com
```

### 2. Verificar que las credenciales NO estén en el repo

```bash
# Verificar que config.json esté en .gitignore
cat .gitignore | grep config.json

# Verificar que .env esté en .gitignore
cat .gitignore | grep .env
```

### 3. Commit y push de los últimos cambios

```bash
git add .
git commit -m "Preparar para despliegue en producción"
git push origin main
```

---

## Transferir Archivos al Servidor

### Opción A: Usando el script transfer-to-server.sh

```bash
# Edita el script con los datos de tu servidor
nano transfer-to-server.sh

# Variables a configurar:
# SERVER_USER="tu_usuario"
# SERVER_IP="ip_del_servidor"
# SERVER_PATH="/var/www/expediente-digital"

# Ejecutar transferencia
./transfer-to-server.sh
```

### Opción B: Clonar desde Git (recomendado)

```bash
# En el servidor
ssh usuario@servidor

# Crear directorio
sudo mkdir -p /var/www/expediente-digital
sudo chown $USER:$USER /var/www/expediente-digital

# Clonar repositorio
cd /var/www
git clone https://github.com/quirogagustavo/expedienteDigital.git expediente-digital
cd expediente-digital
```

---

## Configuración en el Servidor

### 1. Crear archivo .env con credenciales reales

```bash
cd /var/www/expediente-digital/backend

# Copiar ejemplo
cp .env.example .env

# Editar con credenciales reales
nano .env
```

**IMPORTANTE:** Usa credenciales seguras y diferentes a desarrollo.

### 2. Verificar PostgreSQL

```bash
# Conectar a PostgreSQL
sudo -u postgres psql

# Crear usuario y base de datos (si no existen)
CREATE USER expediente_user WITH PASSWORD 'tu_password_seguro';
CREATE DATABASE expediente_digital OWNER expediente_user;
GRANT ALL PRIVILEGES ON DATABASE expediente_digital TO expediente_user;
\q

# Probar conexión
psql -U expediente_user -d expediente_digital -h 127.0.0.1
```

### 3. Configurar PostgreSQL para aceptar conexiones locales

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Añadir/verificar esta línea:
# local   all             expediente_user                                 md5
# host    all             expediente_user     127.0.0.1/32            md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

---

## Despliegue Automatizado

### Usar el script deploy-production.sh

```bash
# En el servidor, desde el directorio del proyecto
cd /var/www/expediente-digital

# Dar permisos de ejecución (si no los tiene)
chmod +x deploy-production.sh

# Configurar variables de entorno para el script
export DOMAIN="tudominio.com"
export EMAIL="admin@tudominio.com"
export APP_DIR="/var/www/expediente-digital"
export APP_USER="$USER"

# Ejecutar script
./deploy-production.sh
```

El script realizará automáticamente:
1. ✓ Verificación de prerrequisitos
2. ✓ Instalación de dependencias
3. ✓ Ejecución de migraciones
4. ✓ Configuración de PM2 con autoarranque
5. ✓ Instalación y configuración de Nginx
6. ✓ Configuración de firewall
7. ✓ Obtención de certificado SSL con Let's Encrypt

---

## Despliegue Manual

Si prefieres hacer el despliegue paso a paso:

### 1. Instalar dependencias del backend

```bash
cd /var/www/expediente-digital/backend
npm install --production
```

### 2. Ejecutar migraciones

```bash
# Instalar sequelize-cli si no está
npm install --save-dev sequelize-cli

# Ejecutar migraciones
NODE_ENV=production npx sequelize-cli db:migrate --config config/config.js --migrations-path migrations
```

### 3. Configurar PM2

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar aplicación
pm2 start index.js --name firma-digital-backend --env production

# Guardar configuración
pm2 save

# Configurar autoarranque
sudo pm2 startup systemd -u $USER --hp $HOME
pm2 save
```

### 4. Instalar y configurar Nginx

```bash
# Instalar Nginx
sudo apt update
sudo apt install -y nginx

# Crear configuración
sudo nano /etc/nginx/sites-available/expediente-digital
```

Contenido del archivo:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name tudominio.com www.tudominio.com;

    client_max_body_size 50M;

    access_log /var/log/nginx/expediente-digital-access.log;
    error_log /var/log/nginx/expediente-digital-error.log;

    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Crear directorio para Let's Encrypt
sudo mkdir -p /var/www/letsencrypt

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/expediente-digital /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
sudo systemctl enable nginx
```

### 5. Configurar firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 6. Obtener certificado SSL

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tudominio.com -d www.tudominio.com

# Probar renovación automática
sudo certbot renew --dry-run
```

---

## Verificación y Pruebas

### 1. Verificar que PM2 esté ejecutando la aplicación

```bash
pm2 status
pm2 logs firma-digital-backend --lines 50
```

### 2. Probar endpoint local

```bash
curl http://localhost:4000/
# Debería devolver: "API de Firma Digital funcionando"
```

### 3. Probar dominio HTTP

```bash
curl http://tudominio.com/
```

### 4. Probar dominio HTTPS

```bash
curl https://tudominio.com/
```

### 5. Verificar Nginx

```bash
sudo nginx -t
sudo systemctl status nginx
```

### 6. Verificar logs

```bash
# Logs de la aplicación
pm2 logs firma-digital-backend

# Logs de Nginx
sudo tail -f /var/log/nginx/expediente-digital-error.log
sudo tail -f /var/log/nginx/expediente-digital-access.log

# Logs del sistema
sudo journalctl -u nginx -n 100
```

---

## Mantenimiento

### Actualizar la aplicación

```bash
# En el servidor
cd /var/www/expediente-digital

# Obtener últimos cambios
git pull origin main

# Instalar nuevas dependencias
cd backend
npm install --production

# Ejecutar migraciones si hay nuevas
NODE_ENV=production npx sequelize-cli db:migrate --config config/config.js

# Reiniciar aplicación
pm2 restart firma-digital-backend
```

### Comandos PM2 útiles

```bash
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs firma-digital-backend

# Reiniciar
pm2 restart firma-digital-backend

# Detener
pm2 stop firma-digital-backend

# Eliminar
pm2 delete firma-digital-backend

# Información detallada
pm2 show firma-digital-backend

# Monitorear recursos
pm2 monit
```

### Backup de base de datos

```bash
# Crear backup
pg_dump -U expediente_user -h localhost expediente_digital > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql -U expediente_user -h localhost expediente_digital < backup_20251022.sql
```

---

## Troubleshooting

### La aplicación no inicia

```bash
# Ver logs de PM2
pm2 logs firma-digital-backend --err

# Verificar archivo .env
cat /var/www/expediente-digital/backend/.env

# Probar iniciar manualmente
cd /var/www/expediente-digital/backend
NODE_ENV=production node index.js
```

### Error de conexión a base de datos

```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Verificar conexión
psql -U expediente_user -d expediente_digital -h 127.0.0.1

# Ver logs de PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### Nginx devuelve 502 Bad Gateway

```bash
# Verificar que la app esté corriendo
pm2 status

# Verificar que escuche en el puerto correcto
sudo netstat -tlnp | grep 4000

# Ver logs de Nginx
sudo tail -f /var/log/nginx/expediente-digital-error.log
```

### Certificado SSL no se renueva

```bash
# Probar renovación manual
sudo certbot renew --dry-run

# Forzar renovación
sudo certbot renew --force-renewal

# Ver logs de Certbot
sudo journalctl -u certbot
```

### PM2 no arranca al reiniciar el servidor

```bash
# Regenerar script de startup
sudo pm2 startup systemd -u $USER --hp $HOME

# Ejecutar el comando que devuelve

# Guardar lista de procesos
pm2 save

# Probar reboot
sudo reboot

# Después del reboot, verificar
pm2 status
```

---

## Seguridad Adicional

### 1. Configurar rate limiting en Nginx

Edita `/etc/nginx/sites-available/expediente-digital`:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    # ...
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://127.0.0.1:4000;
        # ... resto de configuración
    }
}
```

### 2. Configurar CORS solo para tu dominio

Edita `backend/index.js`:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://tudominio.com',
  credentials: true
}));
```

### 3. Usar variables de entorno para secretos

Nunca uses valores hardcodeados para JWT_SECRET u otras claves sensibles.

---

## Recursos Adicionales

- [Documentación PM2](https://pm2.keymetrics.io/)
- [Documentación Nginx](https://nginx.org/en/docs/)
- [Documentación Let's Encrypt](https://letsencrypt.org/docs/)
- [Documentación PostgreSQL](https://www.postgresql.org/docs/)

---

## Soporte

Para problemas o preguntas, consulta los logs y la documentación del proyecto.
