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
  console.log('=== WORKFLOW MANAGER RENDERIZADO ===');
  console.log('Props recibidas:', { expedienteId, expediente, onClose });
  const [oficinas, setOficinas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [estadoWorkflow, setEstadoWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('enviar');

  // Estados para envío
  const [envioData, setEnvioData] = useState({
    oficina_destino_id: '',
    motivo: '',
    observaciones: '',
    prioridad: 'normal'
  });

  // Estados para cambio de estado
  const [cambioEstado, setCambioEstado] = useState({
    nuevo_estado: '',
    observaciones: ''
  });

  const estadosWorkflow = [
    { value: 'en_tramite', label: 'En Trámite', color: 'blue' },
    { value: 'pendiente_revision', label: 'Pendiente Revisión', color: 'yellow' },
    { value: 'con_observaciones', label: 'Con Observaciones', color: 'orange' },
    { value: 'aprobado', label: 'Aprobado', color: 'green' },
    { value: 'rechazado', label: 'Rechazado', color: 'red' },
    { value: 'archivado', label: 'Archivado', color: 'gray' }
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
      console.log('Oficinas cargadas:', oficinasRes.data);
      setHistorial(historialRes.data);
      setEstadoWorkflow(estadoRes.data);
      
    } catch (error) {
      console.error('Error al cargar datos del workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const enviarAOficina = async () => {
    if (!envioData.oficina_destino_id) {
      alert('Debe seleccionar una oficina destino');
      return;
    }

    try {
      await axios.post(`http://localhost:4000/api/workflow/${expedienteId}/enviar-a-oficina`, {
        ...envioData,
        usuario_movimiento: 'usuario_actual' // TODO: Obtener del contexto de autenticación
      });

      // Limpiar formulario
      setEnvioData({
        oficina_destino_id: '',
        motivo: '',
        observaciones: '',
        prioridad: 'normal'
      });

      // Recargar datos
      await cargarDatos();
      
      alert('Expediente enviado correctamente');
    } catch (error) {
      console.error('Error al enviar expediente:', error);
      alert('Error al enviar el expediente');
    }
  };

  const cambiarEstadoExpediente = async () => {
    if (!cambioEstado.nuevo_estado) {
      alert('Debe seleccionar un nuevo estado');
      return;
    }

    try {
      await axios.put(`http://localhost:4000/api/workflow/${expedienteId}/cambiar-estado`, {
        ...cambioEstado,
        usuario_movimiento: 'usuario_actual' // TODO: Obtener del contexto de autenticación
      });

      // Limpiar formulario
      setCambioEstado({
        nuevo_estado: '',
        observaciones: ''
      });

      // Recargar datos
      await cargarDatos();
      
      alert('Estado actualizado correctamente');
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al actualizar el estado');
    }
  };

  const getEstadoColor = (estado) => {
    const estadoInfo = estadosWorkflow.find(e => e.value === estado);
    return estadoInfo ? estadoInfo.color : 'gray';
  };

  const getPrioridadColor = (prioridad) => {
    const prioridadInfo = prioridades.find(p => p.value === prioridad);
    return prioridadInfo ? prioridadInfo.color : 'gray';
  };

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando workflow...</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-red-500 bg-opacity-90 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8" />
              <div>
                <h2 className="text-xl font-bold">Workflow del Expediente</h2>
                <p className="text-blue-100">
                  {expediente?.numero_expediente} - {expediente?.titulo}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Estado actual */}
        {estadoWorkflow && (
          <div className="bg-gray-50 border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Building className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Oficina Actual:</span>
                  <span className="text-blue-600">{estadoWorkflow.oficina_actual_nombre || 'Sin asignar'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Estado:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${getEstadoColor(estadoWorkflow.estado)}-100 text-${getEstadoColor(estadoWorkflow.estado)}-800`}>
                    {estadosWorkflow.find(e => e.value === estadoWorkflow.estado)?.label || estadoWorkflow.estado}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Prioridad:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${getPrioridadColor(estadoWorkflow.prioridad)}-100 text-${getPrioridadColor(estadoWorkflow.prioridad)}-800`}>
                    {prioridades.find(p => p.value === estadoWorkflow.prioridad)?.label || estadoWorkflow.prioridad}
                  </span>
                </div>
              </div>
              {estadoWorkflow.usuario_asignado && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Asignado a: {estadoWorkflow.usuario_asignado}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('enviar')}
              className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'enviar'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Send className="w-4 h-4 inline-block mr-2" />
              Enviar a Oficina
            </button>
            <button
              onClick={() => setActiveTab('estado')}
              className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'estado'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 inline-block mr-2" />
              Cambiar Estado
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'historial'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <History className="w-4 h-4 inline-block mr-2" />
              Historial
            </button>
          </nav>
        </div>

        {/* Contenido de tabs */}
        <div className="p-6 overflow-y-auto max-h-96">
          {activeTab === 'enviar' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Enviar Expediente a Oficina</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Oficina Destino *
                </label>
                <select
                  value={envioData.oficina_destino_id}
                  onChange={(e) => setEnvioData(prev => ({ ...prev, oficina_destino_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Seleccionar oficina... ({oficinas.length} oficinas disponibles)</option>
                  {console.log('Oficinas en render:', oficinas)}
                  {oficinas.map(oficina => (
                    <option key={oficina.id} value={oficina.id}>
                      {oficina.nombre} ({oficina.codigo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridad
                </label>
                <select
                  value={envioData.prioridad}
                  onChange={(e) => setEnvioData(prev => ({ ...prev, prioridad: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {prioridades.map(prioridad => (
                    <option key={prioridad.value} value={prioridad.value}>
                      {prioridad.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo del Envío
                </label>
                <input
                  type="text"
                  value={envioData.motivo}
                  onChange={(e) => setEnvioData(prev => ({ ...prev, motivo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Razón del envío (opcional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={envioData.observaciones}
                  onChange={(e) => setEnvioData(prev => ({ ...prev, observaciones: e.target.value }))}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Observaciones adicionales (opcional)"
                />
              </div>

              <button
                onClick={enviarAOficina}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Expediente</span>
              </button>
            </div>
          )}

          {activeTab === 'estado' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cambiar Estado del Expediente</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nuevo Estado *
                </label>
                <select
                  value={cambioEstado.nuevo_estado}
                  onChange={(e) => setCambioEstado(prev => ({ ...prev, nuevo_estado: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Seleccionar estado...</option>
                  {estadosWorkflow.map(estado => (
                    <option key={estado.value} value={estado.value}>
                      {estado.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={cambioEstado.observaciones}
                  onChange={(e) => setCambioEstado(prev => ({ ...prev, observaciones: e.target.value }))}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Motivo del cambio de estado"
                />
              </div>

              <button
                onClick={cambiarEstadoExpediente}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Cambiar Estado</span>
              </button>
            </div>
          )}

          {activeTab === 'historial' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de Movimientos</h3>
              
              {historial.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay movimientos registrados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historial.map((movimiento, index) => (
                    <div key={movimiento.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">
                              {movimiento.oficina_origen_nombre || 'Sin oficina'} → {movimiento.oficina_destino_nombre}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${getEstadoColor(movimiento.estado_nuevo)}-100 text-${getEstadoColor(movimiento.estado_nuevo)}-800`}>
                              {estadosWorkflow.find(e => e.value === movimiento.estado_nuevo)?.label || movimiento.estado_nuevo}
                            </span>
                          </div>
                          
                          {movimiento.motivo && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Motivo:</strong> {movimiento.motivo}
                            </p>
                          )}
                          
                          {movimiento.observaciones && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Observaciones:</strong> {movimiento.observaciones}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>{movimiento.usuario_movimiento}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatFecha(movimiento.fecha_movimiento)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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