import React, { useState, useEffect } from 'react';
import { uploadService } from '../services/uploadService';
import { authService } from '../services/authService';

const FirmaManager = ({ isAdminMode = false, targetUserId = null }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(targetUserId || null);
  const [firmasUsuario, setFirmasUsuario] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadState, setUploadState] = useState({
    uploading: false,
    preview: null,
    file: null,
    error: null
  });
  const [notification, setNotification] = useState({ type: '', message: '' });

  // Cargar usuarios si es modo administrador
  useEffect(() => {
    if (isAdminMode) {
      loadUsuarios();
    }
  }, [isAdminMode]);

  // Cargar firmas cuando se selecciona un usuario
  useEffect(() => {
    if (selectedUserId) {
      loadFirmasUsuario(selectedUserId);
    }
  }, [selectedUserId]);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const response = await uploadService.get('/api/admin/usuarios');
      setUsuarios(response.data.usuarios || []);
    } catch (error) {
      showNotification('error', 'Error cargando usuarios: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadFirmasUsuario = async (userId) => {
    try {
      setLoading(true);
      const endpoint = isAdminMode 
        ? `/api/admin/usuarios/${userId}/firmas`
        : '/api/usuarios/mi-firma';
      
      const response = await uploadService.get(endpoint);
      
      if (isAdminMode) {
        setFirmasUsuario(response.data.firmas || []);
      } else {
        // Para usuarios normales, convertir la firma individual a array
        setFirmasUsuario(response.data.firma ? [response.data.firma] : []);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setFirmasUsuario([]);
      } else {
        showNotification('error', 'Error cargando firmas: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar archivo antes de procesar
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'].includes(file.type)) {
      showNotification('error', 'Solo se permiten archivos PNG, JPG o SVG');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      showNotification('error', 'El archivo no puede superar los 5MB');
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadState({
        uploading: false,
        preview: e.target.result,
        file: file,
        error: null
      });
    };
    reader.readAsDataURL(file);
  };

  const uploadFirma = async () => {
    if (!uploadState.file || !selectedUserId) return;

    try {
      setUploadState(prev => ({ ...prev, uploading: true, error: null }));

      const formData = new FormData();
      formData.append('firma', uploadState.file);

      const endpoint = isAdminMode 
        ? `/api/admin/usuarios/${selectedUserId}/firmas`
        : '/api/usuarios/mi-firma';

      const response = await uploadService.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      showNotification('success', response.data.message || 'Firma subida correctamente');
      
      // Limpiar estado de upload
      setUploadState({
        uploading: false,
        preview: null,
        file: null,
        error: null
      });

      // Recargar firmas
      await loadFirmasUsuario(selectedUserId);

      // Limpiar input file
      const fileInput = document.getElementById('firma-upload');
      if (fileInput) fileInput.value = '';

    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      setUploadState(prev => ({ ...prev, uploading: false, error: errorMsg }));
      showNotification('error', 'Error subiendo firma: ' + errorMsg);
    }
  };

  const establecerPredeterminada = async (firmaId) => {
    try {
      setLoading(true);
      
      const endpoint = isAdminMode
        ? `/api/admin/usuarios/${selectedUserId}/firmas/${firmaId}/predeterminada`
        : `/api/usuarios/mi-firma/${firmaId}/predeterminada`;

      const response = await uploadService.put(endpoint);
      
      showNotification('success', response.data.message || 'Firma establecida como predeterminada');
      await loadFirmasUsuario(selectedUserId);
    } catch (error) {
      showNotification('error', 'Error estableciendo firma predeterminada: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const eliminarFirma = async (firmaId) => {
    if (!confirm('¿Está seguro de eliminar esta firma?')) return;

    try {
      setLoading(true);
      
      const endpoint = isAdminMode
        ? `/api/admin/usuarios/${selectedUserId}/firmas/${firmaId}`
        : `/api/usuarios/mi-firma/${firmaId}`;

      const response = await uploadService.delete(endpoint);
      
      showNotification('success', response.data.message || 'Firma eliminada correctamente');
      await loadFirmasUsuario(selectedUserId);
    } catch (error) {
      showNotification('error', 'Error eliminando firma: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 5000);
  };

  const clearUpload = () => {
    setUploadState({
      uploading: false,
      preview: null,
      file: null,
      error: null
    });
    const fileInput = document.getElementById('firma-upload');
    if (fileInput) fileInput.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {isAdminMode ? 'Gestión de Firmas de Usuarios' : 'Mi Firma Digital'}
        </h2>
        <p className="text-gray-600">
          {isAdminMode 
            ? 'Administre las firmas digitales de los usuarios del sistema'
            : 'Suba y gestione su firma digital para firmar documentos automáticamente'
          }
        </p>
      </div>

      {/* Notification */}
      {notification.message && (
        <div className={`p-4 rounded-md ${
          notification.type === 'error' 
            ? 'bg-red-50 border border-red-200 text-red-700' 
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Selector de Usuario (solo para admin) */}
      {isAdminMode && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Seleccionar Usuario</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <select
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(e.target.value || null)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Seleccione un usuario...</option>
              {usuarios.map(usuario => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombre_completo} ({usuario.email}) - {usuario.rol_usuario}
                </option>
              ))}
            </select>
            
            {selectedUserId && (
              <div className="text-sm text-gray-600 flex items-center">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Usuario seleccionado: {usuarios.find(u => u.id == selectedUserId)?.nombre_completo}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Section */}
      {(!isAdminMode || selectedUserId) && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {isAdminMode ? 'Subir Nueva Firma' : 'Mi Firma Digital'}
          </h3>
          
          <div className="space-y-4">
            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar archivo de firma (PNG, JPG, SVG - máx. 5MB)
              </label>
              <input
                id="firma-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                disabled={uploadState.uploading}
              />
            </div>

            {/* Preview */}
            {uploadState.preview && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="text-center">
                  <img 
                    src={uploadState.preview} 
                    alt="Preview de firma" 
                    className="max-h-32 mx-auto mb-2 bg-white border"
                    style={{ maxWidth: '200px' }}
                  />
                  <p className="text-sm text-gray-600">
                    {uploadState.file.name} ({formatFileSize(uploadState.file.size)})
                  </p>
                </div>
              </div>
            )}

            {/* Upload Error */}
            {uploadState.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {uploadState.error}
              </div>
            )}

            {/* Action Buttons */}
            {uploadState.file && (
              <div className="flex space-x-3">
                <button
                  onClick={uploadFirma}
                  disabled={uploadState.uploading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  {uploadState.uploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Subiendo...
                    </>
                  ) : (
                    'Subir Firma'
                  )}
                </button>
                
                <button
                  onClick={clearUpload}
                  disabled={uploadState.uploading}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 disabled:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista de Firmas */}
      {(!isAdminMode || selectedUserId) && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {isAdminMode ? 'Firmas del Usuario' : 'Mis Firmas'}
          </h3>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Cargando firmas...</p>
            </div>
          ) : firmasUsuario.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No hay firmas configuradas</p>
              <p className="text-sm">Suba una imagen de su firma para comenzar</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {firmasUsuario.map((firma) => (
                <div key={firma.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Imagen de la firma */}
                      <div className="flex-shrink-0">
                        <img
                          src={`${uploadService.defaults.baseURL}${isAdminMode 
                            ? `/api/admin/usuarios/${selectedUserId}/firmas/${firma.id}/imagen`
                            : '/api/usuarios/mi-firma/imagen'
                          }`}
                          alt="Firma"
                          className="h-16 w-auto bg-white border border-gray-200 rounded"
                          style={{ maxWidth: '120px' }}
                        />
                      </div>
                      
                      {/* Información de la firma */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{firma.nombre_archivo}</h4>
                          {firma.es_predeterminada && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              Predeterminada
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {formatFileSize(firma.tamaño_archivo)} • {firma.firma_tipo?.toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Subida: {new Date(firma.fecha_subida).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {/* Acciones */}
                    <div className="flex items-center space-x-2">
                      {!firma.es_predeterminada && (
                        <button
                          onClick={() => establecerPredeterminada(firma.id)}
                          disabled={loading}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:text-gray-400"
                        >
                          Establecer predeterminada
                        </button>
                      )}
                      
                      {isAdminMode && (
                        <button
                          onClick={() => eliminarFirma(firma.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-800 text-sm font-medium disabled:text-gray-400"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Recomendaciones para firmas digitales:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use imágenes PNG con fondo transparente para mejor calidad</li>
          <li>• Dimensiones recomendadas: máximo 800x200 píxeles</li>
          <li>• Mantenga el archivo lo más pequeño posible (menos de 1MB idealmente)</li>
          <li>• La firma debe ser clara y legible</li>
          <li>• Solo se permite una firma predeterminada por usuario</li>
        </ul>
      </div>
    </div>
  );
};

export default FirmaManager;