import forge from 'node-forge';

// Firma digital simple de un buffer usando una clave privada generada en memoria

export function signBuffer(buffer) {
  // Generar clave privada y pública (en producción, usar claves reales)
  const keypair = forge.pki.rsa.generateKeyPair(2048);
  const md = forge.md.sha256.create();
  md.update(buffer.toString('binary'));
  const signature = keypair.privateKey.sign(md);
  return {
    signature: forge.util.encode64(signature),
    publicKeyPem: forge.pki.publicKeyToPem(keypair.publicKey),
    privateKeyPem: forge.pki.privateKeyToPem(keypair.privateKey)
  };
}

// Validar la firma digital de un buffer
export function verifyBuffer(buffer, signatureB64, publicKeyPem) {
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
  const md = forge.md.sha256.create();
  md.update(buffer.toString('binary'));
  const signature = forge.util.decode64(signatureB64);
  return publicKey.verify(md.digest().bytes(), signature);
}

// Firmar con una clave privada existente
export function signWithPrivateKey(buffer, privateKeyPem) {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const md = forge.md.sha256.create();
  md.update(buffer.toString('binary'));
  const signature = privateKey.sign(md);
  return forge.util.encode64(signature);
}
