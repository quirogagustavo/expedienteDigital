import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Upload, 
  Edit, 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Star,
  Image as ImageIcon,
  Download,
  FileSignature,
  Wand2
} from 'lucide-react';
import axios from 'axios';

const GestionFirmas = ({ isOpen, onClose, usuario }) => {
  const [firmaManuscrita, setFirmaManuscrita] = useState(null);
  const [firmaDigital, setFirmaDigital] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previsualizacion, setPrevisualizacion] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();



  useEffect(() => {

    if (isOpen) {
      cargarFirmasUsuario();
    }
  }, [isOpen]);

  const cargarFirmasUsuario = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('http://localhost:4000/api/usuarios/mi-firma', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.tiene_firma) {
        setFirmaManuscrita(response.data.firma);
      }

      // Verificar si tiene firma digital generada automáticamente
      try {
        const digitalResponse = await axios.get('http://localhost:4000/api/usuarios/mi-firma-digital', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFirmaDigital(digitalResponse.data.firma);
      } catch (err) {
        // No tiene firma digital generada
        setFirmaDigital(null);
      }

    } catch (error) {
      console.error('Error cargando firmas:', error);
      setError('Error cargando firmas del usuario: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file) => {
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('Solo se permiten archivos PNG, JPG o SVG');
      return;
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no puede superar los 5MB');
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPrevisualizacion({
        url: e.target.result,
        file: file,
        nombre: file.name,
        tamaño: (file.size / 1024).toFixed(2)
      });
    };
    reader.readAsDataURL(file);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const subirFirmaManuscrita = async () => {
    if (!previsualizacion) {
      setError('Debe seleccionar una imagen');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('firma', previsualizacion.file);
      formData.append('nombre_firma', `Firma ${usuario.nombre_completo}`);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:4000/api/usuarios/mi-firma',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      setSuccess('Firma manuscrita subida exitosamente');
      setFirmaManuscrita(response.data.firma);
      setPrevisualizacion(null);
      
    } catch (error) {
      console.error('Error subiendo firma:', error);
      setError(error.response?.data?.error || 'Error subiendo firma manuscrita');
    } finally {
      setLoading(false);
    }
  };

  const generarFirmaDigital = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        'http://localhost:4000/api/usuarios/generar-firma-digital',
        {
          texto: usuario.nombre_completo,
          estilo: 'elegante' // Estilo por defecto
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSuccess('Firma digital generada exitosamente');
      setFirmaDigital(response.data.firma);
      
    } catch (error) {
      console.error('Error generando firma digital:', error);
      setError(error.response?.data?.error || 'Error generando firma digital');
    } finally {
      setLoading(false);
    }
  };

  const eliminarFirma = async (tipo) => {
    if (!confirm(`¿Está seguro de eliminar su firma ${tipo}?`)) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (tipo === 'manuscrita') {
        await axios.delete(`http://localhost:4000/api/usuarios/mi-firma/${firmaManuscrita.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFirmaManuscrita(null);
      } else {
        await axios.delete(`http://localhost:4000/api/usuarios/mi-firma-digital/${firmaDigital.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFirmaDigital(null);
      }

      setSuccess(`Firma ${tipo} eliminada exitosamente`);
      
    } catch (error) {
      console.error('Error eliminando firma:', error);
      setError(error.response?.data?.error || `Error eliminando firma ${tipo}`);
    } finally {
      setLoading(false);
    }
  };

  console.log('GestionFirmas render - isOpen:', isOpen, 'usuario:', usuario);
  
  if (!isOpen) {
    console.log('GestionFirmas - No renderizando, isOpen es false');
    return null;
  }
  
  console.log('GestionFirmas - Renderizando modal');

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
        width: '100%',
        maxWidth: '1024px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <FileSignature style={{ height: '24px', width: '24px', color: '#2563eb' }} />
                Gestión de Firmas
              </h2>
              <p style={{ color: '#6b7280', marginTop: '4px' }}>
                Gestiona tus firmas manuscrita y digital para firmar documentos
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '32px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Usuario Info */}
          <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <User style={{ height: '32px', width: '32px', color: '#6b7280' }} />
              <div>
                <h3 style={{ fontWeight: 'bold', color: '#111827', margin: 0 }}>{usuario?.nombre_completo}</h3>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{usuario?.email}</p>
              </div>
            </div>
          </div>

          {/* Mensajes */}
          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle style={{ height: '20px', width: '20px', color: '#ef4444' }} />
              <span style={{ color: '#dc2626', flex: 1 }}>{error}</span>
              <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
          )}

          {success && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle style={{ height: '20px', width: '20px', color: '#22c55e' }} />
              <span style={{ color: '#16a34a', flex: 1 }}>{success}</span>
              <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
          )}

          {/* Indicador de carga inicial */}
          {loading && (
            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', border: '2px solid #3b82f6', borderTop: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <span style={{ color: '#1d4ed8' }}>Cargando firmas...</span>
            </div>
          )}

          <style>
            {`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}
          </style>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {/* Firma Manuscrita */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                Firma Manuscrita
              </h3>

              {firmaManuscrita ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <img 
                      src={`http://localhost:4000/api/usuarios/mi-firma/imagen`}
                      alt="Mi firma manuscrita"
                      className="max-h-20 mx-auto bg-white border border-gray-200 rounded p-2"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="mt-3 text-sm text-gray-600 text-center">
                      <p><strong>Nombre:</strong> {firmaManuscrita.nombre}</p>
                      <p><strong>Tipo:</strong> {firmaManuscrita.tipo.toUpperCase()}</p>
                      <p><strong>Dimensiones:</strong> {firmaManuscrita.dimensiones.ancho} × {firmaManuscrita.dimensiones.alto}px</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => eliminarFirma('manuscrita')}
                      disabled={loading}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Zona de Drop */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      dragOver 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      Arrastra tu firma aquí o haz clic para seleccionar
                    </p>
                    <p className="text-gray-500 text-sm">
                      PNG, JPG o SVG • Máximo 5MB
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                    className="hidden"
                  />

                  {/* Preview */}
                  {previsualizacion && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Vista Previa:</h4>
                      <img 
                        src={previsualizacion.url} 
                        alt="Preview firma"
                        className="max-h-20 mx-auto bg-white border border-gray-200 rounded p-2"
                      />
                      <div className="mt-3 text-sm text-gray-600 text-center">
                        <p><strong>Archivo:</strong> {previsualizacion.nombre}</p>
                        <p><strong>Tamaño:</strong> {previsualizacion.tamaño} KB</p>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => setPrevisualizacion(null)}
                          className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={subirFirmaManuscrita}
                          disabled={loading}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {loading ? 'Subiendo...' : 'Guardar Firma'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Firma Digital */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-purple-600" />
                Firma Digital Automática
              </h3>

              {firmaDigital ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <img 
                      src={`http://localhost:4000/api/usuarios/mi-firma-digital/imagen`}
                      alt="Mi firma digital"
                      className="max-h-20 mx-auto bg-white border border-gray-200 rounded p-2"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="mt-3 text-sm text-gray-600 text-center">
                      <p><strong>Generada automáticamente</strong></p>
                      <p><strong>Texto:</strong> {usuario.nombre_completo}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => generarFirmaDigital()}
                      disabled={loading}
                      className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Wand2 className="h-4 w-4" />
                      Regenerar
                    </button>
                    <button
                      onClick={() => eliminarFirma('digital')}
                      disabled={loading}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <Wand2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      No tienes firma digital generada
                    </p>
                    <p className="text-gray-500 text-sm mb-4">
                      El sistema puede generar una firma automáticamente basada en tu nombre
                    </p>
                    
                    <button
                      onClick={generarFirmaDigital}
                      disabled={loading}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
                    >
                      <Wand2 className="h-5 w-5" />
                      {loading ? 'Generando...' : 'Generar Firma Digital'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Información sobre las Firmas
            </h4>
            <div className="text-blue-800 text-sm space-y-1">
              <p><strong>Firma Manuscrita:</strong> Tu firma escaneada o dibujada que aparecerá visualmente en los documentos.</p>
              <p><strong>Firma Digital:</strong> Una firma tipográfica generada automáticamente con tu nombre para casos donde no tengas manuscrita.</p>
              <p><strong>Seguridad:</strong> Ambas firmas se combinan con certificados digitales para garantizar la autenticidad e integridad de los documentos.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestionFirmas;