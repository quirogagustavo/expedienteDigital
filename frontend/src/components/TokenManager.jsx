import React, { useState, useEffect } from 'react';
import tokenCryptoService from '../services/TokenCryptoService';

const TokenManager = ({ onTokenSelected, onSigningComplete }) => {
  const [tokens, setTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authenticationSuccess, setAuthenticationSuccess] = useState(false);

  // Detectar tokens al cargar el componente
  useEffect(() => {
    detectTokens();
  }, []);

  const detectTokens = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await tokenCryptoService.detectConnectedTokens();
      
      if (result.success) {
        setTokens(result.tokens);
        if (result.tokens.length === 0) {
          setError('No se detectaron tokens criptográficos conectados');
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Error detectando tokens: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectToken = async (token) => {
    try {
      const result = await tokenCryptoService.selectToken(token.id);
      
      if (result.success) {
        setSelectedToken(token);
        setShowPinDialog(true);
        setError('');
        onTokenSelected && onTokenSelected(token);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Error seleccionando token: ' + err.message);
    }
  };

  const authenticateWithPin = async () => {
    if (!pin) {
      setError('Por favor ingrese su PIN');
      return;
    }

    setIsAuthenticating(true);
    setError('');

    try {
      const result = await tokenCryptoService.authenticateWithPIN(pin);
      
      if (result.success) {
        setAuthenticationSuccess(true);
        setShowPinDialog(false);
        setPin('');
        setError('');
      } else {
        setError(result.error);
        setPin('');
      }
    } catch (err) {
      setError('Error en autenticación: ' + err.message);
      setPin('');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Solo números
    if (value.length <= 8) { // Máximo 8 dígitos
      setPin(value);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      authenticateWithPin();
    }
  };

  const logout = async () => {
    try {
      await tokenCryptoService.logout();
      setSelectedToken(null);
      setAuthenticationSuccess(false);
      setPin('');
      setError('');
    } catch (err) {
      setError('Error cerrando sesión: ' + err.message);
    }
  };

  const getTokenIcon = (type) => {
    switch (type) {
      case 'smart_card':
        return '💳';
      case 'usb_token':
        return '🔌';
      case 'hsm':
        return '🏛️';
      default:
        return '🔐';
    }
  };

  const getTokenStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return '#4CAF50';
      case 'disconnected':
        return '#f44336';
      case 'error':
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <div className="token-manager">
      <div className="token-header">
        <h3>🔐 Gestión de Tokens Criptográficos</h3>
        <p className="subtitle">
          Seleccione su token para firma digital de máxima seguridad
        </p>
        <button onClick={detectTokens} className="refresh-tokens-btn">
          🔄 Detectar Tokens
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Detectando tokens criptográficos...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span>⚠️</span>
          <p>{error}</p>
          <button onClick={detectTokens} className="retry-btn">
            🔄 Intentar Nuevamente
          </button>
        </div>
      )}

      {!loading && !error && tokens.length === 0 && (
        <div className="no-tokens">
          <div className="icon">🔍</div>
          <h4>No se encontraron tokens</h4>
          <p>Asegúrese de que su token esté conectado y los drivers instalados</p>
          <button onClick={detectTokens} className="refresh-btn">
            🔄 Buscar Tokens
          </button>
        </div>
      )}

      {!loading && tokens.length > 0 && (
        <div className="tokens-list">
          <h4>Tokens Disponibles ({tokens.length})</h4>
          
          {tokens.map((token) => (
            <div 
              key={token.id} 
              className={`token-card ${selectedToken?.id === token.id ? 'selected' : ''}`}
            >
              <div className="token-info">
                <div className="token-icon">
                  {getTokenIcon(token.type)}
                </div>
                
                <div className="token-details">
                  <h5>{token.name}</h5>
                  <p className="token-model">{token.manufacturer} {token.model}</p>
                  <p className="token-serial">S/N: {token.serialNumber}</p>
                  
                  <div className="token-status">
                    <span 
                      className="status-indicator"
                      style={{ backgroundColor: getTokenStatusColor(token.status) }}
                    ></span>
                    <span className="status-text">{token.status}</span>
                  </div>
                </div>

                <div className="token-actions">
                  {selectedToken?.id === token.id && authenticationSuccess ? (
                    <div className="authenticated-state">
                      <div className="auth-success">
                        <span>✅</span>
                        <span>Autenticado</span>
                      </div>
                      <button onClick={logout} className="logout-token-btn">
                        🚪 Cerrar Sesión
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => selectToken(token)}
                      className="select-token-btn"
                      disabled={token.status !== 'connected'}
                    >
                      {selectedToken?.id === token.id ? '🔓 Autenticar' : '🔑 Seleccionar'}
                    </button>
                  )}
                </div>
              </div>

              {token.certificates && token.certificates.length > 0 && (
                <div className="certificates-info">
                  <h6>📜 Certificados ({token.certificates.length})</h6>
                  {token.certificates.map((cert, index) => (
                    <div key={index} className="certificate-item">
                      <span className="cert-subject">{cert.subject.split(',')[0].replace('CN=', '')}</span>
                      <span className="cert-validity">
                        Válido hasta: {new Date(cert.validTo).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Diálogo de PIN */}
      {showPinDialog && (
        <div className="pin-dialog-overlay">
          <div className="pin-dialog">
            <div className="pin-header">
              <h4>🔐 Autenticación de Token</h4>
              <p>Token seleccionado: <strong>{selectedToken?.name}</strong></p>
              <p className="token-serial">Serie: {selectedToken?.serialNumber}</p>
            </div>

            <div className="token-info-detail">
              <div className="info-row">
                <span className="label">📍 Ubicación:</span>
                <span className="value">{selectedToken?.reader}</span>
              </div>
              <div className="info-row">
                <span className="label">🏭 Fabricante:</span>
                <span className="value">{selectedToken?.manufacturer}</span>
              </div>
              <div className="info-row">
                <span className="label">📜 Certificados:</span>
                <span className="value">{selectedToken?.certificates?.length} disponible(s)</span>
              </div>
              {selectedToken?.certificates?.[0]?.pin_attempts_remaining && (
                <div className="info-row warning">
                  <span className="label">⚠️ Intentos restantes:</span>
                  <span className="value">{selectedToken.certificates[0].pin_attempts_remaining}</span>
                </div>
              )}
            </div>

            <div className="pin-input-container">
              <label>PIN del Token:</label>
              <input
                type="password"
                value={pin}
                onChange={handlePinChange}
                onKeyPress={handleKeyPress}
                placeholder="Ingrese su PIN"
                maxLength="8"
                className="pin-input"
                autoFocus
              />
              <div className="pin-help">
                {selectedToken?.type === 'demo' ? (
                  <div className="demo-help">
                    <span>🧪</span>
                    <strong>Modo Demostración:</strong> Use PIN <code>1234</code> para probar
                  </div>
                ) : (
                  <div className="real-help">
                    <span>🔒</span>
                    El PIN fue proporcionado por la autoridad certificadora junto con su token
                  </div>
                )}
              </div>
            </div>

            <div className="pin-actions">
              <button 
                onClick={() => {
                  setShowPinDialog(false);
                  setPin('');
                  setSelectedToken(null);
                }}
                className="cancel-btn"
                disabled={isAuthenticating}
              >
                ❌ Cancelar
              </button>
              
              <button 
                onClick={authenticateWithPin}
                className="authenticate-btn"
                disabled={!pin || isAuthenticating}
              >
                {isAuthenticating ? '🔄 Verificando...' : '🔑 Autenticar'}
              </button>
            </div>

            {error && (
              <div className="pin-error">
                <span>⚠️</span>
                <span>{error}</span>
                {selectedToken?.type === 'demo' && (
                  <small>Pruebe con el PIN de demostración: <strong>1234</strong></small>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenManager;