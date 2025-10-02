// DEMOSTRACIÓN: Generación de Certificado Interno Paso a Paso
// Gobierno de San Juan - Ejemplo Práctico

import crypto from 'crypto';

console.log('🔐 INICIANDO GENERACIÓN DE CERTIFICADO INTERNO');
console.log('===============================================');

// DATOS DEL USUARIO DE EJEMPLO
const usuario = {
  id: 123,
  nombre_completo: 'Juan Carlos Pérez',
  email: 'juan.perez@sanjuan.gov.ar',
  rol_usuario: 'empleado_interno',
  dependencia: 'Secretaría de Innovación'
};

console.log('👤 USUARIO:', usuario.nombre_completo);
console.log('📧 EMAIL:', usuario.email);
console.log('🏢 ROL:', usuario.rol_usuario);

console.log('\n🔧 PASO 1: GENERANDO PAR DE CLAVES RSA...');
// =====================================

const startTime = Date.now();

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,        // 2048 bits = estándar de seguridad
  publicKeyEncoding: {
    type: 'spki',             // Subject Public Key Info
    format: 'pem'             // Privacy Enhanced Mail
  },
  privateKeyEncoding: {
    type: 'pkcs8',            // Public Key Cryptography Standards #8
    format: 'pem'
  }
});

const keyGenTime = Date.now() - startTime;
console.log(`✅ Claves generadas en ${keyGenTime}ms`);
console.log(`🔑 Clave pública (primeros 100 chars): ${publicKey.substring(0, 100)}...`);
console.log(`🗝️ Clave privada (primeros 100 chars): ${privateKey.substring(0, 100)}...`);

console.log('\n📜 PASO 2: CREANDO DATOS DEL CERTIFICADO...');
// =============================================

// Generar número de serie único
const serialNumber = crypto.randomBytes(8).toString('hex').toUpperCase();

const certificateData = {
  version: 3,
  serialNumber: serialNumber,
  subject: {
    commonName: usuario.nombre_completo,
    organizationName: 'Gobierno de San Juan',
    organizationalUnitName: 'Empleados Internos',
    countryName: 'AR',
    stateOrProvinceName: 'San Juan',
    localityName: 'San Juan Capital',
    emailAddress: usuario.email
  },
  issuer: {
    commonName: 'CA Interna - Gobierno San Juan',
    organizationName: 'Gobierno de San Juan',
    countryName: 'AR'
  },
  validFrom: new Date(),
  validTo: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // 1 año
  keyUsage: ['digitalSignature', 'nonRepudiation'],
  basicConstraints: {
    cA: false // No es una CA
  },
  publicKey: publicKey
};

console.log('📋 DATOS DEL CERTIFICADO:');
console.log(`   Serie: ${certificateData.serialNumber}`);
console.log(`   Sujeto: CN=${certificateData.subject.commonName}`);
console.log(`   Emisor: CN=${certificateData.issuer.commonName}`);
console.log(`   Válido desde: ${certificateData.validFrom.toISOString()}`);
console.log(`   Válido hasta: ${certificateData.validTo.toISOString()}`);
console.log(`   Días de validez: ${Math.ceil((certificateData.validTo - certificateData.validFrom) / (1000 * 60 * 60 * 24))}`);

console.log('\n🏗️ PASO 3: CONSTRUYENDO CERTIFICADO PEM...');
// =============================================

function createSimplifiedPEM(data) {
  const header = '-----BEGIN CERTIFICATE-----';
  const footer = '-----END CERTIFICATE-----';
  
  // Codificar datos del certificado en Base64
  const certContent = {
    version: data.version,
    serialNumber: data.serialNumber,
    issuer: `CN=${data.issuer.commonName},O=${data.issuer.organizationName},C=${data.issuer.countryName}`,
    subject: `CN=${data.subject.commonName},O=${data.subject.organizationName},OU=${data.subject.organizationalUnitName},C=${data.subject.countryName}`,
    validFrom: data.validFrom.toISOString(),
    validTo: data.validTo.toISOString(),
    keyUsage: data.keyUsage,
    basicConstraints: data.basicConstraints,
    publicKey: data.publicKey,
    signatureAlgorithm: 'sha256WithRSAEncryption'
  };

  const certData = Buffer.from(JSON.stringify(certContent, null, 2)).toString('base64');
  
  // Formatear en líneas de 64 caracteres (estándar PEM)
  const formattedData = certData.match(/.{1,64}/g).join('\n');
  
  return `${header}\n${formattedData}\n${footer}`;
}

const certificatePem = createSimplifiedPEM(certificateData);

console.log('✅ CERTIFICADO PEM GENERADO:');
console.log('📄 Tamaño:', certificatePem.length, 'caracteres');
console.log('📝 Vista previa:');
console.log(certificatePem.substring(0, 200) + '...\n...' + certificatePem.substring(certificatePem.length - 100));

console.log('\n💾 PASO 4: PREPARANDO PARA ALMACENAMIENTO...');
// =============================================

const certificadoCompleto = {
  // Datos para la base de datos
  usuario_id: usuario.id,
  nombre_certificado: `Certificado Interno - ${usuario.nombre_completo}`,
  tipo: 'internal',
  certificado_pem: certificatePem,
  clave_privada_pem: privateKey,
  clave_publica_pem: publicKey,
  numero_serie: serialNumber,
  emisor: 'CA Interna - Gobierno San Juan',
  fecha_emision: certificateData.validFrom,
  fecha_expiracion: certificateData.validTo,
  activo: true,
  
  // Metadatos adicionales
  metadata: {
    generacion_automatica: true,
    algoritmo: 'RSA-2048',
    proposito: 'firma_documentos_internos',
    timestamp_generacion: new Date().toISOString(),
    version_sistema: '1.0'
  }
};

console.log('🗂️ ESTRUCTURA PARA BD:');
console.log(`   ID Usuario: ${certificadoCompleto.usuario_id}`);
console.log(`   Nombre: ${certificadoCompleto.nombre_certificado}`);
console.log(`   Tipo: ${certificadoCompleto.tipo}`);
console.log(`   Serie: ${certificadoCompleto.numero_serie}`);
console.log(`   Emisor: ${certificadoCompleto.emisor}`);
console.log(`   Estado: ${certificadoCompleto.activo ? 'ACTIVO' : 'INACTIVO'}`);

console.log('\n🔍 PASO 5: VALIDACIONES DE SEGURIDAD...');
// =======================================

// Validar que las claves coinciden
function validateKeyPair(publicKeyPem, privateKeyPem) {
  try {
    // Crear datos de prueba
    const testData = 'Texto de prueba para validar par de claves';
    
    // Firmar con clave privada
    const sign = crypto.createSign('SHA256');
    sign.write(testData);
    sign.end();
    const signature = sign.sign(privateKeyPem, 'base64');
    
    // Verificar con clave pública
    const verify = crypto.createVerify('SHA256');
    verify.write(testData);
    verify.end();
    const isValid = verify.verify(publicKeyPem, signature, 'base64');
    
    return isValid;
  } catch (error) {
    return false;
  }
}

const isValidKeyPair = validateKeyPair(publicKey, privateKey);
console.log(`🔐 Validación de par de claves: ${isValidKeyPair ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);

// Validar longitud de clave
const keyInfo = crypto.createPublicKey(publicKey);
const keySize = keyInfo.asymmetricKeySize * 8; // Convertir bytes a bits
console.log(`🔑 Tamaño de clave: ${keySize} bits ${keySize >= 2048 ? '✅' : '❌'}`);

// Validar fechas
const now = new Date();
const validFromOk = certificateData.validFrom <= now;
const validToOk = certificateData.validTo > now;
console.log(`📅 Período de validez: ${validFromOk && validToOk ? '✅ CORRECTO' : '❌ INCORRECTO'}`);

console.log('\n🎯 PASO 6: CERTIFICADO LISTO PARA USO');
// ====================================

const totalTime = Date.now() - startTime;

console.log('🏆 RESUMEN DE GENERACIÓN:');
console.log(`⏱️ Tiempo total: ${totalTime}ms`);
console.log(`📊 Eficiencia: ${Math.round(1000/totalTime * 100)/100} certificados/segundo`);
console.log('🔒 Seguridad: RSA-2048 + SHA-256');
console.log('📋 Estado: LISTO PARA FIRMAR DOCUMENTOS INTERNOS');

console.log('\n✅ PROCESO COMPLETADO EXITOSAMENTE');
console.log('==================================');

// EJEMPLO DE USO EN FIRMA
console.log('\n🖋️ EJEMPLO: USANDO CERTIFICADO PARA FIRMAR');
console.log('==========================================');

const documentoEjemplo = 'Contenido del documento interno a firmar';

// Crear firma digital
const sign = crypto.createSign('SHA256');
sign.write(documentoEjemplo);
sign.end();
const firmaDigital = sign.sign(privateKey, 'base64');

console.log(`📄 Documento: "${documentoEjemplo}"`);
console.log(`🖋️ Firma digital: ${firmaDigital.substring(0, 50)}...`);

// Verificar firma
const verify = crypto.createVerify('SHA256');
verify.write(documentoEjemplo);
verify.end();
const firmaValida = verify.verify(publicKey, firmaDigital, 'base64');

console.log(`✅ Verificación: ${firmaValida ? 'FIRMA VÁLIDA' : 'FIRMA INVÁLIDA'}`);

console.log('\n🎉 ¡CERTIFICADO INTERNO GENERADO Y FUNCIONANDO!');

export default certificadoCompleto;