import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const ExpedientePreview = ({ expedienteId, onClose }) => {
  const [previewData, setPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);

  useEffect(() => {
    const fetchPreviewData = async () => {
      try {
        console.log('Cargando preview para expediente:', expedienteId);
        setIsLoading(true);
        setError(null);
        
        // Obtener el token JWT desde localStorage o contexto
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:4000/api/expedientes/${expedienteId}/preview`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log('Datos recibidos:', response.data);
        
        setPreviewData(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error al obtener preview:', error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    if (expedienteId) {
      fetchPreviewData();
    }
  }, [expedienteId]);

  const modalStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 999999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px'
  };

  const contentStyles = {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '95%',
    height: '95%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  };

  if (isLoading) {
    return (
      <div style={modalStyles}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          textAlign: 'center',
          minWidth: '300px'
        }}>
          <h3>Cargando preview del expediente...</h3>
          <p>Por favor espere mientras se cargan los documentos.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={modalStyles}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          textAlign: 'center',
          minWidth: '300px'
        }}>
          <h3 style={{ color: 'red', marginBottom: '20px' }}>Error</h3>
          <p>No se pudo cargar el preview: {error}</p>
          <button 
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  if (!previewData || !previewData.documentos || previewData.documentos.length === 0) {
    return (
      <div style={modalStyles}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          textAlign: 'center',
          minWidth: '300px'
        }}>
          <h3>Sin documentos</h3>
          <p>No hay documentos para mostrar en este expediente.</p>
          <button 
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const currentDocument = previewData.documentos[currentDocumentIndex];

  const nextDocument = () => {
    if (currentDocumentIndex < previewData.documentos.length - 1) {
      setCurrentDocumentIndex(currentDocumentIndex + 1);
    }
  };

  const prevDocument = () => {
    if (currentDocumentIndex > 0) {
      setCurrentDocumentIndex(currentDocumentIndex - 1);
    }
  };

  return (
    <div style={modalStyles}>
      <div style={contentStyles}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '2px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <div>
            <h2 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '24px', 
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              📁 Expediente: {previewData.numero_expediente}
            </h2>
            <p style={{ 
              margin: 0, 
              color: '#6b7280', 
              fontSize: '16px'
            }}>
              {previewData.caratula}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '12px',
              border: 'none',
              backgroundColor: '#ef4444',
              color: 'white',
              cursor: 'pointer',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              fontSize: '16px'
            }}
            title="Cerrar preview"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f1f5f9'
        }}>
          <button
            onClick={prevDocument}
            disabled={currentDocumentIndex === 0}
            style={{
              padding: '10px 16px',
              border: '1px solid #d1d5db',
              backgroundColor: currentDocumentIndex === 0 ? '#f9fafb' : '#ffffff',
              color: currentDocumentIndex === 0 ? '#9ca3af' : '#374151',
              borderRadius: '6px',
              cursor: currentDocumentIndex === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <ChevronLeft size={16} />
            Anterior
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '14px',
            color: '#4b5563',
            fontWeight: '500'
          }}>
            <span style={{ color: '#1f2937' }}>
              📄 Documento {currentDocumentIndex + 1} de {previewData.documentos.length}
            </span>
            <span style={{ color: '#6b7280' }}>|</span>
            <span style={{ fontWeight: 'bold' }}>{currentDocument.nombre_archivo}</span>
            <span style={{ color: '#6b7280' }}>|</span>
            <span>Fojas: {currentDocument.foja_inicial} - {currentDocument.foja_final}</span>
          </div>

          <button
            onClick={nextDocument}
            disabled={currentDocumentIndex === previewData.documentos.length - 1}
            style={{
              padding: '10px 16px',
              border: '1px solid #d1d5db',
              backgroundColor: currentDocumentIndex === previewData.documentos.length - 1 ? '#f9fafb' : '#ffffff',
              color: currentDocumentIndex === previewData.documentos.length - 1 ? '#9ca3af' : '#374151',
              borderRadius: '6px',
              cursor: currentDocumentIndex === previewData.documentos.length - 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            Siguiente
            <ChevronRight size={16} />
          </button>
        </div>

        {/* PDF Viewer */}
        <div style={{
          flex: 1,
          padding: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          {currentDocument.contenido_base64 ? (
            <iframe
              src={`data:application/pdf;base64,${currentDocument.contenido_base64}`}
              style={{
                width: '100%',
                height: '100%',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: 'white'
              }}
              title={`Preview de ${currentDocument.nombre_archivo}`}
            />
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#6b7280',
              padding: '40px'
            }}>
              <h3>❌ Error de contenido</h3>
              <p>No se pudo cargar el contenido del documento</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          borderTop: '2px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#4b5563',
            fontWeight: '500'
          }}>
            📊 Total de páginas en el expediente: {' '}
            <strong>{previewData.documentos.reduce((total, doc) => total + (doc.cantidad_paginas || 0), 0)}</strong>
          </div>

          <a
            href={`http://localhost:4000/api/expedientes/${expedienteId}/documento/${currentDocument.id}/download`}
            download
            style={{
              padding: '12px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
          >
            <Download size={16} />
            Descargar documento actual
          </a>
        </div>
      </div>
    </div>
  );
};

export default ExpedientePreview;