import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const CertificateTypeSelector = ({ onCertificateTypeSelect, selectedType }) => {
  const [certificateTypes, setCertificateTypes] = useState([]);
  const [authorities, setAuthorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    fetchCertificateData();
  }, [token]);

  const fetchCertificateData = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      // Obtener tipos de certificados
      const typesResponse = await fetch('http://localhost:4000/api/certificate-types', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!typesResponse.ok) {
        throw new Error('Error al obtener tipos de certificados');
      }

      const typesData = await typesResponse.json();

      // Obtener autoridades certificadoras
      const authoritiesResponse = await fetch('http://localhost:4000/api/certificate-authorities', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!authoritiesResponse.ok) {
        throw new Error('Error al obtener autoridades certificadoras');
      }

      const authoritiesData = await authoritiesResponse.json();

      setCertificateTypes(typesData.certificate_types || []);
      setAuthorities(authoritiesData.authorities || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getValidityLevelColor = (level) => {
    switch (level) {
      case 'corporate': return 'text-blue-600';
      case 'legal': return 'text-orange-600';
      case 'government': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getValidityLevelIcon = (level) => {
    switch (level) {
      case 'corporate': return '🏢';
      case 'legal': return '⚖️';
      case 'government': return '🏛️';
      default: return '📄';
    }
  };

  if (loading) {
    return (
      <div className="certificate-type-selector">
        <h3>Seleccionar Tipo de Certificado</h3>
        <p>Cargando opciones...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="certificate-type-selector">
        <h3>Seleccionar Tipo de Certificado</h3>
        <p className="error">Error: {error}</p>
        <button onClick={fetchCertificateData}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="certificate-type-selector">
      <div style={{
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        color: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        textAlign: 'center',
        marginBottom: '2rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '600' }}>
          🏛️ Sistema de Firma Digital
        </h2>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.2rem', fontWeight: '500', color: '#e8f4f8' }}>
          Gobierno de la Provincia de San Juan
        </h3>
        <p style={{
          margin: '0',
          background: 'rgba(255, 255, 255, 0.15)',
          padding: '0.5rem 1rem',
          borderRadius: '20px',
          fontWeight: '500',
          fontSize: '0.9rem'
        }}>
          Sistema Interno del Gobierno de San Juan
        </p>
      </div>
      
      <h4>Seleccionar Tipo de Certificado</h4>
      <p className="subtitle">Elige el tipo de certificado según tus necesidades de validación oficial</p>
      
      <div style={{
        background: '#fff3cd',
        border: '1px solid #ffeaa7',
        color: '#856404',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        fontSize: '0.9rem'
      }}>
        ⏰ <strong>Importante:</strong> Los certificados pueden requerir diferentes tiempos de procesamiento. 
        Planifica tus firmas con anticipación según el tipo de certificado requerido.
      </div>
      
      <div className="certificate-types-grid">
        {certificateTypes.map((type) => (
          <div
            key={type.id}
            className={`certificate-type-card ${selectedType?.id === type.id ? 'selected' : ''}`}
            onClick={() => onCertificateTypeSelect(type)}
          >
            <div className="certificate-type-header">
              <span className="certificate-type-icon">
                {getValidityLevelIcon(type.validity_level)}
              </span>
              <h4>{type.name === 'internal' ? 'Interno' : 
                    type.name === 'official_government' ? 'Oficial Gubernamental' : 
                    'Comercial Certificado'}</h4>
            </div>
            
            <p className="certificate-type-description">{type.description}</p>
            
            <div className="certificate-type-details">
              <div className="detail-row">
                <span className="detail-label">Validez:</span>
                <span className={`detail-value ${getValidityLevelColor(type.validity_level)}`}>
                  {type.validity_level === 'corporate' ? 'Corporativa' :
                   type.validity_level === 'legal' ? 'Legal' : 'Gubernamental'}
                </span>
              </div>
              
              <div className="detail-row processing-time-row">
                <span className="detail-label">⏰ Tiempo de procesamiento:</span>
                <span className="detail-value processing-time-value">{type.processing_time}</span>
              </div>
              
              {type.requires_identity_verification && (
                <div className="detail-row">
                  <span className="detail-label">Verificación de identidad:</span>
                  <span className="detail-value verification-required">Requerida ✓</span>
                </div>
              )}
            </div>
            
            {selectedType?.id === type.id && (
              <div className="selected-indicator">✓ Seleccionado</div>
            )}
          </div>
        ))}
      </div>

      {authorities.length > 0 && (
        <div className="authorities-info">
          <h4>Autoridades Certificadoras Disponibles</h4>
          <div className="authorities-list">
            {authorities.map((authority) => (
              <div key={authority.id} className="authority-card">
                <div className="authority-info">
                  <span className="authority-name">{authority.name}</span>
                  <span className="authority-country">({authority.country})</span>
                  {authority.isTrusted && <span className="trusted-badge">Verificado</span>}
                </div>
                <div className="authority-type">
                  {authority.type === 'internal' ? 'Interno' :
                   authority.type === 'government' ? 'Gubernamental' : 'Comercial'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateTypeSelector;