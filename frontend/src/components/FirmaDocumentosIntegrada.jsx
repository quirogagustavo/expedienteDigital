import React, { useState, useEffect } from 'react';
import FirmaUpload from './FirmaUpload';
import { uploadService } from '../services/uploadService';
import { authService } from '../services/authService';

const FirmaDocumentosIntegrada = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [signatureMode, setSignatureMode] = useState('firma_usuario');
  const [isSigningDocument, setIsSigningDocument] = useState(false);
  const [signatureResult, setSignatureResult] = useState(null);
  const [error, setError] = useState('');
  const [firmaUsuario, setFirmaUsuario] = useState(null);
  const [loadingFirma, setLoadingFirma] = useState(false);
  const [showFirmaUpload, setShowFirmaUpload] = useState(false);
  const [posicionFirma, setPosicionFirma] = useState({
    pagina: 1,
    x: 50,
    y: 50,
    ancho: 150,
    alto: 50
  });

  // Cargar firma del usuario al inicializar
  useEffect(() => {
    loadFirmaUsuario();
  }, []);

  const loadFirmaUsuario = async () => {
    try {
      setLoadingFirma(true);
      const response = await uploadService.get('/api/usuarios/mi-firma');
      setFirmaUsuario(response.data.firma);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error cargando firma del usuario:', error);
      }
      setFirmaUsuario(null);
    } finally {
      setLoadingFirma(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setSignatureResult(null);
    setError('');
  };

  const handleFirmaUploadSuccess = (data) => {
    setShowFirmaUpload(false);
    loadFirmaUsuario(); // Recargar firma del usuario
    setError('');
  };

  const handleFirmaUploadError = (errorMessage) => {
    setError('Error subiendo firma: ' + errorMessage);
  };

  const firmarDocumento = async () => {
    if (!selectedFile) {
      setError('Por favor seleccione un archivo para firmar');
      return;
    }

    if (signatureMode === 'firma_usuario' && !firmaUsuario) {
      setError('Debe tener una firma digital configurada. Suba su firma primero.');
      setShowFirmaUpload(true);
      return;
    }

    setIsSigningDocument(true);
    setError('');
    setSignatureResult(null);

    try {
      // Preparar FormData para enviar archivo
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('tipo_documento', 'no_oficial');
      formData.append('certificate_type', 'internal');
      
      // Si usamos firma de usuario, incluir configuración de posición
      if (signatureMode === 'firma_usuario') {
        formData.append('aplicar_firma_visual', 'true');
        formData.append('posicion_firma', JSON.stringify(posicionFirma));
      }

      // Llamar al endpoint de firma
      const response = await uploadService.post('/sign', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Procesar resultado
      setSignatureResult({
        success: true,
        fileName: selectedFile.name,
        timestamp: response.data.firma?.timestamp || new Date().toISOString(),
        signature: response.data.signature,
        publicKeyPem: response.data.publicKeyPem,
        documento: response.data.documento,
        firma: response.data.firma,
        usuario: response.data.usuario,
        certificado: response.data.certificado,
        fileBase64: response.data.fileBase64
      });

    } catch (error) {
      console.error('Error firmando documento:', error);
      setError('Error durante la firma: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSigningDocument(false);
    }
  };

  const descargarDocumentoFirmado = async () => {
    if (!signatureResult?.fileBase64) {
      setError('No hay documento firmado para descargar');
      return;
    }

    try {
      // Convertir base64 a blob
      const byteCharacters = atob(signatureResult.fileBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      // Crear enlace de descarga
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${signatureResult.fileName.replace(/\.[^/.]+$/, '')}_firmado.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error descargando documento:', error);
      setError('Error descargando documento: ' + error.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🔐 Firma Digital de Documentos
        </h2>
        <p className="text-gray-600">
          Firme sus documentos digitalmente usando su firma personal o certificados del sistema
        </p>
      </div>

      {/* Notificaciones */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Selección de archivo */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">1. Seleccionar Documento</h3>
        
        <div className="space-y-4">
          <input
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.txt"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          
          {selectedFile && (
            <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
              <p className="text-sm">
                <span className="font-medium">Archivo:</span> {selectedFile.name}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Tamaño:</span> {formatFileSize(selectedFile.size)}
              </p>
            </div>
          )}
          
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-2">Tipos de archivo soportados:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>PDF:</strong> Se aplicará firma digital y visual al documento</li>
              <li><strong>DOC/DOCX, TXT:</strong> Se convertirá a PDF y se firmará</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Configuración de firma */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">2. Método de Firma</h3>
        
        <div className="space-y-4">
          {/* Opción: Firma de usuario */}
          <div className="border rounded-lg p-4">
            <label className="flex items-start space-x-3">
              <input
                type="radio"
                name="signatureMode"
                value="firma_usuario"
                checked={signatureMode === 'firma_usuario'}
                onChange={(e) => setSignatureMode(e.target.value)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  🖋️ Mi Firma Digital Personal
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Usar mi firma digital personalizada almacenada en el sistema
                </div>
                
                {signatureMode === 'firma_usuario' && (
                  <div className="mt-4 space-y-4">
                    {loadingFirma ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-gray-600 mt-2">Cargando firma...</p>
                      </div>
                    ) : firmaUsuario ? (
                      <div className="bg-green-50 border border-green-200 p-4 rounded">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <img
                              src={`${uploadService.defaults.baseURL}/api/usuarios/mi-firma/imagen`}
                              alt="Mi firma"
                              className="h-12 w-auto bg-white border border-gray-200 rounded"
                              style={{ maxWidth: '100px' }}
                            />
                            <div>
                              <p className="text-sm font-medium text-green-900">Firma configurada</p>
                              <p className="text-xs text-green-700">
                                {firmaUsuario.nombre_archivo} ({formatFileSize(firmaUsuario.tamaño_archivo)})
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowFirmaUpload(!showFirmaUpload)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Cambiar firma
                          </button>
                        </div>
                        
                        {/* Configuración de posición */}
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Página</label>
                            <input
                              type="number"
                              min="1"
                              value={posicionFirma.pagina}
                              onChange={(e) => setPosicionFirma({...posicionFirma, pagina: parseInt(e.target.value) || 1})}
                              className="mt-1 block w-full text-sm border border-gray-300 rounded px-2 py-1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Pos. X</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={posicionFirma.x}
                              onChange={(e) => setPosicionFirma({...posicionFirma, x: parseInt(e.target.value) || 0})}
                              className="mt-1 block w-full text-sm border border-gray-300 rounded px-2 py-1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Ancho</label>
                            <input
                              type="number"
                              min="50"
                              max="300"
                              value={posicionFirma.ancho}
                              onChange={(e) => setPosicionFirma({...posicionFirma, ancho: parseInt(e.target.value) || 150})}
                              className="mt-1 block w-full text-sm border border-gray-300 rounded px-2 py-1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Alto</label>
                            <input
                              type="number"
                              min="30"
                              max="150"
                              value={posicionFirma.alto}
                              onChange={(e) => setPosicionFirma({...posicionFirma, alto: parseInt(e.target.value) || 50})}
                              className="mt-1 block w-full text-sm border border-gray-300 rounded px-2 py-1"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          Posición en % desde la esquina inferior izquierda de la página
                        </p>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                        <p className="text-sm text-yellow-800 mb-3">
                          No tiene una firma digital configurada. Suba su firma para usar esta opción.
                        </p>
                        <button
                          onClick={() => setShowFirmaUpload(!showFirmaUpload)}
                          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                        >
                          Subir mi firma
                        </button>
                      </div>
                    )}
                    
                    {/* Upload de firma */}
                    {showFirmaUpload && (
                      <div className="border-t pt-4">
                        <FirmaUpload
                          onUploadSuccess={handleFirmaUploadSuccess}
                          onUploadError={handleFirmaUploadError}
                          className="max-w-lg"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Opción: Certificado interno */}
          <div className="border rounded-lg p-4">
            <label className="flex items-start space-x-3">
              <input
                type="radio"
                name="signatureMode"
                value="certificado_interno"
                checked={signatureMode === 'certificado_interno'}
                onChange={(e) => setSignatureMode(e.target.value)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  🔒 Certificado Interno del Sistema
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Usar certificado digital generado automáticamente por el sistema
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Botón de firma */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">3. Firmar Documento</h3>
        
        <button
          onClick={firmarDocumento}
          disabled={!selectedFile || isSigningDocument}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center font-medium"
        >
          {isSigningDocument ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Firmando documento...
            </>
          ) : (
            '🔐 Firmar Documento'
          )}
        </button>
      </div>

      {/* Resultado de la firma */}
      {signatureResult && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-green-700 mb-4">
            ✅ Documento Firmado Exitosamente
          </h3>
          
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Información del Documento</h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Archivo:</span> {signatureResult.fileName}</p>
                  <p><span className="font-medium">Fecha de firma:</span> {new Date(signatureResult.timestamp).toLocaleString()}</p>
                  <p><span className="font-medium">Estado:</span> <span className="text-green-600">Firmado digitalmente</span></p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Información del Firmante</h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Usuario:</span> {signatureResult.usuario?.nombre_completo}</p>
                  <p><span className="font-medium">Certificado:</span> {signatureResult.certificado?.nombre_certificado}</p>
                  <p><span className="font-medium">Algoritmo:</span> {signatureResult.firma?.algoritmo}</p>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <button
                onClick={descargarDocumentoFirmado}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                📥 Descargar Documento Firmado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirmaDocumentosIntegrada;