# Checklist de Despliegue Backend - Producción

## Pre-Despliegue (Ejecutar ANTES de transferir al servidor)

### Configuración Local
- [ ] `.env.example` tiene todas las variables necesarias
- [ ] `backend/config/config.json` está en `.gitignore`
- [ ] `backend/.env` está en `.gitignore`
- [ ] `backend/config/config.js` carga variables desde `.env` correctamente
- [ ] Todas las migraciones están en formato `.cjs` (no `.js`)
- [ ] `deploy-production.sh` tiene permisos de ejecución (`chmod +x`)
- [ ] `transfer-to-server.sh` tiene permisos de ejecución (`chmod +x`)

### Código
- [ ] Todos los cambios están commiteados
- [ ] Los tests pasan (si existen)
- [ ] No hay credenciales hardcodeadas en el código
- [ ] `package.json` tiene todas las dependencias necesarias
- [ ] Push realizado al repositorio remoto

### Documentación
- [ ] `DEPLOYMENT_BACKEND_PRODUCTION.md` está actualizado
- [ ] Variables de entorno documentadas en `.env.example`
- [ ] README tiene instrucciones básicas

---

## En el Servidor de Producción

### Prerrequisitos del Sistema
- [ ] Ubuntu 20.04+ instalado
- [ ] Usuario con sudo (NO root) creado
- [ ] Node.js 18+ instalado (`node --version`)
- [ ] npm instalado (`npm --version`)
- [ ] PostgreSQL 12+ instalado (`psql --version`)
- [ ] Git instalado (`git --version`)
- [ ] Dominio apunta a la IP del servidor (verificar con `nslookup tudominio.com`)
- [ ] Puertos 80 y 443 abiertos en firewall del proveedor cloud

### Base de Datos
- [ ] PostgreSQL está corriendo (`sudo systemctl status postgresql`)
- [ ] Usuario de base de datos creado (`expediente_user`)
- [ ] Base de datos creada (`expediente_digital`)
- [ ] Permisos otorgados al usuario
- [ ] `pg_hba.conf` permite conexiones locales con password
- [ ] Conexión probada: `psql -U expediente_user -d expediente_digital -h 127.0.0.1`

### Archivos de la Aplicación
- [ ] Código clonado o transferido a `/var/www/expediente-digital`
- [ ] Permisos correctos en el directorio (`chown usuario:usuario`)
- [ ] `backend/.env` creado con valores de producción
- [ ] `backend/.env` tiene credenciales SEGURAS (diferentes a desarrollo)
- [ ] Verificar que `.env` NO esté en el repo: `git ls-files backend/.env` (debe estar vacío)

---

## Despliegue Automatizado

### Configurar Variables para el Script
```bash
export DOMAIN="tudominio.com"
export EMAIL="admin@tudominio.com"
export APP_DIR="/var/www/expediente-digital"
export APP_USER="$USER"
```

### Ejecutar Script
```bash
cd /var/www/expediente-digital
./deploy-production.sh
```

### Verificaciones del Script
- [ ] Prerrequisitos verificados
- [ ] Dependencias instaladas
- [ ] Migraciones ejecutadas sin errores
- [ ] PM2 instalado y app iniciada
- [ ] PM2 configurado para autoarranque
- [ ] Nginx instalado y configurado
- [ ] Firewall configurado (UFW)
- [ ] Certificado SSL obtenido (Let's Encrypt)

---

## Post-Despliegue (Verificaciones)

### Aplicación
- [ ] PM2 muestra proceso "online": `pm2 status`
- [ ] Logs de PM2 no muestran errores: `pm2 logs firma-digital-backend --lines 50`
- [ ] App responde localmente: `curl http://localhost:4000/`
- [ ] Variables de entorno cargadas correctamente (verificar en logs)

### Base de Datos
- [ ] Tablas creadas correctamente: `psql -U expediente_user -d expediente_digital -c "\dt"`
- [ ] Migraciones aplicadas: verificar tabla `SequelizeMeta`

### Nginx
- [ ] Nginx está corriendo: `sudo systemctl status nginx`
- [ ] Configuración válida: `sudo nginx -t`
- [ ] Dominio responde HTTP: `curl -I http://tudominio.com/`
- [ ] Dominio responde HTTPS: `curl -I https://tudominio.com/`
- [ ] Certificado SSL válido: `openssl s_client -connect tudominio.com:443 -servername tudominio.com`
- [ ] Redirige HTTP a HTTPS correctamente

### Firewall
- [ ] UFW activo: `sudo ufw status`
- [ ] Puerto 22 (SSH) abierto
- [ ] Puerto 80 (HTTP) abierto
- [ ] Puerto 443 (HTTPS) abierto
- [ ] Otros puertos bloqueados

### Logs
- [ ] Logs de aplicación sin errores: `pm2 logs firma-digital-backend`
- [ ] Logs de Nginx sin errores: `sudo tail -f /var/log/nginx/expediente-digital-error.log`
- [ ] No hay errores en journalctl: `sudo journalctl -xe -n 100`

### Funcionalidad
- [ ] Endpoint raíz responde: `curl https://tudominio.com/`
- [ ] API responde correctamente (probar endpoint de login, etc.)
- [ ] CORS configurado correctamente
- [ ] Upload de archivos funciona (si aplica)
- [ ] Conexión a base de datos funcional

---

## Seguridad

### Aplicación
- [ ] Variables sensibles en `.env` (NO en código)
- [ ] JWT_SECRET es único y seguro
- [ ] Credenciales de DB son fuertes y únicas
- [ ] CORS solo permite dominios autorizados
- [ ] Rate limiting configurado en Nginx (opcional)

### Servidor
- [ ] SSH con autenticación por clave (no password)
- [ ] Puerto SSH cambiado (opcional pero recomendado)
- [ ] Fail2ban instalado (opcional)
- [ ] Actualizaciones de seguridad aplicadas: `sudo apt update && sudo apt upgrade`
- [ ] Solo servicios necesarios corriendo

### SSL/TLS
- [ ] Certificado válido y no expirado
- [ ] Renovación automática configurada: `sudo certbot renew --dry-run`
- [ ] Solo TLS 1.2+ habilitado
- [ ] Headers de seguridad configurados (HSTS, etc.)

---

## Respaldos

### Base de Datos
- [ ] Script de backup configurado
- [ ] Backup inicial creado: `pg_dump -U expediente_user expediente_digital > backup_inicial.sql`
- [ ] Backup programado (cron o script)
- [ ] Backup guardado fuera del servidor

### Archivos
- [ ] Código respaldado en Git
- [ ] Archivos de configuración documentados
- [ ] Uploads/documentos respaldados (si aplica)

---

## Monitoreo

### Configurado
- [ ] PM2 monit funcionando: `pm2 monit`
- [ ] Logs centralizados o accesibles
- [ ] Alertas configuradas (opcional)

### A Monitorear
- [ ] Uso de CPU/RAM
- [ ] Espacio en disco
- [ ] Errores en logs
- [ ] Tiempo de respuesta de la API
- [ ] Expiración de certificado SSL (90 días)

---

## Documentación

### Para el Equipo
- [ ] Credenciales guardadas en gestor de contraseñas
- [ ] Accesos SSH documentados
- [ ] Procedimientos de despliegue documentados
- [ ] Contactos de emergencia definidos

### Runbooks
- [ ] Cómo hacer rollback
- [ ] Cómo actualizar la aplicación
- [ ] Cómo reiniciar servicios
- [ ] Cómo restaurar backup de DB

---

## Próximos Pasos (Opcional)

### Mejoras
- [ ] CI/CD pipeline configurado
- [ ] Monitoreo avanzado (Datadog, New Relic, etc.)
- [ ] CDN para assets estáticos
- [ ] Base de datos en cluster/replica
- [ ] Load balancer (si escala)

### Testing en Producción
- [ ] Smoke tests ejecutados
- [ ] Tests de carga realizados
- [ ] Plan de disaster recovery definido

---

## Contactos y Recursos

- **Servidor:** [IP o hostname]
- **Dominio:** [tudominio.com]
- **Proveedor Cloud:** [AWS/DigitalOcean/etc]
- **DNS:** [Cloudflare/Route53/etc]
- **Repositorio:** https://github.com/quirogagustavo/expedienteDigital
- **Soporte:** [email/slack/etc]

---

## Notas Finales

- Mantén este checklist actualizado con cada despliegue
- Documenta cualquier issue encontrado y su solución
- Revisa logs regularmente los primeros días
- Ten un plan de rollback listo antes de desplegar

**Fecha del último despliegue:** [Completar]
**Versión desplegada:** [Completar]
**Responsable:** [Completar]
