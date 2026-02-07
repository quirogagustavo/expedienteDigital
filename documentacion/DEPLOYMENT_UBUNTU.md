# Guía de Despliegue - Expediente Digital (Sin Docker)
## Despliegue en Ubuntu Server

Esta guía te ayudará a desplegar el sistema de Expediente Digital en un servidor Ubuntu para realizar una demo.

## Requisitos del Servidor

- Ubuntu 20.04 LTS o superior
- Mínimo 2GB de RAM (recomendado 4GB)
- 10GB de espacio en disco
- Acceso root o sudo
- Puertos abiertos: 80, 443, 3001 (backend), 3000 (frontend opcional)

## Arquitectura del Proyecto

El proyecto actual tiene una arquitectura monolítica con:
- **Backend**: Node.js/Express en puerto 3001
- **Frontend**: React (puede ser servido estáticamente o en modo desarrollo)
- **Base de datos**: PostgreSQL

## Paso 1: Preparación del Servidor

### 1.1. Actualizar el sistema

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2. Instalar Node.js y npm

```bash
# Instalar curl si no está instalado
sudo apt install -y curl

# Instalar Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version
npm --version
```

### 1.3. Instalar PostgreSQL

```bash
# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Verificar que esté corriendo
sudo systemctl status postgresql

# Habilitar para que inicie con el sistema
sudo systemctl enable postgresql
```

### 1.4. Instalar PM2 (Process Manager)

PM2 mantiene la aplicación Node.js corriendo y la reinicia automáticamente si falla.

```bash
sudo npm install -g pm2
```

### 1.5. Instalar Nginx

```bash
sudo apt install -y nginx

# Verificar instalación
sudo systemctl status nginx
```

### 1.6. Instalar Git

```bash
sudo apt install -y git
```

## Paso 2: Configurar PostgreSQL

### 2.1. Crear usuario y base de datos

```bash
# Cambiar al usuario postgres
sudo -u postgres psql

# Dentro de PostgreSQL, ejecutar:
CREATE DATABASE expediente_digital;
CREATE USER expediente_user WITH ENCRYPTED PASSWORD 'TU_CONTRASEÑA_SEGURA';
GRANT ALL PRIVILEGES ON DATABASE expediente_digital TO expediente_user;
\q
```

### 2.2. Configurar acceso a PostgreSQL

Editar el archivo de configuración:

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Asegúrate de que tenga esta línea (o agrégala):
```
local   all             all                                     md5
```

Reiniciar PostgreSQL:
```bash
sudo systemctl restart postgresql
```

## Paso 3: Clonar y Configurar el Proyecto

### 3.1. Crear directorio para el proyecto

```bash
# Crear directorio
sudo mkdir -p /var/www/expediente-digital
sudo chown -R $USER:$USER /var/www/expediente-digital

# Navegar al directorio
cd /var/www/expediente-digital
```

### 3.2. Clonar el repositorio

```bash
# Clonar desde GitHub
git clone https://github.com/quirogagustavo/expedienteDigital.git .

# O si ya tienes el código localmente, súbelo al servidor usando scp:
# Desde tu máquina local ejecuta:
# scp -r ~/Documentos/firma_digital/* usuario@servidor:/var/www/expediente-digital/
```

### 3.3. Instalar dependencias del backend

```bash
cd /var/www/expediente-digital/backend
npm install --production
```

### 3.4. Instalar dependencias del frontend

```bash
cd /var/www/expediente-digital/frontend
npm install
```

## Paso 4: Configurar Variables de Entorno

### 4.1. Crear archivo .env para el backend

```bash
cd /var/www/expediente-digital/backend
nano .env
```

Agregar las siguientes variables:

```env
# Puerto del servidor
PORT=3001

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=expediente_user
DB_PASSWORD=TU_CONTRASEÑA_SEGURA
DB_NAME=expediente_digital

# JWT
JWT_SECRET=GENERA_UN_SECRET_SEGURO_AQUI
JWT_EXPIRES_IN=86400

# Entorno
NODE_ENV=production

# Rutas de archivos
UPLOAD_PATH=/var/www/expediente-digital/backend/uploads

# CORS (ajusta según tu dominio)
CORS_ORIGIN=http://tu-dominio.com
```

Para generar un JWT_SECRET seguro:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Paso 5: Inicializar la Base de Datos

### 5.1. Ejecutar migraciones o scripts SQL

Si tienes scripts SQL de inicialización:

```bash
cd /var/www/expediente-digital/backend

# Ejecutar script de inicialización
psql -h localhost -U expediente_user -d expediente_digital -f init.sql
```

O si usas Sequelize:

```bash
# Ejecutar migraciones
npx sequelize-cli db:migrate

# Ejecutar seeds (datos iniciales)
npx sequelize-cli db:seed:all
```

### 5.2. Crear directorios necesarios

```bash
# Crear directorio para uploads
mkdir -p /var/www/expediente-digital/backend/uploads/documentos
mkdir -p /var/www/expediente-digital/backend/uploads/firmas

# Dar permisos adecuados
chmod 755 /var/www/expediente-digital/backend/uploads
```

## Paso 6: Construir el Frontend

### 6.1. Build de producción

```bash
cd /var/www/expediente-digital/frontend
npm run build
```

Esto creará una carpeta `dist` o `build` con los archivos estáticos optimizados.

## Paso 7: Configurar PM2 para el Backend

### 7.1. Crear archivo de configuración de PM2

```bash
cd /var/www/expediente-digital/backend
nano ecosystem.config.js
```

Agregar:

```javascript
module.exports = {
  apps: [{
    name: 'expediente-backend',
    script: './index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/expediente-backend-error.log',
    out_file: '/var/log/expediente-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M'
  }]
};
```

### 7.2. Iniciar el backend con PM2

```bash
cd /var/www/expediente-digital/backend
pm2 start ecosystem.config.js

# Guardar configuración para reinicio automático
pm2 save

# Configurar PM2 para iniciar al arrancar el sistema
pm2 startup
# Ejecutar el comando que PM2 te muestra
```

### 7.3. Verificar que esté corriendo

```bash
pm2 status
pm2 logs expediente-backend
```

## Paso 8: Configurar Nginx

### 8.1. Crear configuración de Nginx

```bash
sudo nano /etc/nginx/sites-available/expediente-digital
```

Agregar la siguiente configuración:

```nginx
# Limitar tamaño de uploads
client_max_body_size 100M;

# Servidor HTTP (redirige a HTTPS)
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;  # Cambia por tu dominio
    
    # Redirigir todo a HTTPS (descomenta cuando tengas SSL)
    # return 301 https://$server_name$request_uri;
    
    # Frontend - archivos estáticos
    location / {
        root /var/www/expediente-digital/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Caché para archivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API Backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts para uploads grandes
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
    
    # Logs
    access_log /var/log/nginx/expediente-digital-access.log;
    error_log /var/log/nginx/expediente-digital-error.log;
}

# Servidor HTTPS (descomenta cuando tengas SSL)
# server {
#     listen 443 ssl http2;
#     server_name tu-dominio.com www.tu-dominio.com;
#     
#     ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
#     
#     # Configuración SSL moderna
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#     ssl_prefer_server_ciphers on;
#     
#     # El resto de la configuración es igual que arriba
#     location / {
#         root /var/www/expediente-digital/frontend/dist;
#         try_files $uri $uri/ /index.html;
#     }
#     
#     location /api/ {
#         proxy_pass http://localhost:3001;
#         # ... resto de configuración proxy
#     }
# }
```

### 8.2. Activar el sitio

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/expediente-digital /etc/nginx/sites-enabled/

# Eliminar sitio por defecto (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

## Paso 9: Configurar SSL con Let's Encrypt (Recomendado)

### 9.1. Instalar Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 9.2. Obtener certificado SSL

```bash
# Asegúrate de que tu dominio apunte a la IP del servidor
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Seguir las instrucciones en pantalla
```

### 9.3. Renovación automática

Certbot configura automáticamente la renovación. Puedes probarla con:

```bash
sudo certbot renew --dry-run
```

## Paso 10: Configurar Firewall

```bash
# Permitir SSH
sudo ufw allow OpenSSH

# Permitir HTTP y HTTPS
sudo ufw allow 'Nginx Full'

# Habilitar firewall
sudo ufw enable

# Verificar estado
sudo ufw status
```

## Paso 11: Verificar el Despliegue

### 11.1. Verificar backend

```bash
# Verificar que el backend esté corriendo
curl http://localhost:3001/api/health

# O si tienes un endpoint de prueba
curl http://localhost:3001/api/expedientes
```

### 11.2. Verificar frontend

Abre un navegador y visita: `http://tu-dominio.com`

### 11.3. Ver logs

```bash
# Logs del backend
pm2 logs expediente-backend

# Logs de Nginx
sudo tail -f /var/log/nginx/expediente-digital-access.log
sudo tail -f /var/log/nginx/expediente-digital-error.log
```

## Paso 12: Monitoreo y Mantenimiento

### 12.1. Comandos útiles de PM2

```bash
# Ver estado de procesos
pm2 status

# Ver logs en tiempo real
pm2 logs

# Reiniciar aplicación
pm2 restart expediente-backend

# Detener aplicación
pm2 stop expediente-backend

# Ver monitoreo en tiempo real
pm2 monit

# Ver información detallada
pm2 show expediente-backend
```

### 12.2. Actualizar la aplicación

```bash
# Navegar al directorio
cd /var/www/expediente-digital

# Detener el backend
pm2 stop expediente-backend

# Actualizar código
git pull origin main

# Instalar nuevas dependencias (backend)
cd backend
npm install --production

# Instalar nuevas dependencias (frontend)
cd ../frontend
npm install

# Rebuild frontend
npm run build

# Reiniciar backend
cd ../backend
pm2 restart expediente-backend
```

### 12.3. Backup de base de datos

```bash
# Crear directorio para backups
mkdir -p ~/backups

# Backup manual
pg_dump -h localhost -U expediente_user expediente_digital > ~/backups/expediente-$(date +%Y%m%d-%H%M%S).sql

# Automatizar con cron (ejecutar diariamente a las 2 AM)
crontab -e

# Agregar esta línea:
# 0 2 * * * pg_dump -h localhost -U expediente_user expediente_digital > ~/backups/expediente-$(date +\%Y\%m\%d-\%H\%M\%S).sql
```

### 12.4. Restaurar backup

```bash
psql -h localhost -U expediente_user -d expediente_digital < ~/backups/expediente-20250116-020000.sql
```

## Paso 13: Configuración de Seguridad Adicional

### 13.1. Configurar fail2ban para proteger SSH

```bash
sudo apt install -y fail2ban

# Configurar
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 13.2. Actualizar contraseñas por defecto

Asegúrate de cambiar todas las contraseñas por defecto en:
- PostgreSQL
- Variables de entorno (.env)
- JWT_SECRET

## Troubleshooting

### Backend no inicia

```bash
# Ver logs detallados
pm2 logs expediente-backend --lines 100

# Verificar configuración
cat /var/www/expediente-digital/backend/.env

# Probar manualmente
cd /var/www/expediente-digital/backend
node index.js
```

### Error de base de datos

```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Verificar conexión
psql -h localhost -U expediente_user -d expediente_digital

# Ver logs de PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### Error 502 Bad Gateway en Nginx

```bash
# Verificar que el backend esté corriendo
pm2 status

# Verificar logs de Nginx
sudo tail -f /var/log/nginx/error.log

# Verificar que el puerto 3001 esté escuchando
sudo netstat -tulpn | grep 3001
```

### Problemas de permisos en uploads

```bash
# Ajustar permisos
sudo chown -R $USER:www-data /var/www/expediente-digital/backend/uploads
sudo chmod -R 775 /var/www/expediente-digital/backend/uploads
```

## Acceso a la Aplicación

Una vez desplegado:

- **Aplicación web**: http://tu-dominio.com (o https:// con SSL)
- **API**: http://tu-dominio.com/api/

## Credenciales

Asegúrate de documentar y guardar de forma segura:
- Contraseña de base de datos
- JWT_SECRET
- Credenciales de usuario administrador inicial

## Contacto y Soporte

Para problemas o consultas sobre el despliegue, contacta al equipo de desarrollo.