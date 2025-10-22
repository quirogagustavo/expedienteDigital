# Guía Rápida de Despliegue

## Resumen

Has creado los archivos necesarios para desplegar el proyecto Expediente Digital en un servidor Ubuntu sin Docker.

## Archivos Creados

1. **DEPLOYMENT_UBUNTU.md**: Guía detallada paso a paso del despliegue manual
2. **deploy-ubuntu.sh**: Script automatizado de despliegue (ejecutar en el servidor)
3. **transfer-to-server.sh**: Script para transferir archivos desde tu máquina local al servidor

## Opción 1: Despliegue Automatizado (Recomendado)

### Desde tu máquina local:

```bash
# 1. Transferir archivos al servidor
cd /home/gustavo/Documentos/firma_digital
./transfer-to-server.sh
```

El script te pedirá:
- Usuario del servidor (ej: ubuntu, root, etc.)
- IP o dominio del servidor
- Si usarás clave SSH

### En el servidor:

```bash
# 2. Conectarse al servidor
ssh usuario@ip-del-servidor

# 3. Ejecutar el script de despliegue
chmod +x /tmp/deploy-ubuntu.sh
/tmp/deploy-ubuntu.sh
```

El script automáticamente:
- ✓ Instalará Node.js, PostgreSQL, PM2, Nginx
- ✓ Configurará la base de datos
- ✓ Instalará dependencias
- ✓ Configurará variables de entorno
- ✓ Construirá el frontend
- ✓ Iniciará el backend con PM2
- ✓ Configurará Nginx
- ✓ Opcionalmente configurará SSL con Let's Encrypt

## Opción 2: Despliegue Manual

Si prefieres hacer el despliegue paso a paso, sigue la guía en `DEPLOYMENT_UBUNTU.md`.

## Después del Despliegue

### Verificar que todo funcione:

```bash
# En el servidor, verificar estado del backend
pm2 status

# Ver logs
pm2 logs expediente-backend

# Verificar Nginx
sudo systemctl status nginx

# Ver logs de Nginx
sudo tail -f /var/log/nginx/expediente-digital-error.log
```

### Acceder a la aplicación:

- Aplicación: `http://tu-servidor.com` o `http://ip-del-servidor`
- API: `http://tu-servidor.com/api/`

## Comandos Útiles

```bash
# Reiniciar backend
pm2 restart expediente-backend

# Ver logs en tiempo real
pm2 logs expediente-backend --lines 100

# Detener backend
pm2 stop expediente-backend

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver estado de servicios
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
```

## Actualizar la Aplicación

```bash
# En el servidor
cd /var/www/expediente-digital

# Detener backend
pm2 stop expediente-backend

# Actualizar código (si usas git)
git pull origin main

# O transferir nuevos archivos desde local
# (ejecutar transfer-to-server.sh desde tu máquina)

# Instalar nuevas dependencias
cd backend && npm install --production
cd ../frontend && npm install && npm run build

# Reiniciar backend
cd ../backend
pm2 restart expediente-backend
```

## Backup

### Base de datos:

```bash
# Crear backup
pg_dump -h localhost -U expediente_user expediente_digital > ~/backup-$(date +%Y%m%d).sql

# Restaurar backup
psql -h localhost -U expediente_user -d expediente_digital < ~/backup-20250116.sql
```

### Archivos:

```bash
# Backup de uploads
tar -czf ~/uploads-backup-$(date +%Y%m%d).tar.gz /var/www/expediente-digital/backend/uploads
```

## Troubleshooting

### Error 502 Bad Gateway

```bash
# Verificar que el backend esté corriendo
pm2 status

# Si no está corriendo, iniciarlo
cd /var/www/expediente-digital/backend
pm2 start ecosystem.config.js

# Ver logs para identificar el problema
pm2 logs expediente-backend
```

### Error de conexión a base de datos

```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Intentar conectarse manualmente
psql -h localhost -U expediente_user -d expediente_digital

# Verificar credenciales en .env
cat /var/www/expediente-digital/backend/.env
```

### Archivos no se pueden subir

```bash
# Verificar permisos del directorio uploads
ls -la /var/www/expediente-digital/backend/uploads

# Ajustar permisos si es necesario
sudo chown -R $USER:www-data /var/www/expediente-digital/backend/uploads
sudo chmod -R 775 /var/www/expediente-digital/backend/uploads
```

## Seguridad

### Cambiar credenciales por defecto:

1. Contraseña de PostgreSQL
2. JWT_SECRET en .env
3. Configurar firewall
4. Instalar SSL con Let's Encrypt

### Configurar SSL:

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com
```

## Notas Importantes

- El script genera automáticamente:
  - JWT_SECRET aleatorio
  - Configuración de PM2
  - Configuración de Nginx
  
- Guarda las credenciales mostradas al final del despliegue

- El backend corre en modo cluster (2 instancias) para mejor rendimiento

- Los logs se guardan en:
  - PM2: `/var/log/expediente-backend-*.log`
  - Nginx: `/var/log/nginx/expediente-digital-*.log`

## Soporte

Para más detalles, consulta `DEPLOYMENT_UBUNTU.md`