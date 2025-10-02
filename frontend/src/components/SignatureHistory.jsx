import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const SignatureHistory = () => {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
    const { token } = useAuth();

  useEffect(() => {
    fetchSignatureHistory();
  }, []);

  const fetchSignatureHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/signatures/history');
      setSignatures(response.data.signatures || []);
    } catch (err) {
      console.error('Error fetching signature history:', err);
      setError(err.response?.data?.message || err.message || 'Error al obtener el historial de firmas');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      return new Date(dateString).toLocaleString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'valid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
      case 'invalid':
        return 'error';
      default:
        return 'info';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'Completada';
      case 'valid':
        return 'Válida';
      case 'pending':
        return 'Pendiente';
      case 'failed':
        return 'Fallida';
      case 'invalid':
        return 'Inválida';
      default:
        return status || 'Desconocido';
    }
  };

  if (loading) {
    return (
      <div className="signature-history">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando historial de firmas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="signature-history">
        <div className="error-container">
          <div className="error-icon">❌</div>
          <h3>Error al cargar historial</h3>
          <p>{error}</p>
          <button onClick={fetchSignatureHistory} className="retry-btn">
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="signature-history">
      <div className="history-header">
        <h2>📋 Historial de Firmas Digitales</h2>
        <p className="subtitle">
          Registro completo de documentos firmados por {user?.nombre_completo || user?.username}
        </p>
        <button onClick={fetchSignatureHistory} className="refresh-btn">
          🔄 Actualizar
        </button>
      </div>

      {signatures.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No hay firmas registradas</h3>
          <p>
            Aún no ha firmado ningún documento. Vaya a la pestaña "Firmar Documentos" 
            para crear su primera firma digital.
          </p>
        </div>
      ) : (
        <div className="signatures-container">
          <div className="summary-stats">
            <div className="stat-card">
              <div className="stat-number">{signatures.length}</div>
              <div className="stat-label">Total de Firmas</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {signatures.filter(s => s.status?.toLowerCase() === 'completed').length}
              </div>
              <div className="stat-label">Exitosas</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {signatures.filter(s => s.created_at && 
                  new Date(s.created_at).toDateString() === new Date().toDateString()).length}
              </div>
              <div className="stat-label">Hoy</div>
            </div>
          </div>

          <div className="signatures-list">
            {signatures.map((signature, index) => (
              <div key={signature.id || index} className="signature-card">
                <div className="signature-header">
                  <div className="signature-info">
                    <h4 className="document-name">
                      📄 {signature.document_name || signature.original_filename || `Documento #${index + 1}`}
                    </h4>
                    <div className="signature-meta">
                      <span className="signature-date">
                        🕒 {formatDate(signature.created_at || signature.fecha_firma)}
                      </span>
                      <span className={`signature-status ${getStatusColor(signature.status)}`}>
                        {getStatusText(signature.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="signature-details">
                  <div className="detail-grid">
                    {signature.certificado && (
                      <div className="detail-item">
                        <span className="label">🔒 Certificado:</span>
                        <span className="value">{signature.certificado.nombre_certificado}</span>
                      </div>
                    )}
                    
                    {signature.certificate_type && (
                      <div className="detail-item">
                        <span className="label">📋 Tipo:</span>
                        <span className="value">{signature.certificate_type}</span>
                      </div>
                    )}

                    {signature.file_hash && (
                      <div className="detail-item">
                        <span className="label">🔐 Hash del archivo:</span>
                        <span className="value hash">{signature.file_hash.substring(0, 16)}...</span>
                      </div>
                    )}

                    {signature.signature_hash && (
                      <div className="detail-item">
                        <span className="label">✍️ Hash de la firma:</span>
                        <span className="value hash">{signature.signature_hash.substring(0, 16)}...</span>
                      </div>
                    )}

                    {signature.file_size && (
                      <div className="detail-item">
                        <span className="label">📊 Tamaño:</span>
                        <span className="value">{(signature.file_size / 1024).toFixed(2)} KB</span>
                      </div>
                    )}

                    {signature.ip_address && (
                      <div className="detail-item">
                        <span className="label">🌐 IP:</span>
                        <span className="value">{signature.ip_address}</span>
                      </div>
                    )}
                  </div>

                  {signature.signature_data && (
                    <div className="signature-data-section">
                      <h5>Datos de la Firma Digital:</h5>
                      <textarea 
                        readOnly 
                        value={signature.signature_data} 
                        rows={2}
                        className="signature-textarea"
                      />
                    </div>
                  )}

                  {signature.verification_info && (
                    <div className="verification-info">
                      <h5>Información de Verificación:</h5>
                      <pre className="verification-data">
                        {JSON.stringify(signature.verification_info, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .signature-history {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 0;
        }

        .loading-container, .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-container {
          background: #f8d7da;
          border: 2px solid #f5c6cb;
          border-radius: 12px;
          color: #721c24;
        }

        .error-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .retry-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.95rem;
          margin-top: 1rem;
          transition: background 0.3s ease;
        }

        .retry-btn:hover {
          background: #c82333;
        }

        .history-header {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
          text-align: center;
          position: relative;
        }

        .history-header h2 {
          margin: 0 0 0.5rem;
          color: #2c3e50;
          font-size: 2rem;
        }

        .subtitle {
          margin: 0 0 1rem;
          color: #6c757d;
          font-size: 1.1rem;
        }

        .refresh-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          position: absolute;
          top: 1rem;
          right: 1rem;
        }

        .refresh-btn:hover {
          background: #0056b3;
          transform: translateY(-1px);
        }

        .empty-state {
          background: white;
          padding: 4rem 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          margin: 0 0 1rem;
          color: #495057;
        }

        .empty-state p {
          margin: 0;
          color: #6c757d;
          line-height: 1.6;
        }

        .signatures-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1rem;
        }

        .stat-card {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          text-align: center;
          border-left: 4px solid #007bff;
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 700;
          color: #007bff;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          color: #6c757d;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .signatures-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .signature-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: transform 0.2s ease;
        }

        .signature-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }

        .signature-header {
          background: #f8f9fa;
          padding: 1.5rem;
          border-bottom: 1px solid #e9ecef;
        }

        .signature-info h4 {
          margin: 0 0 0.75rem;
          color: #2c3e50;
          font-size: 1.2rem;
        }

        .signature-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .signature-date {
          color: #6c757d;
          font-size: 0.9rem;
        }

        .signature-status {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .signature-status.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .signature-status.warning {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }

        .signature-status.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .signature-status.info {
          background: #d1ecf1;
          color: #0c5460;
          border: 1px solid #bee5eb;
        }

        .signature-details {
          padding: 1.5rem;
        }

        .detail-grid {
          display: grid;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f1f3f4;
        }

        .detail-item:last-child {
          border-bottom: none;
        }

        .detail-item .label {
          font-weight: 500;
          color: #495057;
          flex-shrink: 0;
        }

        .detail-item .value {
          color: #2c3e50;
          text-align: right;
          flex-grow: 1;
          margin-left: 1rem;
        }

        .detail-item .value.hash {
          font-family: 'Courier New', monospace;
          font-size: 0.85rem;
          background: #f8f9fa;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .signature-data-section, .verification-info {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e9ecef;
        }

        .signature-data-section h5, .verification-info h5 {
          margin: 0 0 0.75rem;
          color: #495057;
          font-size: 1rem;
        }

        .signature-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ced4da;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-size: 0.8rem;
          background: #f8f9fa;
          color: #495057;
          resize: vertical;
        }

        .verification-data {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 6px;
          font-size: 0.8rem;
          overflow-x: auto;
          color: #495057;
          margin: 0;
        }

        @media (max-width: 768px) {
          .signature-history {
            padding: 1rem 0;
          }

          .history-header {
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }

          .history-header h2 {
            font-size: 1.5rem;
          }

          .refresh-btn {
            position: relative;
            top: auto;
            right: auto;
            margin-top: 1rem;
          }

          .summary-stats {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .stat-card {
            padding: 1.5rem;
          }

          .signature-header, .signature-details {
            padding: 1rem;
          }

          .signature-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .detail-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }

          .detail-item .value {
            text-align: left;
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default SignatureHistory;