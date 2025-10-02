# 🧪 Casos de Prueba y Testing
**Sistema de Firma Digital - Gobierno de San Juan**

---

## 📋 Plan de Pruebas

### 🎯 Casos de Prueba por Módulo

#### 1. AUTENTICACIÓN

**Caso 1.1: Login exitoso**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# Resultado esperado: Status 200, token JWT válido
```

**Caso 1.2: Login con credenciales inválidas**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password_incorrecto"
  }'

# Resultado esperado: Status 401, mensaje de error
```

**Caso 1.3: Login con campos faltantes**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin"
  }'

# Resultado esperado: Status 400, validación fallida
```

#### 2. GESTIÓN DE USUARIOS

**Caso 2.1: Obtener perfil con token válido**
```bash
# Primero obtener token
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | \
  jq -r '.token')

# Luego obtener perfil
curl -X GET http://localhost:4000/api/users/profile \
  -H "Authorization: Bearer $TOKEN"

# Resultado esperado: Status 200, datos del usuario
```

**Caso 2.2: Acceso sin token**
```bash
curl -X GET http://localhost:4000/api/users/profile

# Resultado esperado: Status 401, token requerido
```

#### 3. FIRMA DIGITAL

**Caso 3.1: Firma con certificado interno**
```bash
# Crear archivo de prueba
echo "Documento de prueba para firma digital" > test_document.txt

# Firmar documento
curl -X POST http://localhost:4000/api/signatures/sign \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_document.txt" \
  -F "signer_name=Juan Pérez" \
  -F "signer_surname=Pérez" \
  -F "signer_dni=12345678" \
  -F "certificate_type=interno"

# Resultado esperado: Status 200, signature_id generado
```

---

## 🔬 Tests Automatizados

### Frontend Tests (Jest + React Testing Library)

```javascript
// tests/components/DigitalSignatureWithToken.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DigitalSignatureWithToken from '../src/components/DigitalSignatureWithToken';

describe('DigitalSignatureWithToken', () => {
  test('should render file upload section', () => {
    render(<DigitalSignatureWithToken />);
    
    expect(screen.getByText('Seleccionar Archivo')).toBeInTheDocument();
    expect(screen.getByText('Arrastra un archivo aquí o haz clic para seleccionar')).toBeInTheDocument();
  });

  test('should show signer form when button clicked', () => {
    render(<DigitalSignatureWithToken />);
    
    const showFormButton = screen.getByText('Mostrar Formulario');
    fireEvent.click(showFormButton);
    
    expect(screen.getByPlaceholderText('Nombre del firmante')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Apellido del firmante')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('DNI del firmante')).toBeInTheDocument();
  });

  test('should validate required signer fields', async () => {
    render(<DigitalSignatureWithToken />);
    
    // Simular selección de archivo
    const fileInput = screen.getByLabelText(/seleccionar archivo/i);
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Intentar firmar sin datos del firmante
    const signButton = screen.getByText('✍️ Firmar con Certificado Interno');
    fireEvent.click(signButton);

    await waitFor(() => {
      expect(screen.getByText(/complete los datos del firmante/i)).toBeInTheDocument();
    });
  });

  test('should handle PDF signing successfully', async () => {
    render(<DigitalSignatureWithToken />);
    
    // Configurar archivo
    const fileInput = screen.getByLabelText(/seleccionar archivo/i);
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Completar datos del firmante
    fireEvent.click(screen.getByText('Mostrar Formulario'));
    fireEvent.change(screen.getByPlaceholderText('Nombre del firmante'), {
      target: { value: 'Juan' }
    });
    fireEvent.change(screen.getByPlaceholderText('Apellido del firmante'), {
      target: { value: 'Pérez' }
    });
    fireEvent.change(screen.getByPlaceholderText('DNI del firmante'), {
      target: { value: '12345678' }
    });

    // Firmar documento
    const signButton = screen.getByText('✍️ Firmar con Certificado Interno');
    fireEvent.click(signButton);

    await waitFor(() => {
      expect(screen.getByText(/documento firmado exitosamente/i)).toBeInTheDocument();
    });
  });
});
```

### Backend Tests (Jest + Supertest)

```javascript
// tests/auth.test.js
const request = require('supertest');
const app = require('../index');

describe('Authentication Endpoints', () => {
  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe('admin');
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrong_password'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin'
          // password missing
        });

      expect(response.status).toBe(400);
    });
  });
});

// tests/signatures.test.js
describe('Signature Endpoints', () => {
  let authToken;

  beforeEach(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });
    
    authToken = loginResponse.body.token;
  });

  describe('POST /api/signatures/sign', () => {
    test('should sign document with valid data', async () => {
      const response = await request(app)
        .post('/api/signatures/sign')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test document content'), 'test.pdf')
        .field('signer_name', 'Juan Pérez')
        .field('signer_dni', '12345678')
        .field('certificate_type', 'interno');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.signature_id).toBeDefined();
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/signatures/sign')
        .attach('file', Buffer.from('test content'), 'test.pdf');

      expect(response.status).toBe(401);
    });
  });
});
```

### Integration Tests

```javascript
// tests/integration/signing-flow.test.js
describe('Complete Signing Flow', () => {
  test('should complete end-to-end signing process', async () => {
    // 1. Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    
    const token = loginResponse.body.token;

    // 2. Get user certificates
    const certsResponse = await request(app)
      .get('/api/certificates')
      .set('Authorization', `Bearer ${token}`);
    
    expect(certsResponse.status).toBe(200);
    expect(certsResponse.body.length).toBeGreaterThan(0);

    // 3. Sign document
    const signResponse = await request(app)
      .post('/api/signatures/sign')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('Integration test document'), 'integration.pdf')
      .field('signer_name', 'Test User')
      .field('signer_dni', '87654321')
      .field('certificate_type', 'interno');

    expect(signResponse.status).toBe(200);
    const signatureId = signResponse.body.signature_id;

    // 4. Verify signature
    const verifyResponse = await request(app)
      .get(`/api/signatures/verify/${signatureId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.valid).toBe(true);

    // 5. Check signature history
    const historyResponse = await request(app)
      .get('/api/signatures/history')
      .set('Authorization', `Bearer ${token}`);

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.signatures).toContainEqual(
      expect.objectContaining({
        signature_id: signatureId
      })
    );
  });
});
```

---

## 🎭 Casos de Uso Prácticos

### Caso de Uso 1: Firma de Contrato Gubernamental

**Escenario:** Un director de ministerio necesita firmar un contrato de servicios

**Pasos:**
1. **Login al sistema**
   ```bash
   POST /api/auth/login
   Body: {"username": "director.salud", "password": "SecurePass123!"}
   ```

2. **Subir contrato PDF**
   ```javascript
   const contratoFile = new File([pdfBlob], 'contrato_servicios_medicos.pdf');
   ```

3. **Completar datos del firmante**
   ```javascript
   const signerData = {
     nombre: 'Dr. Carlos',
     apellido: 'Mendoza',
     dni: '25789456',
     cargo: 'Director de Salud',
     institucion: 'Ministerio de Salud Pública',
     email: 'carlos.mendoza@salud.sanjuan.gob.ar'
   };
   ```

4. **Firmar con certificado interno**
   ```bash
   POST /api/signatures/sign
   FormData: file + signer data + certificate_type=interno
   ```

5. **Verificar firma**
   ```bash
   GET /api/signatures/verify/{signature_id}
   ```

**Resultado esperado:** Contrato firmado digitalmente con página adicional mostrando datos del firmante y certificado

### Caso de Uso 2: Firma Masiva con Token Criptográfico

**Escenario:** Un funcionario necesita firmar múltiples documentos usando su token personal

**Flujo optimizado:**
1. **Autenticar token una sola vez**
   ```javascript
   // Usuario introduce PIN: "1234"
   tokenCryptoService.authenticateWithPIN("1234");
   // isAuthenticated = true
   ```

2. **Firmar múltiples documentos**
   ```javascript
   for (const documento of documentos) {
     // No solicita PIN adicional porque ya está autenticado
     await signWithToken(documento.hash, certificateId, null);
   }
   ```

3. **Resultado:** 10 documentos firmados con solo una introducción de PIN

### Caso de Uso 3: Manejo de PDF Encriptado

**Escenario:** Intentar firmar un PDF protegido con contraseña

**Flujo:**
1. **Usuario selecciona PDF encriptado**
2. **Sistema intenta cargar PDF**
   ```javascript
   try {
     pdfDoc = await PDFDocument.load(arrayBuffer);
   } catch (encryptionError) {
     // PDF está encriptado
     pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
   }
   ```

3. **Si falla la carga ignorando encriptación**
   ```javascript
   catch (finalError) {
     setError('PDF protegido - generando certificado separado...');
     createNewSignedPDF(); // Crear certificado independiente
   }
   ```

4. **Resultado:** Certificado de firma como PDF separado

---

## 📊 Monitoreo y Métricas

### Scripts de Monitoreo

```bash
#!/bin/bash
# monitor_system.sh

# Verificar estado de servidores
echo "=== Estado de Servidores ==="
curl -s http://localhost:4000/api/health || echo "Backend: ERROR"
curl -s http://localhost:5175 > /dev/null && echo "Frontend: OK" || echo "Frontend: ERROR"

# Verificar base de datos
echo "=== Estado de Base de Datos ==="
psql -h localhost -U postgres -d firma_digital -c "SELECT COUNT(*) FROM usuarios;" 2>/dev/null && echo "PostgreSQL: OK" || echo "PostgreSQL: ERROR"

# Verificar espacio en disco
echo "=== Espacio en Disco ==="
df -h | grep -E "/$|/tmp"

# Verificar logs de errores
echo "=== Errores Recientes ==="
tail -n 5 logs/error.log 2>/dev/null || echo "No hay logs de error"
```

### Métricas de Performance

```javascript
// utils/performance.js
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      signatureCount: 0,
      averageSigningTime: 0,
      errorRate: 0,
      totalProcessingTime: 0
    };
  }

  recordSignature(duration, success) {
    this.metrics.signatureCount++;
    this.metrics.totalProcessingTime += duration;
    this.metrics.averageSigningTime = 
      this.metrics.totalProcessingTime / this.metrics.signatureCount;
    
    if (!success) {
      this.metrics.errorRate = 
        (this.metrics.errorRate * (this.metrics.signatureCount - 1) + 1) / 
        this.metrics.signatureCount;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      errorRate: Math.round(this.metrics.errorRate * 100) / 100,
      averageSigningTime: Math.round(this.metrics.averageSigningTime * 100) / 100
    };
  }
}

module.exports = new PerformanceMonitor();
```

---

## 🚨 Casos de Error Comunes

### Error 1: Token JWT Expirado

**Síntoma:**
```json
{
  "status": 403,
  "message": "Token inválido"
}
```

**Solución:**
```javascript
// Frontend: Interceptor para refrescar token
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Error 2: Archivo No Soportado

**Síntoma:**
```
Error: Cannot process this file type
```

**Solución:**
```javascript
const supportedTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/plain'
];

if (!supportedTypes.includes(file.type)) {
  setError('Tipo de archivo no soportado. Use PDF, JPG, PNG o TXT.');
  return;
}
```

### Error 3: Base de Datos Desconectada

**Síntoma:**
```
Error: Connection refused to PostgreSQL
```

**Solución:**
```javascript
// Backend: Reconexión automática
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  retry: {
    max: 5,
    timeout: 3000,
    match: [
      /ConnectionError/,
      /ConnectionRefusedError/,
      /TimeoutError/
    ]
  }
});
```

---

## 🔧 Scripts de Utilidad

### Script de Backup

```bash
#!/bin/bash
# backup.sh

DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups/firma_digital"

# Crear directorio de backup
mkdir -p $BACKUP_DIR

# Backup de base de datos
pg_dump -h localhost -U postgres firma_digital > "$BACKUP_DIR/db_backup_$DATE.sql"

# Backup de logs
tar -czf "$BACKUP_DIR/logs_backup_$DATE.tar.gz" logs/

# Limpiar backups antiguos (mantener últimos 7 días)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completado: $DATE"
```

### Script de Deployment

```bash
#!/bin/bash
# deploy.sh

echo "Iniciando deployment..."

# Detener servicios
pkill -f "node.*index.js"
pkill -f "vite"

# Actualizar código
git pull origin main

# Backend
cd backend/
npm install --production
npm run migrate  # Si existe
node index.js &
BACKEND_PID=$!

# Frontend
cd ../frontend/
npm install
npm run build
npm run preview &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Deployment completado"
```

---

**© 2024 Gobierno de San Juan - Casos de Prueba y Testing**
*Sistema de Firma Digital - Documentación de QA*