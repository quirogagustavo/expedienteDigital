import React from 'react';

function TestApp() {
  return (
    <div style={{
      padding: '20px',
      textAlign: 'center',
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{color: 'green'}}>✅ FRONTEND FUNCIONA!</h1>
      <p>Si ves este mensaje, el servidor está funcionando correctamente.</p>
      <button 
        onClick={() => alert('¡Modal de prueba!')}
        style={{
          padding: '10px 20px',
          fontSize: '18px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Probar Modal
      </button>
    </div>
  );
}

export default TestApp;