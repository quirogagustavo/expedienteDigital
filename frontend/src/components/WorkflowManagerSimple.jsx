import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Send, 
  History, 
  FileText, 
  Building, 
  User, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Eye,
  ArrowRight,
  Calendar
} from 'lucide-react';

const WorkflowManager = ({ expedienteId, expediente, onClose }) => {

  const [activeTab, setActiveTab] = useState('enviar');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [oficinas, setOficinas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [estadoWorkflow, setEstadoWorkflow] = useState(null);
  const [envioData, setEnvioData] = useState({
    oficina_destino_id: '',
    prioridad: 'normal',
    motivo: '',
    observaciones: ''
  });

  const tabs = [
    { key: 'enviar', label: 'Enviar', icon: Send },
    { key: 'estado', label: 'Estado', icon: Eye },
    { key: 'historial', label: 'Historial', icon: History }
  ];

  const estados = [
    { value: 'en_tramite', label: 'En Trámite', color: 'blue' },
    { value: 'pendiente', label: 'Pendiente', color: 'yellow' },
    { value: 'completado', label: 'Completado', color: 'green' },
    { value: 'rechazado', label: 'Rechazado', color: 'red' }
  ];

  const prioridades = [
    { value: 'baja', label: 'Baja', color: 'green' },
    { value: 'normal', label: 'Normal', color: 'blue' },
    { value: 'alta', label: 'Alta', color: 'orange' },
    { value: 'urgente', label: 'Urgente', color: 'red' }
  ];

  useEffect(() => {
    if (expedienteId) {
      cargarDatos();
    }
  }, [expedienteId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar oficinas, historial y estado en paralelo
      const [oficinasRes, historialRes, estadoRes] = await Promise.all([
        axios.get('http://localhost:4000/api/oficinas'),
        axios.get(`http://localhost:4000/api/workflow/${expedienteId}/historial`),
        axios.get(`http://localhost:4000/api/workflow/${expedienteId}/estado-workflow`)
          .catch(() => ({ data: null })) // Si no existe workflow aún
      ]);
      
      setOficinas(oficinasRes.data);
      setHistorial(historialRes.data);
      setEstadoWorkflow(estadoRes.data);
      
    } catch (error) {
      console.error('Error al cargar datos del workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnviar = async () => {
    if (!envioData.oficina_destino_id) {
      alert('Por favor selecciona una oficina destino');
      return;
    }

    try {
      setLoading(true);
      
      await axios.post(`http://localhost:4000/api/workflow/${expedienteId}/enviar`, {
        oficina_destino_id: parseInt(envioData.oficina_destino_id),
        prioridad: envioData.prioridad,
        motivo: envioData.motivo,
        observaciones: envioData.observaciones
      });

      // Resetear el formulario
      setEnvioData({
        oficina_destino_id: '',
        prioridad: 'normal',
        motivo: '',
        observaciones: ''
      });
      
      // Recargar datos
      await cargarDatos();
      
      alert('Expediente enviado exitosamente');
      
    } catch (error) {
      console.error('Error al enviar expediente:', error);
      alert('Error al enviar el expediente');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ marginBottom: '20px' }}>Cargando workflow...</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}
      >
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', 
          color: 'white', 
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={32} />
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
                Workflow del Expediente
              </h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
                {expediente?.numero_expediente} - {expediente?.titulo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '24px',
              padding: '5px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid #e5e7eb', padding: '0 20px' }}>
          <div style={{ display: 'flex', gap: '32px' }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '16px 4px',
                  cursor: 'pointer',
                  borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
                  color: activeTab === tab.key ? '#3b82f6' : '#6b7280',
                  fontWeight: activeTab === tab.key ? '600' : '400',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', maxHeight: '60vh', overflow: 'auto' }}>
          {activeTab === 'enviar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                Enviar Expediente a Oficina
              </h3>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Oficina Destino *
                </label>
                <select
                  value={envioData.oficina_destino_id}
                  onChange={(e) => setEnvioData(prev => ({ ...prev, oficina_destino_id: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  required
                >
                  <option value="">Seleccionar oficina... ({oficinas.length} oficinas disponibles)</option>
                  {oficinas.map(oficina => (
                    <option key={oficina.id} value={oficina.id}>
                      {oficina.nombre} ({oficina.codigo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Prioridad
                </label>
                <select
                  value={envioData.prioridad}
                  onChange={(e) => setEnvioData(prev => ({ ...prev, prioridad: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  {prioridades.map(prioridad => (
                    <option key={prioridad.value} value={prioridad.value}>
                      {prioridad.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Motivo del Envío
                </label>
                <input
                  type="text"
                  value={envioData.motivo}
                  onChange={(e) => setEnvioData(prev => ({ ...prev, motivo: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="Razón del envío (opcional)"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Observaciones
                </label>
                <textarea
                  value={envioData.observaciones}
                  onChange={(e) => setEnvioData(prev => ({ ...prev, observaciones: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                  placeholder="Observaciones adicionales (opcional)"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: '12px 24px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEnviar}
                  disabled={!envioData.oficina_destino_id}
                  style={{
                    padding: '12px 24px',
                    background: envioData.oficina_destino_id ? '#3b82f6' : '#d1d5db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: envioData.oficina_destino_id ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Enviar Expediente
                </button>
              </div>
            </div>
          )}

          {activeTab === 'estado' && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                Estado Actual del Workflow
              </h3>
              
              {estadoWorkflow ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: '16px', fontWeight: '600' }}>
                      Ubicación Actual
                    </h4>
                    <p style={{ margin: 0, color: '#374151' }}>
                      <strong>Oficina:</strong> {estadoWorkflow.oficina_actual_nombre || 'No asignada'}
                    </p>
                    <p style={{ margin: '8px 0 0 0', color: '#374151' }}>
                      <strong>Usuario Asignado:</strong> {estadoWorkflow.usuario_asignado || 'Sin asignar'}
                    </p>
                  </div>

                  <div style={{ padding: '16px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#92400e', fontSize: '16px', fontWeight: '600' }}>
                      Estado y Prioridad
                    </h4>
                    <p style={{ margin: 0, color: '#374151' }}>
                      <strong>Estado:</strong> {estadoWorkflow.estado}
                    </p>
                    <p style={{ margin: '8px 0 0 0', color: '#374151' }}>
                      <strong>Prioridad:</strong> {estadoWorkflow.prioridad}
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <FileText size={64} color="#d1d5db" style={{ marginBottom: '16px' }} />
                  <p style={{ color: '#6b7280', fontSize: '16px', margin: 0 }}>
                    Este expediente aún no tiene workflow asignado
                  </p>
                  <p style={{ color: '#9ca3af', fontSize: '14px', margin: '8px 0 0 0' }}>
                    Se creará automáticamente cuando envíes el expediente a una oficina
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'historial' && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                Historial de Movimientos
              </h3>
              
              {historial && historial.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {historial.map((movimiento, index) => (
                    <div key={index} style={{ 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px', 
                      padding: '16px',
                      backgroundColor: '#f9fafb'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, color: '#111827', fontSize: '14px', fontWeight: '600' }}>
                          {movimiento.oficina_origen_nombre} → {movimiento.oficina_destino_nombre}
                        </h4>
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>
                          {new Date(movimiento.fecha_movimiento).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                        <strong>Usuario:</strong> {movimiento.usuario_nombre || 'Sistema'}
                      </p>
                      {movimiento.motivo && (
                        <p style={{ margin: '8px 0 0 0', color: '#374151', fontSize: '14px' }}>
                          <strong>Motivo:</strong> {movimiento.motivo}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <History size={64} color="#d1d5db" style={{ marginBottom: '16px' }} />
                  <p style={{ color: '#6b7280', fontSize: '16px', margin: 0 }}>
                    No hay movimientos registrados
                  </p>
                  <p style={{ color: '#9ca3af', fontSize: '14px', margin: '8px 0 0 0' }}>
                    El historial aparecerá cuando se realicen movimientos del expediente
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowManager;