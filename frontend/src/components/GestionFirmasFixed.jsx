import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Upload, 
  Edit, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  FileSignature,
  Wand2,
  Shield,
  Key,
  Calendar
} from 'lucide-react';
import axios from 'axios';

const GestionFirmasFixed = ({ isOpen, onClose, usuario }) => {
  const [firmaManuscrita, setFirmaManuscrita] = useState(null);
  const [firmaDigital, setFirmaDigital] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previsualizacion, setPrevisualizacion] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  // Estados para certificados
  const [certificados, setCertificados] = useState([]);
  const [showCertModal, setShowCertModal] = useState(false);
  const [certFile, setCertFile] = useState(null);
  const [certPassword, setCertPassword] = useState('');
  const [certDragOver, setCertDragOver] = useState(false);
  const certInputRef = useRef();

  useEffect(() => {
    if (isOpen) {
      cargarFirmasUsuario();
      cargarCertificados();
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

  const cargarCertificados = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:4000/api/usuarios/mis-certificados', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCertificados(response.data.certificados || []);
    } catch (error) {
      console.error('Error cargando certificados:', error);
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
          estilo: 'elegante'
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

  const handleCertFileUpload = (file) => {
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ['.p12', '.pfx'];
    const fileName = file.name.toLowerCase();
    const isValidType = allowedTypes.some(ext => fileName.endsWith(ext));
    
    if (!isValidType) {
      setError('Solo se permiten archivos .p12 o .pfx');
      return;
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no puede superar los 5MB');
      return;
    }

    setCertFile(file);
    setError('');
  };

  const handleCertDrop = (e) => {
    e.preventDefault();
    setCertDragOver(false);
    const file = e.dataTransfer.files[0];
    handleCertFileUpload(file);
  };

  const subirCertificado = async () => {
    if (!certFile || !certPassword) {
      setError('Debe seleccionar un archivo y proporcionar la contraseña');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('certificado', certFile);
      formData.append('password', certPassword);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:4000/api/usuarios/subir-certificado',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      setSuccess('Certificado digital subido exitosamente');
      setShowCertModal(false);
      setCertFile(null);
      setCertPassword('');
      cargarCertificados();

    } catch (error) {
      console.error('Error subiendo certificado:', error);
      setError(error.response?.data?.error || 'Error subiendo certificado digital');
    } finally {
      setLoading(false);
    }
  };

  const eliminarCertificado = async (certId) => {
    if (!confirm('¿Está seguro de eliminar este certificado?')) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:4000/api/usuarios/certificados/${certId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Certificado eliminado exitosamente');
      cargarCertificados();
    } catch (error) {
      console.error('Error eliminando certificado:', error);
      setError('Error eliminando certificado');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const containerStyle = {
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
  };

  const modalStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
    width: '100%',
    maxWidth: '1000px',
    maxHeight: '90vh',
    overflow: 'auto'
  };

  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <FileSignature style={{ height: '24px', width: '24px', color: '#2563eb' }} />
                Gestión de Firmas
              </h2>
              <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
                Gestiona tus firmas manuscrita y digital para firmar documentos
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '28px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
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

          {loading && (
            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', border: '2px solid #3b82f6', borderTop: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <span style={{ color: '#1d4ed8' }}>Cargando firmas...</span>
            </div>
          )}

          {/* Grid de Firmas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {/* Firma Manuscrita */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit style={{ height: '20px', width: '20px', color: '#2563eb' }} />
                Firma Manuscrita
              </h3>

              {firmaManuscrita ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                    <img 
                      src={`http://localhost:4000/api/usuarios/mi-firma/imagen`}
                      alt="Mi firma manuscrita"
                      style={{ maxHeight: '80px', margin: '0 auto', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '8px', display: 'block' }}
                    />
                    <div style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
                      <p style={{ margin: '4px 0' }}><strong>Nombre:</strong> {firmaManuscrita.nombre}</p>
                      <p style={{ margin: '4px 0' }}><strong>Tipo:</strong> {firmaManuscrita.tipo.toUpperCase()}</p>
                      <p style={{ margin: '4px 0' }}><strong>Dimensiones:</strong> {firmaManuscrita.dimensiones.ancho} × {firmaManuscrita.dimensiones.alto}px</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (confirm('¿Está seguro de eliminar su firma manuscrita?')) {
                        // Lógica de eliminación aquí
                        setFirmaManuscrita(null);
                        setSuccess('Firma manuscrita eliminada');
                      }
                    }}
                    disabled={loading}
                    style={{
                      width: '100%',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      opacity: loading ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Trash2 style={{ height: '16px', width: '16px' }} />
                    Eliminar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Zona de Drop */}
                  <div
                    style={{
                      border: dragOver ? '2px dashed #3b82f6' : '2px dashed #d1d5db',
                      backgroundColor: dragOver ? '#eff6ff' : 'transparent',
                      borderRadius: '8px',
                      padding: '32px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload style={{ height: '48px', width: '48px', color: '#9ca3af', margin: '0 auto 16px' }} />
                    <p style={{ color: '#6b7280', marginBottom: '8px' }}>
                      Arrastra tu firma aquí o haz clic para seleccionar
                    </p>
                    <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                      PNG, JPG o SVG • Máximo 5MB
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                    style={{ display: 'none' }}
                  />

                  {/* Preview */}
                  {previsualizacion && (
                    <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                      <h4 style={{ fontWeight: 'bold', color: '#111827', marginBottom: '12px' }}>Vista Previa:</h4>
                      <img 
                        src={previsualizacion.url} 
                        alt="Preview firma"
                        style={{ maxHeight: '80px', margin: '0 auto', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '8px', display: 'block' }}
                      />
                      <div style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
                        <p style={{ margin: '4px 0' }}><strong>Archivo:</strong> {previsualizacion.nombre}</p>
                        <p style={{ margin: '4px 0' }}><strong>Tamaño:</strong> {previsualizacion.tamaño} KB</p>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button
                          onClick={() => setPrevisualizacion(null)}
                          style={{
                            flex: 1,
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '12px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={subirFirmaManuscrita}
                          disabled={loading}
                          style={{
                            flex: 1,
                            backgroundColor: '#2563eb',
                            color: 'white',
                            padding: '12px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            opacity: loading ? 0.5 : 1
                          }}
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
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wand2 style={{ height: '20px', width: '20px', color: '#7c3aed' }} />
                Firma Digital Automática
              </h3>

              {firmaDigital ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                    <img 
                      src={`http://localhost:4000/api/usuarios/mi-firma-digital/imagen`}
                      alt="Mi firma digital"
                      style={{ maxHeight: '80px', margin: '0 auto', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '8px', display: 'block' }}
                    />
                    <div style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
                      <p style={{ margin: '4px 0' }}><strong>Generada automáticamente</strong></p>
                      <p style={{ margin: '4px 0' }}><strong>Texto:</strong> {usuario?.nombre_completo}</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={generarFirmaDigital}
                      disabled={loading}
                      style={{
                        flex: 1,
                        backgroundColor: '#7c3aed',
                        color: 'white',
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        opacity: loading ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <Wand2 style={{ height: '16px', width: '16px' }} />
                      Regenerar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('¿Está seguro de eliminar su firma digital?')) {
                          setFirmaDigital(null);
                          setSuccess('Firma digital eliminada');
                        }
                      }}
                      disabled={loading}
                      style={{
                        backgroundColor: '#dc2626',
                        color: 'white',
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        opacity: loading ? 0.5 : 1
                      }}
                    >
                      <Trash2 style={{ height: '16px', width: '16px' }} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ textAlign: 'center', padding: '32px' }}>
                    <Wand2 style={{ height: '48px', width: '48px', color: '#9ca3af', margin: '0 auto 16px' }} />
                    <p style={{ color: '#6b7280', marginBottom: '8px' }}>
                      No tienes firma digital generada
                    </p>
                    <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>
                      El sistema puede generar una firma automáticamente basada en tu nombre
                    </p>
                    
                    <button
                      onClick={generarFirmaDigital}
                      disabled={loading}
                      style={{
                        backgroundColor: '#7c3aed',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        opacity: loading ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        margin: '0 auto'
                      }}
                    >
                      <Wand2 style={{ height: '20px', width: '20px' }} />
                      {loading ? 'Generando...' : 'Generar Firma Digital'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Certificados Digitales */}
          <div style={{ marginTop: '32px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Shield style={{ height: '20px', width: '20px', color: '#059669' }} />
                Certificados Digitales
              </h3>
              <button
                onClick={() => setShowCertModal(true)}
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Upload style={{ height: '16px', width: '16px' }} />
                Subir Certificado
              </button>
            </div>

            {certificados.length > 0 ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                {certificados.map((cert) => (
                  <div key={cert.id} style={{ 
                    backgroundColor: '#f9fafb', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '6px', 
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Key style={{ height: '16px', width: '16px', color: '#059669' }} />
                        <span style={{ fontWeight: 'bold', color: '#111827' }}>{cert.nombre_certificado}</span>
                        <span style={{ 
                          fontSize: '12px', 
                          padding: '2px 8px', 
                          borderRadius: '12px',
                          backgroundColor: cert.estado === 'vigente' ? '#d1fae5' : cert.estado === 'pronto_a_vencer' ? '#fef3c7' : '#fee2e2',
                          color: cert.estado === 'vigente' ? '#065f46' : cert.estado === 'pronto_a_vencer' ? '#92400e' : '#991b1b'
                        }}>
                          {cert.estado === 'vigente' ? 'Vigente' : cert.estado === 'pronto_a_vencer' ? 'Próximo a vencer' : 'Vencido'}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          <span><strong>Emisor:</strong> {cert.emisor}</span>
                          <span><strong>Vence:</strong> {new Date(cert.fecha_expiracion).toLocaleDateString()}</span>
                          <span><strong>Días restantes:</strong> {cert.dias_hasta_vencimiento}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => eliminarCertificado(cert.id)}
                      disabled={loading}
                      style={{
                        backgroundColor: '#dc2626',
                        color: 'white',
                        padding: '8px',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        opacity: loading ? 0.5 : 1
                      }}
                    >
                      <Trash2 style={{ height: '16px', width: '16px' }} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                <Shield style={{ height: '48px', width: '48px', color: '#9ca3af', margin: '0 auto 16px' }} />
                <p style={{ marginBottom: '8px' }}>No tienes certificados digitales subidos</p>
                <p style={{ fontSize: '14px' }}>Sube tu certificado .p12 o .pfx para firmar con validez legal</p>
              </div>
            )}
          </div>

          {/* Modal para subir certificado */}
          {showCertModal && (
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
              zIndex: 10000
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Subir Certificado Digital</h3>
                  <button
                    onClick={() => {
                      setShowCertModal(false);
                      setCertFile(null);
                      setCertPassword('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '20px',
                      cursor: 'pointer',
                      color: '#6b7280'
                    }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Zona de drop para certificado */}
                  <div
                    style={{
                      border: certDragOver ? '2px dashed #059669' : '2px dashed #d1d5db',
                      backgroundColor: certDragOver ? '#ecfdf5' : 'transparent',
                      borderRadius: '8px',
                      padding: '24px',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                    onDrop={handleCertDrop}
                    onDragOver={(e) => { e.preventDefault(); setCertDragOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setCertDragOver(false); }}
                    onClick={() => certInputRef.current?.click()}
                  >
                    <Shield style={{ height: '32px', width: '32px', color: '#9ca3af', margin: '0 auto 8px' }} />
                    <p style={{ color: '#6b7280', marginBottom: '4px' }}>
                      {certFile ? certFile.name : 'Arrastra tu certificado aquí o haz clic para seleccionar'}
                    </p>
                    <p style={{ color: '#9ca3af', fontSize: '12px' }}>
                      Archivos .p12 o .pfx • Máximo 5MB
                    </p>
                  </div>

                  <input
                    ref={certInputRef}
                    type="file"
                    accept=".p12,.pfx"
                    onChange={(e) => handleCertFileUpload(e.target.files[0])}
                    style={{ display: 'none' }}
                  />

                  {/* Campo de contraseña */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>
                      Contraseña del certificado:
                    </label>
                    <input
                      type="password"
                      value={certPassword}
                      onChange={(e) => setCertPassword(e.target.value)}
                      placeholder="Ingrese la contraseña del certificado"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  {/* Botones */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button
                      onClick={() => {
                        setShowCertModal(false);
                        setCertFile(null);
                        setCertPassword('');
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: '#6b7280',
                        color: 'white',
                        padding: '12px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={subirCertificado}
                      disabled={!certFile || !certPassword || loading}
                      style={{
                        flex: 1,
                        backgroundColor: '#059669',
                        color: 'white',
                        padding: '12px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        opacity: (!certFile || !certPassword || loading) ? 0.5 : 1
                      }}
                    >
                      {loading ? 'Subiendo...' : 'Subir Certificado'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Información adicional actualizada */}
          <div style={{ marginTop: '24px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#1d4ed8', marginBottom: '8px', fontSize: '16px' }}>
              ℹ️ Información sobre Firmas y Certificados
            </h4>
            <div style={{ color: '#1e40af', fontSize: '14px', lineHeight: '1.5' }}>
              <p style={{ margin: '4px 0' }}><strong>Firma Manuscrita:</strong> Tu firma escaneada o dibujada que aparecerá visualmente en los documentos.</p>
              <p style={{ margin: '4px 0' }}><strong>Firma Digital Automática:</strong> Una firma tipográfica generada automáticamente con tu nombre.</p>
              <p style={{ margin: '4px 0' }}><strong>Certificados Digitales:</strong> Certificados .p12/.pfx emitidos por autoridades certificadoras para firmas con validez legal.</p>
              <p style={{ margin: '4px 0' }}><strong>Seguridad:</strong> Los certificados digitales garantizan la autenticidad, integridad y no repudio de los documentos firmados.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestionFirmasFixed;