# ⚙️ Configuración Eduge Testing - Integración API Firma Digital

## 📋 Información del Entorno

**Laravel Backend Testing:** `https://edugefinancierobacktesting.sanjuan.gob.ar`
**API Expediente Digital:** (URL a definir cuando se despliegue)
**Usuario de Servicio:** `eduge_service`

---

## 🔐 Credenciales Generadas

```
Username: eduge_service
Password: 99ccb70b4e4d5e391ccb732e500544b34cdb1a2c7779be0916babd104fdba8b7
```

⚠️ **IMPORTANTE:** Estas credenciales son exclusivas para la comunicación entre Laravel y la API de Expediente Digital.

---

## ⚙️ Configuración Laravel (.env)

### Opción 1: API Local (Desarrollo)
```env
# API de Expediente Digital - Local
EXPEDIENTE_API_URL=http://localhost:4000
EXPEDIENTE_API_USERNAME=eduge_service
EXPEDIENTE_API_PASSWORD=99ccb70b4e4d5e391ccb732e500544b34cdb1a2c7779be0916babd104fdba8b7
EXPEDIENTE_API_TIMEOUT=30
```

### Opción 2: API Producción/Testing (Cuando se despliegue)
```env
# API de Expediente Digital - Testing/Producción
EXPEDIENTE_API_URL=https://api-expediente.sanjuan.gob.ar
EXPEDIENTE_API_USERNAME=eduge_service
EXPEDIENTE_API_PASSWORD=99ccb70b4e4d5e391ccb732e500544b34cdb1a2c7779be0916babd104fdba8b7
EXPEDIENTE_API_TIMEOUT=30
```

---

## 🔧 Configuración Backend Node.js

### 1. CORS - Ya Configurado ✅

El backend Node.js ya está configurado para permitir peticiones desde:
- `https://edugefinancierobacktesting.sanjuan.gob.ar`

### 2. Variables de Entorno (.env del backend Node.js)

**🔒 Desarrollo (NODE_ENV=development):**
```env
PORT=4000
NODE_ENV=development
JWT_SECRET=tu_secret_para_desarrollo

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expediente_digital
DB_USER=postgres
DB_PASSWORD=tu_password_postgres

# CORS: En desarrollo, localhost se permite automáticamente
```

**🔐 Producción/Testing (NODE_ENV=production):**
```env
PORT=4000
NODE_ENV=production
JWT_SECRET=tu_secret_produccion_muy_seguro_cambiar_esto

# Base de datos
DB_HOST=tu_servidor_db
DB_PORT=5432
DB_NAME=expediente_digital
DB_USER=postgres
DB_PASSWORD=tu_password_seguro

# CORS - URLs permitidas (seguridad mejorada)
FRONTEND_URL=https://expediente-frontend.sanjuan.gob.ar
LARAVEL_URL=https://edugefinanciero.sanjuan.gob.ar

# ⚠️ IMPORTANTE:
# - En producción, SOLO se permiten las URLs especificadas arriba
# - Localhost NO está permitido por seguridad
# - Editar backend/index.js si necesitas agregar más URLs
```

---

## 🚀 Pasos de Implementación

### Paso 1: Ejecutar Migración en PostgreSQL

```bash
# Conectarse al servidor donde está PostgreSQL
ssh usuario@servidor-db

# Ejecutar migración
cd /ruta/al/proyecto/backend
psql -U postgres -d expediente_digital -f migrations/add_laravel_integration.sql
```

**Resultado esperado:**
```
Migración completada | firmas_laravel | usuario_servicio
---------------------+----------------+-----------------
Migración completada |              0 | eduge_service
```

### Paso 2: Verificar Usuario Creado

```sql
SELECT id, username, email, rol_usuario
FROM usuarios
WHERE username = 'eduge_service';
```

### Paso 3: Configurar Laravel

En tu proyecto Laravel Eduge:

**1. Actualizar `.env`:**
```env
EXPEDIENTE_API_URL=http://localhost:4000
EXPEDIENTE_API_USERNAME=eduge_service
EXPEDIENTE_API_PASSWORD=99ccb70b4e4d5e391ccb732e500544b34cdb1a2c7779be0916babd104fdba8b7
```

**2. Verificar `config/services.php`:**
```php
'expediente' => [
    'url' => env('EXPEDIENTE_API_URL'),
    'username' => env('EXPEDIENTE_API_USERNAME'),
    'password' => env('EXPEDIENTE_API_PASSWORD'),
    'timeout' => env('EXPEDIENTE_API_TIMEOUT', 30),
],
```

### Paso 4: Probar Conexión

**Desde Laravel (Artisan Tinker):**
```php
php artisan tinker

// Test básico
use Illuminate\Support\Facades\Http;

$response = Http::post(config('services.expediente.url') . '/api/login', [
    'username' => config('services.expediente.username'),
    'password' => config('services.expediente.password')
]);

dd($response->json());
// Debe retornar: ['token' => 'eyJhbGc...', 'user' => [...]]
```

---

## 📡 Endpoints Disponibles

### Base URL
```
http://localhost:4000/api/laravel
```

### 1. Health Check
```http
GET /api/laravel/health
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Integración Laravel funcionando correctamente",
  "service_user": "eduge_service",
  "timestamp": "2026-02-07T..."
}
```

### 2. Firmar Documento
```http
POST /api/laravel/signatures/sign
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "laravelUser": {
    "id": 123,
    "email": "usuario@sanjuan.gob.ar",
    "name": "Juan Pérez"
  },
  "documentData": {
    "nombre": "Contrato_2024.pdf",
    "hash": "abc123def456...",
    "tipo": "oficial",
    "tamaño": 245678
  },
  "signatureData": {
    "firma_digital": "hex_signature_data...",
    "certificado_id": 5,
    "algoritmo": "RSA-SHA256"
  },
  "metadata": {
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "numero_expediente": "EXP-2024-001"
  }
}
```

### 3. Obtener Firmas de Usuario
```http
GET /api/laravel/signatures/user/{laravelUserId}?page=1&limit=20
Authorization: Bearer {token}
```

### 4. Verificar Firma
```http
GET /api/laravel/signatures/{signatureId}/verify
Authorization: Bearer {token}
```

### 5. Estadísticas de Usuario
```http
GET /api/laravel/users/{laravelUserId}/stats
Authorization: Bearer {token}
```

---

## 🔒 Seguridad

### Checklist de Seguridad

- [ ] **HTTPS en producción:** Ambos sistemas (Laravel y API) deben usar HTTPS
- [ ] **Firewall:** Permitir tráfico solo entre servidores autorizados
- [ ] **Rate Limiting:** Implementar límite de peticiones por minuto
- [ ] **Logs:** Monitorear accesos del usuario `eduge_service`
- [ ] **Rotación de password:** Cambiar credenciales cada 90 días
- [ ] **IP Whitelist:** Restringir acceso solo desde IP de servidor Laravel

### Rotar Password (Cada 90 días)

**1. Generar nuevo hash:**
```bash
cd backend
node -e "
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const newPass = crypto.randomBytes(32).toString('hex');
bcrypt.hash(newPass, 10).then(h => {
  console.log('Password:', newPass);
  console.log('Hash:', h);
});
"
```

**2. Actualizar en PostgreSQL:**
```sql
UPDATE usuarios
SET password_hash = '$2b$10$nuevo_hash_aqui',
    updated_at = NOW()
WHERE username = 'eduge_service';
```

**3. Actualizar en Laravel `.env`:**
```env
EXPEDIENTE_API_PASSWORD=nuevo_password_aqui
```

---

## 🧪 Testing

### Test 1: Autenticación
```php
// tests/Feature/ExpedienteApiTest.php
public function test_can_authenticate_with_expediente_api()
{
    $service = app(ExpedienteDigitalService::class);

    $token = $service->getToken();

    $this->assertNotNull($token);
    $this->assertStringStartsWith('eyJ', $token); // JWT format
}
```

### Test 2: Health Check
```php
public function test_expediente_api_is_available()
{
    $service = app(ExpedienteDigitalService::class);

    $isHealthy = $service->healthCheck();

    $this->assertTrue($isHealthy);
}
```

### Test 3: Firmar Documento
```php
public function test_can_sign_document()
{
    $service = app(ExpedienteDigitalService::class);
    $user = User::factory()->create();

    $result = $service->firmarDocumento(
        laravelUser: [
            'id' => $user->id,
            'email' => $user->email,
            'name' => $user->name,
        ],
        documentData: [
            'nombre' => 'test.pdf',
            'hash' => hash('sha256', 'test content'),
            'tipo' => 'oficial',
            'tamaño' => 1234
        ],
        signatureData: [
            'firma_digital' => 'test_signature_hex',
            'certificado_id' => 1
        ]
    );

    $this->assertTrue($result['success']);
    $this->assertArrayHasKey('signature', $result);
}
```

---

## 📊 Monitoreo

### Logs a Revisar

**Laravel:**
```bash
tail -f storage/logs/laravel.log | grep "ExpedienteApi"
```

**Node.js Backend:**
```bash
tail -f backend/nohup.out | grep "eduge_service"
```

### Queries Útiles PostgreSQL

**Ver firmas de usuarios de Laravel:**
```sql
SELECT * FROM v_firmas_laravel
ORDER BY timestamp_firma DESC
LIMIT 10;
```

**Estadísticas por usuario Laravel:**
```sql
SELECT * FROM get_laravel_user_stats(123);  -- Reemplazar 123 con ID del usuario
```

**Firmas del último mes:**
```sql
SELECT
  laravel_user_email,
  COUNT(*) as total_firmas,
  COUNT(*) FILTER (WHERE estado_firma = 'valida') as firmas_validas
FROM signatures
WHERE laravel_user_id IS NOT NULL
  AND timestamp_firma >= NOW() - INTERVAL '30 days'
GROUP BY laravel_user_email
ORDER BY total_firmas DESC;
```

---

## 🆘 Troubleshooting

### Error: "Token inválido"
**Causa:** Token JWT expirado (>24h)
**Solución:**
```php
Cache::forget('expediente_api_token');
```

### Error: "CORS Policy"
**Causa:** URL de Laravel no está en whitelist
**Solución:** Verificar que `https://edugefinancierobacktesting.sanjuan.gob.ar` esté en `backend/index.js`

### Error: "Usuario no autorizado"
**Causa:** Credenciales incorrectas en `.env`
**Solución:** Verificar username y password

### Error: "Certificado no encontrado"
**Causa:** `certificado_id` no existe en la base de datos
**Solución:** Listar certificados disponibles:
```sql
SELECT id, nombre_certificado, tipo, activo FROM certificados WHERE activo = true;
```

---

## 📞 Contacto y Soporte

Para problemas técnicos:
1. Revisar logs de ambos sistemas
2. Ejecutar health check
3. Verificar conectividad de red
4. Consultar documentación completa: [`INTEGRACION_LARAVEL.md`](INTEGRACION_LARAVEL.md)

---

**Última actualización:** 2026-02-07
**Versión:** 1.0
**Sistema:** Eduge Financiero - San Juan
