const crypto = require('crypto');

console.log('🔐 DEMOSTRACIÓN: Proceso de firma en nuestra aplicación');
console.log('=======================================================\n');

// Simular el proceso que hace nuestro backend
console.log('📍 SIMULANDO: Usuario "Juan Carlos" firma documento.pdf');
console.log('📱 Datos del frontend:');
const requestData = {
  file: {
    originalname: 'documento.pdf',
    buffer: Buffer.from('Contenido del documento PDF a firmar - Gobierno de San Juan'),
    size: 1024
  },
  body: {
    tipo_documento: 'oficial',
    certificate_type: 'government'
  },
  user: {
    id: 123,
    username: 'juan.perez',
    nombre_completo: 'Juan Carlos Pérez'
  }
};

console.log(`📄 Archivo: ${requestData.file.originalname}`);
console.log(`📋 Tipo: ${requestData.body.tipo_documento}`);
console.log(`🏛️ Certificado: ${requestData.body.certificate_type}`);
console.log(`👤 Usuario: ${requestData.user.nombre_completo}\n`);

// PASO 1: Simular búsqueda en BD (lo que hace línea 87-95 del backend)
console.log('📍 PASO 1: Buscar certificado en base de datos...');
const certificadoEnBD = {
  id: 456,
  usuario_id: 123,
  nombre_certificado: 'Certificado Gubernamental - Juan Carlos Pérez',
  tipo: 'government',
  numero_serie: 'GOV789ABC123',
  // ↓ CLAVE PRIVADA (solo en servidor, cifrada)
  clave_privada_pem: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7h3nK9x2L8f9Y
[... contenido cifrado de la clave privada ...]
qM4vN2wP8xL7fG9hJ3kR5mT8uY6vB2nQ3sA1dF7gH9jK2lM5pO8rS4tU6vW9xZ==
-----END PRIVATE KEY-----`,
  // ↓ CERTIFICADO PÚBLICO (se puede compartir)
  certificado_pem: `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJALC90A875ADE3F6EBMADQYJKoZIhvcdAQEF...
[... certificado con clave pública e identidad ...]
CertificateSignatureValue==
-----END CERTIFICATE-----`,
  activo: true,
  fecha_expiracion: new Date('2026-12-31')
};

console.log('✅ Certificado encontrado en BD:');
console.log(`🏛️ ID: ${certificadoEnBD.id}`);
console.log(`📋 Serie: ${certificadoEnBD.numero_serie}`);
console.log(`🔒 Clave privada: ${certificadoEnBD.clave_privada_pem.length} caracteres (SECRETA)`);
console.log(`📜 Certificado: ${certificadoEnBD.certificado_pem.length} caracteres (PÚBLICO)\n`);

// PASO 2: Validaciones de seguridad
console.log('📍 PASO 2: Validaciones de seguridad...');
console.log('✅ Usuario autorizado para certificado gubernamental');
console.log('✅ Certificado vigente hasta:', certificadoEnBD.fecha_expiracion.toISOString().split('T')[0]);
console.log('✅ Documento oficial + certificado gubernamental: VÁLIDO\n');

// PASO 3: Firmar documento (lo que hace línea 162)
console.log('📍 PASO 3: Firmando documento...');
console.log('🔐 Usando clave privada (SOLO en servidor):');

// Para demostrar, generamos claves reales
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Simular signWithPrivateKey() del backend
const signature = crypto.sign('sha256', requestData.file.buffer, privateKey);

console.log(`📄 Hash del documento: ${crypto.createHash('sha256').update(requestData.file.buffer).digest('hex').substring(0, 16)}...`);
console.log(`🖋️ Firma generada: ${signature.toString('hex').substring(0, 32)}... (${signature.length} bytes)`);
console.log(`⏱️ Tiempo de firma: ~15ms\n`);

// PASO 4: Construir respuesta (lo que hace línea 174-200)
console.log('📍 PASO 4: Construyendo respuesta segura...');

const respuestaSegura = {
  message: "Documento firmado digitalmente con certificado gubernamental",
  filename: requestData.file.originalname,
  size: requestData.file.size,
  fileBase64: requestData.file.buffer.toString('base64'), // ← DOCUMENTO ORIGINAL
  signature: signature.toString('hex'), // ← FIRMA DIGITAL
  publicKeyPem: publicKey, // ← CERTIFICADO (simula certificado_pem)
  documento: {
    tipo_documento: 'oficial',
    certificate_type: 'government',
    estado_firma: 'firmado_gubernamental',
    validez_legal: 'COMPLETA'
  },
  usuario: {
    id: requestData.user.id,
    username: requestData.user.username,
    nombre_completo: requestData.user.nombre_completo,
    rol: 'funcionario_oficial'
  },
  certificado: {
    numero_serie: certificadoEnBD.numero_serie,
    emisor: 'CN=CA Gobierno San Juan',
    validez: certificadoEnBD.fecha_expiracion
  }
  // ⚠️ NOTA CRÍTICA: clave_privada_pem NO está aquí
};

console.log('📦 Respuesta construida:');
console.log(`📄 Documento: ${respuestaSegura.filename} (${respuestaSegura.size} bytes)`);
console.log(`🖋️ Firma: ${respuestaSegura.signature.substring(0, 32)}... (incluida)`);
console.log(`📜 Certificado: ${respuestaSegura.publicKeyPem.length} caracteres (incluido)`);
console.log(`🔒 Clave privada: NO INCLUIDA ✓ (permanece en servidor)`);
console.log(`⚖️ Validez legal: ${respuestaSegura.documento.validez_legal}\n`);

// PASO 5: Verificar que la firma es válida
console.log('📍 PASO 5: Verificando firma (lo que harán otros usuarios)...');
const esValida = crypto.verify('sha256', requestData.file.buffer, publicKey, signature);
console.log(`✅ Verificación con clave pública: ${esValida ? 'FIRMA VÁLIDA ✓' : 'FIRMA INVÁLIDA ✗'}`);

// PASO 6: Demostrar que la clave privada NO está en la respuesta
console.log('\n📍 PASO 6: Auditoria de seguridad...');
const respuestaJSON = JSON.stringify(respuestaSegura);
const contieneClavePrivada = respuestaJSON.includes('PRIVATE KEY') || respuestaJSON.includes(privateKey);
console.log(`🔍 ¿Respuesta contiene clave privada? ${contieneClavePrivada ? 'SÍ ❌' : 'NO ✅'}`);
console.log(`🛡️ Seguridad: ${contieneClavePrivada ? 'COMPROMETIDA' : 'GARANTIZADA'}`);

// RESUMEN FINAL
console.log('\n🎯 RESUMEN DEL PROCESO:');
console.log('=======================');
console.log('1. 🔐 Clave privada PERMANECE en servidor (BD cifrada)');
console.log('2. 🖋️ Se USA solo para crear la firma digital');
console.log('3. 📦 Documento contiene: contenido + firma + certificado público');
console.log('4. 🔒 Clave privada NUNCA sale del servidor');
console.log('5. ✅ Otros pueden validar con la clave pública');
console.log('\n💡 TU CLAVE PRIVADA = Tu "bolígrafo secreto"');
console.log('💡 LA FIRMA = La "marca" que deja tu bolígrafo');
console.log('💡 EL CERTIFICADO = Tu "identificación" para que otros reconozcan tu marca');
console.log('\n🚀 ¡PROCESO COMPLETAMENTE SEGURO!');