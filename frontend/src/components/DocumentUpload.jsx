import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const DocumentUpload = ({ selectedCertificateType }) => {
  const [file, setFile] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [tipoDocumento, setTipoDocumento] = useState('no_oficial');
  const [expedienteId, setExpedienteId] = useState('');
  
  const { user, token } = useAuth();

  // Determinar tipo de firma requerida según el tipo de documento
  const getTipoFirmaRequerida = () => {
    return tipoDocumento === 'oficial' ? 'gubernamental' : 'local_o_gubernamental';
  };

  // Validar si el certificado seleccionado es compatible con el tipo de documento
  const esCertificadoCompatible = () => {
    if (tipoDocumento === 'oficial') {
      return selectedCertificateType && selectedCertificateType.type === 'government';
    }
    return true; // Los documentos no oficiales pueden usar cualquier tipo
  };

  // Obtener tiempo de procesamiento estimado
  const getTiempoProcesamiento = () => {
    if (!selectedCertificateType) return null;
    
    const tiempos = {
      'internal': 'Inmediato',
      'government': '3-5 días hábiles'
    };
    
    return tiempos[selectedCertificateType.type] || 'No especificado';
  };

  // Mostrar advertencia de tiempo si es necesario
  const mostrarAdvertenciaTiempo = () => {
    const tiempo = getTiempoProcesamiento();
    return tiempo && tiempo !== 'Inmediato';
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResponse(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !token) return;
    
    if (!selectedCertificateType) {
      setError('Debe seleccionar un tipo de certificado antes de firmar');
      return;
    }

    // Validar compatibilidad de certificado con tipo de documento
    if (!esCertificadoCompatible()) {
      setError(`Los documentos ${tipoDocumento === 'oficial' ? 'oficiales requieren certificado gubernamental' : 'no oficiales pueden usar cualquier certificado'}`);
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    
    const formData = new FormData();
    formData.append('document', file);
    formData.append('tipo_documento', tipoDocumento);
    formData.append('requiere_firma_gubernamental', tipoDocumento === 'oficial');
    if (expedienteId.trim()) {
      formData.append('expediente_id', expedienteId.trim());
    }
    formData.append('certificate_type', selectedCertificateType.type);
    
    try {
      const res = await fetch('http://localhost:4000/sign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al subir el archivo');
      }
      
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!response?.fileBase64 || !response?.filename) return;
    const link = document.createElement('a');
    link.href = `data:application/octet-stream;base64,${response.fileBase64}`;
    link.download = response.filename;
    link.click();
  };

  const handleVerifyFileChange = (e) => {
    setVerifyFile(e.target.files[0]);
    setVerifyResult(null);
    setVerifyError(null);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyFile || !response?.signature || !response?.publicKeyPem || !token) return;
    
    setVerifyLoading(true);
    setVerifyResult(null);
    setVerifyError(null);
    
    const formData = new FormData();
    formData.append('document', verifyFile);
    formData.append('signature', response.signature);
    formData.append('publicKeyPem', response.publicKeyPem);
    
    try {
      const res = await fetch('http://localhost:4000/verify', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error('Error al validar la firma');
      const data = await res.json();
      setVerifyResult(data);
    } catch (err) {
      setVerifyError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const getCertificateTypeName = () => {
    if (!selectedCertificateType) return 'Ningún certificado seleccionado';
    
    switch (selectedCertificateType.name) {
      case 'internal':
        return 'Interno';
      case 'official_government':
        return 'Oficial Gubernamental';
      case 'commercial_certified':
        return 'Comercial Certificado';
      default:
        return selectedCertificateType.name;
    }
  };

  return (
    <div className="document-upload">
      <div className="upload-section">
        <h2>📄 Firmar Documento Digital</h2>
        
        {/* Estado del certificado seleccionado */}
        <div className={`certificate-status ${selectedCertificateType ? 'selected' : 'none'}`}>
          <h3>Estado del Certificado:</h3>
          <p>
            <strong>Tipo seleccionado:</strong> {getCertificateTypeName()}
            {selectedCertificateType && (
              <>
                <br />
                <strong>Nivel de validación:</strong> {selectedCertificateType.validity_level}
              </>
            )}
          </p>
          {!selectedCertificateType && (
            <p className="warning">
              ⚠️ Debe seleccionar un tipo de certificado en la pestaña "Tipos de Certificado" antes de firmar documentos.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          {/* Nuevo: Selector de tipo de documento */}
          <div className="document-type-container">
            <label htmlFor="tipo-documento">
              🗂️ Tipo de documento:
            </label>
            <select 
              id="tipo-documento"
              value={tipoDocumento} 
              onChange={(e) => setTipoDocumento(e.target.value)}
              className="document-type-select"
            >
              <option value="no_oficial">📋 No Oficial (informes, notas, borradores)</option>
              <option value="oficial">🏛️ Oficial (actos administrativos, resoluciones)</option>
            </select>
            
            {/* Mostrar tipo de firma requerida */}
            <div className="firma-info">
              <strong>Firma requerida:</strong> 
              {tipoDocumento === 'oficial' ? (
                <span className="firma-gubernamental">
                  🔒 Gubernamental (AFIP/ONTI) - Obligatoria
                </span>
              ) : (
                <span className="firma-flexible">
                  ✅ Local o Gubernamental - Flexible
                </span>
              )}
            </div>
          </div>

          {/* Nuevo: Campo para ID de expediente */}
          <div className="expediente-container">
            <label htmlFor="expediente-id">
              📁 ID de Expediente (opcional):
            </label>
            <input 
              type="text" 
              id="expediente-id"
              value={expedienteId}
              onChange={(e) => setExpedienteId(e.target.value)}
              placeholder="Ej: EXP-2025-0123"
              className="expediente-input"
            />
          </div>

          <div className="file-input-container">
            <label htmlFor="document-file">
              📎 Seleccionar documento para firmar:
            </label>
            <input 
              type="file" 
              id="document-file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
            />
            {file && (
              <div className="file-info">
                <span className="file-name">📄 {file.name}</span>
                <span className="file-size">({(file.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}
          </div>
          
          {/* Advertencia de tiempo de procesamiento */}
          {mostrarAdvertenciaTiempo() && selectedCertificateType && (
            <div className="processing-warning">
              ⏰ <strong>Tiempo de procesamiento:</strong> {getTiempoProcesamiento()}
              <br />
              <small>El certificado requerirá tiempo adicional antes de estar disponible para firmar.</small>
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={!file || loading || !selectedCertificateType}
            className="submit-btn"
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Firmando documento...
              </>
            ) : (
              <>
                🔐 Firmar Documento
              </>
            )}
          </button>
        </form>

        {/* Resultado de la firma */}
        {response && (
          <div className="response-section success">
            <h3>✅ Documento Firmado Exitosamente</h3>
            <div className="signature-details">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Firmado por:</span>
                  <span className="value">{response.usuario.nombre_completo}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Certificado utilizado:</span>
                  <span className="value">{response.certificado.nombre_certificado}</span>
                </div>
                
                {/* Nueva información sobre tipo de documento y firma */}
                {response.documento && (
                  <>
                    <div className="detail-item">
                      <span className="label">Tipo de documento:</span>
                      <span className="value">
                        {response.documento.tipo_documento === 'oficial' 
                          ? '🏛️ Oficial (Acto Administrativo)' 
                          : '📋 No Oficial (Documento Interno)'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Tipo de firma aplicada:</span>
                      <span className={`value firma-${response.documento.estado_firma}`}>
                        {response.documento.estado_firma === 'firmado_gubernamental' 
                          ? '🔒 Firma Gubernamental Certificada' 
                          : '✍️ Firma Digital Local'}
                      </span>
                    </div>
                    {response.documento.expediente_id && (
                      <div className="detail-item">
                        <span className="label">Expediente:</span>
                        <span className="value">📁 {response.documento.expediente_id}</span>
                      </div>
                    )}
                  </>
                )}
                
                {selectedCertificateType && (
                  <div className="detail-item">
                    <span className="label">Tipo de certificado:</span>
                    <span className="value">
                      {getCertificateTypeName()} ({selectedCertificateType.validity_level})
                    </span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="label">Fecha de firma:</span>
                  <span className="value">{new Date().toLocaleString()}</span>
                </div>
              </div>
              
              <button onClick={handleDownload} className="download-btn">
                📥 Descargar Documento Original
              </button>
              
              <div className="signature-data">
                <h4>Firma Digital (Base64):</h4>
                <textarea 
                  value={response.signature} 
                  readOnly 
                  rows={3} 
                  className="signature-textarea"
                />
                
                <h4>Clave Pública del Certificado:</h4>
                <textarea 
                  value={response.publicKeyPem} 
                  readOnly 
                  rows={5} 
                  className="signature-textarea"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="error-section">
            <div className="error-icon">❌</div>
            <div className="error-content">
              <h4>Error en la Firma</h4>
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Sección de validación */}
      <div className="verify-section">
        <h2>🔍 Validar Firma Digital</h2>
        <p className="verify-description">
          Suba un documento firmado para verificar su autenticidad y validez.
        </p>
        
        <form onSubmit={handleVerify} className="verify-form">
          <div className="file-input-container">
            <label htmlFor="verify-file">
              📎 Seleccionar documento a verificar:
            </label>
            <input 
              type="file" 
              id="verify-file"
              onChange={handleVerifyFileChange}
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={!verifyFile || !response?.signature || !response?.publicKeyPem || verifyLoading}
            className="verify-btn"
          >
            {verifyLoading ? (
              <>
                <div className="spinner"></div>
                Validando...
              </>
            ) : (
              <>
                🔍 Validar Firma
              </>
            )}
          </button>
          
          {!response && (
            <p className="verify-note">
              ℹ️ Primero debe firmar un documento para poder validarlo
            </p>
          )}
        </form>

        {verifyResult && (
          <div className={`verify-result ${verifyResult.valid ? 'valid' : 'invalid'}`}>
            <div className="result-header">
              <div className="result-icon">
                {verifyResult.valid ? '✅' : '❌'}
              </div>
              <h3>
                {verifyResult.valid ? 'Firma Válida' : 'Firma Inválida'}
              </h3>
            </div>
            <div className="result-details">
              <pre>{JSON.stringify(verifyResult, null, 2)}</pre>
            </div>
          </div>
        )}

        {verifyError && (
          <div className="error-section">
            <div className="error-icon">❌</div>
            <div className="error-content">
              <h4>Error en la Validación</h4>
              <p>{verifyError}</p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .document-upload {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem 0;
        }

        .upload-section, .verify-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .upload-section h2, .verify-section h2 {
          color: #2c3e50;
          margin-bottom: 1.5rem;
          font-size: 1.8rem;
          text-align: center;
        }

        .certificate-status {
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          text-align: center;
        }

        .certificate-status.selected {
          background: #d4edda;
          border-color: #c3e6cb;
        }

        .certificate-status.none {
          background: #fff3cd;
          border-color: #ffeaa7;
        }

        .certificate-status h3 {
          margin: 0 0 1rem;
          color: #495057;
          font-size: 1.2rem;
        }

        .warning {
          color: #856404;
          margin: 0;
          font-weight: 500;
        }

        .upload-form, .verify-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          align-items: center;
        }

        /* Estilos para selector de tipo de documento */
        .document-type-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
          max-width: 500px;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #17a2b8;
        }

        .document-type-select {
          padding: 0.75rem;
          border: 1px solid #ced4da;
          border-radius: 6px;
          background: white;
          font-size: 1rem;
          cursor: pointer;
        }

        .firma-info {
          margin-top: 0.5rem;
          padding: 0.5rem;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .firma-gubernamental {
          color: #dc3545;
          font-weight: 600;
        }

        .firma-flexible {
          color: #28a745;
          font-weight: 600;
        }

        /* Estilos para campo de expediente */
        .expediente-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          width: 100%;
          max-width: 500px;
        }

        .expediente-input {
          padding: 0.75rem;
          border: 1px solid #ced4da;
          border-radius: 6px;
          font-size: 1rem;
        }

        .file-input-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
          max-width: 500px;
        }

        .file-input-container label {
          font-weight: 600;
          color: #495057;
        }

        .file-input-container input[type="file"] {
          padding: 0.75rem;
          border: 2px dashed #6c757d;
          border-radius: 8px;
          background: #f8f9fa;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .file-input-container input[type="file"]:hover {
          border-color: #007bff;
          background: #e7f3ff;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: #e3f2fd;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .file-name {
          font-weight: 500;
          color: #1976d2;
        }

        .file-size {
          color: #616161;
        }

        .submit-btn, .verify-btn, .download-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.875rem 2rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
        }

        .submit-btn:hover, .verify-btn:hover, .download-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
        }

        .submit-btn:disabled, .verify-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .download-btn {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          margin-top: 1rem;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Estilos para advertencia de tiempo de procesamiento */
        .processing-warning {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 1rem;
          border-radius: 8px;
          margin: 1rem 0;
          text-align: center;
          max-width: 500px;
        }

        .processing-warning small {
          display: block;
          margin-top: 0.5rem;
          font-style: italic;
        }

        .response-section {
          margin-top: 2rem;
          padding: 2rem;
          border-radius: 12px;
          border: 2px solid #c3e6cb;
          background: #d4edda;
        }

        .response-section h3 {
          margin: 0 0 1.5rem;
          color: #155724;
          text-align: center;
        }

        .signature-details {
          background: rgba(255, 255, 255, 0.8);
          padding: 1.5rem;
          border-radius: 8px;
        }

        .detail-grid {
          display: grid;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .detail-item .label {
          font-weight: 600;
          color: #495057;
        }

        .detail-item .value {
          color: #2c3e50;
          font-weight: 500;
        }

        /* Estilos específicos para tipos de firma */
        .firma-firmado_gubernamental {
          color: #dc3545;
          font-weight: 600;
          background: #fff5f5;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          border: 1px solid #f5c6cb;
        }

        .firma-firmado_local {
          color: #28a745;
          font-weight: 600;
          background: #f8fff8;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          border: 1px solid #c3e6cb;
        }

        .signature-data {
          margin-top: 1.5rem;
        }

        .signature-data h4 {
          margin: 1rem 0 0.5rem;
          color: #495057;
          font-size: 1rem;
        }

        .signature-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ced4da;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-size: 0.85rem;
          background: #f8f9fa;
          resize: vertical;
        }

        .error-section {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          background: #f8d7da;
          border: 2px solid #f5c6cb;
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 1rem;
        }

        .error-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .error-content h4 {
          margin: 0 0 0.5rem;
          color: #721c24;
        }

        .error-content p {
          margin: 0;
          color: #721c24;
        }

        .verify-description {
          text-align: center;
          color: #6c757d;
          margin-bottom: 1.5rem;
          font-size: 1.05rem;
        }

        .verify-note {
          text-align: center;
          color: #6c757d;
          font-size: 0.9rem;
          margin-top: 1rem;
        }

        .verify-result {
          margin-top: 2rem;
          padding: 1.5rem;
          border-radius: 8px;
          border: 2px solid;
        }

        .verify-result.valid {
          background: #d4edda;
          border-color: #c3e6cb;
          color: #155724;
        }

        .verify-result.invalid {
          background: #f8d7da;
          border-color: #f5c6cb;
          color: #721c24;
        }

        .result-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .result-icon {
          font-size: 2rem;
        }

        .result-details pre {
          background: rgba(255, 255, 255, 0.8);
          padding: 1rem;
          border-radius: 6px;
          overflow-x: auto;
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .document-upload {
            padding: 1rem 0;
          }

          .upload-section, .verify-section {
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }

          .detail-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .file-input-container {
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
};

export default DocumentUpload;