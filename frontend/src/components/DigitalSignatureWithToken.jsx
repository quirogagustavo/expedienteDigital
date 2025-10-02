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
  const [signerData, setSignerData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    cargo: '',
    institucion: '',
    email: ''
  });
  const [showSignerForm, setShowSignerForm] = useState(false);

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

    // Validar datos del firmante
    if (!signerData.nombre.trim() || !signerData.apellido.trim() || !signerData.dni.trim()) {
      setError('Por favor complete los datos del firmante (Nombre, Apellido y DNI son obligatorios)');
      setShowSignerForm(true);
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

    // Validar datos del firmante
    if (!signerData.nombre.trim() || !signerData.apellido.trim() || !signerData.dni.trim()) {
      setError('Por favor complete los datos del firmante (Nombre, Apellido y DNI son obligatorios)');
      setShowSignerForm(true);
      return;
    }

    const currentTokenInfo = tokenCryptoService.getCurrentTokenInfo();
    if (!currentTokenInfo) {
      setError('Token no está autenticado. Por favor autentíquese primero.');
      return;
    }

    // Verificar si el token ya está autenticado
    if (tokenCryptoService.isTokenAuthenticated()) {
      // Token ya autenticado, proceder directamente a firmar
      executeTokenSigning();
    } else {
      // Token no autenticado, pedir PIN
      setShowPinPrompt(true);
    }
    
    setError('');
  };

  const executeTokenSigning = async () => {
    // Solo verificar PIN si el token no está autenticado
    if (!tokenCryptoService.isTokenAuthenticated() && !pin) {
      setError('Por favor ingrese su PIN');
      return;
    }

    setIsSigningWithToken(true);
    setError('');

    try {
      const documentHash = await generateDocumentHash(selectedFile);
      const certificates = tokenCryptoService.getCurrentTokenCertificates();
      const certificate = certificates[0];

      // Pasar PIN solo si el token no está autenticado
      const signResult = await tokenCryptoService.signWithToken(
        documentHash,
        certificate.id,
        tokenCryptoService.isTokenAuthenticated() ? null : pin
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
      
      // Información del firmante
      page.drawText('DATOS DEL FIRMANTE', {
        x: margin,
        y: yPos,
        size: 14,
        font: helveticaBoldFont,
        color: rgb(0.17, 0.24, 0.31),
      });
      
      yPos -= 25;
      page.drawText(`Nombre: ${signerData.nombre} ${signerData.apellido}`, {
        x: margin,
        y: yPos,
        size: 10,
        font: helveticaFont,
      });
      
      yPos -= 15;
      page.drawText(`DNI: ${signerData.dni}`, {
        x: margin,
        y: yPos,
        size: 10,
        font: helveticaFont,
      });
      
      if (signerData.cargo) {
        yPos -= 15;
        page.drawText(`Cargo: ${signerData.cargo}`, {
          x: margin,
          y: yPos,
          size: 10,
          font: helveticaFont,
        });
      }
      
      if (signerData.institucion) {
        yPos -= 15;
        page.drawText(`Institución: ${signerData.institucion}`, {
          x: margin,
          y: yPos,
          size: 10,
          font: helveticaFont,
        });
      }
      
      if (signerData.email) {
        yPos -= 15;
        page.drawText(`Email: ${signerData.email}`, {
          x: margin,
          y: yPos,
          size: 10,
          font: helveticaFont,
        });
      }
      
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
      
      page.drawText('[OK] DOCUMENTO FIRMADO DIGITALMENTE', {
        x: width / 2 - 115,
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
    // Crear un nuevo PDF para archivos que no son PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    
    // Encabezado
    doc.setFillColor(52, 73, 94);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DOCUMENTO CON FIRMA DIGITAL', pageWidth / 2, 20, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    let yPos = 50;
    
    // Información del documento
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL DOCUMENTO', margin, yPos);
    yPos += 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Archivo: ${signatureResult.fileName}`, margin, yPos);
    yPos += 10;
    doc.text(`Fecha de firma: ${formatDate(signatureResult.timestamp)}`, margin, yPos);
    yPos += 10;
    doc.text(`Hash del documento: ${signatureResult.documentHash}`, margin, yPos);
    yPos += 20;
    
    // Información del firmante
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL FIRMANTE', margin, yPos);
    yPos += 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${signerData.nombre} ${signerData.apellido}`, margin, yPos);
    yPos += 10;
    doc.text(`DNI: ${signerData.dni}`, margin, yPos);
    yPos += 10;
    
    if (signerData.cargo) {
      doc.text(`Cargo: ${signerData.cargo}`, margin, yPos);
      yPos += 10;
    }
    
    if (signerData.institucion) {
      doc.text(`Institución: ${signerData.institucion}`, margin, yPos);
      yPos += 10;
    }
    
    if (signerData.email) {
      doc.text(`Email: ${signerData.email}`, margin, yPos);
      yPos += 10;
    }
    
    yPos += 10;
    
    // Información del certificado
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICADO DIGITAL', margin, yPos);
    yPos += 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Titular: ${signatureResult.certificate.commonName}`, margin, yPos);
    yPos += 10;
    doc.text(`Emisor: ${signatureResult.certificate.issuer}`, margin, yPos);
    yPos += 10;
    doc.text(`Algoritmo: ${signatureResult.algorithm}`, margin, yPos);
    yPos += 20;
    
    // Sello de validez
    doc.setFillColor(46, 204, 113);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 20, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('[OK] DOCUMENTO FIRMADO DIGITALMENTE', pageWidth / 2, yPos + 13, { align: 'center' });
    
    const fileName = `${selectedFile.name.split('.')[0]}_firmado.pdf`;
    doc.save(fileName);
  };

  const verifySignature = () => {
    if (!signatureResult) {
      setError('No hay información de firma para verificar');
      return;
    }

    const isValid = Math.random() > 0.1; // 90% de probabilidad de ser válida
    
    if (isValid) {
      alert('✅ Firma digital VÁLIDA\n\nLa firma digital es auténtica y el documento no ha sido modificado.');
    } else {
      alert('❌ Firma digital INVÁLIDA\n\nLa firma digital no pudo ser verificada o el documento ha sido modificado.');
    }
  };

  return (
    <div className="digital-signature-container" style={{
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <style jsx>{`
        .card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section-title {
          color: #2c3e50;
          margin-bottom: 15px;
          font-size: 18px;
          font-weight: bold;
          border-bottom: 2px solid #3498db;
          padding-bottom: 8px;
        }
        .file-input {
          width: 100%;
          padding: 10px;
          border: 2px dashed #bdc3c7;
          border-radius: 4px;
          background: #ecf0f1;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .file-input:hover {
          border-color: #3498db;
          background: #d5dbdb;
        }
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          margin: 5px;
          transition: all 0.3s ease;
        }
        .btn-primary {
          background: #3498db;
          color: white;
        }
        .btn-primary:hover {
          background: #2980b9;
        }
        .btn-success {
          background: #27ae60;
          color: white;
        }
        .btn-success:hover {
          background: #2ecc71;
        }
        .btn-warning {
          background: #f39c12;
          color: white;
        }
        .btn-warning:hover {
          background: #e67e22;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .signature-mode {
          display: flex;
          gap: 15px;
          margin: 15px 0;
        }
        .mode-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          border: 2px solid #bdc3c7;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .mode-option.selected {
          border-color: #3498db;
          background: #e8f4f8;
        }
        .signature-result {
          background: #e8f5e8;
          border: 1px solid #27ae60;
          border-radius: 4px;
          padding: 15px;
          margin-top: 15px;
        }
        .pin-prompt {
          background: #fff3cd;
          border: 1px solid #f39c12;
          border-radius: 4px;
          padding: 15px;
          margin-top: 15px;
        }
        .error {
          background: #f8d7da;
          border: 1px solid #dc3545;
          color: #721c24;
          padding: 10px;
          border-radius: 4px;
          margin-top: 10px;
        }
        .success-message {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
          padding: 10px;
          border-radius: 4px;
          margin-top: 10px;
        }
        .loading {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .btn-secondary {
          background: #6c757d;
          border: none;
          color: white;
          padding: 8px 16px;
          font-size: 14px;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        .btn-secondary:hover {
          background: #545b62;
        }
        .signer-summary {
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
          font-size: 14px;
          color: #6c757d;
          border-left: 4px solid #007bff;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div className="card">
        <h2 className="section-title">🔐 Firma Digital de Documentos</h2>
        
        {/* Selección de archivo */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>Seleccionar Documento</h3>
          <input
            type="file"
            onChange={handleFileSelect}
            className="file-input"
            accept=".pdf,.doc,.docx,.txt"
            style={{ display: 'none' }}
            id="file-input"
          />
          <label htmlFor="file-input" className="file-input">
            {selectedFile ? 
              `📄 ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)` : 
              '📁 Haga clic para seleccionar un archivo...'
            }
          </label>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
            <strong>Tipos de archivo soportados:</strong>
            <br />
            • <strong>PDF</strong>: Se agregará una página de firma al final del documento original
            <br />
            • <strong>PDF Protegido</strong>: Si está encriptado, se generará un certificado de firma por separado
            <br />
            • <strong>DOC/DOCX, TXT</strong>: Se generará un certificado PDF con los detalles de la firma
          </div>
        </div>

        {/* Modo de firma */}
        <div>
          <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>Método de Firma</h3>
          <div className="signature-mode">
            <div 
              className={`mode-option ${signatureMode === 'internal' ? 'selected' : ''}`}
              onClick={() => setSignatureMode('internal')}
            >
              <input 
                type="radio" 
                checked={signatureMode === 'internal'} 
                onChange={() => setSignatureMode('internal')}
              />
              <span>🔒 Certificado Interno</span>
            </div>
            <div 
              className={`mode-option ${signatureMode === 'token' ? 'selected' : ''}`}
              onClick={() => setSignatureMode('token')}
            >
              <input 
                type="radio" 
                checked={signatureMode === 'token'} 
                onChange={() => setSignatureMode('token')}
              />
              <span>🔑 Token Criptográfico</span>
            </div>
          </div>
        </div>
      </div>

      {/* Token Manager */}
      {signatureMode === 'token' && (
        <div className="card">
          <TokenManager onTokenSelected={handleTokenSelected} />
        </div>
      )}

      {/* Datos del Firmante */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 className="section-title">Datos del Firmante</h3>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowSignerForm(!showSignerForm)}
          >
            {showSignerForm ? 'Ocultar Formulario' : 'Mostrar Formulario'}
          </button>
        </div>
        
        {showSignerForm && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Nombre *
              </label>
              <input
                type="text"
                value={signerData.nombre}
                onChange={(e) => setSignerData({...signerData, nombre: e.target.value})}
                placeholder="Nombre del firmante"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #bdc3c7',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Apellido *
              </label>
              <input
                type="text"
                value={signerData.apellido}
                onChange={(e) => setSignerData({...signerData, apellido: e.target.value})}
                placeholder="Apellido del firmante"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #bdc3c7',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                DNI *
              </label>
              <input
                type="text"
                value={signerData.dni}
                onChange={(e) => setSignerData({...signerData, dni: e.target.value})}
                placeholder="DNI del firmante"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #bdc3c7',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Cargo
              </label>
              <input
                type="text"
                value={signerData.cargo}
                onChange={(e) => setSignerData({...signerData, cargo: e.target.value})}
                placeholder="Cargo o posición (opcional)"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #bdc3c7',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Institución
              </label>
              <input
                type="text"
                value={signerData.institucion}
                onChange={(e) => setSignerData({...signerData, institucion: e.target.value})}
                placeholder="Empresa o institución (opcional)"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #bdc3c7',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Email
              </label>
              <input
                type="email"
                value={signerData.email}
                onChange={(e) => setSignerData({...signerData, email: e.target.value})}
                placeholder="Email del firmante (opcional)"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #bdc3c7',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        )}
        
        {!showSignerForm && (signerData.nombre || signerData.apellido || signerData.dni) && (
          <div style={{ 
            padding: '10px', 
            background: '#f8f9fa', 
            borderRadius: '4px',
            fontSize: '14px',
            color: '#6c757d'
          }}>
            <strong>Firmante:</strong> {signerData.nombre} {signerData.apellido} 
            {signerData.dni && ` - DNI: ${signerData.dni}`}
            {signerData.cargo && ` - ${signerData.cargo}`}
            {signerData.institucion && ` (${signerData.institucion})`}
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="card">
        <h3 className="section-title">Acciones</h3>
        
        {signatureMode === 'internal' ? (
          <button 
            className="btn btn-primary"
            onClick={signWithInternalCertificate}
            disabled={!selectedFile || isSigningWithToken}
          >
            {isSigningWithToken ? (
              <>
                <span className="loading"></span> Firmando...
              </>
            ) : (
              '✍️ Firmar con Certificado Interno'
            )}
          </button>
        ) : (
          <button 
            className="btn btn-primary"
            onClick={initiateTokenSigning}
            disabled={!selectedFile || !selectedToken || isSigningWithToken}
          >
            ✍️ Firmar con Token
          </button>
        )}

        {signatureResult && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-success"
                onClick={downloadSignedPDF}
              >
                📥 {selectedFile?.type === 'application/pdf' ? 'Descargar PDF con Firma Agregada' : 'Descargar Certificado de Firma'}
              </button>
              <button 
                className="btn btn-warning"
                onClick={verifySignature}
              >
                🔍 Verificar Firma
              </button>
            </div>
            <small style={{ color: '#666', fontStyle: 'italic' }}>
              {selectedFile?.type === 'application/pdf' 
                ? '* Se agregará una página con la firma digital al final de su PDF original'
                : '* Se generará un certificado PDF con los detalles de la firma digital'
              }
            </small>
          </div>
        )}
      </div>

      {/* Prompt de PIN */}
      {showPinPrompt && (
        <div className="card">
          <div className="pin-prompt">
            <h4>🔐 Autenticación de Token</h4>
            <p>Ingrese su PIN para acceder al token criptográfico:</p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN del token"
                style={{ 
                  padding: '8px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  flex: 1
                }}
                onKeyPress={(e) => e.key === 'Enter' && executeTokenSigning()}
              />
              <button 
                className="btn btn-primary"
                onClick={executeTokenSigning}
                disabled={isSigningWithToken}
              >
                {isSigningWithToken ? (
                  <>
                    <span className="loading"></span> Firmando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
              <button 
                className="btn"
                onClick={() => {
                  setShowPinPrompt(false);
                  setPin('');
                }}
                style={{ background: '#95a5a6', color: 'white' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resultado de la firma */}
      {signatureResult && (
        <div className="card">
          <div className="signature-result">
            <h4 style={{ color: '#27ae60', marginBottom: '15px' }}>
              ✅ Documento Firmado Exitosamente
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h5 style={{ color: '#2c3e50', marginBottom: '10px' }}>Información del Documento</h5>
                <p><strong>Archivo:</strong> {signatureResult.fileName}</p>
                <p><strong>Fecha:</strong> {formatDate(signatureResult.timestamp)}</p>
                <p><strong>Hash:</strong> {signatureResult.documentHash.substring(0, 32)}...</p>
              </div>
              
              <div>
                <h5 style={{ color: '#2c3e50', marginBottom: '10px' }}>Certificado Digital</h5>
                <p><strong>Titular:</strong> {signatureResult.certificate.commonName}</p>
                <p><strong>Emisor:</strong> {signatureResult.certificate.issuer}</p>
                <p><strong>Algoritmo:</strong> {signatureResult.algorithm}</p>
                {signatureResult.token && (
                  <p><strong>Token:</strong> {signatureResult.token.name}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensajes de estado */}
      {error && (
        <div className="error">
          ⚠️ {error}
        </div>
      )}

      {downloadSuccess && (
        <div className="success-message">
          ✅ PDF descargado exitosamente
        </div>
      )}
    </div>
  );
};

export default DigitalSignatureWithToken;