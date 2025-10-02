const crypto = require('crypto');

console.log('🔐 DEMOSTRACIÓN: Claves vs Certificados');
console.log('=====================================\n');

// 1. GENERAR PAR DE CLAVES
console.log('📍 PASO 1: Generando par de claves...');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

console.log('✅ Par de claves generado:');
console.log(`🔒 Clave Privada: ${privateKey.length} caracteres`);
console.log(`🔓 Clave Pública: ${publicKey.length} caracteres\n`);

// 2. MOSTRAR QUE LA CLAVE PÚBLICA VA EN EL CERTIFICADO
console.log('📍 PASO 2: Creando certificado (simula X.509)...');
const certificateData = {
  subject: 'CN=Juan Carlos Pérez,O=Gobierno de San Juan',
  issuer: 'CN=CA Gobierno San Juan',
  serialNumber: crypto.randomBytes(8).toString('hex').toUpperCase(),
  publicKey: publicKey, // ← LA CLAVE PÚBLICA VA AQUÍ
  validFrom: new Date().toISOString(),
  validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
};

console.log('📜 CERTIFICADO CREADO:');
console.log(`👤 Sujeto: ${certificateData.subject}`);
console.log(`🏛️ Emisor: ${certificateData.issuer}`);
console.log(`📋 Serie: ${certificateData.serialNumber}`);
console.log(`🔓 Contiene: Clave pública de ${publicKey.length} caracteres`);
console.log(`📅 Válido hasta: ${certificateData.validTo.split('T')[0]}\n`);

// 3. DEMOSTRAR FIRMA
console.log('📍 PASO 3: Firmando documento...');
const documento = 'Resolución Administrativa N° 123 - Gobierno de San Juan';
console.log(`📄 Documento a firmar: "${documento}"`);

const firma = crypto.sign('sha256', Buffer.from(documento), privateKey);
console.log(`🖋️ Firma generada: ${firma.toString('hex').substring(0, 32)}... (${firma.length} bytes)`);
console.log('🔒 ↑ Usamos la CLAVE PRIVADA para firmar\n');

// 4. DEMOSTRAR VALIDACIÓN
console.log('📍 PASO 4: Validando firma...');
console.log('🔓 Extrayendo clave pública del certificado...');
const clavePublicaDelCertificado = certificateData.publicKey;

const esValida = crypto.verify('sha256', Buffer.from(documento), clavePublicaDelCertificado, firma);
console.log(`✅ Resultado validación: ${esValida ? 'FIRMA VÁLIDA ✓' : 'FIRMA INVÁLIDA ✗'}`);
console.log('🔓 ↑ Usamos la CLAVE PÚBLICA (del certificado) para validar\n');

// 5. DEMOSTRAR QUE NO SE PUEDE FALSIFICAR
console.log('📍 PASO 5: Probando seguridad...');
const { publicKey: otraPublica } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const intentoFalsificacion = crypto.verify('sha256', Buffer.from(documento), otraPublica, firma);
console.log(`❌ Validación con otra clave pública: ${intentoFalsificacion ? 'VÁLIDA' : 'INVÁLIDA ✓'}`);
console.log('🛡️ ↑ Confirma que solo TU clave pública puede validar TU firma\n');

// 6. RESUMEN FINAL
console.log('🎯 RESUMEN FINAL:');
console.log('================');
console.log('🔑 TIENES: 1 par de claves (privada + pública)');
console.log('📜 TIENES: 1 certificado (contiene tu clave pública + identidad)');
console.log('🔒 FIRMAS: Con tu clave privada (secreta)');
console.log('🔓 VALIDAN: Con tu clave pública (en el certificado)');
console.log('✅ RESULTADO: Solo tú puedes firmar, todos pueden validar\n');

console.log('💡 NOTA IMPORTANTE:');
console.log('La clave pública NO es un "certificado público"');
console.log('Es una PARTE del certificado junto con tu identidad 🎯');