// Dashboard de Gestión de Certificados
// Gobierno de San Juan - Panel de Usuario

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const CertificateDashboard = () => {
  const { user } = useAuth();
  const [certificados, setCertificados] = useState([]);
  const [resumen, setResumen] = useState({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      loadCertificates();
      checkCertificateStatus();
    }
  }, [user]);

  const loadCertificates = async () => {
    try {
      const response = await fetch('/api/internal-certificates/my-certificates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCertificados(data.certificados);
        setResumen(data.resumen);
      }
    } catch (error) {
      console.error('Error cargando certificados:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCertificateStatus = async () => {
    try {
      const response = await fetch('/api/internal-certificates/check-status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.needsAction) {
          // Recargar certificados si se generó uno nuevo
          loadCertificates();
        }
      }
    } catch (error) {
      console.error('Error verificando estado:', error);
    }
  };

  const handleRequestCertificate = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/internal-certificates/request-internal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        loadCertificates(); // Recargar lista
      } else {
        const error = await response.json();
        alert(error.message);
      }
    } catch (error) {
      alert('Error solicitando certificado');
    } finally {
      setProcessing(false);
    }
  };

  const handleRenewCertificate = async (certificadoId) => {
    try {
      const response = await fetch(`/api/internal-certificates/renew/${certificadoId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        loadCertificates(); // Recargar lista
      }
    } catch (error) {
      alert('Error renovando certificado');
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'vigente': { color: '#059669', text: '✅ Vigente' },
      'por_vencer': { color: '#f59e0b', text: '⚠️ Por Vencer' },
      'vencido': { color: '#dc2626', text: '❌ Vencido' },
      'inactivo': { color: '#6b7280', text: '⏸️ Inactivo' }
    };
    
    const badge = badges[estado] || badges['inactivo'];
    
    return (
      <span style={{
        backgroundColor: badge.color,
        color: 'white',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '0.8rem',
        fontWeight: 'bold'
      }}>
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return <div style={styles.loading}>Cargando certificados...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔐 Mis Certificados Digitales</h1>
        <p style={styles.subtitle}>Gobierno de San Juan - {user?.nombre_completo}</p>
      </div>

      {/* Resumen */}
      <div style={styles.summary}>
        <div style={styles.summaryCard}>
          <h3>📊 Resumen</h3>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryNumber}>{resumen.total || 0}</span>
              <span style={styles.summaryLabel}>Total</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={{...styles.summaryNumber, color: '#059669'}}>{resumen.vigentes || 0}</span>
              <span style={styles.summaryLabel}>Vigentes</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={{...styles.summaryNumber, color: '#f59e0b'}}>{resumen.por_vencer || 0}</span>
              <span style={styles.summaryLabel}>Por Vencer</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={{...styles.summaryNumber, color: '#dc2626'}}>{resumen.vencidos || 0}</span>
              <span style={styles.summaryLabel}>Vencidos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Botón de solicitar certificado */}
      {(!certificados.length || !certificados.some(c => c.estado === 'vigente')) && (
        <div style={styles.actionSection}>
          <button 
            style={styles.requestButton}
            onClick={handleRequestCertificate}
            disabled={processing}
          >
            {processing ? '⏳ Generando...' : '🆕 Solicitar Certificado Interno'}
          </button>
          <p style={styles.helpText}>
            💡 Los certificados internos se generan automáticamente y son válidos por 1 año
          </p>
        </div>
      )}

      {/* Lista de certificados */}
      <div style={styles.certificatesList}>
        <h2 style={styles.sectionTitle}>📋 Mis Certificados</h2>
        
        {certificados.length === 0 ? (
          <div style={styles.noCertificates}>
            <p>📝 No tienes certificados aún</p>
            <p>Solicita tu primer certificado interno para comenzar a firmar documentos</p>
          </div>
        ) : (
          certificados.map(cert => (
            <div key={cert.id} style={styles.certificateCard}>
              <div style={styles.certificateHeader}>
                <h3 style={styles.certificateName}>{cert.nombre_certificado}</h3>
                {getEstadoBadge(cert.estado)}
              </div>
              
              <div style={styles.certificateDetails}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Tipo:</span>
                  <span style={styles.detailValue}>
                    {cert.tipo === 'internal' ? '🏢 Interno' : '🏛️ Gubernamental'}
                  </span>
                </div>
                
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Número de Serie:</span>
                  <span style={styles.detailValue}>{cert.numero_serie}</span>
                </div>
                
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Emitido:</span>
                  <span style={styles.detailValue}>
                    {new Date(cert.fecha_emision).toLocaleDateString('es-AR')}
                  </span>
                </div>
                
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Vence:</span>
                  <span style={styles.detailValue}>
                    {new Date(cert.fecha_expiracion).toLocaleDateString('es-AR')}
                    {cert.diasParaVencer <= 30 && cert.diasParaVencer > 0 && (
                      <span style={styles.daysWarning}>
                        ({cert.diasParaVencer} días restantes)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Acciones del certificado */}
              <div style={styles.certificateActions}>
                {cert.estado === 'por_vencer' && (
                  <button 
                    style={styles.renewButton}
                    onClick={() => handleRenewCertificate(cert.id)}
                  >
                    🔄 Renovar
                  </button>
                )}
                
                {cert.estado === 'vigente' && (
                  <span style={styles.readyText}>✅ Listo para firmar</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Información adicional */}
      <div style={styles.infoSection}>
        <h3 style={styles.infoTitle}>ℹ️ Información Importante</h3>
        <ul style={styles.infoList}>
          <li>Los certificados internos se generan automáticamente al solicitarlos</li>
          <li>Son válidos por 1 año desde la fecha de emisión</li>
          <li>Puedes renovar certificados que estén por vencer (30 días antes)</li>
          <li>Solo puedes usar certificados internos para documentos NO oficiales</li>
          <li>Para documentos oficiales necesitas certificado gubernamental</li>
        </ul>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    backgroundColor: '#f0f9ff',
    padding: '20px',
    borderRadius: '10px',
    border: '2px solid #1e40af'
  },
  title: {
    color: '#1e40af',
    margin: '0 0 10px 0',
    fontSize: '2rem'
  },
  subtitle: {
    color: '#6b7280',
    margin: '0',
    fontSize: '1.1rem'
  },
  summary: {
    marginBottom: '30px'
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginTop: '15px'
  },
  summaryItem: {
    textAlign: 'center'
  },
  summaryNumber: {
    display: 'block',
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1e40af'
  },
  summaryLabel: {
    fontSize: '0.9rem',
    color: '#6b7280'
  },
  actionSection: {
    textAlign: 'center',
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px'
  },
  requestButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: '10px'
  },
  helpText: {
    color: '#92400e',
    margin: '0',
    fontSize: '0.9rem'
  },
  certificatesList: {
    marginBottom: '30px'
  },
  sectionTitle: {
    color: '#1e40af',
    marginBottom: '20px'
  },
  noCertificates: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    color: '#6b7280'
  },
  certificateCard: {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '15px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  certificateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  certificateName: {
    color: '#1e40af',
    margin: '0',
    fontSize: '1.2rem'
  },
  certificateDetails: {
    marginBottom: '15px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  detailLabel: {
    fontWeight: 'bold',
    color: '#374151'
  },
  detailValue: {
    color: '#6b7280'
  },
  daysWarning: {
    color: '#f59e0b',
    fontSize: '0.9rem',
    marginLeft: '8px'
  },
  certificateActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  renewButton: {
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  readyText: {
    color: '#059669',
    fontWeight: 'bold'
  },
  infoSection: {
    backgroundColor: '#f0f9ff',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #bfdbfe'
  },
  infoTitle: {
    color: '#1e40af',
    marginTop: '0'
  },
  infoList: {
    color: '#374151',
    lineHeight: '1.6'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '1.1rem',
    color: '#6b7280'
  }
};

export default CertificateDashboard;