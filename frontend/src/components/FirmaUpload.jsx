import React, { useState, useRef, useCallback } from 'react';
import { uploadService } from '../services/uploadService';

const FirmaUpload = ({ 
  onUploadSuccess = () => {}, 
  onUploadError = () => {},
  className = '',
  showPreview = true,
  maxFileSize = 5 * 1024 * 1024, // 5MB
  allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState({
    file: null,
    preview: null,
    uploading: false,
    progress: 0,
    error: null,
    validation: null
  });

  const fileInputRef = useRef(null);

  // Validar archivo
  const validateFile = useCallback((file) => {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Validar tipo
    if (!allowedTypes.includes(file.type)) {
      validation.valid = false;
      validation.errors.push('Tipo de archivo no permitido. Use PNG, JPG o SVG.');
    }

    // Validar tamaño
    if (file.size > maxFileSize) {
      validation.valid = false;
      validation.errors.push(`Archivo demasiado grande. Máximo ${formatFileSize(maxFileSize)}.`);
    }

    // Validar nombre
    if (file.name.length > 100) {
      validation.warnings.push('El nombre del archivo es muy largo.');
    }

    // Sugerencias por tipo
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      validation.warnings.push('Considere usar PNG para mejor calidad con fondo transparente.');
    }

    if (file.size > 1024 * 1024) { // 1MB
      validation.warnings.push('Para mejor rendimiento, mantenga el archivo bajo 1MB.');
    }

    return validation;
  }, [allowedTypes, maxFileSize]);

  // Crear preview
  const createPreview = useCallback((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }, []);

  // Procesar archivo seleccionado
  const processFile = useCallback(async (file) => {
    setUploadState(prev => ({ 
      ...prev, 
      error: null, 
      validation: null 
    }));

    // Validar archivo
    const validation = validateFile(file);
    
    if (!validation.valid) {
      setUploadState(prev => ({
        ...prev,
        error: validation.errors.join(' '),
        validation
      }));
      return;
    }

    // Crear preview
    const preview = showPreview ? await createPreview(file) : null;

    setUploadState(prev => ({
      ...prev,
      file,
      preview,
      validation,
      error: null
    }));

  }, [validateFile, createPreview, showPreview]);

  // Validar archivo en el servidor (opcional)
  const validateOnServer = useCallback(async (file) => {
    try {
      const formData = new FormData();
      formData.append('firma', file);

      const response = await uploadService.post('/api/firmas/validar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      return { valid: true, data: response.data };
    } catch (error) {
      return { 
        valid: false, 
        error: error.response?.data?.error || 'Error validando archivo' 
      };
    }
  }, []);

  // Subir archivo
  const uploadFile = useCallback(async () => {
    if (!uploadState.file) return;

    try {
      setUploadState(prev => ({ 
        ...prev, 
        uploading: true, 
        progress: 0, 
        error: null 
      }));

      // Validación adicional en servidor (opcional)
      const serverValidation = await validateOnServer(uploadState.file);
      if (!serverValidation.valid) {
        throw new Error(serverValidation.error);
      }

      // Preparar FormData
      const formData = new FormData();
      formData.append('firma', uploadState.file);

      // Subir archivo con progreso
      const response = await uploadService.post('/api/usuarios/mi-firma', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100
          );
          setUploadState(prev => ({ ...prev, progress }));
        }
      });

      // Éxito
      setUploadState({
        file: null,
        preview: null,
        uploading: false,
        progress: 0,
        error: null,
        validation: null
      });

      onUploadSuccess(response.data);

      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        progress: 0,
        error: errorMessage
      }));
      onUploadError(errorMessage);
    }
  }, [uploadState.file, validateOnServer, onUploadSuccess, onUploadError]);

  // Limpiar upload
  const clearUpload = useCallback(() => {
    setUploadState({
      file: null,
      preview: null,
      uploading: false,
      progress: 0,
      error: null,
      validation: null
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handlers para drag & drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, [processFile]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`firma-upload ${className}`}>
      {/* Zona de Drop */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : uploadState.error 
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }
          ${uploadState.uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploadState.uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploadState.uploading}
        />

        {uploadState.uploading ? (
          <div className="space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600">Subiendo firma...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadState.progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">{uploadState.progress}%</p>
          </div>
        ) : uploadState.file ? (
          <div className="space-y-4">
            {/* Preview */}
            {uploadState.preview && showPreview && (
              <div className="flex justify-center">
                <img 
                  src={uploadState.preview} 
                  alt="Preview de firma" 
                  className="max-h-24 max-w-48 bg-white border border-gray-200 rounded"
                />
              </div>
            )}
            
            {/* Info del archivo */}
            <div>
              <p className="font-medium text-gray-900">{uploadState.file.name}</p>
              <p className="text-sm text-gray-600">
                {formatFileSize(uploadState.file.size)} • {uploadState.file.type.split('/')[1]?.toUpperCase()}
              </p>
            </div>

            {/* Validaciones */}
            {uploadState.validation?.warnings?.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-sm text-yellow-800 font-medium mb-1">Advertencias:</p>
                <ul className="text-xs text-yellow-700 space-y-1">
                  {uploadState.validation.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Botones */}
            <div className="flex space-x-3 justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  uploadFile();
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Subir Firma
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearUpload();
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path 
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
                strokeWidth={2} 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
            <div>
              <p className="text-sm text-gray-600">
                <span className="font-medium text-blue-600">Haz clic para seleccionar</span> o arrastra tu firma aquí
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, SVG hasta {formatFileSize(maxFileSize)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {uploadState.error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
          <p className="text-sm text-red-700">{uploadState.error}</p>
        </div>
      )}

      {/* Consejos */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
        <p className="text-sm text-blue-900 font-medium mb-2">Consejos para una buena firma:</p>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Use PNG con fondo transparente para mejor calidad</li>
          <li>• Mantenga dimensiones razonables (máx. 800x200px)</li>
          <li>• Asegúrese de que la firma sea clara y legible</li>
          <li>• Evite imágenes con mucho ruido o compresión</li>
        </ul>
      </div>
    </div>
  );
};

export default FirmaUpload;