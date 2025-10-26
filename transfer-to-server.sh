#!/bin/bash

# Script para transferir el proyecto al servidor Ubuntu
# Ejecutar desde tu máquina local

echo "================================================"
echo "Transferir Expediente Digital al Servidor"
echo "================================================"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Configuración
PROJECT_DIR="/home/gustavo/Documentos/firma_digital"

# Solicitar información del servidor
read -p "Ingresa el usuario del servidor (ej: ubuntu): " SERVER_USER
read -p "Ingresa la IP o dominio del servidor: " SERVER_IP
read -p "¿Usar clave SSH? (s/n): " USE_SSH_KEY

# Preparar comando scp
if [ "$USE_SSH_KEY" = "s" ]; then
    read -p "Ruta de la clave SSH (ej: ~/.ssh/id_rsa): " SSH_KEY
    SCP_CMD="scp -i $SSH_KEY -r"
else
    SCP_CMD="scp -r"
fi

echo ""
print_info "Preparando archivos para transferir..."

# Crear archivo temporal con exclusiones
cat > /tmp/.rsync-exclude <<EOF
node_modules
.git
.env
dist
build
uploads
*.log
.DS_Store
EOF

# Transferir archivos
print_info "Transfiriendo archivos al servidor..."

if [ "$USE_SSH_KEY" = "s" ]; then
    rsync -avz --progress \
        --exclude-from=/tmp/.rsync-exclude \
        -e "ssh -i $SSH_KEY" \
        $PROJECT_DIR/ \
        $SERVER_USER@$SERVER_IP:/tmp/expediente-digital/
else
    rsync -avz --progress \
        --exclude-from=/tmp/.rsync-exclude \
        $PROJECT_DIR/ \
        $SERVER_USER@$SERVER_IP:/tmp/expediente-digital/
fi

print_success "Archivos transferidos a /tmp/expediente-digital/"

# Transferir script de despliegue
if [ "$USE_SSH_KEY" = "s" ]; then
    scp -i $SSH_KEY $PROJECT_DIR/deploy-ubuntu.sh $SERVER_USER@$SERVER_IP:/tmp/
else
    scp $PROJECT_DIR/deploy-ubuntu.sh $SERVER_USER@$SERVER_IP:/tmp/
fi

print_success "Script de despliegue transferido"

echo ""
echo "================================================"
echo "Transferencia completada!"
echo "================================================"
echo ""
echo "Próximos pasos:"
echo ""
echo "1. Conéctate al servidor:"
if [ "$USE_SSH_KEY" = "s" ]; then
    echo "   ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP"
else
    echo "   ssh $SERVER_USER@$SERVER_IP"
fi
echo ""
echo "2. Ejecuta el script de despliegue:"
echo "   chmod +x /tmp/deploy-ubuntu.sh"
echo "   /tmp/deploy-ubuntu.sh"
echo ""
echo "3. Los archivos están en /tmp/expediente-digital/"
echo "   El script los moverá a /var/www/expediente-digital"
echo ""

# Limpiar archivo temporal
rm /tmp/.rsync-exclude

print_success "¡Listo!"