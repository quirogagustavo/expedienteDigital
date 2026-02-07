# 🔗 Integración Laravel con API de Firma Digital

## 📋 Tabla de Contenidos
1. [Arquitectura](#arquitectura)
2. [Configuración Inicial](#configuración-inicial)
3. [Crear Usuario de Servicio](#crear-usuario-de-servicio)
4. [Implementación en Laravel](#implementación-en-laravel)
5. [Endpoints Disponibles](#endpoints-disponibles)
6. [Ejemplos de Uso](#ejemplos-de-uso)
7. [Manejo de Errores](#manejo-de-errores)

---

## 🏗️ Arquitectura

### Service Account Pattern

```
┌──────────────────────────────────────────────────┐
│           LARAVEL (Sistema Principal)            │
│  • Usuarios: Juan (ID: 101), María (ID: 102)    │
│  • Autenticación: Laravel Sanctum/JWT           │
└────────────────┬─────────────────────────────────┘
                 │
                 │ ✅ Autenticación única con:
                 │    Usuario: laravel_service
                 │    Token JWT compartido
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│      Node.js API (Sistema de Firma Digital)      │
│  • 1 usuario técnico: "laravel_service"         │
│  • Guarda firmas con laravel_user_id            │
│  • Cada firma sabe quién realmente firmó        │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│                  POSTGRESQL                       │
│  signatures:                                     │
│  - usuario_id: 1 (laravel_service)              │
│  - laravel_user_id: 101 (Juan de Laravel)       │
│  - laravel_user_email: juan@example.com         │
└──────────────────────────────────────────────────┘
```

---

## ⚙️ Configuración Inicial

### 1. Ejecutar Migración en Node.js

```bash
cd backend
psql -U postgres -d expediente_digital -f migrations/add_laravel_integration.sql
```

### 2. Crear Usuario de Servicio

```bash
node scripts/create_laravel_service_user.js [password_opcional]
```

**Output esperado:**
```
┌─────────────────────────────────────────────────────────────┐
│           CREDENCIALES DEL USUARIO DE SERVICIO             │
├─────────────────────────────────────────────────────────────┤
│ Usuario ID:  1                                              │
│ Username:    laravel_service                                │
│ Email:       laravel.service@sistema.gob.ar                 │
│ Rol:         administrador                                  │
│ Password:    abc123xyz789...                                │
└─────────────────────────────────────────────────────────────┘
```

⚠️ **¡IMPORTANTE!** Guarda estas credenciales de forma segura.

---

## 🚀 Implementación en Laravel

### Paso 1: Configurar `.env` de Laravel

```env
EXPEDIENTE_API_URL=http://localhost:4000
EXPEDIENTE_API_USERNAME=laravel_service
EXPEDIENTE_API_PASSWORD=tu_password_generado
EXPEDIENTE_API_TIMEOUT=30
```

### Paso 2: Configurar `config/services.php`

```php
<?php
// config/services.php

return [
    // ... otras configuraciones

    'expediente' => [
        'url' => env('EXPEDIENTE_API_URL', 'http://localhost:4000'),
        'username' => env('EXPEDIENTE_API_USERNAME'),
        'password' => env('EXPEDIENTE_API_PASSWORD'),
        'timeout' => env('EXPEDIENTE_API_TIMEOUT', 30),
    ],
];
```

### Paso 3: Crear Service Provider

Crear archivo `app/Services/ExpedienteDigitalService.php`:

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use App\Exceptions\ExpedienteApiException;

class ExpedienteDigitalService
{
    protected string $apiUrl;
    protected string $username;
    protected string $password;
    protected int $timeout;

    public function __construct()
    {
        $this->apiUrl = config('services.expediente.url');
        $this->username = config('services.expediente.username');
        $this->password = config('services.expediente.password');
        $this->timeout = config('services.expediente.timeout', 30);
    }

    /**
     * Obtener token JWT (con caché de 23 horas)
     */
    public function getToken(): string
    {
        return Cache::remember('expediente_api_token', now()->addHours(23), function () {
            try {
                $response = Http::timeout($this->timeout)
                    ->post("{$this->apiUrl}/api/login", [
                        'username' => $this->username,
                        'password' => $this->password,
                    ]);

                if ($response->failed()) {
                    Log::error('Error autenticando con API Expediente', [
                        'status' => $response->status(),
                        'body' => $response->body()
                    ]);
                    throw new ExpedienteApiException('Error de autenticación con API de firma digital');
                }

                $data = $response->json();
                return $data['token'];

            } catch (\Exception $e) {
                Log::error('Excepción al obtener token de Expediente API', [
                    'error' => $e->getMessage()
                ]);
                throw new ExpedienteApiException('No se pudo conectar con la API de firma digital');
            }
        });
    }

    /**
     * Verificar conectividad con la API
     */
    public function healthCheck(): bool
    {
        try {
            $token = $this->getToken();
            $response = Http::timeout($this->timeout)
                ->withToken($token)
                ->get("{$this->apiUrl}/api/laravel/health");

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Health check fallido', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Firmar documento
     *
     * @param array $laravelUser Datos del usuario de Laravel: ['id', 'email', 'name']
     * @param array $documentData Datos del documento: ['nombre', 'hash', 'tipo', 'tamaño']
     * @param array $signatureData Datos de la firma: ['firma_digital', 'certificado_id']
     * @param array $metadata Metadata opcional
     * @return array Respuesta de la API
     */
    public function firmarDocumento(
        array $laravelUser,
        array $documentData,
        array $signatureData,
        array $metadata = []
    ): array {
        try {
            $token = $this->getToken();

            $response = Http::timeout($this->timeout)
                ->withToken($token)
                ->post("{$this->apiUrl}/api/laravel/signatures/sign", [
                    'laravelUser' => $laravelUser,
                    'documentData' => $documentData,
                    'signatureData' => $signatureData,
                    'metadata' => $metadata,
                ]);

            if ($response->failed()) {
                Log::error('Error firmando documento', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'user' => $laravelUser['email']
                ]);

                throw new ExpedienteApiException(
                    'Error al firmar documento: ' . ($response->json()['error'] ?? 'Error desconocido')
                );
            }

            $result = $response->json();

            Log::info('Documento firmado exitosamente', [
                'signature_id' => $result['signature']['id'] ?? null,
                'laravel_user' => $laravelUser['email']
            ]);

            return $result;

        } catch (ExpedienteApiException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Excepción al firmar documento', [
                'error' => $e->getMessage(),
                'user' => $laravelUser['email'] ?? 'unknown'
            ]);
            throw new ExpedienteApiException('Error inesperado al firmar documento');
        }
    }

    /**
     * Obtener firmas de un usuario de Laravel
     */
    public function obtenerFirmasUsuario(int $laravelUserId, array $filters = []): array
    {
        try {
            $token = $this->getToken();

            $queryParams = http_build_query($filters);
            $url = "{$this->apiUrl}/api/laravel/signatures/user/{$laravelUserId}";

            if ($queryParams) {
                $url .= "?{$queryParams}";
            }

            $response = Http::timeout($this->timeout)
                ->withToken($token)
                ->get($url);

            if ($response->failed()) {
                throw new ExpedienteApiException('Error al obtener firmas del usuario');
            }

            return $response->json();

        } catch (\Exception $e) {
            Log::error('Error obteniendo firmas', [
                'laravel_user_id' => $laravelUserId,
                'error' => $e->getMessage()
            ]);
            throw new ExpedienteApiException('Error al obtener historial de firmas');
        }
    }

    /**
     * Verificar una firma específica
     */
    public function verificarFirma(int $signatureId): array
    {
        try {
            $token = $this->getToken();

            $response = Http::timeout($this->timeout)
                ->withToken($token)
                ->get("{$this->apiUrl}/api/laravel/signatures/{$signatureId}/verify");

            if ($response->failed()) {
                throw new ExpedienteApiException('Error al verificar firma');
            }

            return $response->json();

        } catch (\Exception $e) {
            Log::error('Error verificando firma', [
                'signature_id' => $signatureId,
                'error' => $e->getMessage()
            ]);
            throw new ExpedienteApiException('Error al verificar firma');
        }
    }

    /**
     * Obtener estadísticas de un usuario
     */
    public function obtenerEstadisticas(int $laravelUserId): array
    {
        try {
            $token = $this->getToken();

            $response = Http::timeout($this->timeout)
                ->withToken($token)
                ->get("{$this->apiUrl}/api/laravel/users/{$laravelUserId}/stats");

            if ($response->failed()) {
                throw new ExpedienteApiException('Error al obtener estadísticas');
            }

            return $response->json();

        } catch (\Exception $e) {
            Log::error('Error obteniendo estadísticas', [
                'laravel_user_id' => $laravelUserId,
                'error' => $e->getMessage()
            ]);
            throw new ExpedienteApiException('Error al obtener estadísticas');
        }
    }
}
```

### Paso 4: Crear Excepción Personalizada

Crear archivo `app/Exceptions/ExpedienteApiException.php`:

```php
<?php

namespace App\Exceptions;

use Exception;

class ExpedienteApiException extends Exception
{
    public function render($request)
    {
        return response()->json([
            'error' => 'Error en API de Firma Digital',
            'message' => $this->getMessage()
        ], 500);
    }
}
```

---

## 📡 Endpoints Disponibles

### 1. Health Check
```http
GET /api/laravel/health
Authorization: Bearer {token}
```

### 2. Firmar Documento
```http
POST /api/laravel/signatures/sign
Authorization: Bearer {token}
Content-Type: application/json
```

### 3. Obtener Firmas de Usuario
```http
GET /api/laravel/signatures/user/:laravelUserId
Authorization: Bearer {token}
```

### 4. Verificar Firma
```http
GET /api/laravel/signatures/:signatureId/verify
Authorization: Bearer {token}
```

### 5. Estadísticas de Usuario
```http
GET /api/laravel/users/:laravelUserId/stats
Authorization: Bearer {token}
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Firmar Documento desde Controlador

```php
<?php

namespace App\Http\Controllers;

use App\Services\ExpedienteDigitalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DocumentoController extends Controller
{
    protected ExpedienteDigitalService $expedienteService;

    public function __construct(ExpedienteDigitalService $expedienteService)
    {
        $this->expedienteService = $expedienteService;
    }

    /**
     * Firmar un documento
     */
    public function firmar(Request $request, int $documentoId)
    {
        $request->validate([
            'certificado_id' => 'required|integer',
            'firma_digital' => 'required|string',
        ]);

        // Obtener documento (desde tu base de datos Laravel)
        $documento = Documento::findOrFail($documentoId);

        // Calcular hash del documento
        $filePath = storage_path('app/documentos/' . $documento->archivo);
        $hash = hash_file('sha256', $filePath);

        try {
            // Llamar a la API de firma digital
            $result = $this->expedienteService->firmarDocumento(
                // 👤 Datos del usuario real de Laravel
                laravelUser: [
                    'id' => Auth::id(),
                    'email' => Auth::user()->email,
                    'name' => Auth::user()->name,
                ],
                // 📄 Datos del documento
                documentData: [
                    'nombre' => $documento->nombre,
                    'hash' => $hash,
                    'tipo' => 'oficial',
                    'tamaño' => filesize($filePath),
                ],
                // 🖋️ Datos de la firma
                signatureData: [
                    'firma_digital' => $request->firma_digital,
                    'certificado_id' => $request->certificado_id,
                    'algoritmo' => 'RSA-SHA256',
                ],
                // 📊 Metadata adicional
                metadata: [
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'numero_expediente' => $documento->expediente_numero,
                ]
            );

            // Actualizar tu base de datos Laravel
            $documento->update([
                'firmado' => true,
                'signature_id' => $result['signature']['id'],
                'fecha_firma' => now(),
            ]);

            return response()->json([
                'message' => 'Documento firmado exitosamente',
                'signature' => $result['signature'],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error al firmar documento',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Ver historial de firmas del usuario
     */
    public function misFirmas(Request $request)
    {
        try {
            $result = $this->expedienteService->obtenerFirmasUsuario(
                Auth::id(),
                [
                    'page' => $request->get('page', 1),
                    'limit' => $request->get('limit', 20),
                    'estado' => $request->get('estado'),
                ]
            );

            return response()->json($result);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error al obtener firmas',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Verificar una firma
     */
    public function verificarFirma(int $signatureId)
    {
        try {
            $result = $this->expedienteService->verificarFirma($signatureId);

            return response()->json($result);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error al verificar firma',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
```

### Ejemplo 2: Middleware de Verificación

```php
<?php

namespace App\Http\Middleware;

use App\Services\ExpedienteDigitalService;
use Closure;
use Illuminate\Http\Request;

class EnsureExpedienteApiAvailable
{
    protected ExpedienteDigitalService $service;

    public function __construct(ExpedienteDigitalService $service)
    {
        $this->service = $service;
    }

    public function handle(Request $request, Closure $next)
    {
        if (!$this->service->healthCheck()) {
            return response()->json([
                'error' => 'Servicio de firma digital no disponible',
                'message' => 'Por favor intente más tarde',
            ], 503);
        }

        return $next($request);
    }
}
```

### Ejemplo 3: Command Artisan para Verificar Conexión

```php
<?php

namespace App\Console\Commands;

use App\Services\ExpedienteDigitalService;
use Illuminate\Console\Command;

class TestExpedienteApi extends Command
{
    protected $signature = 'expediente:test';
    protected $description = 'Probar conexión con API de Expediente Digital';

    public function handle(ExpedienteDigitalService $service)
    {
        $this->info('Probando conexión con API de Expediente Digital...');

        try {
            // Test 1: Health check
            $this->info('1. Verificando health check...');
            $health = $service->healthCheck();

            if ($health) {
                $this->info('   ✅ Health check exitoso');
            } else {
                $this->error('   ❌ Health check fallido');
                return 1;
            }

            // Test 2: Obtener estadísticas (usuario ID 1 como ejemplo)
            $this->info('2. Obteniendo estadísticas...');
            $stats = $service->obtenerEstadisticas(1);
            $this->info('   ✅ Estadísticas obtenidas');
            $this->table(
                ['Métrica', 'Valor'],
                [
                    ['Total firmas', $stats['statistics']['total_firmas'] ?? 0],
                    ['Firmas válidas', $stats['statistics']['firmas_validas'] ?? 0],
                ]
            );

            $this->info("\n🎉 Todas las pruebas pasaron correctamente");
            return 0;

        } catch (\Exception $e) {
            $this->error("❌ Error: " . $e->getMessage());
            return 1;
        }
    }
}
```

---

## 🛠️ Manejo de Errores

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `401 Unauthorized` | Token inválido o expirado | Limpiar caché: `Cache::forget('expediente_api_token')` |
| `403 Forbidden` | Usuario no es `laravel_service` | Verificar credenciales en `.env` |
| `404 Not Found` | Certificado no existe | Verificar `certificado_id` |
| `500 Internal Error` | Error en API Node.js | Revisar logs del backend Node.js |
| `503 Service Unavailable` | API no disponible | Verificar que el servidor Node.js esté corriendo |

### Logging

```php
// En Laravel, los logs se guardan en storage/logs/laravel.log
// Buscar errores con:
tail -f storage/logs/laravel.log | grep "ExpedienteApi"
```

---

## 🔒 Seguridad

### Recomendaciones

1. **Usar HTTPS en producción**
   ```env
   EXPEDIENTE_API_URL=https://api-expediente.ejemplo.gob.ar
   ```

2. **Rotar password periódicamente**
   ```bash
   node scripts/create_laravel_service_user.js nuevo_password
   ```

3. **Monitorear uso del token**
   - Implementar rate limiting en Laravel
   - Revisar logs regularmente

4. **Encriptar variables sensibles**
   ```bash
   php artisan env:encrypt
   ```

---

## 📞 Soporte

Para problemas o preguntas:
- Revisar logs de Laravel: `storage/logs/laravel.log`
- Revisar logs de Node.js: `backend/nohup.out`
- Ejecutar health check: `php artisan expediente:test`

---

## 📚 Referencias

- [Documentación API](../api/api-documentation.html)
- [Estructura Base de Datos](ESTRUCTURA_BASE_DATOS.md)
- [Guía Técnica](GUIA_TECNICA.md)
