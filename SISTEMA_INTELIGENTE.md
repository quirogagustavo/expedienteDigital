// Documentación del Sistema Inteligente de Certificados
// Gobierno de San Juan - Seguridad + Usabilidad

# Sistema Inteligente de Auto-detección de Certificados

## 🎯 Objetivo

Crear un sistema que **sugiera automáticamente** el certificado correcto pero **requiera confirmación explícita** para mantener la seguridad gubernamental.

## 🔒 Principios de Seguridad

### 1. Nunca Automático al 100%
- El sistema SUGIERE, nunca decide por el usuario
- Documentos oficiales SIEMPRE requieren confirmación explícita
- Múltiples capas de validación de permisos

### 2. Matriz de Decisión Usuario + Documento

| Rol Usuario        | Documento Oficial | Documento No-Oficial |
|-------------------|-------------------|---------------------|
| empleado_interno  | ❌ No permitido   | ✅ Interno          |
| funcionario_oficial| ✅ Gubernamental  | 🤔 Interno (sugerido)|
| administrador     | ✅ Gubernamental  | 🤔 Interno (sugerido)|

### 3. Niveles de Confirmación

- **CRÍTICO**: Documento oficial + Certificado gubernamental
  - Requiere confirmación explícita con advertencia
- **NORMAL**: Documento interno + Certificado interno  
  - Confirmación automática (bajo riesgo)
- **REVISAR**: Combinaciones inusuales
  - Requiere revisión manual

## 🏗️ Arquitectura del Sistema

### Backend
```
/services/CertificateAutoDetection.js
├── suggestCertificate()     # Lógica de sugerencia
├── canUseCertificate()      # Validación de permisos
├── getSecurityConfirmation()# Generación de alertas
└── getSecureWorkflow()      # Workflow completo
```

### Frontend
```
/components/SmartCertificateSelector.jsx
├── Auto-detección inicial
├── Modal de confirmación de seguridad
├── Opción de selección manual
└── Auditoría visual completa
```

### API
```
/routes/smartCertificateRoutes.js
├── POST /smart-suggest       # Sugerencia inteligente
├── POST /confirm-signature   # Confirmación con auditoría
└── GET /my-signatures        # Historial transparente
```

## 🛡️ Características de Seguridad

### 1. Auditoría Completa
```javascript
{
  timestamp: "2024-01-15T10:30:00Z",
  usuario_id: 123,
  usuario_email: "funcionario@sanjuan.gov.ar",
  usuario_rol: "funcionario_oficial",
  documento_id: "DOC_456",
  certificado_tipo: "government",
  confirmacion_explicita: true,
  ip: "192.168.1.100",
  user_agent: "Mozilla/5.0..."
}
```

### 2. Validación Doble
- Frontend: Validación de permisos en tiempo real
- Backend: Revalidación antes de cada acción
- Base de datos: Constraints de integridad

### 3. Transparencia Gubernamental
- Logs detallados de todas las operaciones
- Historial de firmas por usuario
- Trazabilidad completa de decisiones

## 🎮 Flujo de Usuario

### Escenario 1: Funcionario firmando documento oficial
1. Usuario selecciona documento oficial
2. Sistema detecta: funcionario_oficial + oficial = government
3. Muestra confirmación CRÍTICA
4. Usuario confirma explícitamente
5. Sistema registra auditoría y firma

### Escenario 2: Empleado interno con documento interno
1. Usuario selecciona documento interno
2. Sistema detecta: empleado_interno + no_oficial = internal
3. Confirmación automática (bajo riesgo)
4. Firma se ejecuta directamente

### Escenario 3: Usuario quiere elegir manualmente
1. Usuario click en "Selección Manual"
2. Se muestra selector tradicional
3. Sistema valida permisos
4. Proceso normal de confirmación

## 🔧 Configuración e Instalación

### 1. Actualizar Base de Datos
```sql
-- Ya aplicado automáticamente
ALTER TABLE usuarios 
ADD COLUMN rol_usuario ENUM('empleado_interno', 'funcionario_oficial', 'administrador'),
ADD COLUMN certificado_preferido ENUM('internal', 'government');
```

### 2. Integrar Componente
```jsx
import SmartCertificateSelector from './components/SmartCertificateSelector';

// En lugar de CertificateTypeSelector
<SmartCertificateSelector 
  documento={selectedDocument}
  onCertificateSelected={handleCertificateChoice}
/>
```

### 3. Backend Routes
```javascript
// Ya configurado en index.js
app.use('/api/certificates', smartCertificateRoutes);
```

## 🎯 Ventajas del Sistema

### Para el Usuario
- ✅ Proceso más rápido (sugerencia inteligente)
- ✅ Menos errores (validación automática)
- ✅ Claridad en permisos
- ✅ Opción de control manual

### Para el Gobierno
- 🔒 Seguridad no comprometida
- 📊 Auditoría completa
- 🎯 Cumplimiento de normativas
- 📈 Eficiencia operativa

### Para Administradores
- 👀 Visibilidad total del sistema
- 🔍 Trazabilidad de decisiones
- ⚡ Procesos optimizados
- 🛡️ Control de acceso granular

## 🚀 Próximos Pasos

1. **Probar el flujo completo** con diferentes roles
2. **Configurar alertas** para actividades sensibles
3. **Implementar reportes** de auditoría
4. **Optimizar performance** para uso masivo

---

*Este sistema balancea perfectamente seguridad gubernamental con experiencia de usuario moderna.*