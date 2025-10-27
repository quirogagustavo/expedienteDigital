#!/bin/bash
# Script de limpieza para mejorar performance del proyecto

echo "🧹 Iniciando limpieza del proyecto..."

# Limpiar logs
echo "📄 Limpiando archivos de log..."
find . -name "*.log" -type f -delete 2>/dev/null
find . -name "nohup.out" -type f -delete 2>/dev/null

# Limpiar archivos temporales
echo "🗑️ Limpiando archivos temporales..."
rm -rf ./backend/temp/* 2>/dev/null
rm -rf ./temp/* 2>/dev/null

# Limpiar builds antiguos
echo "🏗️ Limpiando builds antiguos..."
rm -rf ./frontend/dist/* 2>/dev/null
rm -rf ./frontend/build/* 2>/dev/null
rm -rf ./backend/build/* 2>/dev/null

# Limpiar cache de npm
echo "📦 Limpiando cache de npm..."
cd backend && npm cache clean --force 2>/dev/null
cd ../frontend && npm cache clean --force 2>/dev/null
cd ..

# Limpiar archivos de test temporales
echo "🧪 Limpiando archivos de test temporales..."
find . -name "test_*.js" -not -path "*/node_modules/*" -delete 2>/dev/null
find . -name "test_*.sh" -not -path "*/node_modules/*" -delete 2>/dev/null

# Limpiar backups
echo "💾 Limpiando archivos de backup..."
find . -name "*.backup" -type f -delete 2>/dev/null
find . -name "*.bak" -type f -delete 2>/dev/null

# Limpiar archivos de MacOS
echo "🍎 Limpiando archivos de sistema..."
find . -name ".DS_Store" -type f -delete 2>/dev/null

# Limpiar git
echo "🔧 Optimizando repositorio Git..."
git gc --aggressive --prune=now 2>/dev/null

# Mostrar tamaños finales
echo ""
echo "📊 Resumen de tamaños:"
echo "Backend node_modules: $(du -sh backend/node_modules 2>/dev/null | cut -f1)"
echo "Frontend node_modules: $(du -sh frontend/node_modules 2>/dev/null | cut -f1)"
echo "Uploads: $(du -sh backend/uploads 2>/dev/null | cut -f1)"
echo "Tamaño total del proyecto: $(du -sh . 2>/dev/null | cut -f1)"

echo ""
echo "✅ Limpieza completada!"
echo "💡 Recomendación: Cierra y vuelve a abrir VS Code para aplicar los cambios"
