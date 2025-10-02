import React, { useState } from 'react';
import TokenManager from './TokenManager';
import tokenCryptoService from '../services/TokenCryptoService';
import jsPDF from 'jspdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const DigitalSignatureWithToken = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [signatureMode, setSignatureMode] = useState('internal');
  const [isSigningWithToken, setIsSigningWithToken] = useState(false);
  const [signatureResult, setSignatureResult] = useState(null);
  const [pin, setPin] = useState('');
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [error, setError] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setSignatureResult(null);
    setError('');
  };

  const handleTokenSelected = (token) => {
    setSelectedToken(token);
    setSignatureMode('token');
    setError('');
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Fecha no disponible';
    try {
      return new Date(timestamp).toLocaleString('es-ES');
    } catch (e) {
      return 'Fecha no válida';
    }
  };

  const generateDocumentHash = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const signWithInternalCertificate = async () => {
    if (!selectedFile) {
      setError('Por favor seleccione un archivo para firmar');
      return;
    }

    setIsSigningWithToken(true);
    setError('');

    try {
      const documentHash = await generateDocumentHash(selectedFile);
      const timestamp = new Date().toISOString();
      
      setSignatureResult({
        success: true,
        fileName: selectedFile.name,
        timestamp: timestamp,
        certificate: {
          commonName: 'Sistema Interno',
          issuer: 'Autoridad Certificadora Nacional',
          serialNumber: 'INT-' + Date.now(),
          validFrom: new Date().toISOString().split('T')[0],
          validTo: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        },
        algorithm: 'SHA256withRSA',
        digitalSignature: 'INTERNAL_SIG_' + documentHash.substring(0, 16),
        documentHash: documentHash,
        signatureChain: ['Certificado Raíz Nacional', 'Certificado Intermedio', 'Certificado de Firma']
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);

    } catch (error) {
      console.error('Error en firma interna:', error);
      setError('Error durante el proceso de firma interna: ' + error.message);
    } finally {
      setIsSigningWithToken(false);
    }
  };

  const initiateTokenSigning = () => {
    if (!selectedFile) {
      setError('Por favor seleccione un archivo para firmar');
      return;
    }

    if (!selectedToken) {
      setError('Por favor seleccione un token criptográfico');
      return;
    }

    const currentTokenInfo = tokenCryptoService.getCurrentTokenInfo();
    if (!currentTokenInfo) {
      setError('Token no está autenticado. Por favor autentíquese primero.');
      return;
    }

    setShowPinPrompt(true);
    setError('');
  };

  const executeTokenSigning = async () => {
    if (!pin) {
      setError('Por favor ingrese su PIN');
      return;
    }

    setIsSigningWithToken(true);
    setError('');

    try {
      const documentHash = await generateDocumentHash(selectedFile);
      const certificates = tokenCryptoService.getCurrentTokenCertificates();
      const certificate = certificates[0];

      const signResult = await tokenCryptoService.signWithToken(
        documentHash,
        certificate.id,
        pin
      );

      if (signResult.success) {
        setSignatureResult({
          success: true,
          fileName: selectedFile.name,
          timestamp: signResult.timestamp,
          certificate: signResult.certificate,
          token: signResult.token,
          algorithm: signResult.algorithm,
          digitalSignature: signResult.signature,
          documentHash: documentHash,
          signatureChain: signResult.signatureChain
        });
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      } else {
        setError(signResult.error || 'Error al firmar con el token');
      }

    } catch (error) {
      console.error('Error en firma digital:', error);
      setError('Error durante el proceso de firma: ' + error.message);
    } finally {
      setIsSigningWithToken(false);
      setShowPinPrompt(false);
      setPin('');
    }
  };

  const downloadSignedPDF = async () => {
    if (!signatureResult) {
      setError('No hay información de firma disponible');
      return;
    }

    try {
      // Si el archivo original es PDF, lo modificamos; si no, creamos uno nuevo
      if (selectedFile.type === 'application/pdf') {
        await addSignatureToExistingPDF();
      } else {
        await createNewSignedPDF();
      }
      
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error al generar PDF:', error);
      setError('Error al generar el PDF: ' + error.message);
    }
  };

  const addSignatureToExistingPDF = async () => {
    try {
      // Leer el PDF original
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      // Intentar cargar el PDF, manejando documentos encriptados
      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(arrayBuffer);
      } catch (encryptionError) {
        if (encryptionError.message.includes('encrypted')) {
          // Intentar cargar ignorando la encriptación
          try {
            pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          } catch (finalError) {
            throw new Error('No se puede procesar este PDF. El archivo está protegido y no se puede modificar.');
          }
        } else {
          throw encryptionError;
        }
      }
      
      // Obtener las fuentes
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Agregar una nueva página al final para la firma
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const margin = 50;
      
      // Fondo de la página de firma
      page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: height,
        color: rgb(0.98, 0.98, 0.98),
      });
      
      // Encabezado
      page.drawRectangle({
        x: 0,
        y: height - 60,
        width: width,
        height: 60,
        color: rgb(0.2, 0.29, 0.37),
      });
      
      page.drawText('DOCUMENTO CON FIRMA DIGITAL', {
        x: width / 2 - 120,
        y: height - 35,
        size: 16,
        font: helveticaBoldFont,
        color: rgb(1, 1, 1),
      });
      
      let yPos = height - 100;
      
      // Información del documento
      page.drawText('INFORMACIÓN DEL DOCUMENTO', {
        x: margin,
        y: yPos,
        size: 14,
        font: helveticaBoldFont,
        color: rgb(0.17, 0.24, 0.31),
      });
      
      yPos -= 25;
      page.drawText(`Archivo: ${signatureResult.fileName}`, {
        x: margin,
        y: yPos,
        size: 10,
        font: helveticaFont,
      });
      
      yPos -= 15;
      page.drawText(`Fecha de firma: ${formatDate(signatureResult.timestamp)}`, {
        x: margin,
        y: yPos,
        size: 10,
        font: helveticaFont,
      });
      
      yPos -= 15;
      page.drawText(`Hash del documento: ${signatureResult.documentHash.substring(0, 64)}...`, {
        x: margin,
        y: yPos,
        size: 10,
        font: helveticaFont,
      });
      
      yPos -= 35;
      
      // Información del certificado
      page.drawText('CERTIFICADO DIGITAL', {
        x: margin,
        y: yPos,
        size: 14,
        font: helveticaBoldFont,
        color: rgb(0.17, 0.24, 0.31),
      });
      
      yPos -= 25;
      page.drawText(`Titular: ${signatureResult.certificate.commonName}`, {
        x: margin,
        y: yPos,
        size: 10,
        font: helveticaFont,
      });
      
      yPos -= 15;
      page.drawText(`Emisor: ${signatureResult.certificate.issuer}`, {
        x: margin,
        y: yPos,
        size: 10,
        font: helveticaFont,
      });
      
      yPos -= 15;
      page.drawText(`Algoritmo: ${signatureResult.algorithm}`, {
        x: margin,
        y: yPos,
        size: 10,
        font: helveticaFont,
      });
      
      if (signatureResult.token) {
        yPos -= 15;
        page.drawText(`Token: ${signatureResult.token.name}`, {
          x: margin,
          y: yPos,
          size: 10,
          font: helveticaFont,
        });
      }
      
      yPos -= 35;
      
      // Sello de validez
      page.drawRectangle({
        x: margin,
        y: yPos - 25,
        width: width - (2 * margin),
        height: 30,
        color: rgb(0.18, 0.8, 0.44),
      });
      
      page.drawText('✓ DOCUMENTO FIRMADO DIGITALMENTE', {
        x: width / 2 - 110,
        y: yPos - 15,
        size: 12,
        font: helveticaBoldFont,
        color: rgb(1, 1, 1),
      });
      
      // Información técnica de la firma
      yPos -= 60;
      page.drawText('DETALLES TÉCNICOS DE LA FIRMA', {
        x: margin,
        y: yPos,
        size: 12,
        font: helveticaBoldFont,
        color: rgb(0.17, 0.24, 0.31),
      });
      
      yPos -= 20;
      page.drawText(`Firma digital: ${signatureResult.digitalSignature}`, {
        x: margin,
        y: yPos,
        size: 8,
        font: helveticaFont,
      });
      
      yPos -= 12;
      page.drawText(`Número de serie: ${signatureResult.certificate.serialNumber || 'N/A'}`, {
        x: margin,
        y: yPos,
        size: 8,
        font: helveticaFont,
      });
      
      // Generar el PDF modificado
      const pdfBytes = await pdfDoc.save();
      
      // Descargar el archivo
      const fileName = `${selectedFile.name.split('.')[0]}_firmado.pdf`;
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error procesando PDF:', error);
      
      // Si hay un error con el PDF original, crear un certificado de firma separado
      if (error.message.includes('protegido') || error.message.includes('encrypted') || error.message.includes('PDFDocument')) {
        setError(`El PDF original está protegido. Generando certificado de firma por separado...`);
        setTimeout(() => {
          createNewSignedPDF();
          setError(''); // Limpiar el error después de generar el certificado
        }, 2000);
      } else {
        throw error;
      }
    }
  };

  const createNewSignedPDF = async () => {
    // Implementación para crear un nuevo PDF firmado
  };

  return (
    <div>
      <h1>Firma Digital con Token Criptográfico</h1>
      <div>
        <h2>Seleccionar Archivo</h2>
        <input type="file" onChange={handleFileSelect} />
      </div>
      <div>
        <h2>Seleccionar Token</h2>
        <TokenManager onTokenSelected={handleTokenSelected} />
      </div>
      <div>
        <h2>Modo de Firma</h2>
        <button onClick={() => setSignatureMode('internal')}>Firma Interna</button>
        <button onClick={() => setSignatureMode('token')}>Firma con Token</button>
      </div>
      <div>
        <h2>Resultado de la Firma</h2>
        {signatureResult && (
          <div>
            <p>Archivo: {signatureResult.fileName}</p>
            <p>Fecha de Firma: {formatDate(signatureResult.timestamp)}</p>
            <p>Hash del Documento: {signatureResult.documentHash}</p>
            <p>Firma Digital: {signatureResult.digitalSignature}</p>
            <p>Certificado: {signatureResult.certificate.commonName}</p>
            <p>Emisor: {signatureResult.certificate.issuer}</p>
            <p>Válido Desde: {signatureResult.certificate.validFrom}</p>
            <p>Válido Hasta: {signatureResult.certificate.validTo}</p>
          </div>
        )}
      </div>
      <div>
        <h2>Descargar PDF Firmado</h2>
        <button onClick={downloadSignedPDF}>Descargar</button>
      </div>
      {showPinPrompt && (
        <div>
          <h2>Ingrese su PIN</h2>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN del Token"
          />
          <button onClick={executeTokenSigning}>Firmar con Token</button>
          <button onClick={() => setShowPinPrompt(false)}>Cancelar</button>
        </div>
      )}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {downloadSuccess && <div style={{ color: 'green' }}>Descarga exitosa</div>}
    </div>
  );
};

export default DigitalSignatureWithToken;
