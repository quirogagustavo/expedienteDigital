import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TestGestionFirmas = ({ isOpen, onClose, usuario }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  console.log('TestGestionFirmas - Props recibidas:', { isOpen, usuario });

  useEffect(() => {
    if (isOpen) {
      testearConexion();
    }
  }, [isOpen]);

  const testearConexion = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      console.log('Token obtenido:', token ? 'Existe' : 'No existe');
      
      if (!token) {
        setError('No hay token de autenticación');
        return;
      }

      // Probar conexión simple
      const response = await axios.get('http://localhost:4000/api/usuarios/mi-firma', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Respuesta exitosa:', response.data);
      setData(response.data);
      
    } catch (error) {
      console.error('Error en petición:', error);
      setError(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Test - Gestión de Firmas</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <strong>Usuario recibido:</strong>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {JSON.stringify(usuario, null, 2)}
            </pre>
          </div>

          <div>
            <strong>Estado de carga:</strong> {loading ? 'Cargando...' : 'Idle'}
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}

          {data && (
            <div>
              <strong>Datos obtenidos:</strong>
              <pre className="bg-gray-100 p-2 rounded text-sm">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}

          <button
            onClick={testearConexion}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Probando...' : 'Probar Conexión'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestGestionFirmas;