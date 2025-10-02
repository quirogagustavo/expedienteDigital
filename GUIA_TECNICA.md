# 🔍 Guía Técnica Detallada - Endpoints y Flujos
**Sistema de Firma Digital - Gobierno de San Juan**

---

## 📡 Especificación Detallada de Endpoints

### 🔐 AUTENTICACIÓN

#### `POST /api/auth/login`

**URL Completa:** `http://localhost:4000/api/auth/login`

**Ejemplo de Request con cURL:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2wiOiJhZG1pbiIsImlhdCI6MTY5NjI2MDAwMCwiZXhwIjoxNjk2MzQ2NDAwfQ.signature",
  "user": {
    "id": 1,
    "username": "admin",
    "nombre_completo": "Administrador del Sistema",
    "email": "admin@sanjuan.gob.ar",
    "rol_usuario": "admin",
    "certificado_preferido": "interno"
  }
}
```

**Validaciones:**
- `username`: Requerido, máximo 50 caracteres
- `password`: Requerido, máximo 255 caracteres
- Rate limiting: 5 intentos por IP cada 15 minutos

**Códigos de Estado:**
- `200` - Login exitoso
- `401` - Credenciales inválidas
- `429` - Demasiados intentos
- `500` - Error interno del servidor

---

#### `POST /api/auth/register`

**URL Completa:** `http://localhost:4000/api/auth/register`

**Ejemplo de Request:**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "juan.perez",
    "password": "MiPassword123!",
    "nombre_completo": "Juan Carlos Pérez",
    "email": "juan.perez@sanjuan.gob.ar",
    "rol_usuario": "empleado"
  }'
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "user": {
    "id": 2,
    "username": "juan.perez",
    "nombre_completo": "Juan Carlos Pérez",
    "email": "juan.perez@sanjuan.gob.ar",
    "rol_usuario": "empleado"
  }
}
```

---

### 👥 GESTIÓN DE USUARIOS

#### `GET /api/users/profile`

**URL Completa:** `http://localhost:4000/api/users/profile`

**Ejemplo de Request:**
```bash
curl -X GET http://localhost:4000/api/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Ejemplo de Response:**
```json
{
  "id": 1,
  "username": "admin",
  "nombre_completo": "Administrador del Sistema",
  "email": "admin@sanjuan.gob.ar",
  "rol_usuario": "admin",
  "certificado_preferido": "interno",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-10-02T10:30:00.000Z"
}
```

**Headers Requeridos:**
- `Authorization: Bearer <jwt_token>`

---

#### `PUT /api/users/profile`

**URL Completa:** `http://localhost:4000/api/users/profile`

**Ejemplo de Request:**
```bash
curl -X PUT http://localhost:4000/api/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_completo": "Juan Carlos Pérez Actualizado",
    "email": "juan.carlos.nuevo@sanjuan.gob.ar",
    "certificado_preferido": "token"
  }'
```

---

### 📜 CERTIFICADOS

#### `GET /api/certificates`

**URL Completa:** `http://localhost:4000/api/certificates`

**Ejemplo de Request:**
```bash
curl -X GET http://localhost:4000/api/certificates \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Ejemplo de Response:**
```json
[
  {
    "id": 1,
    "nombre": "Certificado Interno Gobierno SJ",
    "tipo": "interno",
    "status": "activo",
    "validez_desde": "2024-01-01",
    "validez_hasta": "2025-12-31",
    "algoritmo": "RSA-2048",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "nombre": "Certificado AFIP Nivel 3",
    "tipo": "externo",
    "status": "activo",
    "validez_desde": "2024-03-15",
    "validez_hasta": "2026-03-15",
    "algoritmo": "RSA-4096",
    "created_at": "2024-03-15T00:00:00.000Z"
  }
]
```

---

#### `POST /api/certificates/validate`

**URL Completa:** `http://localhost:4000/api/certificates/validate`

**Ejemplo de Request:**
```bash
curl -X POST http://localhost:4000/api/certificates/validate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "certificate_id": 1,
    "certificate_data": "-----BEGIN CERTIFICATE-----\nMIIEpDCCA4ygAwIBAgIJAKs...\n-----END CERTIFICATE-----"
  }'
```

**Ejemplo de Response:**
```json
{
  "valid": true,
  "certificate_id": 1,
  "validation_details": {
    "issuer": "CN=Gobierno de San Juan CA,O=Gobierno de San Juan,C=AR",
    "subject": "CN=Admin Sistema,O=Gobierno de San Juan,C=AR",
    "serial_number": "123456789",
    "not_before": "2024-01-01T00:00:00Z",
    "not_after": "2025-12-31T23:59:59Z",
    "algorithm": "sha256WithRSAEncryption",
    "key_size": 2048,
    "crl_status": "valid"
  },
  "warnings": [],
  "errors": []
}
```

---

### ✍️ FIRMAS DIGITALES

#### `POST /api/signatures/sign`

**URL Completa:** `http://localhost:4000/api/signatures/sign`

**Ejemplo de Request (usando FormData):**
```javascript
// Frontend JavaScript
const formData = new FormData();
formData.append('file', selectedFile);
formData.append('signer_name', 'Juan Pérez');
formData.append('signer_surname', 'Pérez');
formData.append('signer_dni', '12345678');
formData.append('signer_email', 'juan@sanjuan.gob.ar');
formData.append('signer_position', 'Director');
formData.append('signer_institution', 'Ministerio de Hacienda');
formData.append('certificate_type', 'interno');
formData.append('signature_algorithm', 'SHA256withRSA');

fetch('http://localhost:4000/api/signatures/sign', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Ejemplo con cURL:**
```bash
curl -X POST http://localhost:4000/api/signatures/sign \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@documento.pdf" \
  -F "signer_name=Juan Pérez" \
  -F "signer_dni=12345678" \
  -F "certificate_type=interno"
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "signature_id": "sig_1696260000_123",
  "document_hash": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
  "digital_signature": "MIIGYwYJKoZIhvcNAQcCoIIGVDCCBlACAQExDzANBglghkgBZQME...",
  "timestamp": "2024-10-02T15:30:00.000Z",
  "certificate_info": {
    "id": 1,
    "issuer": "CN=Gobierno de San Juan CA",
    "subject": "CN=Juan Pérez",
    "algorithm": "SHA256withRSA",
    "key_size": 2048,
    "valid_from": "2024-01-01T00:00:00Z",
    "valid_until": "2025-12-31T23:59:59Z"
  },
  "signer_info": {
    "name": "Juan Pérez",
    "dni": "12345678",
    "email": "juan@sanjuan.gob.ar",
    "position": "Director",
    "institution": "Ministerio de Hacienda"
  },
  "file_info": {
    "original_name": "documento.pdf",
    "size": 1048576,
    "mime_type": "application/pdf",
    "pages": 5
  }
}
```

---

#### `GET /api/signatures/verify/:signatureId`

**URL Completa:** `http://localhost:4000/api/signatures/verify/sig_1696260000_123`

**Ejemplo de Request:**
```bash
curl -X GET http://localhost:4000/api/signatures/verify/sig_1696260000_123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Ejemplo de Response:**
```json
{
  "valid": true,
  "signature_id": "sig_1696260000_123",
  "verification_details": {
    "document_integrity": "valid",
    "signature_integrity": "valid",
    "certificate_validity": "valid",
    "timestamp_validity": "valid",
    "crl_status": "not_revoked"
  },
  "document_info": {
    "hash": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
    "algorithm": "SHA-256",
    "original_name": "documento.pdf",
    "signed_at": "2024-10-02T15:30:00.000Z"
  },
  "signer_info": {
    "name": "Juan Pérez",
    "dni": "12345678",
    "email": "juan@sanjuan.gob.ar",
    "certificate_subject": "CN=Juan Pérez,O=Gobierno de San Juan,C=AR"
  },
  "technical_details": {
    "signature_algorithm": "SHA256withRSA",
    "key_size": 2048,
    "certificate_chain_length": 3,
    "trusted_root": "CN=Gobierno de San Juan Root CA"
  }
}
```

---

#### `GET /api/signatures/history`

**URL Completa:** `http://localhost:4000/api/signatures/history`

**Parámetros de Query opcionales:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10, max: 100)
- `from_date`: Fecha desde (YYYY-MM-DD)
- `to_date`: Fecha hasta (YYYY-MM-DD)
- `status`: Estado de firma (pendiente, completada, fallida)

**Ejemplo de Request:**
```bash
curl -X GET "http://localhost:4000/api/signatures/history?page=1&limit=5&status=completada" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Ejemplo de Response:**
```json
{
  "signatures": [
    {
      "id": 1,
      "signature_id": "sig_1696260000_123",
      "documento_original": "contrato_servicios.pdf",
      "fecha_firma": "2024-10-02T15:30:00.000Z",
      "tipo_documento": "contrato",
      "estado_firma": "completada",
      "hash_documento": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
      "datos_firmante": {
        "nombre": "Juan Pérez",
        "dni": "12345678",
        "cargo": "Director"
      },
      "certificado_usado": {
        "id": 1,
        "nombre": "Certificado Interno Gobierno SJ"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "total_items": 25,
    "items_per_page": 5,
    "has_next": true,
    "has_previous": false
  }
}
```

---

## 🔄 Flujos Técnicos Detallados

### 1. Flujo Completo de Autenticación

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant B as Backend
    participant DB as PostgreSQL

    U->>F: Ingresa credenciales
    F->>F: Validación frontend
    F->>B: POST /api/auth/login
    B->>B: Validar formato datos
    B->>DB: SELECT usuario WHERE username
    DB-->>B: Datos usuario (con hash)
    B->>B: bcrypt.compare(password, hash)
    alt Credenciales válidas
        B->>B: Generar JWT token
        B-->>F: 200 + token + datos usuario
        F->>F: Guardar token en localStorage
        F->>F: Actualizar estado global
        F-->>U: Redirigir a dashboard
    else Credenciales inválidas
        B-->>F: 401 + error message
        F-->>U: Mostrar error
    end
```

### 2. Flujo de Firma con Token Criptográfico

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant TM as TokenManager
    participant TC as TokenCryptoService
    participant B as Backend

    U->>F: Selecciona "Token Criptográfico"
    F->>TM: Activar TokenManager
    TM->>TC: detectConnectedTokens()
    TC-->>TM: Lista de tokens disponibles
    TM-->>F: Mostrar tokens detectados
    
    U->>TM: Selecciona token específico
    TM->>TC: selectToken(tokenId)
    TC->>TC: clearAuthentication() si token diferente
    TC-->>TM: Token seleccionado
    TM-->>U: Solicitar PIN
    
    U->>TM: Introduce PIN
    TM->>TC: authenticateWithPIN(pin)
    TC->>TC: validatePIN(pin)
    TC->>TC: isAuthenticated = true
    TC-->>TM: Autenticación exitosa
    TM-->>F: Token autenticado
    
    U->>F: Hacer clic "Firmar"
    F->>F: executeTokenSigning()
    F->>TC: isTokenAuthenticated()
    TC-->>F: true (ya autenticado)
    F->>TC: signWithToken(hash, certId, null)
    TC->>TC: Usar sesión existente (sin pedir PIN)
    TC-->>F: Firma digital generada
    F->>F: Generar PDF con firma
    F-->>U: Descargar documento firmado
```

### 3. Flujo de Generación de PDF

```mermaid
flowchart TD
    A[Firma exitosa] --> B{¿Archivo es PDF?}
    
    B -->|Sí| C[addSignatureToExistingPDF]
    B -->|No| D[createNewSignedPDF]
    
    C --> E[Leer archivo PDF original]
    E --> F{¿PDF encriptado?}
    F -->|Sí| G[Intentar load con ignoreEncryption]
    F -->|No| H[Cargar PDF normalmente]
    G --> I{¿Carga exitosa?}
    I -->|No| J[Error: PDF protegido]
    I -->|Sí| K[Continuar proceso]
    H --> K
    
    K --> L[Crear nueva página de firma]
    L --> M[Agregar datos del firmante]
    M --> N[Agregar información del certificado]
    N --> O[Agregar detalles técnicos]
    O --> P[Generar PDF final]
    
    D --> Q[Crear nuevo PDF con jsPDF]
    Q --> R[Agregar encabezado]
    R --> S[Agregar datos del documento]
    S --> T[Agregar datos del firmante]
    T --> U[Agregar información del certificado]
    U --> V[Agregar sello de validez]
    V --> P
    
    P --> W[Iniciar descarga automática]
    J --> X[Mostrar error al usuario]
```

---

## 💾 Ejemplos de Uso de la Base de Datos

### Consultas Comunes

#### 1. Obtener historial de firmas de un usuario

```sql
SELECT 
    s.id,
    s.nombre_archivo,
    s.fecha_firma,
    s.estado_firma,
    s.datos_firmante->>'nombre' as firmante_nombre,
    s.datos_firmante->>'dni' as firmante_dni,
    c.nombre as certificado_nombre
FROM signatures s
LEFT JOIN certificados c ON s.certificado_usado = c.id
WHERE s.usuario_id = $1
ORDER BY s.fecha_firma DESC
LIMIT 10;
```

#### 2. Validar certificado activo

```sql
SELECT 
    id,
    nombre,
    status,
    validez_desde,
    validez_hasta,
    algoritmo
FROM certificados 
WHERE usuario_id = $1 
    AND status = 'activo' 
    AND validez_hasta > CURRENT_DATE
ORDER BY validez_hasta DESC;
```

#### 3. Estadísticas de firmas por período

```sql
SELECT 
    DATE_TRUNC('day', fecha_firma) as fecha,
    COUNT(*) as total_firmas,
    COUNT(CASE WHEN estado_firma = 'completada' THEN 1 END) as firmas_exitosas,
    COUNT(CASE WHEN estado_firma = 'fallida' THEN 1 END) as firmas_fallidas
FROM signatures 
WHERE fecha_firma >= $1 AND fecha_firma <= $2
GROUP BY DATE_TRUNC('day', fecha_firma)
ORDER BY fecha;
```

---

## 🔧 Código de Ejemplo para Integración

### Frontend - Clase Cliente API

```javascript
class SignatureAPI {
  constructor(baseURL = 'http://localhost:4000/api', token = null) {
    this.baseURL = baseURL;
    this.token = token;
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error en la solicitud');
    }

    return response.json();
  }

  // Autenticación
  async login(username, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    if (response.success) {
      this.setToken(response.token);
    }
    
    return response;
  }

  // Firmar documento
  async signDocument(file, signerData, certificateType = 'interno') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('signer_name', signerData.nombre);
    formData.append('signer_surname', signerData.apellido);
    formData.append('signer_dni', signerData.dni);
    formData.append('signer_email', signerData.email || '');
    formData.append('signer_position', signerData.cargo || '');
    formData.append('signer_institution', signerData.institucion || '');
    formData.append('certificate_type', certificateType);

    return this.request('/signatures/sign', {
      method: 'POST',
      headers: {
        // No incluir Content-Type para FormData
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });
  }

  // Verificar firma
  async verifySignature(signatureId) {
    return this.request(`/signatures/verify/${signatureId}`);
  }

  // Obtener historial
  async getSignatureHistory(page = 1, limit = 10) {
    return this.request(`/signatures/history?page=${page}&limit=${limit}`);
  }
}

// Ejemplo de uso
const api = new SignatureAPI();

// Login
const loginResult = await api.login('admin', 'admin123');
console.log('Login exitoso:', loginResult.success);

// Firmar documento
const signerData = {
  nombre: 'Juan',
  apellido: 'Pérez',
  dni: '12345678',
  email: 'juan@sanjuan.gob.ar',
  cargo: 'Director',
  institucion: 'Ministerio de Hacienda'
};

const signResult = await api.signDocument(fileObject, signerData, 'interno');
console.log('Documento firmado:', signResult.signature_id);
```

### Backend - Middleware de Validación

```javascript
// middleware/validation.js
const { body, validationResult } = require('express-validator');

const signatureValidation = [
  body('signer_name')
    .notEmpty()
    .withMessage('Nombre del firmante es requerido')
    .isLength({ min: 2, max: 50 })
    .withMessage('Nombre debe tener entre 2 y 50 caracteres'),
    
  body('signer_dni')
    .notEmpty()
    .withMessage('DNI es requerido')
    .isNumeric()
    .withMessage('DNI debe ser numérico')
    .isLength({ min: 7, max: 8 })
    .withMessage('DNI debe tener 7 u 8 dígitos'),
    
  body('certificate_type')
    .isIn(['interno', 'token'])
    .withMessage('Tipo de certificado inválido'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = { signatureValidation };
```

---

## 📊 Monitoreo y Logs

### Configuración de Logs

```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'firma-digital' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

module.exports = logger;
```

### Métricas de Uso

```javascript
// middleware/metrics.js
const promClient = require('prom-client');

const signatureCounter = new promClient.Counter({
  name: 'signatures_total',
  help: 'Total number of signatures created',
  labelNames: ['status', 'certificate_type']
});

const signatureDuration = new promClient.Histogram({
  name: 'signature_duration_seconds',
  help: 'Duration of signature process',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

module.exports = {
  signatureCounter,
  signatureDuration,
  register: promClient.register
};
```

---

**© 2024 Gobierno de San Juan - Documentación Técnica Detallada**
*Sistema de Firma Digital - Versión 1.0*