#!/bin/bash
set -e

# ============================================================================
# Script de Despliegue Simple - Solo Backend (sin SSL/Dominio)
# ============================================================================
# Para usar con IP del servidor, sin certificado SSL
# Ejecutar como usuario con sudo (NO como root)
# ============================================================================

echo "========================================"
echo "Despliegue Backend - Producción Simple"
echo "========================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables de configuración
APP_DIR="${APP_DIR:-/var/www/expediente-digital}"
BACKEND_DIR="${APP_DIR}/backend"
APP_USER="${APP_USER:-$USER}"
APP_NAME="firma-digital-backend"
APP_PORT="4000"

echo -e "${YELLOW}Configuración:${NC}"
echo "Directorio: $APP_DIR"
echo "Usuario: $APP_USER"
echo "Puerto: $APP_PORT"
echo ""

# ============================================================================
# 1. Verificar prerrequisitos
# ============================================================================
echo -e "${GREEN}[1/5] Verificando prerrequisitos...${NC}"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js no está instalado${NC}"
    exit 1
fi
echo "✓ Node.js $(node --version)"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm no está instalado${NC}"
    exit 1
fi
echo "✓ npm $(npm --version)"

# Verificar directorio backend
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Error: Directorio backend no encontrado: $BACKEND_DIR${NC}"
    exit 1
fi
echo "✓ Directorio backend encontrado"

# Verificar .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}Advertencia: Archivo .env no encontrado${NC}"
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
        echo -e "${YELLOW}IMPORTANTE: Edita $BACKEND_DIR/.env con las credenciales correctas${NC}"
        read -p "Presiona Enter cuando hayas editado el archivo .env..."
    else
        echo -e "${RED}Error: No existe .env.example${NC}"
        exit 1
    fi
fi
echo "✓ Archivo .env existe"

# ============================================================================
# 2. Instalar dependencias del backend
# ============================================================================
echo -e "${GREEN}[2/5] Instalando dependencias...${NC}"
cd "$BACKEND_DIR"
npm install --production --no-audit --no-fund
echo "✓ Dependencias instaladas"

# ============================================================================
# 3. Ejecutar migraciones de base de datos
# ============================================================================
echo -e "${GREEN}[3/5] Ejecutando migraciones de base de datos...${NC}"
if [ -d "$BACKEND_DIR/migrations" ]; then
    # Instalar sequelize-cli si no está
    if ! npm list sequelize-cli &> /dev/null; then
        npm install --save-dev sequelize-cli
    fi
    
    # Ejecutar migraciones
    NODE_ENV=production npx sequelize-cli db:migrate --config config/config.js --migrations-path migrations || {
        echo -e "${YELLOW}Advertencia: Error al ejecutar migraciones. Verifica la conexión a la base de datos.${NC}"
    }
    echo "✓ Migraciones ejecutadas"
else
    echo -e "${YELLOW}No se encontró carpeta migrations, omitiendo...${NC}"
fi

# ============================================================================
# 4. Configurar PM2
# ============================================================================
echo -e "${GREEN}[4/5] Configurando PM2...${NC}"

# Instalar PM2 globalmente si no está instalado
if ! command -v pm2 &> /dev/null; then
    echo "Instalando PM2..."
    sudo npm install -g pm2
fi
echo "✓ PM2 instalado"

# Detener proceso existente si existe
pm2 delete "$APP_NAME" 2>/dev/null || true

# Iniciar aplicación con PM2
pm2 start index.js --name "$APP_NAME" --env production

# Guardar lista de procesos
pm2 save

# Configurar arranque automático
echo "Configurando PM2 para arrancar al boot..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" | grep "sudo" | bash || true
pm2 save

echo "✓ PM2 configurado y aplicación iniciada"
pm2 status

# ============================================================================
# 5. Configurar Nginx (sin SSL, solo HTTP)
# ============================================================================
echo -e "${GREEN}[5/5] Configurando Nginx...${NC}"

# Instalar Nginx si no está instalado
if ! command -v nginx &> /dev/null; then
    echo "Instalando Nginx..."
    sudo apt update
    sudo apt install -y nginx
fi
echo "✓ Nginx instalado"

# Obtener IP del servidor
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "IP del servidor: $SERVER_IP"

# Crear configuración de Nginx
NGINX_CONF="/etc/nginx/sites-available/expediente-digital"
echo "Creando configuración de Nginx..."

sudo tee "$NGINX_CONF" > /dev/null <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    # Permitir acceso por IP
    server_name $SERVER_IP _;

    # Aumentar tamaño máximo para uploads
    client_max_body_size 50M;

    # Logs
    access_log /var/log/nginx/expediente-digital-access.log;
    error_log /var/log/nginx/expediente-digital-error.log;

    # Proxy al backend
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Habilitar sitio
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/expediente-digital

# Deshabilitar sitio default
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
sudo systemctl enable nginx

echo "✓ Nginx configurado y recargado"

# Configurar firewall (permitir HTTP)
if command -v ufw &> /dev/null; then
    echo "Configurando firewall..."
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx HTTP'
    sudo ufw --force enable
    echo "✓ Firewall configurado"
    sudo ufw status
fi

# ============================================================================
# Resumen final
# ============================================================================
echo ""
echo "========================================"
echo -e "${GREEN}✓ Despliegue completado${NC}"
echo "========================================"
echo ""
echo "Estado de la aplicación:"
pm2 status
echo ""
echo "URLs de acceso:"
echo "  Por IP:  http://$SERVER_IP"
echo "  Local:   http://localhost:$APP_PORT"
echo ""
echo "Comandos útiles:"
echo "  Ver logs:        pm2 logs $APP_NAME"
echo "  Reiniciar app:   pm2 restart $APP_NAME"
echo "  Ver estado:      pm2 status"
echo "  Logs Nginx:      sudo tail -f /var/log/nginx/expediente-digital-error.log"
echo ""
echo "Próximos pasos:"
echo "  1. Prueba: curl http://localhost:$APP_PORT"
echo "  2. Prueba: curl http://$SERVER_IP"
echo "  3. Configura CORS en el backend para permitir tu frontend en desarrollo"
echo ""
echo "Para agregar SSL/dominio más adelante, usa: ./deploy-production.sh"
echo ""
