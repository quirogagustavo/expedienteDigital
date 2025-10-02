#!/bin/bash

echo "==================================="
echo "🔐 VERIFICADOR DE FIRMA DIGITAL 🔐"
echo "==================================="
echo

# Archivos que vamos a verificar
DOCUMENTO="documento-ejemplo.txt"
CLAVE_PUBLICA="mi_clave_publica.pem"
FIRMA="mi_firma_digital.bin"

echo "📄 Documento original: $DOCUMENTO"
echo "🔑 Clave pública: $CLAVE_PUBLICA"
echo "✍️  Archivo de firma: $FIRMA"
echo

# Verificar que todos los archivos existan
if [[ ! -f "$DOCUMENTO" ]]; then
    echo "❌ Error: No se encuentra $DOCUMENTO"
    exit 1
fi

if [[ ! -f "$CLAVE_PUBLICA" ]]; then
    echo "❌ Error: No se encuentra $CLAVE_PUBLICA"
    exit 1
fi

if [[ ! -f "$FIRMA" ]]; then
    echo "❌ Error: No se encuentra $FIRMA"
    exit 1
fi

echo "✅ Todos los archivos encontrados"
echo

# Mostrar información del certificado
echo "📋 INFORMACIÓN DEL CERTIFICADO:"
echo "================================"
openssl rsa -pubin -in "$CLAVE_PUBLICA" -text -noout
echo

# Verificar la firma
echo "🔍 VERIFICANDO FIRMA DIGITAL:"
echo "=============================="

# Generar hash del documento
echo "1️⃣ Generando hash SHA-256 del documento..."
HASH=$(openssl dgst -sha256 "$DOCUMENTO")
echo "   Hash: $HASH"
echo

# Verificar la firma
echo "2️⃣ Verificando firma con la clave pública..."
if openssl dgst -sha256 -verify "$CLAVE_PUBLICA" -signature "$FIRMA" "$DOCUMENTO"; then
    echo
    echo "🎉 ¡VERIFICACIÓN EXITOSA!"
    echo "✅ La firma es válida"
    echo "✅ El documento NO ha sido modificado"
    echo "✅ La firma pertenece al certificado proporcionado"
else
    echo
    echo "❌ VERIFICACIÓN FALLIDA"
    echo "⚠️  La firma no es válida o el documento fue modificado"
fi

echo
echo "==================================="
echo "Verificación completada"
echo "==================================="