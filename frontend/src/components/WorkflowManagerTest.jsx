import React from 'react';

const WorkflowManagerTest = ({ expedienteId, expediente, onClose }) => {
  console.log('=== WORKFLOW MANAGER TEST RENDERIZADO ===');
  console.log('Props recibidas:', { expedienteId, expediente, onClose });

  return (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 0, 0, 0.9)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '10px',
          textAlign: 'center',
          maxWidth: '600px',
          width: '100%'
        }}
      >
        <h1 style={{ color: 'black', fontSize: '24px', marginBottom: '20px' }}>
          MODAL DE PRUEBA - WORKFLOW
        </h1>
        <p style={{ color: 'black', marginBottom: '10px' }}>
          Expediente ID: {expedienteId}
        </p>
        <p style={{ color: 'black', marginBottom: '10px' }}>
          Número: {expediente?.numero_expediente}
        </p>
        <p style={{ color: 'black', marginBottom: '20px' }}>
          Título: {expediente?.titulo}
        </p>
        <button 
          onClick={onClose}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Cerrar Modal
        </button>
      </div>
    </div>
  );
};

export default WorkflowManagerTest;