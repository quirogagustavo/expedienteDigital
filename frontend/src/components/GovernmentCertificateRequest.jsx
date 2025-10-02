import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const GovernmentCertificateRequest = () => {
    const { token } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const [requestResult, setRequestResult] = useState(null);
  const [error, setError] = useState('');

  const handleRequestCertificate = async () => {
    setRequesting(true);
    setError('');
    
    try {
      const response = await api.post('/api/request-government-certificate', {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setRequestResult(response.data);
    } catch (error) {
      if (error.response && error.response.data) {
        setError(error.response.data.message);
        if (error.response.data.certificate) {
          setRequestResult(error.response.data);
        }
      } else {
        setError('Error de conexión al servidor');
      }
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="government-certificate-request">
      <div className="container">
        <div className="certificate-card">
          <div className="card-header">
            <div className="header-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7L12 12L21 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M3 17L12 22L21 17" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M3 12L12 17L21 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2>Certificado Digital Gubernamental - Provincia de San Juan</h2>
            <p className="subtitle">Para empleados del sector público argentino</p>
          </div>

          <div className="card-content">
            <div className="employee-info">
              <h3>Información del Empleado</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Nombre Completo:</span>
                  <span className="value">{user?.nombre_completo || user?.username}</span>
                </div>
                <div className="info-item">
                  <span className="label">Email Institucional:</span>
                  <span className="value">{user?.email}</span>
                </div>
              </div>
            </div>

            <div className="certificate-benefits">
              <h3>Beneficios del Certificado Oficial - Gobierno de San Juan</h3>
              <ul className="benefits-list">
                <li>✅ <strong>Para empleados</strong> de la Provincia de San Juan</li>
                <li>✅ <strong>Válido por 3 años</strong> - renovación automática</li>
                <li>✅ <strong>Reconocimiento legal completo</strong> según normativa argentina</li>
                <li>✅ <strong>Una sola vez</strong> - reutilizable para múltiples documentos oficiales</li>
                <li>✅ <strong>Soporte técnico oficial</strong> del Gobierno de San Juan</li>
              </ul>
            </div>

            <div className="requirements-section">
              <h3>Documentación Requerida</h3>
              <div className="requirements-list">
                <div className="requirement-item">
                  <span className="req-icon">📄</span>
                  <span>DNI Argentino vigente</span>
                </div>
                <div className="requirement-item">
                  <span className="req-icon">🏢</span>
                  <span>Constancia de trabajo del ente gubernamental</span>
                </div>
                <div className="requirement-item">
                  <span className="req-icon">📋</span>
                  <span>CUIL/CUIT del empleado</span>
                </div>
              </div>
            </div>

            {!requestResult && (
              <div className="action-section">
                <button 
                  className={`request-btn ${requesting ? 'requesting' : ''}`}
                  onClick={handleRequestCertificate}
                  disabled={requesting}
                >
                  {requesting ? (
                    <>
                      <div className="spinner"></div>
                      Procesando solicitud...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L3 7L12 12L21 7L12 2Z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M3 17L12 22L21 17" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Solicitar Certificado - San Juan
                    </>
                  )}
                </button>
              </div>
            )}

            {requestResult && (
              <div className={`result-section ${requestResult.success ? 'success' : 'info'}`}>
                <div className="result-header">
                  <div className="result-icon">
                    {requestResult.success ? '✅' : 'ℹ️'}
                  </div>
                  <h3>{requestResult.message}</h3>
                </div>

                {requestResult.certificate && (
                  <div className="certificate-details">
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="label">Estado:</span>
                        <span className={`status ${requestResult.certificate.status}`}>
                          {requestResult.certificate.status === 'pending' ? 'Pendiente de Verificación' : 'Activo'}
                        </span>
                      </div>
                      
                      {requestResult.certificate.trackingId && (
                        <div className="detail-item">
                          <span className="label">ID de Seguimiento:</span>
                          <span className="tracking-id">{requestResult.certificate.trackingId}</span>
                        </div>
                      )}

                      <div className="detail-item">
                        <span className="label">Autoridad Certificadora:</span>
                        <span className="value">{requestResult.certificate.authority}</span>
                      </div>

                      <div className="detail-item">
                        <span className="label">Tiempo Estimado:</span>
                        <span className="value">{requestResult.certificate.estimatedCompletion}</span>
                      </div>
                    </div>

                    {requestResult.certificate.nextSteps && (
                      <div className="next-steps">
                        <h4>Próximos Pasos:</h4>
                        <ol>
                          {requestResult.certificate.nextSteps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    
                    {requestResult.certificate.issued && (
                      <div className="active-certificate">
                        <h4>Certificado Activo</h4>
                        <p><strong>Nombre:</strong> {requestResult.certificate.name}</p>
                        <p><strong>Emitido:</strong> {new Date(requestResult.certificate.issued).toLocaleDateString()}</p>
                        <p><strong>Expira:</strong> {new Date(requestResult.certificate.expires).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="error-section">
                <div className="error-icon">⚠️</div>
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .government-certificate-request {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem 0;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .certificate-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .card-header {
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          color: white;
          padding: 2rem;
          text-align: center;
        }

        .header-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 1rem;
          color: white;
        }

        .card-header h2 {
          margin: 0 0 0.5rem;
          font-size: 2rem;
          font-weight: 700;
        }

        .subtitle {
          margin: 0;
          opacity: 0.9;
          font-size: 1.1rem;
        }

        .card-content {
          padding: 2rem;
        }

        .employee-info, .certificate-benefits, .requirements-section {
          margin-bottom: 2rem;
        }

        .employee-info h3, .certificate-benefits h3, .requirements-section h3 {
          color: #2c3e50;
          margin-bottom: 1rem;
          font-size: 1.3rem;
          font-weight: 600;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .info-item .label {
          font-weight: 600;
          color: #495057;
        }

        .info-item .value {
          color: #2c3e50;
        }

        .benefits-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .benefits-list li {
          padding: 0.75rem 0;
          border-bottom: 1px solid #eee;
          font-size: 1.1rem;
        }

        .benefits-list li:last-child {
          border-bottom: none;
        }

        .requirements-list {
          display: grid;
          gap: 0.75rem;
        }

        .requirement-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #4CAF50;
        }

        .req-icon {
          font-size: 1.5rem;
        }

        .action-section {
          text-align: center;
          padding: 2rem 0;
        }

        .request-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }

        .request-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
        }

        .request-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .request-btn.requesting {
          background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .result-section {
          padding: 2rem;
          border-radius: 12px;
          margin-top: 1rem;
        }

        .result-section.success {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
        }

        .result-section.info {
          background: #d1ecf1;
          border: 1px solid #bee5eb;
          color: #0c5460;
        }

        .result-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .result-icon {
          font-size: 2rem;
        }

        .result-header h3 {
          margin: 0;
          font-size: 1.3rem;
        }

        .certificate-details {
          background: rgba(255, 255, 255, 0.7);
          padding: 1.5rem;
          border-radius: 8px;
        }

        .detail-grid {
          display: grid;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .detail-item .label {
          font-weight: 600;
        }

        .status.pending {
          background: #fff3cd;
          color: #856404;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          border: 1px solid #ffeaa7;
        }

        .tracking-id {
          font-family: monospace;
          background: #f8f9fa;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .next-steps {
          margin-top: 1.5rem;
        }

        .next-steps h4 {
          margin: 0 0 1rem;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .next-steps ol {
          margin: 0;
          padding-left: 1.5rem;
        }

        .next-steps li {
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }

        .active-certificate {
          background: rgba(76, 175, 80, 0.1);
          padding: 1rem;
          border-radius: 8px;
          border-left: 4px solid #4CAF50;
          margin-top: 1rem;
        }

        .active-certificate h4 {
          margin: 0 0 0.75rem;
          color: #2e7d32;
        }

        .active-certificate p {
          margin: 0.25rem 0;
        }

        .error-section {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #f8d7da;
          color: #721c24;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #f5c6cb;
        }

        .error-icon {
          font-size: 1.5rem;
        }

        @media (max-width: 768px) {
          .container {
            padding: 0 0.5rem;
          }

          .card-content {
            padding: 1.5rem;
          }

          .card-header {
            padding: 1.5rem;
          }

          .card-header h2 {
            font-size: 1.5rem;
          }

          .info-item, .detail-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .request-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default GovernmentCertificateRequest;