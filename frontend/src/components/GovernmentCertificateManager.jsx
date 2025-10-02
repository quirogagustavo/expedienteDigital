// Componente de Gestión de Certificados Gubernamentales
// Gobierno de San Juan - Panel para Funcionarios Oficiales

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const GovernmentCertificateManager = () => {
  const { user } = useAuth();
  const [certificados, setCertificados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('certificates');

  useEffect(() => {
    if (user) {
      loadGovernmentCertificates();
    }
  }, [user]);

  const loadGovernmentCertificates = async () => {
    try {
      const response = await fetch('/api/government-certificates/my-government-certificates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCertificados(data.certificados_gubernamentales || []);
      }
    } catch (error) {
      console.error('Error cargando certificados gubernamentales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCertificate = async () => {
    setRequesting(true);
    try {
      const response = await fetch('/api/government-certificates/request-government', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          documentos_identidad: {
            dni: user.dni,
            cuil: user.cuil,
            cargo: user.cargo,
            dependencia: user.dependencia
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Solicitud iniciada: ${data.message}\n\nTiempo estimado: ${data.tiempo_estimado}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      alert('Error solicitando certificado gubernamental');
    } finally {
      setRequesting(false);
    }
  };

  const handleImportCertificate = async () => {
    if (!selectedFile || !password) {
      alert('Seleccione un archivo P12/PFX y proporcione la contraseña');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('certificate', selectedFile);
      formData.append('password', password);

      const response = await fetch('/api/government-certificates/import-p12', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        alert('Certificado importado exitosamente');
        setSelectedFile(null);
        setPassword('');
        loadGovernmentCertificates(); // Recargar lista
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      alert('Error importando certificado');
    } finally {
      setImporting(false);
    }
  };

  const handleVerifyCertificate = async (certificadoId) => {
    try {
      const response = await fetch(`/api/government-certificates/verify/${certificadoId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        const statusMessage = `
Estado: ${data.certificado.estado}
Válido para firmar: ${data.valid_for_signing ? 'SÍ' : 'NO'}
Días para vencer: ${data.certificado.diasParaVencer}
Estado de revocación: ${data.revocation_status.revoked ? 'REVOCADO' : 'NO REVOCADO'}
Última verificación: ${new Date(data.last_verification).toLocaleString('es-AR')}
        `;
        
        alert(`Verificación del certificado:\n${statusMessage}`);
      }
    } catch (error) {
      alert('Error verificando certificado');
    }
  };

  const getEstadoBadge = (certificado) => {
    let color = '#6b7280';
    let text = '⏸️ Inactivo';

    if (certificado.revoked) {
      color = '#dc2626';
      text = '🚫 Revocado';
    } else if (certificado.estado === 'vigente' && certificado.valid_for_signing) {
      color = '#059669';
      text = '✅ Vigente';
    } else if (certificado.estado === 'por_vencer') {
      color = '#f59e0b';
      text = '⚠️ Por Vencer';
    } else if (certificado.estado === 'vencido') {
      color = '#dc2626';
      text = '❌ Vencido';
    }

    return (
      <span style={{
        backgroundColor: color,
        color: 'white',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '0.8rem',
        fontWeight: 'bold'
      }}>
        {text}
      </span>
    );
  };

  if (loading) {
    return <div style={styles.loading}>Cargando certificados gubernamentales...</div>;
  }

  // Solo funcionarios oficiales y administradores pueden acceder
  if (!['funcionario_oficial', 'administrador'].includes(user?.rol_usuario)) {
    return (
      <div style={styles.accessDenied}>
        <h2>🚫 Acceso Restringido</h2>
        <p>Solo funcionarios oficiales y administradores pueden gestionar certificados gubernamentales.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🏛️ Certificados Gubernamentales</h1>
        <p style={styles.subtitle}>Gobierno de San Juan - {user?.nombre_completo}</p>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button 
          style={{...styles.tab, ...(activeTab === 'certificates' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('certificates')}
        >
          📋 Mis Certificados
        </button>
        <button 
          style={{...styles.tab, ...(activeTab === 'import' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('import')}
        >
          📥 Importar P12/PFX
        </button>
        <button 
          style={{...styles.tab, ...(activeTab === 'request' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('request')}
        >
          📝 Solicitar Nuevo
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'certificates' && (
        <div style={styles.tabContent}>
          <h2 style={styles.sectionTitle}>📋 Certificados Gubernamentales Activos</h2>
          
          {certificados.length === 0 ? (
            <div style={styles.noCertificates}>
              <p>🏛️ No tienes certificados gubernamentales aún</p>
              <p>Importa un certificado existente o solicita uno nuevo</p>
            </div>
          ) : (
            certificados.map(cert => (
              <div key={cert.id} style={styles.certificateCard}>
                <div style={styles.certificateHeader}>
                  <h3 style={styles.certificateName}>{cert.nombre_certificado}</h3>
                  {getEstadoBadge(cert)}
                </div>
                
                <div style={styles.certificateDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Tipo:</span>
                    <span style={styles.detailValue}>🏛️ Gubernamental</span>
                  </div>
                  
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Número de Serie:</span>
                    <span style={styles.detailValue}>{cert.numero_serie}</span>
                  </div>
                  
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Emisor:</span>
                    <span style={styles.detailValue}>{cert.emisor}</span>
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
                      {cert.diasParaVencer <= 60 && cert.diasParaVencer > 0 && (
                        <span style={styles.daysWarning}>
                          ({cert.diasParaVencer} días restantes)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div style={styles.certificateActions}>
                  <button 
                    style={styles.verifyButton}
                    onClick={() => handleVerifyCertificate(cert.id)}
                  >
                    🔍 Verificar Estado
                  </button>
                  
                  {cert.valid_for_signing && (
                    <span style={styles.readyText}>✅ Listo para documentos oficiales</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'import' && (
        <div style={styles.tabContent}>
          <h2 style={styles.sectionTitle}>📥 Importar Certificado P12/PFX</h2>
          
          <div style={styles.importSection}>
            <div style={styles.importInfo}>
              <h3>ℹ️ Información Importante</h3>
              <ul style={styles.infoList}>
                <li>Solo certificados emitidos por autoridades certificantes gubernamentales</li>
                <li>Formatos soportados: .p12, .pfx</li>
                <li>El certificado debe estar vigente y no revocado</li>
                <li>Necesita la contraseña del archivo P12/PFX</li>
              </ul>
            </div>

            <div style={styles.uploadForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Archivo P12/PFX:</label>
                <input
                  type="file"
                  accept=".p12,.pfx"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  style={styles.fileInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Contraseña del certificado:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.passwordInput}
                  placeholder="Ingrese la contraseña"
                />
              </div>

              <button 
                style={styles.importButton}
                onClick={handleImportCertificate}
                disabled={importing || !selectedFile || !password}
              >
                {importing ? '⏳ Importando...' : '📥 Importar Certificado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'request' && (
        <div style={styles.tabContent}>
          <h2 style={styles.sectionTitle}>📝 Solicitar Certificado Gubernamental</h2>
          
          <div style={styles.requestSection}>
            <div style={styles.requestInfo}>
              <h3>🏛️ Proceso de Solicitud</h3>
              <ol style={styles.processList}>
                <li>Validación de identidad por administrador</li>
                <li>Verificación de cargo y dependencia</li>
                <li>Aprobación supervisorial</li>
                <li>Emisión por CA gubernamental</li>
              </ol>
              
              <div style={styles.timeInfo}>
                <strong>⏱️ Tiempo estimado: 3-5 días hábiles</strong>
              </div>
            </div>

            <div style={styles.userInfo}>
              <h3>👤 Sus Datos para la Solicitud</h3>
              <div style={styles.userData}>
                <p><strong>Nombre:</strong> {user.nombre_completo}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>DNI:</strong> {user.dni || 'No registrado'}</p>
                <p><strong>CUIL:</strong> {user.cuil || 'No registrado'}</p>
                <p><strong>Cargo:</strong> {user.cargo || 'No registrado'}</p>
                <p><strong>Dependencia:</strong> {user.dependencia || 'No registrada'}</p>
              </div>
            </div>

            <button 
              style={styles.requestButton}
              onClick={handleRequestCertificate}
              disabled={requesting}
            >
              {requesting ? '⏳ Enviando Solicitud...' : '📝 Solicitar Certificado Gubernamental'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '900px',
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
  tabs: {
    display: 'flex',
    marginBottom: '20px',
    borderBottom: '2px solid #e5e7eb'
  },
  tab: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '15px 20px',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#6b7280',
    borderBottom: '3px solid transparent'
  },
  activeTab: {
    color: '#1e40af',
    borderBottomColor: '#1e40af',
    fontWeight: 'bold'
  },
  tabContent: {
    minHeight: '400px'
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
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  verifyButton: {
    backgroundColor: '#3b82f6',
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
  importSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  importInfo: {
    marginBottom: '20px',
    backgroundColor: '#f0f9ff',
    padding: '15px',
    borderRadius: '5px'
  },
  infoList: {
    color: '#374151',
    lineHeight: '1.6'
  },
  uploadForm: {
    maxWidth: '400px'
  },
  formGroup: {
    marginBottom: '15px'
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#374151'
  },
  fileInput: {
    width: '100%',
    padding: '8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px'
  },
  passwordInput: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '1rem'
  },
  importButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '6px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  requestSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  requestInfo: {
    marginBottom: '20px',
    backgroundColor: '#fef3c7',
    padding: '15px',
    borderRadius: '5px'
  },
  processList: {
    color: '#92400e',
    lineHeight: '1.6'
  },
  timeInfo: {
    marginTop: '10px',
    color: '#92400e'
  },
  userInfo: {
    marginBottom: '20px',
    backgroundColor: '#f0f9ff',
    padding: '15px',
    borderRadius: '5px'
  },
  userData: {
    color: '#374151',
    lineHeight: '1.6'
  },
  requestButton: {
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    padding: '15px 25px',
    borderRadius: '6px',
    fontSize: '1.1rem',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '1.1rem',
    color: '#6b7280'
  },
  accessDenied: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#fef2f2',
    border: '2px solid #dc2626',
    borderRadius: '8px',
    color: '#7f1d1d'
  }
};

export default GovernmentCertificateManager;