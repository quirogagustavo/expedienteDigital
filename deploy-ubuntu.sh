#!/bin/bash

# Script de despliegue automatizado para Expediente Digital
# Para Ubuntu Server (Sin Docker)

set -e  # Salir si hay algún error

echo "================================================"
echo "Expediente Digital - Script de Despliegue"
echo "Para Ubuntu Server"
echo "================================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de utilidad
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

# Verificar si el script se ejecuta con privilegios
if [ "$EUID" -eq 0 ]; then 
    print_error "No ejecutes este script como root. Usa tu usuario normal."
    exit 1
fi

# Variables de configuración
INSTALL_DIR="/var/www/expediente-digital"
DB_NAME="expediente_digital"
DB_USER="expediente_user"

# 1. Verificar sistema operativo
print_step "1. Verificando sistema operativo..."

if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [ "$ID" != "ubuntu" ]; then
        print_error "Este script está diseñado para Ubuntu"
        exit 1
    fi
    print_success "Sistema: Ubuntu $VERSION_ID"
else
    print_error "No se pudo detectar el sistema operativo"
    exit 1
fi

# 2. Actualizar sistema
print_step "2. Actualizando sistema..."
sudo apt update
sudo apt upgrade -y
print_success "Sistema actualizado"

# 3. Instalar Node.js
print_step "3. Instalando Node.js..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_info "Node.js ya instalado: $NODE_VERSION"
else
    print_info "Instalando Node.js 18.x LTS..."
    sudo apt install -y curl
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    print_success "Node.js instalado: $(node --version)"
fi

# 4. Instalar PostgreSQL
print_step "4. Instalando PostgreSQL..."

if command -v psql &> /dev/null; then
    print_info "PostgreSQL ya instalado"
else
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
    print_success "PostgreSQL instalado"
fi

# 5. Configurar base de datos
print_step "5. Configurando base de datos..."

read -p "Ingresa la contraseña para el usuario de base de datos: " -s DB_PASSWORD
echo ""

# Verificar si la base de datos ya existe
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    print_info "La base de datos '$DB_NAME' ya existe"
else
    sudo -u postgres psql <<EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF
    print_success "Base de datos creada: $DB_NAME"
fi

# 6. Instalar PM2
print_step "6. Instalando PM2..."

if command -v pm2 &> /dev/null; then
    print_info "PM2 ya instalado: $(pm2 --version)"
else
    sudo npm install -g pm2
    print_success "PM2 instalado"
fi

# 7. Instalar Nginx
print_step "7. Instalando Nginx..."

if command -v nginx &> /dev/null; then
    print_info "Nginx ya instalado"
else
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    print_success "Nginx instalado"
fi

# 8. Instalar Git
print_step "8. Verificando Git..."

if command -v git &> /dev/null; then
    print_info "Git ya instalado: $(git --version)"
else
    sudo apt install -y git
    print_success "Git instalado"
fi

# 9. Configurar directorio del proyecto
print_step "9. Configurando directorio del proyecto..."

if [ ! -d "$INSTALL_DIR" ]; then
    sudo mkdir -p $INSTALL_DIR
    sudo chown -R $USER:$USER $INSTALL_DIR
    print_success "Directorio creado: $INSTALL_DIR"
else
    print_info "El directorio ya existe: $INSTALL_DIR"
    read -p "¿Deseas continuar? Los archivos existentes serán respaldados. (s/n): " CONTINUE
    if [ "$CONTINUE" != "s" ]; then
        print_error "Despliegue cancelado"
        exit 0
    fi
    
    # Crear backup
    BACKUP_DIR="$INSTALL_DIR-backup-$(date +%Y%m%d-%H%M%S)"
    sudo mv $INSTALL_DIR $BACKUP_DIR
    sudo mkdir -p $INSTALL_DIR
    sudo chown -R $USER:$USER $INSTALL_DIR
    print_info "Backup creado en: $BACKUP_DIR"
fi

cd $INSTALL_DIR

# 10. Obtener código fuente
print_step "10. Obteniendo código fuente..."

read -p "¿Clonar desde GitHub? (s/n): " CLONE_GIT

if [ "$CLONE_GIT" = "s" ]; then
    read -p "Ingresa la URL del repositorio: " REPO_URL
    git clone $REPO_URL .
    print_success "Código clonado desde GitHub"
else
    print_info "Copia manualmente los archivos a $INSTALL_DIR"
    read -p "Presiona Enter cuando hayas copiado los archivos..." 
fi

# 11. Instalar dependencias del backend
print_step "11. Instalando dependencias del backend..."

if [ -d "$INSTALL_DIR/backend" ]; then
    cd $INSTALL_DIR/backend
    npm install --production
    print_success "Dependencias del backend instaladas"
else
    print_error "No se encontró el directorio backend"
    exit 1
fi

# 12. Configurar variables de entorno
print_step "12. Configurando variables de entorno..."

# Generar JWT_SECRET
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Crear archivo .env
cat > $INSTALL_DIR/backend/.env <<EOF
# Puerto del servidor
PORT=3001

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=86400

# Entorno
NODE_ENV=production

# Rutas de archivos
UPLOAD_PATH=$INSTALL_DIR/backend/uploads

# CORS
CORS_ORIGIN=*
EOF

print_success "Archivo .env creado"

# 13. Crear directorios necesarios
print_step "13. Creando directorios de uploads..."

mkdir -p $INSTALL_DIR/backend/uploads/documentos
mkdir -p $INSTALL_DIR/backend/uploads/firmas
chmod -R 755 $INSTALL_DIR/backend/uploads

print_success "Directorios creados"

# 14. Inicializar base de datos
print_step "14. Inicializando base de datos..."

cd $INSTALL_DIR/backend

# Verificar si hay scripts de inicialización
if [ -f "init.sql" ]; then
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -f init.sql
    print_success "Base de datos inicializada con init.sql"
elif [ -d "migrations" ]; then
    npx sequelize-cli db:migrate
    print_success "Migraciones ejecutadas"
else
    print_info "No se encontraron scripts de inicialización. Asegúrate de ejecutarlos manualmente."
fi

# 15. Configurar PM2
print_step "15. Configurando PM2..."

cat > $INSTALL_DIR/backend/ecosystem.config.js <<EOF
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
EOF

# Iniciar con PM2
cd $INSTALL_DIR/backend
pm2 start ecosystem.config.js
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

print_success "Backend iniciado con PM2"

# 16. Instalar y construir frontend
print_step "16. Configurando frontend..."

if [ -d "$INSTALL_DIR/frontend" ]; then
    cd $INSTALL_DIR/frontend
    
    # Instalar dependencias
    npm install
    
    # Construir para producción
    npm run build
    
    print_success "Frontend construido"
else
    print_info "No se encontró directorio frontend"
fi

# 17. Configurar Nginx
print_step "17. Configurando Nginx..."

read -p "Ingresa el dominio o IP del servidor (ej: ejemplo.com o 192.168.1.100): " SERVER_NAME

sudo tee /etc/nginx/sites-available/expediente-digital > /dev/null <<EOF
client_max_body_size 100M;

server {
    listen 80;
    server_name $SERVER_NAME;
    
    # Frontend
    location / {
        root $INSTALL_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API Backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
    
    access_log /var/log/nginx/expediente-digital-access.log;
    error_log /var/log/nginx/expediente-digital-error.log;
}
EOF

# Activar sitio
sudo ln -sf /etc/nginx/sites-available/expediente-digital /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

print_success "Nginx configurado"

# 18. Configurar firewall
print_step "18. Configurando firewall..."

read -p "¿Configurar firewall UFW? (s/n): " CONFIGURE_UFW

if [ "$CONFIGURE_UFW" = "s" ]; then
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable
    print_success "Firewall configurado"
fi

# 19. Configurar SSL (opcional)
print_step "19. Configuración SSL..."

read -p "¿Configurar SSL con Let's Encrypt? (s/n): " CONFIGURE_SSL

if [ "$CONFIGURE_SSL" = "s" ]; then
    # Instalar certbot
    sudo apt install -y certbot python3-certbot-nginx
    
    read -p "Ingresa tu correo para Let's Encrypt: " EMAIL
    
    sudo certbot --nginx -d $SERVER_NAME --email $EMAIL --agree-tos --non-interactive
    
    print_success "SSL configurado"
fi

# 20. Verificar despliegue
print_step "20. Verificando despliegue..."

sleep 3

# Verificar backend
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    print_success "Backend respondiendo correctamente"
else
    print_info "No se pudo verificar el backend. Verifica los logs con: pm2 logs"
fi

# Ver estado de PM2
pm2 status

echo ""
echo "================================================"
echo "✓ Despliegue completado exitosamente!"
echo "================================================"
echo ""
echo "Información del despliegue:"
echo "- Directorio: $INSTALL_DIR"
echo "- URL: http://$SERVER_NAME"
if [ "$CONFIGURE_SSL" = "s" ]; then
    echo "- URL segura: https://$SERVER_NAME"
fi
echo ""
echo "Base de datos:"
echo "- Nombre: $DB_NAME"
echo "- Usuario: $DB_USER"
echo ""
echo "Comandos útiles:"
echo "- Ver logs: pm2 logs expediente-backend"
echo "- Estado: pm2 status"
echo "- Reiniciar: pm2 restart expediente-backend"
echo "- Ver logs Nginx: sudo tail -f /var/log/nginx/expediente-digital-error.log"
echo ""
echo "Credenciales importantes (GUÁRDALAS):"
echo "- DB_PASSWORD: $DB_PASSWORD"
echo "- JWT_SECRET: $JWT_SECRET"
echo ""
print_success "¡Todo listo para la demo!"