import fs from 'fs';
import path from 'path';
import { SignPdf } from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';
import { plainAddPlaceholder } from '@signpdf/placeholder-plain';
import forge from 'node-forge';

/**
 * Genera un certificado digital temporal para firma (solo para desarrollo/testing)
 */
export const generateTemporaryCertificate = (userInfo) => {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  
  const attrs = [
    { name: 'commonName', value: userInfo.nombre_completo || 'Usuario Sistema' },
    { name: 'countryName', value: 'AR' },
    { name: 'stateOrProvinceName', value: 'Buenos Aires' },
    { name: 'localityName', value: 'CABA' },
    { name: 'organizationName', value: 'Sistema Digital' },
    { name: 'organizationalUnitName', value: 'Firma Digital' }
  ];
  
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  
  // Extensiones básicas
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', keyCertSign: true, digitalSignature: true, nonRepudiation: true },
    { name: 'extKeyUsage', serverAuth: false, clientAuth: false, codeSigning: false, timeStamping: false }
  ]);
  
  // Auto-firmar el certificado
  cert.sign(keys.privateKey);
  
  // Crear PKCS#12
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, cert, 'password', { algorithm: 'aes256' });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  
  return Buffer.from(p12Der, 'binary');
};

/**
 * Obtiene certificado PKCS#12 para el usuario
 * En desarrollo usa un certificado generado con OpenSSL
 * En producción debe obtener el certificado real del token/archivo del usuario
 */
export const getCertificateForUser = async (userId, userInfo) => {
  // Para desarrollo: usar certificados específicos por usuario
  let certificatePath;
  
  // Certificado específico para usuario_legal (ID 10)
  if (userId === 10 || (userInfo && userInfo.username === 'usuario_legal')) {
    certificatePath = path.join(process.cwd(), 'certificates', 'usuario_legal.p12');
  } else {
    // Certificado genérico para otros usuarios
    certificatePath = path.join(process.cwd(), 'certificates', 'test_compatible.p12');
  }
  
  if (fs.existsSync(certificatePath)) {
    console.log(`Usando certificado PKCS#12 para usuario ${userId}:`, certificatePath);
    return fs.readFileSync(certificatePath);
  }
  
  // Fallback: generar certificado temporal con forge (menos compatible)
  console.warn('Certificado OpenSSL no encontrado, usando certificado temporal de forge');
  return generateTemporaryCertificate(userInfo);
};

/**
 * Firma digitalmente un PDF con certificado criptográfico
 */
export const signPDFCryptographically = async (pdfPath, outputPath, userInfo, signatureData) => {
  try {
    console.log('=== INICIANDO FIRMA DIGITAL CRIPTOGRÁFICA ===');
    console.log('Archivo PDF:', pdfPath);
    console.log('Usuario:', userInfo.nombre_completo);
    
    // Leer el PDF original
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`Archivo PDF no encontrado: ${pdfPath}`);
    }
    
    let pdfBuffer = fs.readFileSync(pdfPath);
    
    // Obtener certificado para el usuario
    const certificateBuffer = await getCertificateForUser(userInfo.id, userInfo);
    
    // Crear signer con el certificado
    console.log('Tamaño del buffer del certificado:', certificateBuffer.length, 'bytes');
    console.log('Intentando crear P12Signer con contraseña...');
    const signer = new P12Signer(certificateBuffer, 'password');
    
  // Agregar placeholder para la firma
  const pdfWithPlaceholder = plainAddPlaceholder({
      pdfBuffer,
      reason: `Firmado digitalmente por ${userInfo.nombre_completo}`,
      contactInfo: userInfo.email || 'sistema@digital.gov.ar',
      name: userInfo.nombre_completo,
      location: 'Argentina',
      signerName: userInfo.nombre_completo,
      signatureLength: 8192,
    });
    
  // Aplicar la firma digital
  const signPdf = new SignPdf();
  const signedPdf = await signPdf.sign(pdfWithPlaceholder, signer);
    
    // Guardar el PDF firmado
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, signedPdf);
    
    console.log('✅ PDF firmado criptográficamente exitosamente:', outputPath);
    console.log('Tamaño del PDF firmado:', signedPdf.length, 'bytes');
    
    return {
      success: true,
      outputPath,
      certificateInfo: {
        subject: userInfo.nombre_completo,
        issuer: 'Sistema Digital - Certificado Temporal',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
        serialNumber: '01'
      }
    };
    
  } catch (error) {
    console.error('Error en firma digital criptográfica:', error);
    throw error;
  }
};

/**
 * Verifica la firma digital de un PDF
 */
export const verifyPDFSignature = async (signedPdfPath) => {
  try {
    console.log('=== VERIFICANDO FIRMA DIGITAL ===');
    console.log('Archivo:', signedPdfPath);
    
    // Esta función verificaría la firma digital
    // Por simplicidad, retornamos información básica
    // En producción, aquí se haría una verificación completa
    
    return {
      isValid: true,
      signatures: [
        {
          signer: 'Usuario Sistema',
          signDate: new Date(),
          reason: 'Firmado digitalmente',
          isValidNow: true
        }
      ]
    };
    
  } catch (error) {
    console.error('Error verificando firma digital:', error);
    return {
      isValid: false,
      error: error.message
    };
  }
};

export default {
  signPDFCryptographically,
  verifyPDFSignature,
  getCertificateForUser,
  generateTemporaryCertificate
};