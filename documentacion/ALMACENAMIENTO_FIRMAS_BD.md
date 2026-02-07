# 🗄️ ALMACENAMIENTO DE FIRMAS DIGITALES EN BASE DE DATOS

## Gobierno de San Juan - Estructura de Base de Datos
## Fecha: 30 de septiembre de 2025

---

## 🎯 **RESPUESTA A TU PREGUNTA:**

**"¿Cómo almaceno mi firma digital en la base de datos?"**

### **📊 ESTRUCTURA ACTUAL DE ALMACENAMIENTO:**

```
🗃️ BASE DE DATOS PostgreSQL:
├── 📋 Tabla "certificados" → Tus claves y certificados
├── 📄 Tabla "documents" → Metadatos de documentos
├── 🖋️ Tabla "signatures" → Historial de firmas (NUEVA - por crear)
└── 👤 Tabla "usuarios" → Información de usuarios
```

---

## 🔐 **TABLA 1: CERTIFICADOS (Ya existe)**

### **📋 Estructura de `certificados`:**
```sql
CREATE TABLE certificados (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  
  -- 🔐 CLAVES CRIPTOGRÁFICAS
  clave_privada_pem TEXT, -- Tu clave secreta (cifrada)
  certificado_pem TEXT,   -- Tu certificado público
  clave_publica_pem TEXT, -- Tu clave pública extraída
  
  -- 📋 INFORMACIÓN DEL CERTIFICADO
  nombre_certificado VARCHAR(200),
  numero_serie VARCHAR(50),
  emisor VARCHAR(255),
  tipo ENUM('internal', 'government'),
  
  -- 📅 FECHAS
  fecha_emision DATE,
  fecha_expiracion DATE,
  
  -- ⚙️ ESTADO
  activo BOOLEAN DEFAULT true,
  status ENUM('pending', 'active', 'expired', 'revoked'),
  
  -- 🏛️ AUTORIDAD CERTIFICADORA
  certificate_type_id INTEGER,
  certificate_authority_id INTEGER
);
```

### **💾 EJEMPLO DE DATOS:**
```sql
INSERT INTO certificados VALUES (
  123,                    -- id
  456,                    -- usuario_id
  '-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwgg...
-----END PRIVATE KEY-----', -- clave_privada_pem
  '-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJALC90A875ADE3F6EB...
-----END CERTIFICATE-----', -- certificado_pem
  'Certificado Interno - Juan Carlos Pérez',
  'A7B9F2E8D3C1',         -- numero_serie
  'CN=CA Gobierno San Juan',
  'internal',             -- tipo
  '2025-09-30',          -- fecha_emision
  '2026-09-30',          -- fecha_expiracion
  true                   -- activo
);
```

---

## 🖋️ **TABLA 2: HISTORIAL DE FIRMAS (A crear)**

### **📋 Nueva tabla `signatures`:**
```sql
CREATE TABLE signatures (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  certificado_id INTEGER REFERENCES certificados(id),
  
  -- 📄 INFORMACIÓN DEL DOCUMENTO
  nombre_documento VARCHAR(255),
  nombre_archivo_original VARCHAR(255),
  tipo_documento ENUM('oficial', 'no_oficial'),
  hash_documento VARCHAR(64), -- SHA256 del documento original
  tamaño_archivo INTEGER,
  
  -- 🖋️ DATOS DE LA FIRMA
  firma_digital TEXT,     -- La firma digital (hex)
  algoritmo_firma VARCHAR(50) DEFAULT 'RSA-SHA256',
  timestamp_firma TIMESTAMP DEFAULT NOW(),
  
  -- 🔍 VALIDACIONES
  estado_firma ENUM('valida', 'invalida', 'vencida', 'revocada') DEFAULT 'valida',
  verificada BOOLEAN DEFAULT true,
  
  -- 📊 METADATOS
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  
  -- 🏛️ INFORMACIÓN LEGAL
  validez_legal ENUM('COMPLETA', 'INTERNA', 'LIMITADA'),
  numero_expediente VARCHAR(100),
  
  -- 📅 TIMESTAMPS
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsqueda eficiente
CREATE INDEX idx_signatures_usuario ON signatures(usuario_id);
CREATE INDEX idx_signatures_fecha ON signatures(timestamp_firma);
CREATE INDEX idx_signatures_documento ON signatures(hash_documento);
```

---

## 🔄 **PROCESO COMPLETO DE ALMACENAMIENTO**

### **📱 PASO 1: Usuario sube documento**
```javascript
// Frontend envía:
{
  file: documento.pdf,
  tipo_documento: "oficial",
  certificate_type: "government"
}
```

### **🔍 PASO 2: Backend busca certificado**
```javascript
// Buscar en tabla certificados
const certificado = await Certificado.findOne({
  where: { 
    usuario_id: req.user.id,
    tipo: certificate_type,
    activo: true 
  }
});
```

### **🖋️ PASO 3: Generar firma digital**
```javascript
// Extraer clave privada de BD
const clavePrivada = certificado.clave_privada_pem;

// Crear firma usando crypto
const firma = crypto.sign('sha256', documentBuffer, clavePrivada);
```

### **💾 PASO 4: Almacenar en historial**
```javascript
// Insertar en tabla signatures
const nuevaFirma = await Signature.create({
  usuario_id: req.user.id,
  certificado_id: certificado.id,
  nombre_documento: req.file.originalname,
  nombre_archivo_original: req.file.originalname,
  tipo_documento: req.body.tipo_documento,
  hash_documento: crypto.createHash('sha256').update(req.file.buffer).digest('hex'),
  tamaño_archivo: req.file.size,
  firma_digital: firma.toString('hex'),
  algoritmo_firma: 'RSA-SHA256',
  estado_firma: 'valida',
  verificada: true,
  ip_address: req.ip,
  user_agent: req.get('User-Agent'),
  validez_legal: certificate_type === 'government' ? 'COMPLETA' : 'INTERNA'
});
```

---

## 🗃️ **EJEMPLO COMPLETO DE ALMACENAMIENTO**

### **🔐 CERTIFICADO (tabla `certificados`):**
```json
{
  "id": 123,
  "usuario_id": 456,
  "clave_privada_pem": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq...\n-----END PRIVATE KEY-----",
  "certificado_pem": "-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIJ...\n-----END CERTIFICATE-----",
  "nombre_certificado": "Certificado Gubernamental - Juan Carlos Pérez",
  "numero_serie": "GOV789ABC123",
  "tipo": "government",
  "activo": true,
  "fecha_expiracion": "2026-12-31"
}
```

### **🖋️ FIRMA DIGITAL (tabla `signatures`):**
```json
{
  "id": 789,
  "usuario_id": 456,
  "certificado_id": 123,
  "nombre_documento": "Resolución Administrativa N° 123",
  "nombre_archivo_original": "resolucion_123.pdf",
  "tipo_documento": "oficial",
  "hash_documento": "a7b9f2e8d3c1456789abcdef01234567...",
  "tamaño_archivo": 2048576,
  "firma_digital": "73d2557113e1b77adefbb55e21908445...",
  "algoritmo_firma": "RSA-SHA256",
  "timestamp_firma": "2025-09-30T15:30:45.123Z",
  "estado_firma": "valida",
  "verificada": true,
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (X11; Linux x86_64)...",
  "validez_legal": "COMPLETA",
  "numero_expediente": "EXP-2025-001234"
}
```

---

## 🔍 **CONSULTAS ÚTILES PARA HISTORIAL**

### **📊 Ver todas tus firmas:**
```sql
SELECT 
  s.id,
  s.nombre_documento,
  s.timestamp_firma,
  s.estado_firma,
  s.validez_legal,
  c.nombre_certificado,
  u.nombre_completo
FROM signatures s
JOIN certificados c ON s.certificado_id = c.id
JOIN usuarios u ON s.usuario_id = u.id
WHERE s.usuario_id = 456
ORDER BY s.timestamp_firma DESC;
```

### **🔎 Buscar firma específica:**
```sql
SELECT 
  s.*,
  c.numero_serie,
  c.tipo as tipo_certificado
FROM signatures s
JOIN certificados c ON s.certificado_id = c.id
WHERE s.hash_documento = 'a7b9f2e8d3c1456789abcdef01234567...';
```

### **📈 Estadísticas de firmas:**
```sql
SELECT 
  COUNT(*) as total_firmas,
  COUNT(CASE WHEN tipo_documento = 'oficial' THEN 1 END) as firmas_oficiales,
  COUNT(CASE WHEN estado_firma = 'valida' THEN 1 END) as firmas_validas,
  DATE(timestamp_firma) as fecha
FROM signatures
WHERE usuario_id = 456
GROUP BY DATE(timestamp_firma)
ORDER BY fecha DESC;
```

---

## 🛡️ **SEGURIDAD EN EL ALMACENAMIENTO**

### **🔐 CIFRADO DE CLAVES PRIVADAS:**
```javascript
// Antes de almacenar en BD
const crypto = require('crypto');

// Cifrar clave privada con contraseña del usuario
function encryptPrivateKey(privateKeyPem, userPassword) {
  const cipher = crypto.createCipher('aes-256-cbc', userPassword);
  let encrypted = cipher.update(privateKeyPem, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Descifrar para usar
function decryptPrivateKey(encryptedKey, userPassword) {
  const decipher = crypto.createDecipher('aes-256-cbc', userPassword);
  let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### **🔍 AUDITORÍA COMPLETA:**
```sql
-- Tabla de auditoría
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER,
  accion VARCHAR(100), -- 'crear_certificado', 'firmar_documento', 'verificar_firma'
  tabla_afectada VARCHAR(50),
  registro_id INTEGER,
  datos_anteriores JSON,
  datos_nuevos JSON,
  ip_address INET,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## 📱 **API ENDPOINTS PARA HISTORIAL**

### **🔍 Obtener historial de firmas:**
```javascript
GET /api/signatures/history
Authorization: Bearer <token>

Response:
{
  "success": true,
  "signatures": [
    {
      "id": 789,
      "document_name": "Resolución Administrativa N° 123",
      "timestamp_firma": "2025-09-30T15:30:45.123Z",
      "estado_firma": "valida",
      "validez_legal": "COMPLETA",
      "certificate_type": "Oficial Gubernamental"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_items": 25,
    "total_pages": 3
  }
}
```

### **📄 Obtener detalles de firma específica:**
```javascript
GET /api/signatures/789
Authorization: Bearer <token>

Response:
{
  "success": true,
  "signature": {
    "id": 789,
    "document_name": "Resolución Administrativa N° 123",
    "hash_documento": "a7b9f2e8d3c1456789abcdef...",
    "firma_digital": "73d2557113e1b77adefbb55e...",
    "verification_info": {
      "verified": true,
      "certificate_valid": true,
      "signature_valid": true,
      "overall_status": "VALID"
    }
  }
}
```

---

## ✅ **RESUMEN PARA TI, GUSTAVO:**

### **🎯 CÓMO SE ALMACENA TU FIRMA DIGITAL:**

1. **🔐 Tu certificado** se guarda una vez en tabla `certificados`:
   - Clave privada (cifrada)
   - Certificado público
   - Metadatos de validez

2. **🖋️ Cada firma** se guarda en tabla `signatures`:
   - Hash del documento original
   - Firma digital generada (256 bytes)
   - Timestamp y metadatos
   - Referencia al certificado usado

3. **🔍 Para validar** una firma:
   - Se busca en `signatures` por hash del documento
   - Se obtiene el certificado asociado
   - Se verifica la firma usando la clave pública

### **💾 LO QUE SE ALMACENA:**
- ✅ Hash del documento (para integridad)
- ✅ Firma digital (resultado de firmar con tu clave privada)
- ✅ Timestamp de cuándo firmaste
- ✅ Metadatos (IP, navegador, tipo de documento)
- ✅ Estado de validez

### **🔒 LO QUE NO SE ALMACENA:**
- ❌ El documento completo (solo su hash)
- ❌ Tu clave privada sin cifrar
- ❌ Datos sensibles sin protección

**¡Tu firma digital queda perfectamente registrada y es verificable eternamente!** 🚀

**¿Quieres que implemente la tabla `signatures` completa en el sistema?** 🤔