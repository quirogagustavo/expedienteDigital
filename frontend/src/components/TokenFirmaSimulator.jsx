import React, { useState, useEffect } from 'react';
import { Shield, Key, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const TokenFirmaSimulator = ({ documento, onFirmaExitosa, onCancel }) => {
  const [step, setStep] = useState('detecting'); // detecting, pin, signing, success, error
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [certificados, setCertificados] = useState([]);
  const [certSeleccionado, setCertSeleccionado] = useState('');
  const [tokenInfo, setTokenInfo] = useState(null);

  // Simular detección del token
  useEffect(() => {
    const detectarToken = setTimeout(() => {
      const tokenSimulado = {
        serie: 'TOK-ARG-2024-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        fabricante: 'SafeNet eToken 5110',
        version: '2.1.4',
        estado: 'conectado'
      };
      
      const certsSimulados = [
        {
          id: 'cert_1',
          nombre: 'Certificado de Firma - Juan Pérez',
          emisor: 'AFIP - Administración Federal de Ingresos Públicos',
          vencimiento: '2025-12-31',
          uso: 'Firma Digital'
        }
      ];

      setTokenInfo(tokenSimulado);
      setCertificados(certsSimulados);
      setCertSeleccionado(certsSimulados[0].id);
      setStep('pin');
    }, 2000);

    return () => clearTimeout(detectarToken);
  }, []);

  const validarPin = async () => {
    if (!pin) {
      setError('Debe ingresar el PIN del token');
      return;
    }
    
    if (pin.length < 4) {
      setError('El PIN debe tener al menos 4 dígitos');
      return;
    }

    setStep('signing');
    setError('');

    try {
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      if (Math.random() > 0.1) {
        const firmaSimulada = {
          algoritmo: 'SHA-256 with RSA',
          timestamp: new Date().toISOString(),
          certificado: certificados.find(c => c.id === certSeleccionado),
          hash: 'SHA256:' + Math.random().toString(36).substr(2, 32),
          serial: tokenInfo.serie
        };
        
        setStep('success');
        setTimeout(() => {
          onFirmaExitosa(firmaSimulada);
        }, 1500);
      } else {
        throw new Error('Error en el token durante el proceso de firma');
      }
    } catch (err) {
      setError(err.message);
      setStep('error');
    }
  };

  const reintentar = () => {
    setStep('pin');
    setPin('');
    setError('');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
      }}>
        
        <div className="text-center mb-6">
          <Shield className="w-12 h-12 mx-auto mb-3 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-800">Token de Firma Digital</h2>
          <p className="text-gray-600 mt-2">Simulador de token gubernamental argentino</p>
        </div>

        {step === 'detecting' && (
          <div className="text-center py-8">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-lg font-medium text-gray-700 mb-2">Detectando token...</p>
            <p className="text-sm text-gray-500">Conecte su token USB y espere</p>
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-700">
                💡 <strong>Simulación:</strong> Este es un token simulado para pruebas del sistema
              </p>
            </div>
          </div>
        )}

        {step === 'pin' && tokenInfo && (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-800 mb-2">✅ Token detectado exitosamente</h3>
              <div className="text-sm text-green-700 space-y-1">
                <p><strong>Serie:</strong> {tokenInfo.serie}</p>
                <p><strong>Modelo:</strong> {tokenInfo.fabricante}</p>
                <p><strong>Estado:</strong> {tokenInfo.estado}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certificado de firma
              </label>
              <select
                value={certSeleccionado}
                onChange={(e) => setCertSeleccionado(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                {certificados.filter(cert => cert.uso === 'Firma Digital').map(cert => (
                  <option key={cert.id} value={cert.id}>
                    {cert.nombre} (Vence: {cert.vencimiento})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Key className="w-4 h-4 inline mr-1" />
                PIN del token
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-lg tracking-widest"
                placeholder="••••••••"
                maxLength="8"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') validarPin();
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 <strong>Para pruebas use:</strong> 1234 o 123456
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700">❌ {error}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Documento a firmar:</h4>
              <p className="text-sm text-blue-700">{documento?.documento_nombre}</p>
              <p className="text-xs text-blue-600 mt-1">Tipo: {documento?.documento_tipo}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={validarPin}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
              >
                <Shield className="w-4 h-4 inline mr-2" />
                Firmar Documento
              </button>
              <button
                onClick={onCancel}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {step === 'signing' && (
          <div className="text-center py-8">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium text-gray-700 mb-2">Firmando documento...</p>
            <p className="text-sm text-gray-500">El token está procesando la firma digital</p>
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                🔐 Aplicando certificado digital y generando hash criptográfico...
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <p className="text-xl font-bold text-green-700 mb-2">¡Firma exitosa!</p>
            <p className="text-sm text-gray-600">El documento ha sido firmado digitalmente</p>
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-left">
              <p className="text-xs text-green-700">
                ✅ <strong>Certificado:</strong> {certificados.find(c => c.id === certSeleccionado)?.nombre}<br/>
                ✅ <strong>Algoritmo:</strong> SHA-256 with RSA<br/>
                ✅ <strong>Timestamp:</strong> {new Date().toLocaleString()}
              </p>
            </div>
            <div className="flex justify-center mt-6">
              <button
                onClick={() => {
                  const firmaSimulada = {
                    algoritmo: 'SHA-256 with RSA',
                    timestamp: new Date().toISOString(),
                    certificado: certificados.find(c => c.id === certSeleccionado),
                    hash: 'SHA256:' + Math.random().toString(36).substr(2, 32),
                    serial: tokenInfo.serie
                  };
                  onFirmaExitosa(firmaSimulada);
                }}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <p className="text-xl font-bold text-red-700 mb-2">Error de firma</p>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={reintentar}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Reintentar
              </button>
              <button
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenFirmaSimulator;