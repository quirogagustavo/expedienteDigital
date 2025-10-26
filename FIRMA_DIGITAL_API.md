# 📝 Documentación de API - Firma Digital

## Índice
- [Introducción](#introducción)
- [Autenticación](#autenticación)
- [Firmar Documento](#firmar-documento)
- [Verificar Firma](#verificar-firma)
- [Ejemplos de Código](#ejemplos-de-código)
- [Errores Comunes](#errores-comunes)

---

## Introducción

Esta API permite **firmar digitalmente documentos** usando certificados internos o gubernamentales con algoritmo RSA-SHA256. El sistema genera automáticamente certificados para usuarios y mantiene un registro completo de auditoría.

### URL Base
```
Desarrollo: http://localhost:4000
Producción: http://10.64.160.220:4000
```

---

## Autenticación

Todos los endpoints de firma requieren autenticación mediante **JWT (JSON Web Token)**.

### 1. Login

**Endpoint:**
```
POST /login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "nombre_completo": "Administrador del Sistema",
    "email": "admin@sistema.gov.ar",
    "rol_usuario": "administrador"
  }
}
```

**Ejemplo JavaScript:**
```javascript
const login = async (username, password) => {
  const response = await fetch('http://10.64.160.220:4000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  const data = await response.json();
  localStorage.setItem('token', data.token);
  return data;
};
```

---

## Firmar Documento

### Endpoint Principal

**URL:**
```
POST /sign
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### Parámetros

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `document` | File | ✅ Sí | Archivo a firmar (PDF, Word, etc.) |
| `tipo_documento` | String | ✅ Sí | `'oficial'` o `'no_oficial'` |
| `certificate_type` | String | ✅ Sí | `'internal'` o `'government'` |
| `aplicar_firma_visual` | String | ❌ No | `'true'` o `'false'` (solo PDFs) |
| `posicion_firma` | JSON String | ❌ No | Posición de la firma visual |

### Tipos de Documento

- **`oficial`**: Documentos que requieren validez legal gubernamental
  - Solo se pueden firmar con `certificate_type: 'government'`
  - Requiere certificado gubernamental válido
  
- **`no_oficial`**: Documentos internos o de uso general
  - Se pueden firmar con `certificate_type: 'internal'`
  - El certificado se genera automáticamente si no existe

### Tipos de Certificado

- **`internal`**: Certificado interno generado por el sistema
  - Se crea automáticamente para el usuario
  - Válido para documentos no oficiales
  - Ideal para uso interno de la organización

- **`government`**: Certificado gubernamental importado
  - Debe ser importado previamente (.p12/.pfx)
  - Validez legal completa
  - Verificación contra CRL/OCSP

### Firma Visual (Opcional)

Si `aplicar_firma_visual: 'true'`, puedes especificar la posición:

```json
{
  "pagina": 1,
  "x": 50,
  "y": 50,
  "ancho": 150,
  "alto": 50
}
```

### Request Completo

```javascript
const formData = new FormData();
formData.append('document', file); // File object
formData.append('tipo_documento', 'no_oficial');
formData.append('certificate_type', 'internal');
formData.append('aplicar_firma_visual', 'true');
formData.append('posicion_firma', JSON.stringify({
  pagina: 1,
  x: 50,
  y: 50,
  ancho: 150,
  alto: 50
}));

const response = await fetch('http://10.64.160.220:4000/sign', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
```

### Response Exitoso

```json
{
  "message": "Documento firmado digitalmente con certificado interno",
  "filename": "documento.pdf",
  "size": 1234567,
  "fileBase64": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlIC9...",
  "signature": "a1b2c3d4e5f6789...",
  "publicKeyPem": "-----BEGIN CERTIFICATE-----\nMIIE...\n-----END CERTIFICATE-----",
  "documento": {
    "tipo_documento": "no_oficial",
    "certificate_type": "internal",
    "estado_firma": "firmado_interno",
    "validez_legal": "INTERNA",
    "hash_documento": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "firma_visual_aplicada": true
  },
  "firma": {
    "id": 123,
    "timestamp": "2025-10-24T13:30:00.000Z",
    "algoritmo": "RSA-SHA256",
    "estado": "valida",
    "verificada": true
  },
  "usuario": {
    "id": 1,
    "username": "admin",
    "nombre_completo": "Administrador del Sistema",
    "rol": "administrador"
  },
  "certificado": {
    "id": 45,
    "nombre_certificado": "Certificado Interno - admin",
    "tipo": "internal",
    "numero_serie": "ABC123XYZ456",
    "fecha_emision": "2025-01-01T00:00:00.000Z",
    "fecha_expiracion": "2026-01-01T00:00:00.000Z",
    "dias_para_vencer": 69
  },
  "auditoria": {
    "timestamp": "2025-10-24T13:30:00.000Z",
    "firma_id": "FIRMA_1729776600000"
  }
}
```

### Campos de la Respuesta

| Campo | Descripción |
|-------|-------------|
| `fileBase64` | Documento firmado codificado en Base64 |
| `signature` | Firma digital en formato hexadecimal |
| `publicKeyPem` | Certificado público para verificación |
| `documento.hash_documento` | Hash SHA-256 del documento original |
| `documento.validez_legal` | `'COMPLETA'` o `'INTERNA'` |
| `firma.id` | ID único de la firma (para auditoría) |
| `firma.algoritmo` | Algoritmo usado (RSA-SHA256) |
| `certificado.dias_para_vencer` | Días hasta que expire el certificado |

---

## Verificar Firma

### Endpoint

**URL:**
```
POST /verify
```

**Headers:**
```
Content-Type: multipart/form-data
```

**Parámetros:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `document` | File | Archivo original (sin firmar) |
| `signature` | String | Firma digital en hexadecimal |
| `publicKeyPem` | String | Certificado público (PEM) |

### Request

```javascript
const formData = new FormData();
formData.append('document', originalFile);
formData.append('signature', signatureHex);
formData.append('publicKeyPem', publicKey);

const response = await fetch('http://10.64.160.220:4000/verify', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

### Response

```json
{
  "valid": true,
  "message": "La firma es válida"
}
```

o

```json
{
  "valid": false,
  "message": "La firma NO es válida"
}
```

---

## Ejemplos de Código

### Ejemplo 1: Firma Simple (React)

```jsx
import { useState } from 'react';

function FirmarDocumento() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSign = async () => {
    if (!file) {
      alert('Selecciona un archivo');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('document', file);
    formData.append('tipo_documento', 'no_oficial');
    formData.append('certificate_type', 'internal');

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://10.64.160.220:4000/sign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
        descargarArchivo(data.fileBase64, data.filename);
      } else {
        alert(data.error || 'Error al firmar');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const descargarArchivo = (base64, filename) => {
    const blob = base64ToBlob(base64, 'application/pdf');
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firmado_${filename}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const base64ToBlob = (base64, type) => {
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type });
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Firmar Documento</h2>
      
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileChange}
        className="mb-4"
      />
      
      <button
        onClick={handleSign}
        disabled={loading || !file}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
      >
        {loading ? 'Firmando...' : 'Firmar Documento'}
      </button>
      
      {result && (
        <div className="mt-4 p-4 bg-green-100 rounded">
          <h3 className="font-bold">✅ Documento firmado exitosamente</h3>
          <p>ID de Firma: {result.firma.id}</p>
          <p>Algoritmo: {result.firma.algoritmo}</p>
          <p>Timestamp: {new Date(result.firma.timestamp).toLocaleString()}</p>
          <p>Hash: {result.documento.hash_documento.substring(0, 40)}...</p>
        </div>
      )}
    </div>
  );
}

export default FirmarDocumento;
```

### Ejemplo 2: Firma con Visual (React)

```jsx
function FirmarConVisual() {
  const [file, setFile] = useState(null);
  const [posicion, setPosicion] = useState({
    pagina: 1,
    x: 50,
    y: 50,
    ancho: 150,
    alto: 50
  });

  const handleSign = async () => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('tipo_documento', 'no_oficial');
    formData.append('certificate_type', 'internal');
    formData.append('aplicar_firma_visual', 'true');
    formData.append('posicion_firma', JSON.stringify(posicion));

    const token = localStorage.getItem('token');
    
    const response = await fetch('http://10.64.160.220:4000/sign', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('Firmado con visual:', data.documento.firma_visual_aplicada);
      // Descargar archivo...
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      
      <div className="mt-4">
        <h3>Posición de la Firma Visual</h3>
        <label>
          Página:
          <input
            type="number"
            value={posicion.pagina}
            onChange={(e) => setPosicion({...posicion, pagina: parseInt(e.target.value)})}
          />
        </label>
        
        <label>
          X:
          <input
            type="number"
            value={posicion.x}
            onChange={(e) => setPosicion({...posicion, x: parseInt(e.target.value)})}
          />
        </label>
        
        <label>
          Y:
          <input
            type="number"
            value={posicion.y}
            onChange={(e) => setPosicion({...posicion, y: parseInt(e.target.value)})}
          />
        </label>
      </div>
      
      <button onClick={handleSign}>Firmar con Visual</button>
    </div>
  );
}
```

### Ejemplo 3: Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>Firma Digital</title>
</head>
<body>
  <h1>Firmar Documento</h1>
  
  <input type="file" id="fileInput" accept=".pdf">
  <button onclick="firmarDocumento()">Firmar</button>
  
  <div id="resultado"></div>

  <script>
    // Token almacenado después del login
    const TOKEN = localStorage.getItem('token');
    const API_URL = 'http://10.64.160.220:4000';

    async function firmarDocumento() {
      const fileInput = document.getElementById('fileInput');
      const file = fileInput.files[0];
      
      if (!file) {
        alert('Selecciona un archivo');
        return;
      }

      const formData = new FormData();
      formData.append('document', file);
      formData.append('tipo_documento', 'no_oficial');
      formData.append('certificate_type', 'internal');

      try {
        const response = await fetch(`${API_URL}/sign`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${TOKEN}`
          },
          body: formData
        });

        const data = await response.json();

        if (response.ok) {
          mostrarResultado(data);
          descargarArchivo(data.fileBase64, data.filename);
        } else {
          alert('Error: ' + data.error);
        }
      } catch (error) {
        alert('Error de conexión: ' + error.message);
      }
    }

    function mostrarResultado(data) {
      const div = document.getElementById('resultado');
      div.innerHTML = `
        <h2>✅ Documento firmado</h2>
        <p><strong>ID:</strong> ${data.firma.id}</p>
        <p><strong>Algoritmo:</strong> ${data.firma.algoritmo}</p>
        <p><strong>Hash:</strong> ${data.documento.hash_documento}</p>
        <p><strong>Timestamp:</strong> ${new Date(data.firma.timestamp).toLocaleString()}</p>
      `;
    }

    function descargarArchivo(base64, filename) {
      const blob = base64ToBlob(base64, 'application/pdf');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `firmado_${filename}`;
      a.click();
      window.URL.revokeObjectURL(url);
    }

    function base64ToBlob(base64, type) {
      const binary = atob(base64);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      return new Blob([array], { type });
    }
  </script>
</body>
</html>
```

### Ejemplo 4: Node.js / Backend

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function firmarDocumento(filePath, token) {
  const formData = new FormData();
  formData.append('document', fs.createReadStream(filePath));
  formData.append('tipo_documento', 'no_oficial');
  formData.append('certificate_type', 'internal');

  try {
    const response = await axios.post('http://10.64.160.220:4000/sign', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    // Guardar documento firmado
    const buffer = Buffer.from(response.data.fileBase64, 'base64');
    fs.writeFileSync('documento_firmado.pdf', buffer);

    console.log('✅ Documento firmado exitosamente');
    console.log('ID de firma:', response.data.firma.id);
    console.log('Hash:', response.data.documento.hash_documento);

    return response.data;
  } catch (error) {
    console.error('❌ Error al firmar:', error.response?.data || error.message);
    throw error;
  }
}

// Uso
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
firmarDocumento('./documento.pdf', token);
```

---

## Errores Comunes

### 1. Error 401: Token de acceso requerido

```json
{
  "error": "Token de acceso requerido"
}
```

**Solución:** Incluye el token en el header `Authorization`:
```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

### 2. Error 400: Faltan datos para la firma

```json
{
  "error": "No se envió ningún archivo"
}
```

**Solución:** Asegúrate de enviar el archivo en FormData:
```javascript
formData.append('document', file);
```

### 3. Error 400: Tipo de documento inválido

```json
{
  "error": "Tipo de documento inválido"
}
```

**Solución:** Usa valores válidos:
```javascript
formData.append('tipo_documento', 'oficial'); // o 'no_oficial'
formData.append('certificate_type', 'internal'); // o 'government'
```

### 4. Error 400: Documentos oficiales solo con certificado gubernamental

```json
{
  "error": "Los documentos oficiales SOLO pueden firmarse con certificado gubernamental"
}
```

**Solución:** Para documentos oficiales, usa:
```javascript
formData.append('tipo_documento', 'oficial');
formData.append('certificate_type', 'government');
```

### 5. Error 404: No tiene certificado gubernamental

```json
{
  "error": "No tiene certificado gubernamental activo",
  "action_required": "import_or_request_government_certificate"
}
```

**Solución:** Importa un certificado .p12/.pfx desde el panel de certificados gubernamentales.

### 6. Error 403: Certificado revocado

```json
{
  "error": "Su certificado gubernamental ha sido REVOCADO",
  "revocation_reason": "...",
  "revocation_date": "..."
}
```

**Solución:** Renueva o importa un certificado válido.

### 7. Error de conexión: ERR_CONNECTION_REFUSED

**Solución:** Verifica:
- Que el backend esté corriendo: `pm2 status`
- Que el firewall permita el puerto 4000: `sudo ufw allow 4000/tcp`
- Que la URL sea correcta

### 8. Error CORS

```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solución:** El backend ya incluye CORS configurado. Verifica que:
- El frontend esté en `localhost:5174` o la URL configurada en `FRONTEND_URL`
- El backend esté reiniciado después de cambiar `.env`

---

## Flujo Completo de Integración

### 1. Setup Inicial

```javascript
// 1. Login
const loginResponse = await fetch('http://10.64.160.220:4000/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});

const { token } = await loginResponse.json();
localStorage.setItem('token', token);
```

### 2. Firmar Documento

```javascript
// 2. Preparar FormData
const formData = new FormData();
formData.append('document', file);
formData.append('tipo_documento', 'no_oficial');
formData.append('certificate_type', 'internal');

// 3. Enviar a firmar
const signResponse = await fetch('http://10.64.160.220:4000/sign', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const signData = await signResponse.json();
```

### 3. Procesar Resultado

```javascript
// 4. Guardar datos de la firma
const firmaInfo = {
  id: signData.firma.id,
  hash: signData.documento.hash_documento,
  signature: signData.signature,
  publicKey: signData.publicKeyPem,
  timestamp: signData.firma.timestamp
};

// 5. Descargar archivo firmado
const blob = base64ToBlob(signData.fileBase64, 'application/pdf');
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `firmado_${signData.filename}`;
a.click();
URL.revokeObjectURL(url);
```

### 4. (Opcional) Verificar Firma

```javascript
// 6. Verificar la firma en cualquier momento
const verifyFormData = new FormData();
verifyFormData.append('document', originalFile);
verifyFormData.append('signature', firmaInfo.signature);
verifyFormData.append('publicKeyPem', firmaInfo.publicKey);

const verifyResponse = await fetch('http://10.64.160.220:4000/verify', {
  method: 'POST',
  body: verifyFormData
});

const { valid } = await verifyResponse.json();
console.log('Firma válida:', valid);
```

---

## Seguridad

### Buenas Prácticas

✅ **Almacena el token de forma segura**
```javascript
// ✅ Bueno: localStorage para SPAs
localStorage.setItem('token', token);

// ❌ Malo: No envíes el token por URL
// /sign?token=abc123
```

✅ **Verifica siempre las respuestas**
```javascript
if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error || 'Error desconocido');
}
```

✅ **Maneja la expiración del token**
```javascript
if (response.status === 401) {
  localStorage.removeItem('token');
  window.location.href = '/login';
}
```

✅ **Valida el tipo de archivo antes de enviar**
```javascript
const allowedTypes = ['.pdf', '.doc', '.docx'];
const extension = file.name.substring(file.name.lastIndexOf('.'));

if (!allowedTypes.includes(extension)) {
  alert('Tipo de archivo no permitido');
  return;
}
```

---

## Recursos Adicionales

### Endpoints Relacionados

- `GET /profile` - Obtener perfil del usuario autenticado
- `GET /certificados` - Listar certificados del usuario
- `GET /api/signatures/history` - Historial de firmas
- `GET /api/signatures/:id` - Detalles de una firma específica
- `GET /api/signatures/verify/:id` - Verificar firma por ID

### Modelos de Datos

```typescript
interface SignResponse {
  message: string;
  filename: string;
  size: number;
  fileBase64: string;
  signature: string;
  publicKeyPem: string;
  documento: {
    tipo_documento: 'oficial' | 'no_oficial';
    certificate_type: 'internal' | 'government';
    estado_firma: string;
    validez_legal: 'COMPLETA' | 'INTERNA';
    hash_documento: string;
    firma_visual_aplicada: boolean;
  };
  firma: {
    id: number;
    timestamp: string;
    algoritmo: string;
    estado: string;
    verificada: boolean;
  };
  usuario: {
    id: number;
    username: string;
    nombre_completo: string;
    rol: string;
  };
  certificado: {
    id: number;
    nombre_certificado: string;
    tipo: 'internal' | 'government';
    numero_serie: string;
    fecha_emision: string;
    fecha_expiracion: string;
    dias_para_vencer: number;
  };
}
```

---

## Soporte

Para más información o reportar problemas:
- 📧 Email: admin@sistema.gov.ar
- 📁 Repositorio: https://github.com/quirogagustavo/expedienteDigital
- 📚 Documentación adicional: Ver archivos `FRONTEND_PRODUCCION.md` y `DEPLOYMENT_IP_ONLY.md`

---

**Última actualización:** 24 de octubre de 2025
**Versión de la API:** 1.0.0
