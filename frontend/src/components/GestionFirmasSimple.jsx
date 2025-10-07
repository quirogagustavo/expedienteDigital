import React from 'react';

const GestionFirmasSimple = ({ isOpen, onClose, usuario }) => {
  console.log('GestionFirmasSimple - Props recibidas:', { isOpen, usuario });
  
  if (!isOpen) {
    console.log('GestionFirmasSimple - No abierto');
    return null;
  }

  console.log('GestionFirmasSimple - Renderizando!');

  return (
    <div 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Gestión de Firmas</h2>
          <button
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Usuario:</h3>
            <p style={{ margin: '4px 0' }}>Nombre: {usuario?.nombre_completo || 'No disponible'}</p>
            <p style={{ margin: '4px 0' }}>Email: {usuario?.email || 'No disponible'}</p>
            <p style={{ margin: '4px 0' }}>ID: {usuario?.id || 'No disponible'}</p>
          </div>
          
          <div style={{ borderTop: '1px solid #eee', paddingTop: '16px' }}>
            <p style={{ color: '#059669', fontWeight: 'bold', margin: '8px 0' }}>
              ✅ Modal funcionando correctamente!
            </p>
            <p style={{ fontSize: '14px', color: '#666', margin: '8px 0' }}>
              Este es un modal de prueba para verificar que la funcionalidad básica funciona.
            </p>
          </div>
          
          <button
            onClick={onClose}
            style={{
              width: '100%',
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '12px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default GestionFirmasSimple;