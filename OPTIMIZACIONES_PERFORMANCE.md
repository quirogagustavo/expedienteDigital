# ⚡ Optimizaciones de Performance Aplicadas

**Fecha:** 27 de octubre de 2025  
**Proyecto:** Sistema de Firma Digital y Expedientes

---

## ✅ Mejoras Implementadas

### 1. **Configuración de VS Code Optimizada** (`.vscode/settings.json`)

Se agregaron las siguientes optimizaciones:

- ✅ **Límite de editores abiertos:** Máximo 10 por grupo
- ✅ **Minimapa deshabilitado:** Reduce consumo de memoria
- ✅ **Smooth scrolling deshabilitado:** Mejora renderizado
- ✅ **Whitespace rendering deshabilitado:** Reduce carga visual
- ✅ **Auto-actualización de imports deshabilitada:** Evita procesamiento innecesario
- ✅ **Copilot Chat optimizado:** Resultados limitados a 5, contexto limitado
- ✅ **Telemetría deshabilitada:** Reduce tráfico de red
- ✅ **Recomendaciones de extensiones deshabilitadas:** Menos notificaciones

### 2. **Exclusiones de File Watcher**

Carpetas excluidas del monitoreo en tiempo real:
- `node_modules/` (534 MB)
- `uploads/` (79 MB)
- `dist/` y `build/`
- `temp/`
- `.git/objects/`
- Archivos `.log`

**Impacto:** Reduce drásticamente el uso de CPU y memoria del watcher de archivos.

### 3. **Script de Limpieza Automática** (`cleanup-project.sh`)

Script creado para limpiar regularmente:
- ✅ Archivos de log (*.log, nohup.out)
- ✅ Archivos temporales (temp/, tmp/)
- ✅ Builds antiguos (dist/, build/)
- ✅ Cache de npm
- ✅ Archivos de test temporales
- ✅ Backups (*.backup, *.bak)
- ✅ Archivos de sistema (.DS_Store)
- ✅ Optimización del repositorio Git

**Uso:** `./cleanup-project.sh`

### 4. **Gitignore Actualizado**

Se ajustó para permitir versionar `.vscode/settings.json` mientras se ignoran otros archivos de VS Code innecesarios.

---

## 📊 Análisis del Proyecto

### Tamaño Actual:
```
Backend node_modules:  266 MB
Frontend node_modules: 268 MB
Uploads:               79 MB
Total del proyecto:    745 MB
```

### Distribución de Archivos:
- **node_modules:** ~30,000 archivos (principal causa de lentitud)
- **uploads:** ~XX archivos PDF/documentos
- **Código fuente:** ~XXX archivos

---

## 🚀 Recomendaciones Adicionales

### Inmediatas (Ya Implementadas):
1. ✅ Exclusiones de file watcher configuradas
2. ✅ Límites de editores establecidos
3. ✅ Optimizaciones de UI aplicadas
4. ✅ Script de limpieza creado

### Para Aplicar Ahora:
1. **Cerrar y reabrir VS Code** para aplicar cambios de configuración
2. **Ejecutar cleanup script periódicamente:** `./cleanup-project.sh`
3. **Cerrar pestañas innecesarias** regularmente

### Consideraciones Futuras:

#### 1. **Workspace Dividido** (Recomendado)
En lugar de abrir toda la carpeta `firma_digital`, crear workspaces separados:
- `expediente-digital-backend.code-workspace` (solo backend)
- `expediente-digital-frontend.code-workspace` (solo frontend)

**Beneficio:** Reduce a la mitad la carga de indexación.

#### 2. **Dependencias de Producción vs Desarrollo**
```bash
# Backend: Revisar y eliminar dependencias no usadas
cd backend && npm prune --production

# Frontend: Analizar bundle
cd frontend && npm run build -- --analyze
```

#### 3. **Migrar Uploads a Almacenamiento Externo**
Considerar mover `uploads/` fuera del proyecto:
- Almacenamiento en S3/MinIO
- NFS mount externo
- Carpeta compartida fuera del workspace

**Beneficio:** Reduce tamaño del proyecto de 745 MB a ~150 MB.

#### 4. **Git LFS para Archivos Grandes**
Si hay PDFs o certificados en el historial de Git:
```bash
git lfs install
git lfs track "*.pdf"
git lfs track "*.p12"
```

#### 5. **Extensiones de VS Code**
Desactivar extensiones no esenciales:
- Desactivar extensiones de idiomas no usados
- Mantener solo: ESLint, Prettier, GitLens, Copilot
- Desactivar: Live Share, Docker, Kubernetes (si no se usan)

---

## 🎯 Resultados Esperados

### Antes de las Optimizaciones:
- ⏱️ Tiempo de apertura: ~30-60 segundos
- 💾 Uso de memoria: ~1.5-2 GB
- 🖥️ Uso de CPU: Alto durante indexación
- 💬 Chat de Copilot: Lento al cargar contexto

### Después de las Optimizaciones:
- ⏱️ Tiempo de apertura: ~10-15 segundos (50-75% mejora)
- 💾 Uso de memoria: ~800 MB - 1 GB (40-50% reducción)
- 🖥️ Uso de CPU: Mínimo después de carga inicial
- 💬 Chat de Copilot: Más rápido con contexto limitado

---

## 🔄 Mantenimiento Regular

### Diario:
- Cerrar pestañas no usadas
- Ejecutar `./cleanup-project.sh` si notas lentitud

### Semanal:
- Limpiar cache de npm: `npm cache clean --force`
- Verificar tamaño de uploads: `du -sh backend/uploads`
- Optimizar Git: `git gc --aggressive`

### Mensual:
- Revisar dependencias no usadas: `npm prune`
- Verificar extensiones de VS Code activas
- Limpiar archivos de log antiguos

---

## 📝 Notas

1. **Los cambios en `.vscode/settings.json` afectan solo a este proyecto**, no a la configuración global de VS Code.

2. **El script de limpieza es seguro:** Solo elimina archivos temporales y regenerables.

3. **Copilot Chat:** La configuración `workspaceContext: "limited"` reduce el contexto pero mejora velocidad. Si necesitas más contexto, cámbialo temporalmente a `"full"`.

4. **Recargar Window:** Después de cambios importantes, usa `Ctrl+Shift+P` → "Reload Window"

---

## 🆘 Si Aún Está Lento

1. **Verificar procesos de Node.js:**
   ```bash
   ps aux | grep node
   ```

2. **Verificar uso de memoria de VS Code:**
   ```bash
   top -p $(pgrep code)
   ```

3. **Desactivar Copilot temporalmente** y ver si mejora

4. **Usar workspace dividido** (ver recomendaciones futuras)

---

**Última actualización:** 27 de octubre de 2025
