// Componente de Confirmación de Firma con Auto-detección
// Gobierno de San Juan - Sistema Seguro e Inteligente

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const SmartCertificateSelector = ({ documento, onCertificateSelected }) => {
  const { user } = useAuth();
  const [workflow, setWorkflow] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [manualSelection, setManualSelection] = useState(false);

  useEffect(() => {
    if (user && documento) {
      // Llamar al backend para obtener el workflow de seguridad
      fetchSecureWorkflow();
    }
  }, [user, documento]);

  const fetchSecureWorkflow = async () => {
    try {
      const response = await fetch('/api/certificates/smart-suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tipoDocumento: documento.tipo,
          userId: user.id
        })
      });

      const workflowData = await response.json();
      
      // Si el workflow indica que no hay certificados, manejarlo
      if (workflowData.error && workflowData.action_required) {
        setWorkflow({
          error: true,
          mensaje: workflowData.message,
          action_required: workflowData.action_required,
          redirect_to: workflowData.redirect_to
        });
      } else {
        setWorkflow(workflowData);
      }
    } catch (error) {
      console.error('Error obteniendo workflow:', error);
      setWorkflow({
        error: true,
        mensaje: 'Error de conexión. Intente nuevamente.',
        action_required: 'retry'
      });
    }
  };

  const handleAutoConfirm = () => {
    if (workflow?.confirmacion?.requiereConfirmacionExplicita) {
      setShowConfirmation(true);
    } else {
      // Confirmación automática para casos de bajo riesgo
      onCertificateSelected(workflow.certificadoSugerido);
    }
  };

  const handleExplicitConfirm = () => {
    onCertificateSelected(workflow.certificadoSugerido);
    setShowConfirmation(false);
  };

  const handleManualSelect = () => {
    setManualSelection(true);
  };

  if (!workflow) {
    return <div style={styles.loading}>Analizando configuración de seguridad...</div>;
  }

  if (workflow.error) {
    return (
      <div style={styles.error}>
        <h3>⚠️ Acción Requerida</h3>
        <p>{workflow.mensaje}</p>
        
        {workflow.action_required === 'import_or_request_government_certificate' && (
          <div style={styles.actionButtons}>
            <button 
              style={styles.actionButton}
              onClick={() => window.location.href = '/government-certificates'}
            >
              🏛️ Ir a Certificados Gubernamentales
            </button>
          </div>
        )}
        
        {workflow.action_required === 'retry_internal_certificate_generation' && (
          <div style={styles.actionButtons}>
            <button 
              style={styles.actionButton}
              onClick={() => window.location.href = '/internal-certificates'}
            >
              🏢 Ir a Certificados Internos
            </button>
          </div>
        )}
        
        {workflow.action_required === 'retry' && (
          <div style={styles.actionButtons}>
            <button 
              style={styles.actionButton}
              onClick={fetchSecureWorkflow}
            >
              🔄 Reintentar
            </button>
          </div>
        )}
      </div>
    );
  }

  if (showConfirmation) {
    return (
      <div style={styles.confirmationModal}>
        <div style={styles.modalContent}>
          <h2 style={styles.securityHeader}>🔒 CONFIRMACIÓN DE SEGURIDAD</h2>
          
          <div style={styles.confirmationBox}>
            <pre style={styles.confirmationText}>
              {workflow.confirmacion.mensaje}
            </pre>
          </div>

          <div style={styles.actionButtons}>
            <button 
              style={styles.confirmButton}
              onClick={handleExplicitConfirm}
            >
              ✓ SÍ, CONFIRMO LA FIRMA
            </button>
            <button 
              style={styles.cancelButton}
              onClick={() => setShowConfirmation(false)}
            >
              ✗ Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (manualSelection) {
    // Componente de selección manual (el que ya teníamos)
    return <ManualCertificateSelector onCertificateSelected={onCertificateSelected} />;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>
        🎯 Sistema Inteligente de Certificados
      </h2>
      
      <div style={styles.suggestionBox}>
        <h3 style={styles.suggestionTitle}>
          📋 Configuración Detectada
        </h3>
        
        <div style={styles.detectionInfo}>
          <p><strong>Usuario:</strong> {user.nombre} ({user.rol_usuario})</p>
          <p><strong>Documento:</strong> {documento.nombre} ({documento.tipo})</p>
          <p><strong>Certificado Sugerido:</strong> 
            <span style={styles.certificateTag}>
              {workflow.certificadoSugerido === 'government' ? 
                '🏛️ Gubernamental' : '🏢 Interno'}
            </span>
          </p>
        </div>

        <div style={styles.securityLevel}>
          <span style={styles.securityBadge}>
            Nivel de Seguridad: {workflow.confirmacion.nivel}
          </span>
        </div>
      </div>

      <div style={styles.actionSection}>
        <button 
          style={styles.smartButton}
          onClick={handleAutoConfirm}
        >
          🚀 Usar Configuración Inteligente
        </button>

        {workflow.usuarioPuedeElegir && (
          <button 
            style={styles.manualButton}
            onClick={handleManualSelect}
          >
            ⚙️ Selección Manual
          </button>
        )}
      </div>

      <div style={styles.securityNote}>
        💡 <strong>Nota de Seguridad:</strong> Este sistema analiza automáticamente 
        el tipo de documento y sus permisos para sugerir el certificado más apropiado.
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f8fafa',
    border: '2px solid #1e40af',
    borderRadius: '10px',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    textAlign: 'center',
    color: '#1e40af',
    marginBottom: '20px',
    fontSize: '1.5rem'
  },
  suggestionBox: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    marginBottom: '20px'
  },
  suggestionTitle: {
    color: '#059669',
    marginBottom: '15px'
  },
  detectionInfo: {
    backgroundColor: '#f0f9ff',
    padding: '15px',
    borderRadius: '5px',
    marginBottom: '15px'
  },
  certificateTag: {
    backgroundColor: '#1e40af',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    marginLeft: '8px'
  },
  securityLevel: {
    textAlign: 'center'
  },
  securityBadge: {
    backgroundColor: '#f59e0b',
    color: 'white',
    padding: '5px 10px',
    borderRadius: '15px',
    fontSize: '0.9rem'
  },
  actionSection: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    marginBottom: '20px'
  },
  smartButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '6px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  manualButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '6px',
    fontSize: '1rem',
    cursor: 'pointer'
  },
  securityNote: {
    backgroundColor: '#fef3c7',
    padding: '15px',
    borderRadius: '5px',
    fontSize: '0.9rem',
    color: '#92400e'
  },
  confirmationModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    maxWidth: '500px',
    width: '90%'
  },
  securityHeader: {
    textAlign: 'center',
    color: '#dc2626',
    marginBottom: '20px'
  },
  confirmationBox: {
    backgroundColor: '#fef2f2',
    border: '2px solid #dc2626',
    padding: '20px',
    borderRadius: '5px',
    marginBottom: '20px'
  },
  confirmationText: {
    color: '#7f1d1d',
    fontSize: '1rem',
    whiteSpace: 'pre-wrap',
    fontFamily: 'Arial, sans-serif'
  },
  actionButtons: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center'
  },
  confirmButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '15px 25px',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '15px 25px',
    borderRadius: '6px',
    fontSize: '1rem',
    cursor: 'pointer'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '1.1rem',
    color: '#6b7280'
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '2px solid #dc2626',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    color: '#7f1d1d'
  },
  actionButtons: {
    marginTop: '15px',
    display: 'flex',
    gap: '10px',
    justifyContent: 'center'
  },
  actionButton: {
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '6px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};

export default SmartCertificateSelector;