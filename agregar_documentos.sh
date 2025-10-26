#!/bin/bash

# Script para agregar documentos a un expediente existente a través de la API
# Este script utiliza curl para enviar peticiones a la API del sistema

# Definir variables
TOKEN=""
EXPEDIENTE_ID="1"  # Cambiar por un ID de expediente válido
BASE_URL="http://localhost:4000"
UPLOAD_DIR="/home/gustavo/Documentos/firma_digital/uploads/documentos"

# Limpiar archivo de logs
LOG_FILE="/tmp/agregar_documentos.log"
> "$LOG_FILE"

# Función para registrar mensajes en el log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 1. Obtener token de autenticación
log "Obteniendo token de autenticación..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "admin123"}')

# Intentar obtener el token
if echo $TOKEN_RESPONSE | grep -q '"token"'; then
    TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    log "Token obtenido correctamente"
else
    log "ERROR: No se pudo obtener el token de autenticación"
    log "Respuesta: $TOKEN_RESPONSE"
    exit 1
fi

# 2. Verificar expediente
log "Verificando expediente ID: $EXPEDIENTE_ID..."
EXPEDIENTE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/expedientes/$EXPEDIENTE_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")

# Guardar la respuesta para análisis
echo "Respuesta expediente: $EXPEDIENTE_RESPONSE" >> "$LOG_FILE"

if echo $EXPEDIENTE_RESPONSE | grep -q "error"; then
    log "ERROR: El expediente no existe o no se puede acceder"
    exit 1
else
    log "Expediente encontrado correctamente"
fi

# 3. Buscar PDFs firmados para agregar
log "Buscando PDFs firmados para agregar..."
PDF_FILES=($(find "$UPLOAD_DIR" -type f -name "*_firmado.pdf" | head -5))

if [ ${#PDF_FILES[@]} -eq 0 ]; then
    log "ERROR: No se encontraron PDFs firmados"
    exit 1
fi

log "Se encontraron ${#PDF_FILES[@]} PDFs firmados"

# 4. Agregar documentos al expediente
log "Agregando documentos al expediente $EXPEDIENTE_ID..."

for ((i=0; i<${#PDF_FILES[@]}; i++)); do
    PDF_FILE=${PDF_FILES[$i]}
    FILENAME=$(basename "$PDF_FILE")
    
    log "Agregando documento $((i+1))/${#PDF_FILES[@]}: $FILENAME"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/expedientes/$EXPEDIENTE_ID/documentos" \
        -H "Authorization: Bearer $TOKEN" \
        -F "archivo=@$PDF_FILE" \
        -F "documento_nombre=$FILENAME" \
        -F "documento_tipo=anexo" \
        -F "numero_foja=$((i+1))")
    
    if echo $RESPONSE | grep -q "documento"; then
        log "✅ Documento agregado exitosamente"
    else
        log "❌ Error agregando documento: $RESPONSE"
    fi
    
    # Esperar un poco entre solicitudes
    sleep 1
done

log "Proceso completado. Se agregaron documentos al expediente $EXPEDIENTE_ID"