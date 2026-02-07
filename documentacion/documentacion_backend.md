# Documentación del Backend - Sistema de Expediente Digital

## 1. Introducción

Este documento describe en detalle los endpoints del backend y el modelo de datos implementado en el sistema de Expediente Digital. El sistema permite la gestión completa de expedientes digitales, incluyendo la creación, visualización, firma y seguimiento de documentos.

## 2. Modelo de Datos

### 2.1. Expediente

**Tabla**: `expedientes`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | Identificador único del expediente (PK, autoincremental) |
| numero_expediente | STRING(50) | Número único del expediente (formato: YYYY-######) |
| titulo | STRING(200) | Título descriptivo del expediente |
| descripcion | TEXT | Descripción detallada del expediente |
| estado | ENUM | Estado del expediente: 'borrador', 'en_proceso', 'consolidado', 'cerrado' |
| tipo_expediente | ENUM | Tipo de expediente: 'licitacion', 'contratacion', 'administrativo', 'juridico', 'tecnico', 'otro' |
| prioridad | ENUM | Prioridad del expediente: 'baja', 'normal', 'alta', 'urgente' |
| fecha_creacion | DATE | Fecha de creación del expediente |
| fecha_consolidacion | DATE | Fecha de consolidación del expediente |
| fecha_cierre | DATE | Fecha de cierre del expediente |
| usuario_responsable | INTEGER | ID del usuario responsable del expediente (FK -> usuarios.id) |
| reparticion | STRING(100) | Departamento o repartición a la que pertenece el expediente |
| archivo_consolidado | TEXT | Ruta del PDF consolidado final |
| hash_consolidado | STRING(64) | Hash SHA-256 del expediente consolidado |
| metadatos | JSONB | Información adicional específica del tipo de expediente |
| observaciones | TEXT | Observaciones generales sobre el expediente |
| oficina_actual_id | INTEGER | ID de la oficina donde se encuentra actualmente el expediente (FK -> oficinas.id) |
| estado_workflow | ENUM | Estado en el flujo de trabajo: 'iniciado', 'en_tramite', 'pendiente_revision', 'con_observaciones', 'aprobado', 'rechazado', 'archivado' |

**Índices**:
- Único en `numero_expediente`
- Índices simples en `estado`, `usuario_responsable`, `reparticion`, `fecha_creacion`

### 2.2. ExpedienteDocumento

**Tabla**: `expediente_documentos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | Identificador único del documento (PK, autoincremental) |
| expediente_id | INTEGER | ID del expediente al que pertenece (FK -> expedientes.id) |
| numero_foja | INTEGER | Número de foja dentro del expediente |
| foja_inicial | INTEGER | Foja inicial del documento en el expediente |
| foja_final | INTEGER | Foja final del documento en el expediente |
| cantidad_paginas | INTEGER | Cantidad de páginas del documento PDF |
| documento_nombre | STRING(255) | Nombre del documento |
| documento_tipo | ENUM | Tipo de documento: 'iniciacion', 'informe', 'dictamen', 'resolucion', 'anexo', 'notificacion', 'otro' |
| archivo_path | TEXT | Ruta del archivo original |
| archivo_firmado_path | TEXT | Ruta del archivo firmado |
| hash_documento | STRING(64) | Hash SHA-256 del documento original |
| orden_secuencial | INTEGER | Orden dentro del expediente |
| fecha_agregado | DATE | Fecha en que se agregó el documento |
| usuario_agregado | INTEGER | ID del usuario que agregó el documento (FK -> usuarios.id) |
| estado_firma | ENUM | Estado de la firma: 'pendiente', 'firmado', 'rechazado' |
| fecha_firma | DATE | Fecha en que se firmó el documento |
| hash_firma | STRING(512) | Hash de la firma digital del documento |
| usuario_firmante | INTEGER | ID del usuario que firmó el documento (FK -> usuarios.id) |
| signature_id | INTEGER | Referencia a la tabla signatures (FK -> signatures.id) |
| requiere_firma | BOOLEAN | Indica si el documento requiere firma |
| visible_publico | BOOLEAN | Indica si el documento es visible al público |
| metadatos | JSONB | Información adicional del documento |
| observaciones | TEXT | Observaciones sobre el documento |
| oficina_agregado_id | INTEGER | ID de la oficina que agregó este documento (FK -> oficinas.id) |
| usuario_agregado_workflow | STRING | Usuario que agregó el documento en el workflow |

**Índices**:
- Único en `[expediente_id, numero_foja]`
- Índices simples en `[expediente_id, orden_secuencial]`, `estado_firma`, `documento_tipo`, `signature_id`

### 2.3. Oficina

**Tabla**: `oficinas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | Identificador único de la oficina (PK, autoincremental) |
| nombre | STRING | Nombre de la oficina |
| descripcion | TEXT | Descripción de la oficina |
| codigo | STRING(10) | Código único de la oficina |
| responsable | STRING | Nombre del responsable de la oficina |
| email | STRING | Email de contacto de la oficina |
| telefono | STRING | Teléfono de contacto de la oficina |
| activa | BOOLEAN | Indica si la oficina está activa |

**Relaciones**:
- Una oficina puede tener muchos expedientes actualmente (`expedientes.oficina_actual_id`)
- Una oficina puede ser origen/destino de muchos movimientos de workflow (`workflow_movimientos.oficina_origen_id`, `workflow_movimientos.oficina_destino_id`)
- Una oficina puede agregar muchos documentos (`expediente_documentos.oficina_agregado_id`)

### 2.4. Usuario

**Tabla**: `usuarios`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | Identificador único del usuario (PK, autoincremental) |
| username | STRING(100) | Nombre de usuario, único |
| nombre_completo | STRING(200) | Nombre completo del usuario |
| email | STRING | Email del usuario, único |
| rol_usuario | ENUM | Rol del usuario: 'empleado_interno', 'funcionario_oficial', 'administrador' |
| certificado_preferido | ENUM | Certificado sugerido automáticamente: 'internal', 'government' |
| password_hash | STRING(255) | Hash de la contraseña del usuario |
| oficina_id | INTEGER | ID de la oficina a la que pertenece el usuario (FK -> oficinas.id) |

### 2.5. Otras Tablas

- **Certificado**: Almacena los certificados digitales disponibles para firmar documentos.
- **Signature**: Almacena información detallada sobre firmas digitales realizadas.
- **FirmaHistorial**: Registra el historial de firmas de documentos.
- **UsuarioFirma**: Almacena las imágenes de firmas visuales de los usuarios.
- **WorkflowMovimiento**: Registra los movimientos de expedientes entre oficinas.

## 3. Endpoints de la API

### 3.1. Endpoints de Expedientes

#### 3.1.1. Crear Expediente

- **URL**: `/expedientes`
- **Método**: `POST`
- **Autenticación**: Requiere JWT token
- **Descripción**: Crea un nuevo expediente
- **Parámetros de Request**:
  - `titulo` (string, requerido): Título del expediente
  - `descripcion` (string): Descripción del expediente
  - `reparticion` (string): Repartición del expediente
  - `estado` (string, default 'borrador'): Estado inicial del expediente
  - `prioridad` (string, default 'normal'): Prioridad del expediente
  - `metadatos` (objeto): Metadatos adicionales del expediente
- **Respuesta**: Objeto con los detalles del expediente creado

#### 3.1.2. Obtener Expedientes

- **URL**: `/expedientes`
- **Método**: `GET`
- **Autenticación**: Requiere JWT token y verificación de acceso de administrador
- **Descripción**: Lista expedientes según filtros y paginación
- **Parámetros de Query**:
  - `estado` (string, opcional): Filtrar por estado
  - `prioridad` (string, opcional): Filtrar por prioridad
  - `page` (number, default 1): Página actual
  - `limit` (number, default 10): Cantidad de resultados por página
- **Respuesta**: Lista paginada de expedientes con documentos asociados

#### 3.1.3. Obtener Detalles de Firmas

- **URL**: `/expedientes/:id/firmas`
- **Método**: `GET`
- **Autenticación**: Requiere JWT token
- **Descripción**: Obtiene detalles completos del expediente con firmas
- **Parámetros de Path**:
  - `id` (number): ID del expediente
- **Respuesta**: Expediente con detalles de firmas en sus documentos

#### 3.1.4. Verificar Firma Digital

- **URL**: `/expedientes/:id/documentos/:docId/verificar-firma`
- **Método**: `GET`
- **Autenticación**: Requiere JWT token
- **Descripción**: Verifica la firma digital de un documento
- **Parámetros de Path**:
  - `id` (number): ID del expediente
  - `docId` (number): ID del documento
- **Respuesta**: Información detallada sobre la verificación de la firma

#### 3.1.5. Servir Archivo de Documento

- **URL**: `/expedientes/:id/documentos/:docId/archivo`
- **Método**: `GET`
- **Autenticación**: Requiere JWT token
- **Descripción**: Sirve el archivo de un documento para visualización/descarga
- **Parámetros de Path**:
  - `id` (number): ID del expediente
  - `docId` (number): ID del documento
- **Respuesta**: Archivo del documento (PDF, imagen, etc.)

#### 3.1.6. Obtener Expediente Específico

- **URL**: `/expedientes/:id`
- **Método**: `GET`
- **Autenticación**: Requiere JWT token y verificación de acceso al expediente
- **Descripción**: Obtiene detalles completos de un expediente específico
- **Parámetros de Path**:
  - `id` (number): ID del expediente
- **Respuesta**: Objeto con detalles completos del expediente y sus documentos

#### 3.1.7. Agregar Documento

- **URL**: `/expedientes/:id/documentos`
- **Método**: `POST`
- **Autenticación**: Requiere JWT token
- **Descripción**: Agrega un nuevo documento al expediente
- **Parámetros de Path**:
  - `id` (number): ID del expediente
- **Parámetros de Form**:
  - `documento_nombre` (string, requerido): Nombre del documento
  - `documento_tipo` (string): Tipo de documento
  - `archivo` (file, requerido): Archivo a subir (PDF, DOC, DOCX, PNG, JPG, JPEG)
- **Respuesta**: Detalles del documento agregado

#### 3.1.8. Actualizar Estado del Expediente

- **URL**: `/expedientes/:id/estado`
- **Método**: `PATCH`
- **Autenticación**: Requiere JWT token
- **Descripción**: Actualiza el estado de un expediente
- **Parámetros de Path**:
  - `id` (number): ID del expediente
- **Parámetros de Body**:
  - `estado` (string, requerido): Nuevo estado del expediente
  - `oficina_destino_id` (number, opcional): ID de la oficina destino
- **Respuesta**: Expediente actualizado

#### 3.1.9. Eliminar Documento

- **URL**: `/expedientes/:id/documentos/:docId`
- **Método**: `DELETE`
- **Autenticación**: Requiere JWT token
- **Descripción**: Elimina un documento del expediente
- **Parámetros de Path**:
  - `id` (number): ID del expediente
  - `docId` (number): ID del documento
- **Restricciones**: No se pueden eliminar documentos firmados o de expedientes cerrados
- **Respuesta**: Confirmación de eliminación

#### 3.1.10. Firmar Documento

- **URL**: `/expedientes/:id/documentos/:docId/firmar`
- **Método**: `POST`
- **Autenticación**: Requiere JWT token
- **Descripción**: Firma un documento del expediente
- **Parámetros de Path**:
  - `id` (number): ID del expediente
  - `docId` (number): ID del documento
- **Parámetros de Body**:
  - Para firma interna o certificado:
    - `metodo` (string): 'interno' o 'certificado'
    - `certificado_id` (number, opcional): ID del certificado si el método es 'certificado'
  - Para firma con token:
    - `metodo` (string): 'token'
    - `firmaDigital` (string): Hash de la firma digital
    - `certificado` (objeto): Información del certificado (emisor, titular)
    - `algoritmo` (string): Algoritmo usado para la firma
    - `timestampFirma` (string): Timestamp de la firma
- **Respuesta**: Documento firmado con detalles de la firma

#### 3.1.11. Enviar Expediente

- **URL**: `/expedientes/:id/enviar`
- **Método**: `POST`
- **Autenticación**: Requiere JWT token
- **Descripción**: Envía un expediente a otra oficina
- **Parámetros de Path**:
  - `id` (number): ID del expediente
- **Parámetros de Body**:
  - `oficina_destino_id` (number, requerido): ID de la oficina destino
  - `comentario` (string, opcional): Comentario sobre el envío
- **Restricciones**: Todos los documentos deben estar firmados
- **Respuesta**: Confirmación del envío

#### 3.1.12. Obtener Previsualización del Expediente

- **URL**: `/expedientes/:id/preview`
- **Método**: `GET`
- **Autenticación**: Requiere JWT token
- **Descripción**: Obtiene una previsualización completa del expediente
- **Parámetros de Path**:
  - `id` (number): ID del expediente
- **Parámetros de Query**:
  - `page` (number, default 1): Página actual
  - `limit` (number, default 5): Cantidad de documentos por página
  - `includeContent` (string, default 'true'): Incluir contenido en base64
- **Respuesta**: Previsualización del expediente con documentos paginados

#### 3.1.13. Generar y Servir PDF Unificado

- **URL**: `/expedientes/:id/merged-pdf`
- **Método**: `GET`
- **Autenticación**: Requiere JWT token
- **Descripción**: Genera y sirve un PDF unificado con todos los documentos del expediente
- **Parámetros de Path**:
  - `id` (number): ID del expediente
- **Respuesta**: Archivo PDF unificado con todos los documentos del expediente

### 3.2. Endpoints de Autenticación

#### 3.2.1. Login de Usuario

- **URL**: `/login`
- **Método**: `POST`
- **Descripción**: Autentica un usuario y devuelve un token JWT
- **Parámetros de Body**:
  - `username` (string, requerido): Nombre de usuario
  - `password` (string, requerido): Contraseña
- **Respuesta**: Token JWT y datos del usuario autenticado

### 3.3. Endpoints de Usuarios

#### 3.3.1. Obtener Usuario

- **URL**: `/usuarios/:id`
- **Método**: `GET`
- **Autenticación**: Requiere JWT token
- **Descripción**: Obtiene información detallada de un usuario
- **Parámetros de Path**:
  - `id` (number): ID del usuario
- **Respuesta**: Datos del usuario

### 3.4. Endpoints de Oficinas

#### 3.4.1. Obtener Oficinas

- **URL**: `/oficinas`
- **Método**: `GET`
- **Autenticación**: Requiere JWT token
- **Descripción**: Lista todas las oficinas disponibles
- **Respuesta**: Lista de oficinas

## 4. Flujos de Trabajo Principales

### 4.1. Flujo de Creación y Firma de Expediente

1. **Crear Expediente**: 
   - POST `/expedientes` con datos básicos del expediente
   - Se genera un número de expediente único en formato YYYY-######

2. **Agregar Documentos**:
   - POST `/expedientes/:id/documentos` para cada documento
   - Se valida tipo de archivo y se calcula hash
   - Se asignan fojas automáticamente

3. **Firmar Documentos**:
   - POST `/expedientes/:id/documentos/:docId/firmar` 
   - Se soportan tres métodos de firma: interno, certificado y token
   - Para documentos PDF, se genera un archivo con firma visual incrustada

4. **Enviar Expediente**:
   - POST `/expedientes/:id/enviar` para transferir a otra oficina
   - Se verifica que todos los documentos estén firmados
   - Se registra el movimiento en el historial

### 4.2. Flujo de Acceso a Expedientes

1. El usuario se autentica y obtiene un token JWT
2. El token incluye información del usuario y su oficina
3. Al solicitar un expediente, se verifica:
   - Si el usuario es el responsable del expediente
   - Si el expediente está en la oficina del usuario
   - Si el usuario tiene rol de administrador
4. Existen excepciones para acceso a expedientes específicos (como el expediente 9)

## 5. Características Especiales

### 5.1. Merged PDF Endpoint

- Permite generar un PDF unificado con todos los documentos del expediente
- Prioriza archivos firmados sobre originales cuando están disponibles
- Mantiene el orden secuencial de los documentos
- Incluye firmas visuales y digitales en el PDF resultante
- Accesible mediante GET `/expedientes/:id/merged-pdf`

### 5.2. Verificación de Firmas

- Permite verificar la integridad y validez de firmas digitales
- Muestra información detallada sobre el firmante
- Verifica firmas criptográficas en documentos PDF
- Accesible mediante GET `/expedientes/:id/documentos/:docId/verificar-firma`

### 5.3. Control de Acceso por Oficina

- Sistema de permisos basado en la pertenencia a oficinas
- Un expediente solo es accesible por usuarios de la oficina actual
- Flujo de envío entre oficinas para transferir la responsabilidad
- Verificación de acceso en cada endpoint que accede a un expediente

## 6. Seguridad

### 6.1. Autenticación

#### 6.1.1. JSON Web Tokens (JWT)

Los JWT (JSON Web Tokens) son el mecanismo central de autenticación del sistema. Un JWT es un estándar abierto (RFC 7519) que define una forma compacta y autónoma para transmitir información de manera segura entre partes como un objeto JSON.

**Estructura del Token**:
- **Header**: Contiene el tipo de token (JWT) y el algoritmo de firma (típicamente HS256).
  ```json
  {
    "alg": "HS256",
    "typ": "JWT"
  }
  ```

- **Payload**: Contiene las afirmaciones (claims) sobre el usuario y datos adicionales:
  ```json
  {
    "id": 123,                      // ID del usuario
    "username": "jperez",           // Nombre de usuario
    "rol_usuario": "funcionario_oficial", // Rol del usuario
    "oficina_id": 5,                // ID de la oficina a la que pertenece
    "email": "jperez@gob.ar",       // Email del usuario
    "iat": 1602434269,              // Issued At: Timestamp de emisión
    "exp": 1602520669               // Expiration: Timestamp de expiración
  }
  ```

- **Firma**: Asegura que el token no ha sido alterado:
  ```
  HMACSHA256(
    base64UrlEncode(header) + "." +
    base64UrlEncode(payload),
    SECRET_KEY
  )
  ```

**Ciclo de Vida del Token**:
1. **Generación**: Se crea durante el login exitoso usando `jwt.sign()` con una clave secreta.
2. **Almacenamiento**: El cliente almacena el token (típicamente en localStorage o cookies).
3. **Uso**: El cliente incluye el token en cada solicitud protegida en el header `Authorization: Bearer [token]`.
4. **Verificación**: El middleware `authenticateToken` verifica la integridad y validez del token.
5. **Expiración**: Los tokens tienen una duración limitada (default: 24 horas) por seguridad.

**Implementación**:
```javascript
// Generación en el login
const token = jwt.sign(
  { 
    id: usuario.id,
    username: usuario.username,
    rol_usuario: usuario.rol_usuario,
    oficina_id: usuario.oficina_id,
    email: usuario.email
  }, 
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Verificación en middleware authenticateToken
const token = req.header('Authorization')?.split(' ')[1];
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded; // Hace disponible la información del usuario en el objeto request
```

#### 6.1.2. Middleware de Autenticación

El middleware `authenticateToken` está implementado para:
- Extraer el token JWT del header Authorization
- Verificar la firma usando la clave secreta
- Comprobar que no está expirado
- Adjuntar la información del usuario decodificada a `req.user`
- Rechazar acceso si el token es inválido o ha expirado

### 6.2. Autorización

- Middleware `verificarAccesoExpediente` para control de acceso por oficina
- Middleware `verificarAccesoAdministrador` para endpoints exclusivos de administradores
- Verificación explícita de permisos en operaciones sensibles

### 6.3. Seguridad de Archivos

- Validación de tipos de archivos permitidos
- Generación de nombres de archivo únicos
- Cálculo de hash SHA-256 para verificar integridad
- Rutas de archivo no predecibles

## 7. Consideraciones para Desarrollo

### 7.1. Manejo de Errores

- Todos los endpoints están encapsulados en bloques try-catch
- Mensajes de error descriptivos con detalles cuando es seguro
- Logging detallado para debugging

### 7.2. Seguridad de JWT

#### 7.2.1. Buenas Prácticas Implementadas

- **Clave Secreta Robusta**: Se utiliza una clave secreta compleja y larga almacenada en variables de entorno.
- **Firma HMAC-SHA256**: Algoritmo de firma seguro y eficiente.
- **Expiración de Tokens**: Todos los tokens tienen una duración limitada para minimizar el riesgo de uso indebido.
- **Payload Mínimo**: Solo se incluye información esencial del usuario en el token.
- **Tokens de Uso Único**: No se guardan en base de datos, cada autenticación genera un nuevo token.

#### 7.2.2. Manejo de Errores de JWT

El sistema está preparado para manejar varios tipos de errores relacionados con JWT:

```javascript
jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
  if (err) {
    switch(err.name) {
      case 'TokenExpiredError':
        return res.status(401).json({ error: 'Token expirado, inicie sesión nuevamente' });
      case 'JsonWebTokenError':
        return res.status(403).json({ error: 'Token inválido' });
      default:
        return res.status(403).json({ error: 'Error de autenticación' });
    }
  }
  req.user = user;
  next();
});
```

#### 7.2.3. Renovación de Tokens

Para mantener la sesión del usuario sin requerir login frecuente, el sistema utiliza estrategias de renovación de tokens:

- **Token de Actualización**: Cuando el token está próximo a expirar pero la sesión sigue activa.
- **Silent Refresh**: Actualización automática en segundo plano sin interrumpir al usuario.

### 7.3. Optimización

- Paginación implementada en endpoints que devuelven listas
- Carga selectiva de relaciones en consultas a la base de datos
- Uso de índices en columnas frecuentemente consultadas

### 7.4. Extensibilidad

- Diseño modular con separación clara de responsabilidades
- Uso de metadatos JSON para campos específicos de dominio
- Constantes y enumeraciones para tipos de datos restringidos

## 8. Guía de Uso con Herramientas de API

### 8.1. Ejemplos con Postman

A continuación se presenta una guía paso a paso para interactuar con la API del sistema utilizando Postman u otras herramientas similares.

#### 8.1.1. Autenticación

**1. Configurar la solicitud de login:**

- **Método**: POST
- **URL**: `http://localhost:3001/api/login`
- **Headers**: 
  - Content-Type: application/json
- **Body** (raw JSON):
  ```json
  {
    "username": "jperez",
    "password": "contraseña123"
  }
  ```

**2. Obtener y guardar el token JWT:**

Tras realizar la solicitud, se recibirá una respuesta similar a:

```json
{
  "usuario": {
    "id": 123,
    "username": "jperez",
    "nombre_completo": "Juan Pérez",
    "rol_usuario": "funcionario_oficial",
    "oficina_id": 5
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzLCJ1c2VybmFtZSI6ImpwZXJleiIsInJvbF91c3VhcmlvIjoiZnVuY2lvbmFyaW9fb2ZpY2lhbCIsIm9maWNpbmFfaWQiOjUsImlhdCI6MTYwMjQzNDI2OSwiZXhwIjoxNjAyNTIwNjY5fQ.SomeSignatureHash"
}
```

**3. Guardar el token en una variable:**

En Postman:
1. Crear una colección para el proyecto
2. Seleccionar la pestaña "Tests"
3. Añadir este script para guardar el token automáticamente:
   ```javascript
   var jsonData = pm.response.json();
   pm.environment.set("authToken", jsonData.token);
   ```

#### 8.1.2. Usar el Token para Endpoints Protegidos

**1. Configurar una solicitud a un endpoint protegido:**

- **Método**: GET
- **URL**: `http://localhost:3001/api/expedientes/5`
- **Headers**: 
  - Authorization: Bearer {{authToken}}

**2. Ejemplo de solicitud para crear un expediente:**

- **Método**: POST
- **URL**: `http://localhost:3001/api/expedientes`
- **Headers**: 
  - Content-Type: application/json
  - Authorization: Bearer {{authToken}}
- **Body** (raw JSON):
  ```json
  {
    "titulo": "Licitación Pública 2025/01",
    "descripcion": "Licitación para la adquisición de equipamiento informático",
    "tipo_expediente": "licitacion",
    "prioridad": "alta",
    "reparticion": "Dirección de Compras"
  }
  ```

**3. Ejemplo de solicitud para subir un documento:**

- **Método**: POST
- **URL**: `http://localhost:3001/api/expedientes/5/documentos`
- **Headers**: 
  - Authorization: Bearer {{authToken}}
- **Body** (form-data):
  - documento_nombre: "Pliego de condiciones"
  - documento_tipo: "anexo"
  - archivo: [seleccionar archivo PDF]

#### 8.1.3. Manejo de Respuestas de Error

Si el token es inválido o ha expirado, recibirás respuestas como:

```json
{
  "error": "Token expirado, inicie sesión nuevamente"
}
```

o

```json
{
  "error": "Token inválido"
}
```

En estos casos, debes volver a autenticarte para obtener un nuevo token.

### 8.2. Curl Examples

Para quienes prefieran usar herramientas de línea de comandos como curl:

**1. Login y obtención del token:**

```bash
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "jperez", "password": "contraseña123"}'
```

**2. Guardar el token en una variable:**

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "jperez", "password": "contraseña123"}' | jq -r '.token')
```

**3. Usar el token para acceder a endpoints protegidos:**

```bash
curl -X GET http://localhost:3001/api/expedientes \
  -H "Authorization: Bearer $TOKEN"
```

**4. Crear un nuevo expediente:**

```bash
curl -X POST http://localhost:3001/api/expedientes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "titulo": "Licitación Pública 2025/01",
    "descripcion": "Licitación para la adquisición de equipamiento informático",
    "tipo_expediente": "licitacion",
    "prioridad": "alta",
    "reparticion": "Dirección de Compras"
  }'
```

**5. Subir un documento:**

```bash
curl -X POST http://localhost:3001/api/expedientes/5/documentos \
  -H "Authorization: Bearer $TOKEN" \
  -F "documento_nombre=Pliego de condiciones" \
  -F "documento_tipo=anexo" \
  -F "archivo=@/path/to/your/file.pdf"
```

**6. Obtener PDF unificado:**

```bash
curl -X GET http://localhost:3001/api/expedientes/5/merged-pdf \
  -H "Authorization: Bearer $TOKEN" \
  --output expediente_unificado.pdf
```

### 8.3. Recomendaciones de Seguridad

1. **No almacenar tokens en código**: Nunca incluir tokens JWT directamente en el código fuente o archivos de configuración.
   
2. **Verificar HTTPS**: En producción, asegurar que todas las comunicaciones sean a través de HTTPS para proteger el token en tránsito.

3. **Validar entradas**: Siempre validar las entradas antes de enviarlas a la API para evitar ataques de inyección.

4. **Gestionar la expiración**: Implementar la lógica para manejar la expiración del token y renovarlo cuando sea necesario.

5. **Revocar tokens**: En caso de detectar actividad sospechosa, implementar un mecanismo para revocar tokens específicos.