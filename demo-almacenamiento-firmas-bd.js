const crypto = require('crypto');

console.log('🗄️ DEMOSTRACIÓN: Almacenamiento de Firmas Digitales en BD');
console.log('=========================================================\n');

// Simular el proceso completo de almacenamiento
console.log('📱 ESCENARIO: Juan Carlos firma "Resolución N° 123.pdf"');
console.log('========================================================\n');

// 1. DATOS DEL DOCUMENTO
const documentoOriginal = Buffer.from(`
GOBIERNO DE SAN JUAN
RESOLUCIÓN ADMINISTRATIVA N° 123/2025

ARTÍCULO 1°: Se aprueba el nuevo protocolo de firma digital...
ARTÍCULO 2°: La presente resolución entrará en vigencia...

Firmado digitalmente por: [PENDIENTE]
Fecha: 30 de septiembre de 2025
`);

console.log('📍 PASO 1: Procesando documento original...');
console.log(`📄 Nombre: Resolución_123.pdf`);
console.log(`📊 Tamaño: ${documentoOriginal.length} bytes`);

// Calcular hash del documento
const hashDocumento = crypto.createHash('sha256').update(documentoOriginal).digest('hex');
console.log(`🔐 Hash SHA256: ${hashDocumento}`);
console.log(`✅ Hash calculado (para verificar integridad)\n`);

// 2. DATOS DEL CERTIFICADO (simulados de BD)
console.log('📍 PASO 2: Obteniendo certificado de la BD...');
const certificadoBD = {
  id: 123,
  usuario_id: 456,
  nombre_certificado: 'Certificado Gubernamental - Juan Carlos Pérez',
  numero_serie: 'GOV789ABC123',
  tipo: 'government',
  activo: true
};

console.log(`🏛️ Certificado: ${certificadoBD.nombre_certificado}`);
console.log(`📋 Serie: ${certificadoBD.numero_serie}`);
console.log(`🔑 Tipo: ${certificadoBD.tipo}`);
console.log(`✅ Estado: ${certificadoBD.activo ? 'ACTIVO' : 'INACTIVO'}\n`);

// 3. GENERAR FIRMA DIGITAL
console.log('📍 PASO 3: Generando firma digital...');

// Para la demo, generar claves reales
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const firmaDigital = crypto.sign('sha256', documentoOriginal, privateKey);
console.log(`🖋️ Algoritmo: RSA-SHA256`);
console.log(`🔒 Firma generada: ${firmaDigital.toString('hex').substring(0, 32)}... (${firmaDigital.length} bytes)`);
console.log(`⏱️ Timestamp: ${new Date().toISOString()}\n`);

// 4. PREPARAR REGISTRO PARA BD
console.log('📍 PASO 4: Preparando registro para tabla "signatures"...');

const registroFirma = {
  id: 789, // Auto-increment en BD real
  usuario_id: 456,
  certificado_id: 123,
  
  // 📄 INFORMACIÓN DEL DOCUMENTO
  nombre_documento: 'Resolución Administrativa N° 123/2025',
  nombre_archivo_original: 'Resolución_123.pdf',
  tipo_documento: 'oficial',
  hash_documento: hashDocumento,
  tamaño_archivo: documentoOriginal.length,
  
  // 🖋️ DATOS DE LA FIRMA
  firma_digital: firmaDigital.toString('hex'),
  algoritmo_firma: 'RSA-SHA256',
  timestamp_firma: new Date().toISOString(),
  
  // 🔍 VALIDACIONES
  estado_firma: 'valida',
  verificada: true,
  
  // 📊 METADATOS
  ip_address: '192.168.1.100',
  user_agent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/118.0.0.0',
  session_id: `SIG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  
  // 🏛️ INFORMACIÓN LEGAL
  validez_legal: 'COMPLETA',
  numero_expediente: 'EXP-2025-001234',
  crl_check_status: 'valid',
  
  // 📅 TIMESTAMPS
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

console.log('💾 REGISTRO COMPLETO A INSERTAR:');
console.log('==================================');
console.log(`ID: ${registroFirma.id}`);
console.log(`Usuario: ${registroFirma.usuario_id}`);
console.log(`Certificado: ${registroFirma.certificado_id}`);
console.log(`Documento: ${registroFirma.nombre_documento}`);
console.log(`Hash: ${registroFirma.hash_documento.substring(0, 16)}...`);
console.log(`Firma: ${registroFirma.firma_digital.substring(0, 16)}...`);
console.log(`Validez: ${registroFirma.validez_legal}`);
console.log(`Estado: ${registroFirma.estado_firma}`);
console.log(`IP: ${registroFirma.ip_address}`);
console.log(`Session: ${registroFirma.session_id}\n`);

// 5. SIMULAR QUERY SQL
console.log('📍 PASO 5: Query SQL de inserción...');
console.log('=====================================');

const sqlInsert = `
INSERT INTO signatures (
  usuario_id, certificado_id, nombre_documento, nombre_archivo_original,
  tipo_documento, hash_documento, tamaño_archivo, firma_digital,
  algoritmo_firma, timestamp_firma, estado_firma, verificada,
  ip_address, user_agent, session_id, validez_legal, numero_expediente,
  crl_check_status, created_at, updated_at
) VALUES (
  ${registroFirma.usuario_id},
  ${registroFirma.certificado_id},
  '${registroFirma.nombre_documento}',
  '${registroFirma.nombre_archivo_original}',
  '${registroFirma.tipo_documento}',
  '${registroFirma.hash_documento}',
  ${registroFirma.tamaño_archivo},
  '${registroFirma.firma_digital.substring(0, 32)}...',
  '${registroFirma.algoritmo_firma}',
  '${registroFirma.timestamp_firma}',
  '${registroFirma.estado_firma}',
  ${registroFirma.verificada},
  '${registroFirma.ip_address}',
  '${registroFirma.user_agent.substring(0, 30)}...',
  '${registroFirma.session_id}',
  '${registroFirma.validez_legal}',
  '${registroFirma.numero_expediente}',
  '${registroFirma.crl_check_status}',
  '${registroFirma.created_at}',
  '${registroFirma.updated_at}'
);`;

console.log(sqlInsert);
console.log('\n✅ Registro insertado en tabla "signatures"\n');

// 6. VERIFICAR INTEGRIDAD
console.log('📍 PASO 6: Verificando integridad almacenada...');
console.log('===============================================');

// Simular verificación (como lo haría otro usuario)
const documentoRecuperado = documentoOriginal; // En realidad vendría del storage
const hashRecuperado = crypto.createHash('sha256').update(documentoRecuperado).digest('hex');
const firmaRecuperada = Buffer.from(registroFirma.firma_digital, 'hex');

console.log(`📄 Hash original: ${hashDocumento.substring(0, 16)}...`);
console.log(`📄 Hash recuperado: ${hashRecuperado.substring(0, 16)}...`);
console.log(`✅ Integridad documento: ${hashDocumento === hashRecuperado ? 'VÁLIDA' : 'COMPROMETIDA'}`);

const verificacionFirma = crypto.verify('sha256', documentoRecuperado, publicKey, firmaRecuperada);
console.log(`🖋️ Verificación firma: ${verificacionFirma ? 'VÁLIDA ✓' : 'INVÁLIDA ✗'}`);
console.log(`🔒 Estado en BD: ${registroFirma.estado_firma}`);
console.log(`⚖️ Validez legal: ${registroFirma.validez_legal}\n`);

// 7. CONSULTAS DE HISTORIAL
console.log('📍 PASO 7: Ejemplos de consultas de historial...');
console.log('=================================================');

console.log('🔍 Obtener todas las firmas del usuario:');
console.log(`
SELECT 
  s.id, s.nombre_documento, s.timestamp_firma, s.estado_firma,
  c.nombre_certificado, c.numero_serie, u.nombre_completo
FROM signatures s
JOIN certificados c ON s.certificado_id = c.id
JOIN usuarios u ON s.usuario_id = u.id
WHERE s.usuario_id = 456
ORDER BY s.timestamp_firma DESC;
`);

console.log('🔍 Buscar firma por hash de documento:');
console.log(`
SELECT * FROM signatures 
WHERE hash_documento = '${hashDocumento}';
`);

console.log('📈 Estadísticas de firmas del usuario:');
console.log(`
SELECT 
  COUNT(*) as total_firmas,
  COUNT(CASE WHEN tipo_documento = 'oficial' THEN 1 END) as oficiales,
  COUNT(CASE WHEN estado_firma = 'valida' THEN 1 END) as validas,
  COUNT(CASE WHEN validez_legal = 'COMPLETA' THEN 1 END) as validez_completa
FROM signatures 
WHERE usuario_id = 456;
`);

// 8. RESUMEN FINAL
console.log('\n🎯 RESUMEN FINAL DEL ALMACENAMIENTO:');
console.log('====================================');
console.log('✅ Documento procesado y hasheado');
console.log('✅ Certificado extraído de BD');
console.log('✅ Firma digital generada con clave privada');
console.log('✅ Registro completo almacenado en tabla "signatures"');
console.log('✅ Integridad y validez verificadas');
console.log('✅ Historial disponible para consultas');
console.log('\n💡 VENTAJAS DEL SISTEMA:');
console.log('========================');
console.log('🔐 Seguridad: Claves privadas nunca salen del servidor');
console.log('📊 Trazabilidad: Cada firma registrada con metadatos completos');
console.log('🔍 Verificabilidad: Hash + firma permiten validación independiente');
console.log('⚖️ Validez legal: Diferenciación entre firmas internas y gubernamentales');
console.log('📈 Auditoría: Historial completo de todas las operaciones');
console.log('\n🚀 ¡SISTEMA DE ALMACENAMIENTO COMPLETO Y SEGURO!');