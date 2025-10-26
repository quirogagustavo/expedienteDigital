# 📊 Estructura de la Base de Datos - Sistema de Firma Digital

> **Base de Datos:** `expediente_digital`  
> **Motor:** PostgreSQL  
> **Última actualización:** Octubre 2025

---

## 📋 Índice

1. [Diagrama de Relaciones](#diagrama-de-relaciones)
2. [Tablas Principales](#tablas-principales)
   - [usuarios](#1-usuarios)
   - [certificados](#2-certificados)
   - [signatures](#3-signatures)
   - [expedientes](#4-expedientes)
   - [expediente_documentos](#5-expediente_documentos)
3. [Tablas de Gestión de Firmas Visuales](#tablas-de-gestión-de-firmas-visuales)
   - [usuarios_firmas](#6-usuarios_firmas)
   - [firmas_historial](#7-firmas_historial)
4. [Tablas de Workflow](#tablas-de-workflow)
   - [oficinas](#8-oficinas)
   - [expediente_workflow](#9-expediente_workflow)
   - [workflow_movimientos](#10-workflow_movimientos)
5. [Tablas de Sistema de CA Híbrida](#tablas-de-sistema-de-ca-híbrida)
   - [certificate_types](#11-certificate_types)
   - [certificate_authorities](#12-certificate_authorities)
6. [Relaciones Entre Tablas](#relaciones-entre-tablas)
7. [Índices y Constraints](#índices-y-constraints)
8. [Tipos de Datos Especiales (ENUM)](#tipos-de-datos-especiales-enum)

---

## 🔗 Diagrama de Relaciones

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  usuarios   │────────→│   certificados   │────────→│   signatures    │
└─────────────┘         └──────────────────┘         └─────────────────┘
      │                          │                            │
      │                          │                            │
      ↓                          ↓                            ↓
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  oficinas   │         │certificate_types │         │  expedientes    │
└─────────────┘         └──────────────────┘         └─────────────────┘
      │                          │                            │
      │                          ↓                            ↓
      │                  ┌──────────────────┐         ┌─────────────────┐
      │                  │certificate_auth. │         │expediente_docs  │
      │                  └──────────────────┘         └─────────────────┘
      │                                                       │
      ↓                                                       ↓
┌─────────────────┐                              ┌─────────────────────┐
│expediente_wf    │                              │ usuarios_firmas     │
└─────────────────┘                              └─────────────────────┘
      │                                                       │
      ↓                                                       ↓
┌─────────────────┐                              ┌─────────────────────┐
│workflow_movim.  │                              │ firmas_historial    │
└─────────────────┘                              └─────────────────────┘
```

---

## 📚 Tablas Principales

### 1. **usuarios**

**Propósito:** Almacena la información de todos los usuarios del sistema que pueden firmar documentos, gestionar expedientes y acceder a diferentes funcionalidades según su rol.

#### Estructura de Campos:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Identificador único del usuario |
| `username` | VARCHAR(100) | UNIQUE, NOT NULL | Nombre de usuario para login |
| `nombre_completo` | VARCHAR(200) | NULL | Nombre completo del usuario |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Correo electrónico del usuario |
| `rol_usuario` | ENUM | NOT NULL | Rol del usuario: 'empleado_interno', 'funcionario_oficial', 'administrador' |
| `certificado_preferido` | ENUM | NULL | Tipo de certificado sugerido: 'internal', 'government' |
| `password_hash` | VARCHAR(255) | NOT NULL | Contraseña encriptada con bcrypt |
| `oficina_id` | INTEGER | NULL, FK → oficinas(id) | Oficina a la que pertenece el usuario |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Fecha de creación del registro |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Fecha de última actualización |

#### Relaciones:
- **Tiene muchos:** certificados, signatures, usuarios_firmas, expedientes
- **Pertenece a:** oficinas

#### Datos que se almacenan:
- Credenciales de acceso (username, email, password)
- Información personal del usuario
- Rol y permisos (define qué tipo de certificados puede usar)
- Preferencias de certificado según su rol
- Asociación con una oficina para control de acceso

---

### 2. **certificados**

**Propósito:** Almacena los certificados digitales (tanto internos como gubernamentales) que se utilizan para firmar documentos. Cada certificado contiene las claves criptográficas necesarias para la firma digital.

#### Estructura de Campos:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Identificador único del certificado |
| `usuario_id` | INTEGER | NOT NULL, FK → usuarios(id) | Usuario propietario del certificado |
| `nombre_certificado` | VARCHAR(200) | NULL | Nombre descriptivo del certificado |
| `certificado_pem` | TEXT | NOT NULL | Certificado en formato PEM (X.509) |
| `clave_privada_pem` | TEXT | NULL | Clave privada en formato PEM (NULL para certificados externos) |
| `clave_publica_pem` | TEXT | NULL | Clave pública en formato PEM |
| `fecha_emision` | DATE | NULL | Fecha de emisión del certificado |
| `fecha_expiracion` | DATE | NULL | Fecha de expiración del certificado |
| `activo` | BOOLEAN | DEFAULT true | Si el certificado está activo |
| `tipo` | ENUM | DEFAULT 'internal' | Tipo: 'internal', 'government' |
| `status` | ENUM | DEFAULT 'active' | Estado: 'pending', 'active', 'expired', 'revoked', 'rejected' |
| `numero_serie` | VARCHAR(255) | NULL | Número de serie del certificado |
| `serial_number` | VARCHAR(255) | NULL | Serial number adicional |
| `emisor` | VARCHAR(255) | NULL | Entidad emisora del certificado |
| `issuer_dn` | TEXT | NULL | Distinguished Name del emisor |
| `subject_dn` | TEXT | NULL | Distinguished Name del sujeto |
| `validation_data` | JSON | NULL | Datos de validación de identidad |
| `certificate_type_id` | INTEGER | NOT NULL, FK → certificate_types(id) | Tipo de certificado |
| `certificate_authority_id` | INTEGER | NOT NULL, FK → certificate_authorities(id) | Autoridad certificadora |
| `external_certificate_id` | VARCHAR(255) | NULL | ID del certificado en CA externa |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Fecha de actualización |

#### Relaciones:
- **Pertenece a:** usuarios, certificate_types, certificate_authorities
- **Tiene muchos:** signatures

#### Datos que se almacenan:
- **Certificados digitales** en formato PEM (estándar X.509)
- **Claves criptográficas:** privada y pública para firma RSA
- **Metadata del certificado:** emisor, número de serie, fechas de validez
- **Estado del certificado:** activo, expirado, revocado
- **Tipo de certificado:** interno (corporativo) o gubernamental
- **Datos de validación:** información de verificación de identidad (JSON)
- **Relación con CA:** qué autoridad certificadora lo emitió

---

### 3. **signatures**

**Propósito:** Registra cada firma digital realizada en el sistema. Almacena la firma criptográfica del documento, metadatos de auditoría, información legal y validaciones de seguridad.

#### Estructura de Campos:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Identificador único de la firma |
| `usuario_id` | INTEGER | NOT NULL, FK → usuarios(id) | Usuario que realizó la firma |
| `certificado_id` | INTEGER | NOT NULL, FK → certificados(id) | Certificado usado para firmar |
| **📄 INFORMACIÓN DEL DOCUMENTO** |
| `nombre_documento` | VARCHAR(255) | NOT NULL | Nombre descriptivo del documento |
| `nombre_archivo_original` | VARCHAR(255) | NOT NULL | Nombre original del archivo |
| `tipo_documento` | ENUM | NOT NULL | Tipo: 'oficial', 'no_oficial' |
| `hash_documento` | VARCHAR(64) | NOT NULL | SHA256 hash del documento original |
| `tamaño_archivo` | INTEGER | NOT NULL | Tamaño en bytes |
| **🖋️ DATOS DE LA FIRMA DIGITAL** |
| `firma_digital` | TEXT | NOT NULL | Firma digital en formato hexadecimal |
| `algoritmo_firma` | VARCHAR(50) | DEFAULT 'RSA-SHA256' | Algoritmo usado (RSA-SHA256, RSA-SHA512) |
| `timestamp_firma` | TIMESTAMP | DEFAULT NOW() | Momento exacto de la firma |
| **🔍 ESTADO Y VALIDACIONES** |
| `estado_firma` | ENUM | DEFAULT 'valida' | Estado: 'valida', 'invalida', 'vencida', 'revocada' |
| `verificada` | BOOLEAN | DEFAULT true | Si la firma fue verificada criptográficamente |
| `crl_check_status` | ENUM | DEFAULT 'not_checked' | Verificación CRL: 'valid', 'revoked', 'unknown', 'not_checked' |
| `ocsp_response` | JSON | NULL | Respuesta OCSP del servidor de validación |
| **📊 METADATOS DE SESIÓN** |
| `ip_address` | INET | NULL | IP desde donde se realizó la firma |
| `user_agent` | TEXT | NULL | Navegador/cliente usado |
| `session_id` | VARCHAR(255) | NULL | ID de sesión para auditoría |
| **🏛️ INFORMACIÓN LEGAL** |
| `validez_legal` | ENUM | NOT NULL | Validez: 'COMPLETA', 'INTERNA', 'LIMITADA' |
| `numero_expediente` | VARCHAR(100) | NULL | Número de expediente asociado |
| `batch_id` | VARCHAR(100) | NULL | ID del lote de firma (firmas masivas) |
| **📅 TIMESTAMPS** |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Fecha de actualización |

#### Índices:
- `idx_signatures_usuario` (usuario_id)
- `idx_signatures_fecha` (timestamp_firma)
- `idx_signatures_documento` (hash_documento)
- `idx_signatures_estado` (estado_firma)
- `idx_signatures_expediente` (numero_expediente)
- `idx_signatures_unique_hash_user` UNIQUE (hash_documento, usuario_id, timestamp_firma)

#### Relaciones:
- **Pertenece a:** usuarios, certificados

#### Datos que se almacenan:
- **Firma criptográfica:** resultado de cifrar el hash del documento con la clave privada
- **Hash del documento:** SHA-256 del archivo original para verificar integridad
- **Metadatos del documento:** nombre, tipo, tamaño
- **Información de auditoría:** IP, navegador, sesión, timestamp exacto
- **Validaciones de seguridad:** verificación CRL/OCSP, estado de la firma
- **Datos legales:** validez legal según tipo de certificado, expediente asociado
- **Algoritmo criptográfico:** RSA-SHA256 por defecto

---

### 4. **expedientes**

**Propósito:** Gestiona los expedientes administrativos que agrupan múltiples documentos. Un expediente es un contenedor lógico que representa un trámite o proceso administrativo completo.

#### Estructura de Campos:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Identificador único del expediente |
| `numero_expediente` | VARCHAR(50) | UNIQUE, NOT NULL | Número único de expediente (ej: EXP-2025-001) |
| `titulo` | VARCHAR(200) | NOT NULL | Título descriptivo del expediente |
| `descripcion` | TEXT | NULL | Descripción detallada del expediente |
| `estado` | ENUM | DEFAULT 'borrador' | Estado: 'borrador', 'en_proceso', 'consolidado', 'cerrado' |
| `tipo_expediente` | ENUM | DEFAULT 'administrativo' | Tipo: 'licitacion', 'contratacion', 'administrativo', 'juridico', 'tecnico', 'otro' |
| `prioridad` | ENUM | DEFAULT 'normal' | Prioridad: 'baja', 'normal', 'alta', 'urgente' |
| `fecha_creacion` | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| `fecha_consolidacion` | TIMESTAMP | NULL | Fecha en que se consolidó el expediente |
| `fecha_cierre` | TIMESTAMP | NULL | Fecha de cierre definitivo |
| `usuario_responsable` | INTEGER | NOT NULL, FK → usuarios(id) | Usuario responsable del expediente |
| `reparticion` | VARCHAR(100) | NOT NULL | Repartición o área que gestiona el expediente |
| `archivo_consolidado` | TEXT | NULL | Ruta del PDF consolidado final |
| `hash_consolidado` | VARCHAR(64) | NULL | Hash SHA-256 del expediente consolidado |
| `metadatos` | JSONB | NULL | Información adicional específica del tipo |
| `observaciones` | TEXT | NULL | Observaciones generales |
| `oficina_actual_id` | INTEGER | NULL, FK → oficinas(id) | Oficina donde se encuentra actualmente |
| `estado_workflow` | ENUM | DEFAULT 'iniciado' | Estado workflow: 'iniciado', 'en_tramite', 'pendiente_revision', 'con_observaciones', 'aprobado', 'rechazado', 'archivado' |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Fecha de creación del registro |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Fecha de actualización |

#### Índices:
- `UNIQUE` (numero_expediente)
- `INDEX` (estado)
- `INDEX` (usuario_responsable)
- `INDEX` (reparticion)
- `INDEX` (fecha_creacion)

#### Relaciones:
- **Pertenece a:** usuarios (responsable), oficinas (ubicación actual)
- **Tiene muchos:** expediente_documentos, expediente_workflow, workflow_movimientos

#### Datos que se almacenan:
- **Identificación del expediente:** número único, título, descripción
- **Estado del trámite:** borrador, en proceso, consolidado, cerrado
- **Clasificación:** tipo de expediente (licitación, contratación, etc.)
- **Gestión:** responsable, repartición, prioridad
- **Consolidación:** archivo PDF final, hash del consolidado
- **Workflow:** ubicación actual, estado en el flujo de trabajo
- **Metadatos flexibles:** información adicional en formato JSON

---

### 5. **expediente_documentos**

**Propósito:** Almacena los documentos individuales que forman parte de un expediente. Cada documento representa una foja o conjunto de fojas con su respectiva información de firma y metadatos.

#### Estructura de Campos:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Identificador único del documento |
| `expediente_id` | INTEGER | NOT NULL, FK → expedientes(id) | Expediente al que pertenece |
| **📑 FOLIADO** |
| `numero_foja` | INTEGER | NOT NULL | Número de foja dentro del expediente |
| `foja_inicial` | INTEGER | NULL | Foja inicial del documento |
| `foja_final` | INTEGER | NULL | Foja final del documento |
| `cantidad_paginas` | INTEGER | DEFAULT 1 | Cantidad de páginas del PDF |
| **📄 INFORMACIÓN DEL DOCUMENTO** |
| `documento_nombre` | VARCHAR(255) | NOT NULL | Nombre del documento |
| `documento_tipo` | ENUM | NOT NULL | Tipo: 'iniciacion', 'informe', 'dictamen', 'resolucion', 'anexo', 'notificacion', 'otro' |
| `archivo_path` | TEXT | NOT NULL | Ruta del archivo original |
| `archivo_firmado_path` | TEXT | NULL | Ruta del archivo firmado |
| `hash_documento` | VARCHAR(64) | NOT NULL | Hash SHA-256 del documento |
| **📊 ORDEN Y SECUENCIA** |
| `orden_secuencial` | INTEGER | NOT NULL | Orden dentro del expediente |
| `fecha_agregado` | TIMESTAMP | DEFAULT NOW() | Fecha de agregación al expediente |
| `usuario_agregado` | INTEGER | NOT NULL, FK → usuarios(id) | Usuario que agregó el documento |
| **✍️ ESTADO DE FIRMA** |
| `estado_firma` | ENUM | DEFAULT 'pendiente' | Estado: 'pendiente', 'firmado', 'rechazado' |
| `fecha_firma` | TIMESTAMP | NULL | Fecha de firma |
| `hash_firma` | VARCHAR(512) | NULL | Hash de la firma digital |
| `usuario_firmante` | INTEGER | NULL, FK → usuarios(id) | Usuario que firmó |
| `signature_id` | INTEGER | NULL, FK → signatures(id) | Referencia a la tabla signatures |
| `requiere_firma` | BOOLEAN | DEFAULT true | Si el documento requiere firma |
| **🔒 VISIBILIDAD Y METADATA** |
| `visible_publico` | BOOLEAN | DEFAULT false | Si es visible públicamente |
| `metadatos` | JSONB | NULL | Información adicional |
| `observaciones` | TEXT | NULL | Observaciones del documento |
| **🏢 WORKFLOW** |
| `oficina_agregado_id` | INTEGER | NULL, FK → oficinas(id) | Oficina que agregó el documento |
| `usuario_agregado_workflow` | VARCHAR(255) | NULL | Usuario workflow que agregó |
| **📅 TIMESTAMPS** |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Fecha de actualización |

#### Índices:
- `UNIQUE` (expediente_id, numero_foja)
- `INDEX` (expediente_id, orden_secuencial)
- `INDEX` (estado_firma)
- `INDEX` (documento_tipo)
- `INDEX` (signature_id)

#### Relaciones:
- **Pertenece a:** expedientes, usuarios (agregado y firmante), oficinas, signatures
- **Tiene muchos:** firmas_historial

#### Datos que se almacenan:
- **Foliado:** número de foja, rango de fojas (inicial-final), cantidad de páginas
- **Archivos:** rutas del archivo original y firmado
- **Integridad:** hash SHA-256 del documento
- **Estado de firma:** pendiente, firmado, rechazado con referencias a la firma digital
- **Ordenamiento:** posición secuencial en el expediente
- **Trazabilidad:** quién agregó, cuándo, desde qué oficina
- **Metadata:** información adicional en JSON, observaciones

---

## 🖊️ Tablas de Gestión de Firmas Visuales

### 6. **usuarios_firmas**

**Propósito:** Almacena las imágenes de firmas manuscritas (firmas visuales) que los usuarios pueden aplicar sobre los documentos PDF como representación visual de su firma digital.

#### Estructura de Campos:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Identificador único |
| `usuario_id` | INTEGER | NOT NULL, FK → usuarios(id), ON DELETE CASCADE | Usuario propietario |
| `firma_nombre` | VARCHAR(255) | NOT NULL | Nombre descriptivo de la firma |
| `firma_imagen` | BYTEA | NOT NULL | Imagen de la firma en bytes |
| `firma_tipo` | ENUM | NOT NULL | Formato: 'png', 'jpg', 'jpeg', 'svg' |
| `tamaño_archivo` | INTEGER | NOT NULL, CHECK ≤ 5242880 | Tamaño en bytes (máx 5MB) |
| `ancho_pixels` | INTEGER | NULL, CHECK ≤ 2000 | Ancho en píxeles |
| `alto_pixels` | INTEGER | NULL, CHECK ≤ 500 | Alto en píxeles |
| `activa` | BOOLEAN | DEFAULT true | Si la firma está activa |
| `es_predeterminada` | BOOLEAN | DEFAULT false | Si es la firma por defecto |
| `fecha_subida` | TIMESTAMP | DEFAULT NOW() | Fecha de carga |
| `subida_por` | INTEGER | NULL, FK → usuarios(id) | Usuario que subió la firma |
| `metadatos` | JSONB | DEFAULT '{}' | Metadata adicional |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Fecha de actualización |

#### Índices:
- `idx_usuarios_firmas_usuario_id` (usuario_id)
- `idx_usuarios_firmas_activa` (activa)
- `idx_usuarios_firmas_predeterminada` (es_predeterminada)

#### Relaciones:
- **Pertenece a:** usuarios (propietario y quien subió)
- **Tiene muchos:** firmas_historial

#### Datos que se almacenan:
- **Imagen de la firma:** almacenada como BYTEA (datos binarios)
- **Formato:** PNG, JPG, JPEG o SVG
- **Dimensiones:** ancho y alto en píxeles (validados)
- **Tamaño:** máximo 5MB por imagen
- **Estado:** activa/inactiva, predeterminada
- **Metadata:** información adicional en JSON
- **Trazabilidad:** quién y cuándo la subió

---

### 7. **firmas_historial**

**Propósito:** Registra el historial de aplicación de firmas visuales sobre documentos PDF. Almacena la posición, tamaño y página donde se aplicó cada firma visual.

#### Estructura de Campos:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Identificador único |
| `usuario_firma_id` | INTEGER | NULL, FK → usuarios_firmas(id) | Firma visual aplicada (NULL si eliminada) |
| `documento_id` | INTEGER | NOT NULL, FK → expediente_documentos(id) | Documento donde se aplicó |
| `expediente_id` | INTEGER | NOT NULL, FK → expedientes(id) | Expediente asociado |
| `accion` | ENUM | NOT NULL | Acción: 'aplicada', 'removida', 'actualizada', 'regenerada' |
| `posicion_x` | INTEGER | CHECK 0-1000 | Posición X en el PDF |
| `posicion_y` | INTEGER | CHECK 0-1000 | Posición Y en el PDF |
| `tamaño_aplicado` | ENUM | NULL | Tamaño: 'pequeño', 'mediano', 'grande', 'custom' |
| `pagina_numero` | INTEGER | DEFAULT 1, CHECK ≥ 1 | Número de página |
| `fecha_aplicacion` | TIMESTAMP | DEFAULT NOW() | Fecha de aplicación |
| `aplicada_por` | INTEGER | NOT NULL, FK → usuarios(id) | Usuario que aplicó la firma |
| `metadata` | JSONB | DEFAULT '{}' | Metadata adicional |

#### Relaciones:
- **Pertenece a:** usuarios_firmas, expediente_documentos, expedientes, usuarios (aplicada_por)

#### Datos que se almacenan:
- **Posicionamiento:** coordenadas X, Y en el PDF
- **Tamaño:** predefinido (pequeño, mediano, grande) o custom
- **Página:** en qué página del PDF se aplicó
- **Acción:** si se aplicó, removió, actualizó o regeneró
- **Trazabilidad completa:** qué firma, en qué documento, cuándo y quién la aplicó
- **Metadata:** información adicional sobre la aplicación

---

## 🏢 Tablas de Workflow

### 8. **oficinas**

**Propósito:** Define las diferentes oficinas o departamentos de la organización por donde circulan los expedientes en el flujo de trabajo administrativo.

#### Estructura de Campos:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Identificador único |
| `nombre` | VARCHAR(255) | NOT NULL | Nombre de la oficina |
| `descripcion` | TEXT | NULL | Descripción de la oficina |
| `codigo` | VARCHAR(20) | UNIQUE, NOT NULL | Código único (ej: ME001, AL002) |
| `responsable` | VARCHAR(255) | NULL | Nombre del responsable |
| `email` | VARCHAR(255) | NULL | Email de contacto |
| `telefono` | VARCHAR(20) | NULL | Teléfono de contacto |
| `activa` | BOOLEAN | DEFAULT true | Si la oficina está activa |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Fecha de actualización |

#### Relaciones:
- **Tiene muchos:** usuarios, expedientes, expediente_workflow, workflow_movimientos

#### Datos que se almacenan:
- **Identificación:** nombre, código único
- **Información de contacto:** responsable, email, teléfono
- **Estado:** activa/inactiva
- **Descripción:** función de la oficina

#### Oficinas Predeterminadas:
1. **Mesa de Entradas** (ME001) - Recepción inicial de expedientes
2. **Área Legal** (AL002) - Asuntos legales y jurídicos
3. **Contaduría** (CT003) - Control y gestión financiera
4. **Recursos Humanos** (RH004) - Gestión de personal
5. **Dirección General** (DG005) - Toma de decisiones finales

---

### 9. **expediente_workflow**

**Propósito:** Rastrea el estado actual de cada expediente en el flujo de trabajo, incluyendo en qué oficina se encuentra, su prioridad y estado de tramitación.

#### Estructura de Campos:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Identificador único |
| `expediente_id` | INTEGER | NOT NULL, FK → expedientes(id) | Expediente en workflow |
| `oficina_actual_id` | INTEGER | NULL, FK → oficinas(id) | Oficina donde está actualmente |
| `oficina_origen_id` | INTEGER | NULL, FK → oficinas(id) | Oficina de origen |
| `estado` | ENUM | DEFAULT 'en_tramite' | Estado: 'en_tramite', 'pendiente_revision', 'con_observaciones', 'aprobado', 'rechazado', 'archivado', 'derivado' |
| `prioridad` | ENUM | DEFAULT 'normal' | Prioridad: 'baja', 'normal', 'alta', 'urgente' |
| `fecha_recepcion` | TIMESTAMP | NULL | Fecha de recepción en oficina actual |
| `fecha_vencimiento` | TIMESTAMP | NULL | Fecha límite de tramitación |
| `observaciones` | TEXT | NULL | Observaciones del workflow |
| `usuario_asignado` | VARCHAR(255) | NULL | Usuario asignado en la oficina |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Fecha de actualización |

#### Relaciones:
- **Pertenece a:** expedientes, oficinas (actual y origen)

#### Datos que se almacenan:
- **Ubicación actual:** oficina donde se encuentra el expediente
- **Ubicación origen:** oficina que inició el trámite
- **Estado del trámite:** en tramitación, pendiente, aprobado, etc.
- **Prioridad:** urgencia del trámite
- **Plazos:** fecha de recepción y vencimiento
- **Asignación:** usuario responsable actual
- **Observaciones:** notas sobre el estado del workflow

---

### 10. **workflow_movimientos**

**Propósito:** Registra el historial completo de movimientos de expedientes entre oficinas, creando una auditoría completa del recorrido de cada expediente.

#### Estructura de Campos:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Identificador único |
| `expediente_id` | INTEGER | NOT NULL | ID del expediente |
| `oficina_origen_id` | INTEGER | NULL, FK → oficinas(id) | Oficina de origen |
| `oficina_destino_id` | INTEGER | NOT NULL, FK → oficinas(id) | Oficina de destino |
| `usuario_id` | INTEGER | NULL | ID del usuario que movió |
| `accion` | VARCHAR(100) | NOT NULL | Tipo de acción realizada |
| `estado_anterior` | VARCHAR(255) | NULL | Estado previo del expediente |
| `estado_nuevo` | VARCHAR(255) | NOT NULL | Nuevo estado del expediente |
| `motivo` | TEXT | NULL | Motivo del movimiento |
| `observaciones` | TEXT | NULL | Observaciones adicionales |
| `usuario_movimiento` | VARCHAR(255) | NOT NULL | Usuario que realizó el movimiento |
| `fecha_movimiento` | TIMESTAMP | DEFAULT NOW() | Fecha del movimiento |
| `documentos_agregados` | JSON | NULL | Documentos agregados en el movimiento |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Fecha de actualización |

#### Relaciones:
- **Pertenece a:** oficinas (origen y destino)
- **Referencia:** expedientes (vía expediente_id)

#### Datos que se almacenan:
- **Trazabilidad completa:** origen, destino, usuario, fecha
- **Cambios de estado:** estado anterior y nuevo
- **Justificación:** motivo y observaciones del movimiento
- **Documentos:** qué documentos se agregaron durante el movimiento (JSON)
- **Acción:** tipo de acción realizada (derivación, revisión, aprobación, etc.)

---

## 🔐 Tablas de Sistema de CA Híbrida

### 11. **certificate_types**

**Propósito:** Define los tipos de certificados disponibles en el sistema (internos corporativos y gubernamentales oficiales) con sus características y niveles de validez.

#### Estructura de Campos:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Identificador único |
| `name` | VARCHAR(255) | UNIQUE, NOT NULL | Nombre del tipo: 'internal', 'official_government' |
| `description` | TEXT | NOT NULL | Descripción del tipo de certificado |
| `validity_level` | ENUM | NOT NULL | Nivel: 'corporate', 'government' |
| `processing_time` | VARCHAR(255) | NOT NULL | Tiempo de procesamiento: 'Inmediato', '3-5 días' |
| `requires_identity_verification` | BOOLEAN | DEFAULT false | Si requiere verificación de identidad |
| `is_active` | BOOLEAN | DEFAULT true | Si el tipo está activo |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Fecha de actualización |

#### Relaciones:
- **Tiene muchos:** certificados

#### Datos que se almacenan:
- **Tipos de certificado:** interno (corporativo) o gubernamental
- **Nivel de validez:** corporativa o gubernamental
- **Requisitos:** si requiere verificación de identidad
- **Tiempos:** cuánto demora obtener el certificado
- **Estado:** activo/inactivo

#### Tipos Predeterminados:
1. **internal** - Certificado interno para documentos corporativos (inmediato, sin verificación)
2. **official_government** - Certificado oficial gubernamental (3-5 días, con verificación de identidad)

---

### 12. **certificate_authorities**

**Propósito:** Almacena información sobre las Autoridades Certificadoras (CA) disponibles, tanto la CA interna como las CAs gubernamentales externas (AFIP, ONTI).

#### Estructura de Campos:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Identificador único |
| `name` | VARCHAR(255) | NOT NULL | Nombre de la CA: 'Internal CA', 'AFIP Argentina', 'ONTI Argentina' |
| `country` | VARCHAR(2) | NOT NULL | Código ISO del país (ej: AR) |
| `type` | ENUM | NOT NULL | Tipo: 'internal', 'government', 'commercial' |
| `api_endpoint` | VARCHAR(255) | NULL | URL del API (para CAs externas) |
| `api_key` | TEXT | NULL | Clave de API (encriptada) |
| `is_trusted` | BOOLEAN | DEFAULT false | Si es una CA confiable |
| `is_active` | BOOLEAN | DEFAULT true | Si está activa |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Fecha de actualización |

#### Relaciones:
- **Tiene muchos:** certificados

#### Datos que se almacenan:
- **Información de la CA:** nombre, país, tipo
- **Integración:** endpoint de API, clave de API
- **Confianza:** si es una CA confiable (gubernamental verificada)
- **Estado:** activa/inactiva

#### CAs Predeterminadas:
1. **Internal CA** (AR, internal) - CA interna del sistema
2. **AFIP Argentina** (AR, government) - Administración Federal de Ingresos Públicos
3. **ONTI Argentina** (AR, government) - Oficina Nacional de Tecnologías de Información

---

## 🔗 Relaciones Entre Tablas

### Relaciones Principales:

```
usuarios (1) ──→ (N) certificados
usuarios (1) ──→ (N) signatures
usuarios (1) ──→ (N) expedientes (como responsable)
usuarios (1) ──→ (N) usuarios_firmas
usuarios (N) ──→ (1) oficinas

certificados (1) ──→ (N) signatures
certificados (N) ──→ (1) certificate_types
certificados (N) ──→ (1) certificate_authorities

expedientes (1) ──→ (N) expediente_documentos
expedientes (1) ──→ (1) expediente_workflow
expedientes (1) ──→ (N) workflow_movimientos

expediente_documentos (N) ──→ (1) signatures
expediente_documentos (1) ──→ (N) firmas_historial

usuarios_firmas (1) ──→ (N) firmas_historial

oficinas (1) ──→ (N) expediente_workflow
oficinas (1) ──→ (N) workflow_movimientos
```

### Cascadas y Borrado:

- **usuarios → usuarios_firmas:** ON DELETE CASCADE (si se elimina un usuario, se eliminan sus firmas)
- **usuarios → certificados:** ON DELETE RESTRICT (no se puede eliminar un usuario con certificados)
- **certificados → signatures:** ON DELETE RESTRICT (no se puede eliminar un certificado usado en firmas)
- **expedientes → expediente_documentos:** ON DELETE CASCADE (si se elimina un expediente, se eliminan sus documentos)

---

## 📊 Índices y Constraints

### Índices Únicos:
- `usuarios.username` - Garantiza usernames únicos
- `usuarios.email` - Garantiza emails únicos
- `expedientes.numero_expediente` - Garantiza números únicos
- `oficinas.codigo` - Garantiza códigos únicos
- `certificate_types.name` - Garantiza tipos únicos
- `(expediente_documentos.expediente_id, numero_foja)` - Garantiza fojas únicas por expediente
- `(signatures.hash_documento, usuario_id, timestamp_firma)` - Evita firmas duplicadas

### Índices de Performance:
- `signatures(usuario_id, timestamp_firma, estado_firma, hash_documento, numero_expediente)`
- `expediente_documentos(expediente_id, orden_secuencial, estado_firma, signature_id)`
- `expedientes(estado, usuario_responsable, reparticion, fecha_creacion)`
- `usuarios_firmas(usuario_id, activa, es_predeterminada)`

### Constraints de Validación:
- `usuarios_firmas.tamaño_archivo` ≤ 5242880 bytes (5MB)
- `usuarios_firmas.ancho_pixels` ≤ 2000
- `usuarios_firmas.alto_pixels` ≤ 500
- `firmas_historial.posicion_x` BETWEEN 0 AND 1000
- `firmas_historial.posicion_y` BETWEEN 0 AND 1000
- `firmas_historial.pagina_numero` ≥ 1

---

## 🎯 Tipos de Datos Especiales (ENUM)

### usuarios.rol_usuario:
- `empleado_interno` - Empleado corporativo (puede usar certificados internos)
- `funcionario_oficial` - Funcionario público (puede usar certificados gubernamentales)
- `administrador` - Administrador del sistema (acceso completo)

### usuarios.certificado_preferido:
- `internal` - Certificado interno corporativo
- `government` - Certificado gubernamental

### certificados.tipo:
- `internal` - Certificado generado internamente
- `government` - Certificado gubernamental oficial

### certificados.status:
- `pending` - Pendiente de aprobación
- `active` - Activo y válido
- `expired` - Expirado
- `revoked` - Revocado
- `rejected` - Rechazado

### signatures.tipo_documento:
- `oficial` - Documento oficial (requiere validez legal completa)
- `no_oficial` - Documento no oficial (validez interna)

### signatures.estado_firma:
- `valida` - Firma válida y verificada
- `invalida` - Firma inválida
- `vencida` - Certificado vencido
- `revocada` - Certificado revocado

### signatures.validez_legal:
- `COMPLETA` - Validez legal completa (documentos oficiales con cert. gubernamental)
- `INTERNA` - Validez interna (documentos con cert. interno)
- `LIMITADA` - Validez limitada

### signatures.crl_check_status:
- `valid` - Verificado como válido
- `revoked` - Verificado como revocado
- `unknown` - No se pudo verificar
- `not_checked` - No verificado

### expedientes.estado:
- `borrador` - Expediente en creación
- `en_proceso` - En tramitación
- `consolidado` - Consolidado (PDF generado)
- `cerrado` - Cerrado definitivamente

### expedientes.tipo_expediente:
- `licitacion` - Licitación pública
- `contratacion` - Contratación
- `administrativo` - Trámite administrativo
- `juridico` - Asunto jurídico
- `tecnico` - Asunto técnico
- `otro` - Otro tipo

### expedientes.prioridad:
- `baja` - Prioridad baja
- `normal` - Prioridad normal
- `alta` - Prioridad alta
- `urgente` - Urgente

### expedientes.estado_workflow:
- `iniciado` - Recién iniciado
- `en_tramite` - En tramitación
- `pendiente_revision` - Pendiente de revisión
- `con_observaciones` - Con observaciones
- `aprobado` - Aprobado
- `rechazado` - Rechazado
- `archivado` - Archivado

### expediente_documentos.documento_tipo:
- `iniciacion` - Documento de iniciación
- `informe` - Informe
- `dictamen` - Dictamen
- `resolucion` - Resolución
- `anexo` - Anexo
- `notificacion` - Notificación
- `otro` - Otro tipo

### expediente_documentos.estado_firma:
- `pendiente` - Pendiente de firma
- `firmado` - Firmado
- `rechazado` - Rechazado

### usuarios_firmas.firma_tipo:
- `png` - Imagen PNG
- `jpg` - Imagen JPG
- `jpeg` - Imagen JPEG
- `svg` - Imagen SVG

### firmas_historial.accion:
- `aplicada` - Firma aplicada al documento
- `removida` - Firma removida
- `actualizada` - Firma actualizada
- `regenerada` - Documento regenerado con firma

### firmas_historial.tamaño_aplicado:
- `pequeño` - Tamaño pequeño
- `mediano` - Tamaño mediano
- `grande` - Tamaño grande
- `custom` - Tamaño personalizado

### certificate_types.validity_level:
- `corporate` - Validez corporativa/interna
- `government` - Validez gubernamental/oficial

### certificate_authorities.type:
- `internal` - CA interna del sistema
- `government` - CA gubernamental
- `commercial` - CA comercial

---

## 📝 Notas Importantes

### Seguridad:
1. **Claves privadas:** Solo se almacenan para certificados internos (NULL para externos)
2. **Hashes:** SHA-256 para integridad de documentos
3. **Firmas:** RSA-SHA256 por defecto
4. **Passwords:** bcrypt con salt de 10 rounds (60 caracteres)

### Performance:
1. Índices en campos más consultados (usuario_id, timestamp_firma, estado)
2. Índices compuestos para búsquedas complejas
3. JSONB para metadata flexible con índices GIN

### Auditoría:
1. Timestamps automáticos (created_at, updated_at)
2. Campos de trazabilidad (usuario_agregado, aplicada_por, etc.)
3. Historial completo de movimientos y acciones
4. Metadatos de sesión (IP, user agent, session_id)

### Integridad:
1. Foreign keys con ON DELETE y ON UPDATE apropiados
2. Constraints de validación en campos críticos
3. Índices únicos para prevenir duplicados
4. Hooks de Sequelize para validaciones de negocio

---

## 🔄 Flujo de Datos Típico

### 1. Firma de Documento:
```
usuario → certificado → signature → expediente_documento
         ↓
    usuarios_firmas → firmas_historial
```

### 2. Workflow de Expediente:
```
expediente → expediente_workflow → workflow_movimientos
     ↓              ↓
oficina_actual   oficina_origen/destino
```

### 3. Creación de Expediente:
```
usuario → expediente → expediente_documentos → signatures
                ↓
           expediente_workflow
```

---

## 📚 Queries Comunes

### Ver expedientes de un usuario:
```sql
SELECT * FROM expedientes 
WHERE usuario_responsable = ? 
ORDER BY fecha_creacion DESC;
```

### Ver firmas de un documento:
```sql
SELECT s.*, u.nombre_completo, c.nombre_certificado
FROM signatures s
JOIN usuarios u ON s.usuario_id = u.id
JOIN certificados c ON s.certificado_id = c.id
WHERE s.hash_documento = ?;
```

### Ver movimientos de un expediente:
```sql
SELECT wm.*, 
       oo.nombre as oficina_origen,
       od.nombre as oficina_destino
FROM workflow_movimientos wm
LEFT JOIN oficinas oo ON wm.oficina_origen_id = oo.id
JOIN oficinas od ON wm.oficina_destino_id = od.id
WHERE wm.expediente_id = ?
ORDER BY wm.fecha_movimiento DESC;
```

### Ver documentos pendientes de firma:
```sql
SELECT ed.*, e.numero_expediente, e.titulo
FROM expediente_documentos ed
JOIN expedientes e ON ed.expediente_id = e.id
WHERE ed.estado_firma = 'pendiente'
  AND ed.requiere_firma = true
ORDER BY ed.fecha_agregado ASC;
```

---

**Fin del Documento**  
*Para más información sobre la API, consultar `FIRMA_DIGITAL_API.md`*
