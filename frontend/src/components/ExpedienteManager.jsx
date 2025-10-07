//import React, { useState, useEffect } from 'react';

import React, { useState, useEffect } from 'react';
import api from '../utils/api';
// Para pdfjs-dist v5.x, usar el worker legacy
import { FileText, Plus, Eye, Edit, Trash2, Download, FileSignature, CheckCircle, Clock, AlertCircle, FolderOpen, Settings, User, Send } from 'lucide-react';
import GestionFirmas from './GestionFirmasFixed';
// import DigitalSignatureWithToken from './DigitalSignatureWithToken';

const ExpedienteManager = () => {
  // Función para firmar documento
  // Selector de método de firma
  const [showMetodoFirmaModal, setShowMetodoFirmaModal] = useState(false);
  const [docIdAFirmar, setDocIdAFirmar] = useState(null);
  const [metodoFirma, setMetodoFirma] = useState('interno');
  const [certSeleccionado, setCertSeleccionado] = useState(null);
  const [showTokenFirmaModal, setShowTokenFirmaModal] = useState(false);
  const [docParaToken, setDocParaToken] = useState(null);
  const [showEnvioModal, setShowEnvioModal] = useState(false);
  const [expedienteAEnviar, setExpedienteAEnviar] = useState(null);
  const [oficinasDisponibles, setOficinasDisponibles] = useState([]);
  const [envioData, setEnvioData] = useState({
    oficina_destino_id: '',
    comentario: ''
  });

  // Debug: Rastrear cambios de estado
  React.useEffect(() => {
    console.log('🔄 showEnvioModal cambió a:', showEnvioModal);
  }, [showEnvioModal]);
  
  React.useEffect(() => {
    console.log('🔄 expedienteAEnviar cambió a:', expedienteAEnviar);
  }, [expedienteAEnviar]);

  // Lógica para firmar documento según método
  const handleFirmarDocumento = (docId) => {
    setDocIdAFirmar(docId);
    setShowMetodoFirmaModal(true);
  };

  const confirmarFirmaDocumento = async () => {
    if (!selectedExpediente || !docIdAFirmar) return;
    try {
      let response;
      if (metodoFirma === 'interno') {
        response = await api.post(`/api/expedientes/${selectedExpediente.id}/documentos/${docIdAFirmar}/firmar`, { metodo: 'interno' }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        alert(response.data?.message || 'Documento firmado exitosamente');
        loadExpedienteDetails(selectedExpediente.id);
      } else if (metodoFirma === 'certificado') {
        if (!certSeleccionado) {
          alert('Selecciona un certificado digital propio');
          return;
        }
        response = await api.post(`/api/expedientes/${selectedExpediente.id}/documentos/${docIdAFirmar}/firmar`, { metodo: 'certificado', certificadoId: certSeleccionado }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        alert(response.data?.message || 'Documento firmado exitosamente');
        loadExpedienteDetails(selectedExpediente.id);
      } else if (metodoFirma === 'token') {
        // Buscar el documento a firmar
        const doc = selectedExpediente.documentos?.find(d => d.id === docIdAFirmar);
        if (!doc) {
          alert('No se encontró el documento para firmar con token');
          return;
        }
        setDocParaToken(doc);
        setShowTokenFirmaModal(true);
        setShowMetodoFirmaModal(false);
        return;
      }
    } catch (error) {
      let msg = 'Error al firmar documento.';
      if (error.response?.data?.error) {
        msg += '\n' + error.response.data.error;
      }
      if (error.response?.data?.details) {
        msg += '\nDetalles: ' + error.response.data.details;
      }
      alert(msg);
    } finally {
      setShowMetodoFirmaModal(false);
      setDocIdAFirmar(null);
      setMetodoFirma('interno');
      setCertSeleccionado(null);
    }
  };

  const abrirModalEnvio = async (expediente) => {
    try {
      console.log('🚀 ABRIENDO MODAL ENVÍO - Expediente:', expediente.id);
      console.log('Debug - Usuario completo:', usuario);
      console.log('Debug - Usuario oficina_id:', usuario?.oficina_id);
      
      if (!usuario || !usuario.oficina_id) {
        alert('Error: Usuario sin oficina asignada. Contacte al administrador.');
        return;
      }

      // NUEVA VALIDACIÓN: Cargar detalles completos del expediente antes de validar
      console.log('� CARGANDO DETALLES COMPLETOS DEL EXPEDIENTE PARA VALIDACIÓN');
      let expedienteCompleto;
      try {
        const response = await api.get(`/api/expedientes/${expediente.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        expedienteCompleto = response.data.expediente;
        console.log('✅ Expediente completo cargado:', expedienteCompleto);
      } catch (error) {
        console.error('❌ Error cargando expediente completo:', error);
        alert('Error cargando los detalles del expediente');
        return;
      }

      // Verificar que todos los documentos estén firmados usando los datos completos
      console.log('🔍 VALIDANDO DOCUMENTOS EN FRONTEND');
      console.log('Documentos del expediente completo:', expedienteCompleto.documentos);
      
      if (expedienteCompleto.documentos) {
        expedienteCompleto.documentos.forEach(doc => {
          console.log(`📄 Documento: ${doc.documento_nombre}, Estado: ${doc.estado_firma}`);
        });
      }
      
      const documentosPendientes = expedienteCompleto.documentos?.filter(doc => doc.estado_firma === 'pendiente') || [];
      console.log('Documentos pendientes encontrados:', documentosPendientes.length, documentosPendientes);
      
      if (documentosPendientes.length > 0) {
        console.log('❌ BLOQUEANDO ENVÍO EN FRONTEND - Documentos pendientes:', documentosPendientes.length);
        alert(`❌ No se puede enviar el expediente\n\n📋 El expediente contiene ${documentosPendientes.length} documento${documentosPendientes.length > 1 ? 's' : ''} pendiente${documentosPendientes.length > 1 ? 's' : ''} de firma:\n\n${documentosPendientes.map(doc => `📄 ${doc.documento_nombre}`).join('\n')}\n\n⚠️ Debe firmar todos los documentos antes de poder enviar el expediente a otra oficina.`);
        return;
      }
      
      console.log('✅ VALIDACIÓN FRONTEND APROBADA - Todos los documentos están firmados');
      
      // Cargar oficinas disponibles (excluyendo la actual del usuario)
      console.log('🌐 Llamando API:', `/api/oficinas/disponibles/${usuario.oficina_id}`);
      const response = await api.get(`/api/oficinas/disponibles/${usuario.oficina_id}`);
      console.log('📊 Respuesta de oficinas:', response.data);
      
      // Establecer todo junto al final
      setOficinasDisponibles(response.data);
      setExpedienteAEnviar(expedienteCompleto);
      console.log('📝 Expediente completo a enviar establecido:', expedienteCompleto.id);
      console.log('✅ Abriendo modal...');
      setShowEnvioModal(true);
      console.log('🎯 Estado después de setShowEnvioModal:', {
        showEnvioModal: true,
        expedienteAEnviar,
        oficinasDisponibles: response.data.length
      });
    } catch (error) {
      console.error('Error completo:', error);
      alert('Error cargando oficinas: ' + (error.response?.data?.error || error.message));
    }
  };

  const enviarExpediente = async () => {
    if (!envioData.oficina_destino_id) {
      alert('Debe seleccionar una oficina destino');
      return;
    }
    try {
      const response = await api.post(`/api/expedientes/${expedienteAEnviar.id}/enviar`, envioData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Mensaje de éxito
      alert('✅ ' + (response.data?.message || 'Expediente enviado exitosamente a la oficina seleccionada'));
      loadExpedientes();
      setShowEnvioModal(false);
      setEnvioData({ oficina_destino_id: '', comentario: '' });
    } catch (error) {
      console.error('Error en envío:', error);
      
      // Manejar diferentes tipos de errores
      if (error.response?.status === 400) {
        // Error de validación (documentos pendientes)
        const mensaje = error.response?.data?.message || error.response?.data?.error;
        alert('❌ No se pudo enviar el expediente:\n\n' + mensaje);
      } else {
        // Otros errores (servidor, red, etc.)
        const mensaje = error.response?.data?.error || error.message;
        alert('❌ Error enviando expediente:\n' + mensaje);
      }
      
      // No cerrar el modal si hay error para que el usuario pueda corregir
    }
  };

  // Función para eliminar documento
  const eliminarDocumento = async (docId, docNombre) => {
    if (!confirm(`¿Está seguro de que desea eliminar el documento "${docNombre}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }
    
    try {
      const response = await api.delete(`/api/expedientes/${selectedExpediente.id}/documentos/${docId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert(response.data?.message || 'Documento eliminado exitosamente');
      loadExpedienteDetails(selectedExpediente.id);
    } catch (error) {
      alert('Error eliminando documento: ' + (error.response?.data?.error || error.message));
    }
  };
      {/* Modal para firma con token */}
      {/*
      {showTokenFirmaModal && docParaToken && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999}}>
          <div style={{background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', minWidth: 400, maxWidth: 600, width: '100%', position: 'relative'}}>
            <button style={{position: 'absolute', top: 16, right: 16, background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontWeight: 600, zIndex: 10}} onClick={() => { setShowTokenFirmaModal(false); setDocParaToken(null); }}>Cerrar</button>
            <h2 style={{fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '1rem'}}>Firma con Token Digital</h2>
            {/* <DigitalSignatureWithToken ... /> */}
          //</div>
        //</div>
        //)}
      //}
  // Estado para previsualización de documento
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  // Estado para previsualización del expediente completo
  const [showExpedienteModal, setShowExpedienteModal] = useState(false);
  // Estado para gestión de firmas
  const [showGestionFirmas, setShowGestionFirmas] = useState(false);
  const [usuario, setUsuario] = useState(null);
    // Estados principales
    const [expedientes, setExpedientes] = useState([]);
    const [selectedExpediente, setSelectedExpediente] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    // Estados para filtros y paginación
    const [filter, setFilter] = useState({ estado: '', prioridad: '' });
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
    // Estados para crear expediente
    const [newExpediente, setNewExpediente] = useState({
      titulo: '',
      descripcion: '',
      reparticion: '',
      prioridad: 'normal',
      metadatos: {}
    });
    // Estados para agregar documento
    const [newDocument, setNewDocument] = useState({
      documento_nombre: '',
      documento_tipo: 'documento',
      numero_foja: '',
      archivo: null
    });
    const [documentFile, setDocumentFile] = useState(null);

    useEffect(() => {
      loadExpedientes();
    }, [filter, pagination.page]);

    useEffect(() => {
      loadUsuarioInfo();
    }, []); // Solo cargar una vez al montar el componente

    const loadUsuarioInfo = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('ExpedienteManager - Token obtenido:', token ? 'Token existe' : 'No hay token');
        if (!token) return;
        
        // Decodificar token para obtener información del usuario
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('ExpedienteManager - Payload del token:', payload);
        
        // Usar la API para obtener el perfil completo del usuario
        const response = await api.get('/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const usuarioData = {
          id: response.data.user.id,
          nombre_completo: response.data.user.nombre_completo,
          email: response.data.user.email,
          oficina_id: response.data.user.oficina_id
        };
        console.log('ExpedienteManager - Usuario establecido:', usuarioData);
        setUsuario(usuarioData);
      } catch (error) {
        console.error('Error cargando información del usuario:', error);
        // Fallback al payload del token si la API falla
        try {
          const token = localStorage.getItem('token');
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUsuario({
            id: payload.id,
            nombre_completo: payload.nombre_completo || payload.username,
            email: payload.email || 'email@ejemplo.com',
            oficina_id: payload.oficina_id
          });
        } catch (fallbackError) {
          console.error('Error en fallback:', fallbackError);
        }
      }
    };

    const loadExpedientes = async () => {
      setLoading(true);
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          ...filter
        };
        const response = await api.get('/api/expedientes', {
          params,
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setExpedientes(response.data.expedientes || []);
        setPagination(prev => ({ 
          ...prev, 
          total: response.data.pagination?.total || 0, 
          pages: response.data.pagination?.pages || 1 
        }));
      } catch (error) {
        alert('Error al cargar expedientes: ' + (error.response?.data?.error || error.message));
      } finally {
        setLoading(false);
      }
    };

    const createExpediente = async (e) => {
      e.preventDefault();
      try {
        const response = await api.post('/api/expedientes', newExpediente, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setExpedientes([response.data.expediente, ...expedientes]);
        setShowCreateModal(false);
        setNewExpediente({ titulo: '', descripcion: '', reparticion: '', prioridad: 'normal', metadatos: {} });
        alert('Expediente creado exitosamente');
        loadExpedientes();
      } catch (error) {
        alert('Error al crear expediente: ' + (error.response?.data?.error || error.message));
      }
    };

    const loadExpedienteDetails = async (expedienteId) => {
      try {
        const response = await api.get(`/api/expedientes/${expedienteId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSelectedExpediente(response.data.expediente);
      } catch (error) {
        alert('Error al cargar detalles del expediente');
      }
    };

    const addDocument = async (e) => {
      e.preventDefault();
      if (!selectedExpediente) return;
      try {
        const formData = new FormData();
        formData.append('documento_nombre', newDocument.documento_nombre);
        formData.append('documento_tipo', newDocument.documento_tipo);
        formData.append('numero_foja', newDocument.numero_foja);
        if (newDocument.archivo) {
          formData.append('archivo', newDocument.archivo);
        }
        const response = await api.post(`/api/expedientes/${selectedExpediente.id}/documentos`, formData, {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        setShowDocumentModal(false);
        setNewDocument({ documento_nombre: '', documento_tipo: 'documento', numero_foja: '', archivo: null });
        loadExpedienteDetails(selectedExpediente.id);
        alert(response.data?.message || 'Documento agregado exitosamente');
      } catch (error) {
        let msg = 'Error al agregar documento.';
        if (error.response?.data?.error) {
          msg += '\n' + error.response.data.error;
        }
        if (error.response?.data?.details) {
          msg += '\nDetalles: ' + error.response.data.details;
        }
        alert(msg);
      }
    };

    const getEstadoBadge = (estado) => {
      const badges = {
        borrador: { color: 'bg-gray-500', icon: Edit, text: 'Borrador' },
        en_proceso: { color: 'bg-blue-500', icon: Clock, text: 'En Proceso' },
        consolidado: { color: 'bg-green-500', icon: CheckCircle, text: 'Consolidado' },
        cerrado: { color: 'bg-red-500', icon: AlertCircle, text: 'Cerrado' }
      };
      const badge = badges[estado] || badges.borrador;
      const Icon = badge.icon;
      return (
        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium text-white rounded-full ${badge.color}`}>
          <Icon className="w-3 h-3 mr-1" />
          {badge.text}
        </span>
      );
    };

    const getPrioridadColor = (prioridad) => {
      const colors = {
        alta: 'text-red-600 font-semibold',
        media: 'text-yellow-600 font-medium',
        normal: 'text-green-600',
        baja: 'text-gray-600'
      };
      return colors[prioridad] || colors.normal;
    };

  //console.log('showCreateModal:', showCreateModal);
  return (
    <>
    <div className="p-6 max-w-7xl mx-auto" style={{ position: 'relative' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileText className="w-8 h-8 mr-3 text-blue-600" />
            Gestión de Expedientes
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => {
                console.log('Botón Mis Firmas clickeado. Usuario actual:', usuario);
                console.log('Estableciendo showGestionFirmas a true');
                setShowGestionFirmas(true);
              }}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
            >
              <FileSignature className="w-5 h-5 mr-2" />
              Mis Firmas
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Expediente
            </button>
          </div>
        </div>
        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={filter.estado}
                onChange={(e) => setFilter({ ...filter, estado: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Todos los estados</option>
                <option value="borrador">Borrador</option>
                <option value="en_proceso">En Proceso</option>
                <option value="consolidado">Consolidado</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prioridad</label>
              <select
                value={filter.prioridad}
                onChange={(e) => setFilter({ ...filter, prioridad: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Todas las prioridades</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="normal">Normal</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilter({ estado: '', prioridad: '' });
                  setPagination({ ...pagination, page: 1 });
                }}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div> 
        {/* Lista de Expedientes */}
          <div>
            {loading ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                <p className="mt-2 text-gray-600">Cargando expedientes...</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 overflow-x-auto w-full max-w-5xl mx-auto">
                {expedientes.length === 0 ? (
                  <li className="py-4 text-gray-500 text-center">No hay expedientes disponibles.</li>
                ) : (
                  expedientes.map((exp) => (
                    <li key={exp.id} className={`py-6 border-b border-gray-100 w-full max-w-5xl mx-auto ${exp.documentos?.some(doc => doc.estado_firma === 'pendiente') ? 'bg-orange-50' : ''}`}> 
                      <div className="flex items-center justify-between w-full min-w-0">
                        {/* Izquierda: Título y badges */}
                        <div className="flex items-center min-w-0 flex-1 gap-2">
                          <span className={`font-extrabold text-xl md:text-2xl mr-2 truncate whitespace-nowrap min-w-0 ${exp.documentos?.some(doc => doc.estado_firma === 'pendiente') ? 'text-red-700' : 'text-blue-800'}`}> 
                            <FolderOpen className={`w-6 h-6 inline-block mr-2 align-middle ${exp.documentos?.some(doc => doc.estado_firma === 'pendiente') ? 'text-red-500' : 'text-blue-400'}`} />
                            {exp.titulo}
                          </span>
                          <div className="flex flex-nowrap items-center gap-2 min-w-0 overflow-hidden">
                            {/* Mostrar prioridad solo si no es 'normal' */}
                            {exp.prioridad !== 'normal' && (
                              <span className={getPrioridadColor(exp.prioridad) + ' whitespace-nowrap'}>
                                {exp.prioridad}
                              </span>
                            )}
                            {/* Mostrar estado solo si no es 'borrador' */}
                            {exp.estado !== 'borrador' && (
                              <span className="whitespace-nowrap">
                                {getEstadoBadge(exp.estado)}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Derecha: Botones de acción */}
                        <div className="flex flex-nowrap gap-2 flex-shrink-0 min-w-[220px] justify-end">
                          <button className="text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-1 py-1 flex items-center gap-1 transition text-xs" onClick={() => loadExpedienteDetails(exp.id)}>
                            <Eye className="w-4 h-4" />
                            <span className="hidden sm:inline">Ver</span>
                          </button>
                          <button className="text-green-600 hover:text-green-800 border border-green-200 rounded-lg px-1 py-1 flex items-center gap-1 transition text-xs" onClick={() => { setSelectedExpediente(exp); setShowDocumentModal(true); }}>
                            <FileSignature className="w-4 h-4" />
                            <span className="hidden sm:inline">Agregar Doc.</span>
                          </button>
                          <button 
                            className={`border rounded-lg px-1 py-1 flex items-center gap-1 transition text-xs ${
                              exp.documentos?.some(doc => doc.estado_firma === 'pendiente') 
                                ? 'text-gray-400 border-gray-200 cursor-not-allowed' 
                                : 'text-orange-600 border-orange-200 hover:text-orange-800 hover:border-orange-400'
                            }`} 
                            onClick={() => {
                              if (!exp.documentos?.some(doc => doc.estado_firma === 'pendiente')) abrirModalEnvio(exp);
                            }} 
                            title={
                              exp.documentos?.some(doc => doc.estado_firma === 'pendiente')
                                ? 'No se puede enviar: hay documentos sin firmar'
                                : 'Enviar expediente a otra oficina'
                            }
                          >
                            <Send className="w-4 h-4" />
                            <span className="hidden sm:inline">Enviar</span>
                          </button>
                          <button className="text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg px-1 py-1 flex items-center gap-1 transition text-xs">
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Descargar</span>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          {/* Contenido Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Detalles del Expediente Seleccionado */}
          <div>
            {selectedExpediente ? (
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                          <div>
                            <h2 className="text-2xl font-bold text-blue-800 mb-2 flex items-center gap-2">
                              <FolderOpen className="w-7 h-7 text-blue-400" />
                              {selectedExpediente.titulo}
                            </h2>
                            <div className="text-gray-600 mb-2"><span className="font-semibold">Descripción:</span> {selectedExpediente.descripcion || <span className="italic text-gray-400">Sin descripción</span>}</div>
                            <div className="flex gap-4 flex-wrap">
                              <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"><strong>Repartición:</strong> {selectedExpediente.reparticion}</span>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getPrioridadColor(selectedExpediente.prioridad)} bg-gray-100`}><strong>Prioridad:</strong> {selectedExpediente.prioridad}</span>
                              <span>{getEstadoBadge(selectedExpediente.estado)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <span className="text-xs text-gray-400">ID: {selectedExpediente.id}</span>
                            <span className="text-xs text-gray-400">Documentos: {selectedExpediente.documentos?.length || 0}</span>
                            <button
                              onClick={() => setShowExpedienteModal(true)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              Ver Expediente Completo
                            </button>
                          </div>
                        </div>
                        <div className="mt-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Documentos</h3>
                          {/* Documentos asociados - tarjetas */}
                          <div className="grid grid-cols-1 gap-4 mt-2">
                            {selectedExpediente.documentos && selectedExpediente.documentos.length > 0 ? (
                              selectedExpediente.documentos.map((doc) => (
                                <div key={doc.id} className="bg-gray-50 rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center justify-between border border-gray-200">
                                  <div className="flex items-center gap-3">
                                    <FileText className="w-6 h-6 text-blue-500" />
                                    <div>
                                      <div className="font-semibold text-lg text-gray-800">{doc.documento_nombre}</div>
                                      <div className="text-sm text-gray-500">Tipo: <span className="font-medium">{doc.documento_tipo}</span></div>
                                      <div className="text-sm text-gray-500">Foja: <span className="font-medium">{doc.numero_foja}</span></div>
                                      <div className="text-sm text-gray-500">Estado: {doc.estado_firma === 'firmado' ? <span className="text-green-600 font-semibold">Firmado</span> : doc.estado_firma === 'pendiente' ? <span className="text-yellow-600 font-semibold">Pendiente</span> : <span className="text-red-600 font-semibold">Rechazado</span>}</div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 mt-3 md:mt-0">
                                    <button
                                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 flex items-center gap-1 text-sm"
                                      onClick={() => { setPreviewDoc(doc); setShowPreviewModal(true); }}
                                    >
                                      <Eye className="w-4 h-4" />Ver
                                    </button>
                                    {doc.estado_firma === 'pendiente' && (
                                      <>
                                        <button className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1 text-sm" onClick={() => handleFirmarDocumento(doc.id)}><FileSignature className="w-4 h-4" />Firmar</button>
                                        <button 
                                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 flex items-center gap-1 text-sm" 
                                          onClick={() => eliminarDocumento(doc.id, doc.documento_nombre)}
                                          title="Eliminar documento (solo disponible para documentos no firmados)"
                                        >
                                          <Trash2 className="w-4 h-4" />Eliminar
                                        </button>
                                      </>
                                    )}
      {/* Modal para seleccionar método de firma */}
      {showMetodoFirmaModal && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999}}>
          <div style={{background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', minWidth: 350, maxWidth: 400, width: '100%'}}>
            <h2 style={{fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '1rem'}}>Selecciona el método de firma</h2>
            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: 8}}>
                <input type="radio" name="metodoFirma" value="interno" checked={metodoFirma === 'interno'} onChange={() => setMetodoFirma('interno')} />
                <span style={{marginLeft: 8}}>Certificado interno del sistema</span>
              </label>
              <label style={{display: 'block', marginBottom: 8}}>
                <input type="radio" name="metodoFirma" value="certificado" checked={metodoFirma === 'certificado'} onChange={() => setMetodoFirma('certificado')} />
                <span style={{marginLeft: 8}}>Certificado digital propio</span>
              </label>
              {metodoFirma === 'certificado' && (
                <select style={{width: '100%', marginTop: 8, marginBottom: 8, padding: 6, borderRadius: 6, border: '1px solid #ccc'}} value={certSeleccionado || ''} onChange={e => setCertSeleccionado(e.target.value)}>
                  <option value="">Selecciona un certificado</option>
                  {(usuario?.certificados || []).map(cert => (
                    <option key={cert.id} value={cert.id}>{cert.nombre || cert.issuer || cert.id}</option>
                  ))}
                </select>
              )}
              <label style={{display: 'block', marginBottom: 8}}>
                <input type="radio" name="metodoFirma" value="token" checked={metodoFirma === 'token'} onChange={() => setMetodoFirma('token')} />
                <span style={{marginLeft: 8}}>Token de firma digital</span>
              </label>
            </div>
            <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem'}}>
              <button onClick={confirmarFirmaDocumento} style={{background: '#059669', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600}}>Firmar</button>
              <button onClick={() => setShowMetodoFirmaModal(false)} style={{background: '#6b7280', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-gray-500 text-center py-2">No hay documentos asociados.</div>
                            )}
                          </div>
                        </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg shadow text-gray-500 text-center">
                <p>Selecciona un expediente para ver los detalles.</p>
              </div>
            )}
          </div>
        {/* Modal de previsualización de documento */}
        {showPreviewModal && previewDoc && (
          <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999}}>
            <div style={{background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', minWidth: 350, maxWidth: 800, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative'}}>
              <button style={{position: 'absolute', top: 16, right: 16, background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontWeight: 600, zIndex: 10}} onClick={() => setShowPreviewModal(false)}>Cerrar</button>
              <h2 style={{fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '1rem'}}>Previsualización: {previewDoc.documento_nombre}</h2>
              {/* Renderizar PDF o imagen */}
              <div className="mb-3">
                <div className="text-sm text-gray-600 mb-2">Ruta: {previewDoc.archivo_path || 'No disponible'}</div>
                <a 
                  href={`http://localhost:4000/${previewDoc.archivo_path}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 mr-2"
                >
                  Abrir en Nueva Pestaña
                </a>
              </div>
              {previewDoc.archivo_path && previewDoc.archivo_path.match(/\.pdf$/i) ? (
                <iframe 
                  src={`http://localhost:4000/${previewDoc.archivo_path}`} 
                  title="PDF Preview" 
                  style={{width: '100%', height: '70vh', border: '1px solid #ccc', borderRadius: '0.5rem'}}
                  onError={(e) => {
                    console.error('Error loading PDF in modal:', e);
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
              ) : previewDoc.archivo_path && previewDoc.archivo_path.match(/\.(png|jpg|jpeg)$/i) ? (
                <img 
                  src={`http://localhost:4000/${previewDoc.archivo_path}`} 
                  alt={previewDoc.documento_nombre} 
                  style={{maxWidth: '100%', maxHeight: '70vh', borderRadius: '0.5rem', border: '1px solid #ccc'}}
                  onError={(e) => {
                    console.error('Error loading image in modal:', e);
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
              ) : (
                <div className="text-gray-500">No se puede previsualizar este tipo de archivo.</div>
              )}
              <div className="text-red-500 italic text-center py-4 border border-gray-200 rounded mt-2" style={{display: 'none'}}>
                Error al cargar el archivo. Verifica que el servidor esté funcionando en http://localhost:4000 y que el archivo exista.
              </div>
            </div>
          </div>
        )}

        {/* Modal de previsualización del expediente completo */}
        {showExpedienteModal && selectedExpediente && (
          <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999}}>
            <div style={{background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', minWidth: 600, maxWidth: '95vw', width: '100%', maxHeight: '95vh', overflowY: 'auto', position: 'relative'}}>
              <button style={{position: 'absolute', top: 16, right: 16, background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontWeight: 600, zIndex: 10}} onClick={() => setShowExpedienteModal(false)}>Cerrar</button>
              
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <FolderOpen className="w-6 h-6 text-blue-400" />
                  Vista Completa del Expediente
                </h2>
                
                {/* Información del expediente */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{selectedExpediente.titulo}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><strong>ID:</strong> {selectedExpediente.id}</div>
                    <div><strong>Estado:</strong> <span>{selectedExpediente.estado}</span></div>
                    <div><strong>Prioridad:</strong> <span className={getPrioridadColor(selectedExpediente.prioridad)}>{selectedExpediente.prioridad}</span></div>
                    <div><strong>Repartición:</strong> {selectedExpediente.reparticion}</div>
                  </div>
                  {selectedExpediente.descripcion && (
                    <div className="mt-3"><strong>Descripción:</strong> {selectedExpediente.descripcion}</div>
                  )}
                </div>

                {/* Lista completa de documentos */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Documentos del Expediente ({selectedExpediente.documentos?.length || 0})</h3>
                  {selectedExpediente.documentos && selectedExpediente.documentos.length > 0 ? (
                    <div className="space-y-4">
                      {selectedExpediente.documentos.map((doc, index) => (
                        <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">#{index + 1}</span>
                              <FileText className="w-5 h-5 text-blue-500" />
                              <div>
                                <div className="font-semibold text-gray-800">{doc.documento_nombre}</div>
                                <div className="text-sm text-gray-500">Tipo: {doc.documento_tipo} | Foja: {doc.numero_foja}</div>
                              </div>
                            </div>
                            <div className="text-sm">
                              Estado: {doc.estado_firma === 'firmado' ? 
                                <span className="text-green-600 font-semibold">✓ Firmado</span> : 
                                doc.estado_firma === 'pendiente' ? 
                                <span className="text-yellow-600 font-semibold">⏳ Pendiente</span> : 
                                <span className="text-red-600 font-semibold">✗ Rechazado</span>
                              }
                            </div>
                          </div>
                          
                          {/* Vista previa del documento en el modal */}
                          <div className="mt-3">
                            {doc.archivo_path ? (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-gray-600">Archivo: {doc.archivo_path}</span>
                                  <div className="flex gap-2">
                                    <button
                                      className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200"
                                      onClick={() => { setPreviewDoc(doc); setShowPreviewModal(true); setShowExpedienteModal(false); }}
                                    >
                                      Ver en Modal Separado
                                    </button>
                                    <a 
                                      href={`http://localhost:4000/${doc.archivo_path}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200"
                                    >
                                      Abrir en Nueva Pestaña
                                    </a>
                                  </div>
                                </div>
                                {doc.archivo_path.match(/\.pdf$/i) ? (
                                  <iframe 
                                    src={`http://localhost:4000/${doc.archivo_path}`} 
                                    title={`Preview ${doc.documento_nombre}`} 
                                    style={{width: '100%', height: '400px', border: '1px solid #ccc', borderRadius: '0.5rem'}}
                                    onError={(e) => {
                                      console.error('Error loading PDF:', e);
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'block';
                                    }}
                                  />
                                ) : doc.archivo_path.match(/\.(png|jpg|jpeg)$/i) ? (
                                  <img 
                                    src={`http://localhost:4000/${doc.archivo_path}`} 
                                    alt={doc.documento_nombre} 
                                    style={{maxWidth: '100%', maxHeight: '400px', borderRadius: '0.5rem', border: '1px solid #ccc'}}
                                    onError={(e) => {
                                      console.error('Error loading image:', e);
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'block';
                                    }}
                                  />
                                ) : (
                                  <div className="text-gray-500 italic text-center py-4 border border-gray-200 rounded">
                                    Vista previa no disponible para este tipo de archivo ({doc.archivo_path.split('.').pop()})
                                  </div>
                                )}
                                <div className="text-red-500 italic text-center py-4 border border-gray-200 rounded mt-2" style={{display: 'none'}}>
                                  Error al cargar el archivo. Verifica que el servidor esté funcionando y que el archivo exista.
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-500 italic text-center py-4 border border-gray-200 rounded">
                                No hay archivo asociado a este documento
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-8">No hay documentos en este expediente.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
{/* Modal para crear expediente */}
        {showCreateModal && (
          <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
            <div style={{background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', minWidth: 350, maxWidth: 400, width: '100%'}}>
              <h2 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem'}}>Nuevo Expediente</h2>
              <form onSubmit={createExpediente}>
                <div style={{marginBottom: '1rem'}}>
                  <label style={{display: 'block', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.5rem'}}>Título</label>
                  <input type="text" style={{width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc'}} value={newExpediente.titulo} onChange={e => setNewExpediente({ ...newExpediente, titulo: e.target.value })} required />
                </div>
                <div style={{marginBottom: '1rem'}}>
                  <label style={{display: 'block', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.5rem'}}>Descripción</label>
                  <textarea style={{width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc'}} value={newExpediente.descripcion} onChange={e => setNewExpediente({ ...newExpediente, descripcion: e.target.value })} />
                </div>
                <div style={{marginBottom: '1rem'}}>
                  <label style={{display: 'block', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.5rem'}}>Repartición</label>
                  <input type="text" style={{width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc'}} value={newExpediente.reparticion} onChange={e => setNewExpediente({ ...newExpediente, reparticion: e.target.value })} />
                </div>
                <div style={{marginBottom: '1rem'}}>
                  <label style={{display: 'block', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.5rem'}}>Prioridad</label>
                  <select style={{width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc'}} value={newExpediente.prioridad} onChange={e => setNewExpediente({ ...newExpediente, prioridad: e.target.value })}>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="normal">Normal</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem'}}>
                  <button type="submit" style={{background: '#2563eb', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600}}>Crear</button>
                  <button type="button" style={{background: '#6b7280', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600}} onClick={() => setShowCreateModal(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal para agregar documento */}
        {showDocumentModal && (
          <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
            <div style={{background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', minWidth: 350, maxWidth: 400, width: '100%'}}>
              <h2 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem'}}>Agregar Documento</h2>
              <form onSubmit={addDocument}>
                <div style={{marginBottom: '1rem'}}>
                  <label style={{display: 'block', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.5rem'}}>Nombre</label>
                  <input type="text" style={{width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc'}} value={newDocument.documento_nombre} onChange={e => setNewDocument({ ...newDocument, documento_nombre: e.target.value })} required />
                </div>
                <div style={{marginBottom: '1rem'}}>
                  <label style={{display: 'block', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.5rem'}}>Tipo</label>
                  <select style={{width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc'}} value={newDocument.documento_tipo} onChange={e => setNewDocument({ ...newDocument, documento_tipo: e.target.value })}>
                    <option value="iniciacion">Iniciación</option>
                    <option value="informe">Informe</option>
                    <option value="dictamen">Dictamen</option>
                    <option value="resolucion">Resolución</option>
                    <option value="anexo">Anexo</option>
                    <option value="notificacion">Notificación</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div style={{marginBottom: '1rem'}}>
                  <label style={{display: 'block', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.5rem'}}>Archivo</label>
                  <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style={{width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc'}} 
                    onChange={async e => {
                      const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                      console.log('Archivo seleccionado:', file);
                      if (!file) {
                        setNewDocument(prev => ({ ...prev, archivo: null }));
                        return;
                      }
                      if (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword' || file.type === 'image/png' || file.type === 'image/jpeg') {
                        if (file.type === 'application/pdf') {
                          try {
                            const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
                            pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
                            const reader = new FileReader();
                            reader.onload = async function(ev) {
                              const typedarray = new Uint8Array(ev.target.result);
                              const pdf = await pdfjsLib.getDocument(typedarray).promise;
                              setNewDocument(prev => ({ ...prev, archivo: file }));
                            };
                            reader.readAsArrayBuffer(file);
                            return;
                          } catch (err) {
                            alert('Error al procesar el PDF: ' + err.message);
                            setNewDocument(prev => ({ ...prev, archivo: file }));
                          }
                        } else {
                          setNewDocument(prev => ({ ...prev, archivo: file }));
                        }
                      } else {
                        alert('Tipo de archivo no permitido. Selecciona PDF, DOC, DOCX, PNG, JPG o JPEG.');
                        setNewDocument(prev => ({ ...prev, archivo: null }));
                      }
                    }}
                    required
                  />
                </div>
                <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem'}}>
                  <button type="submit" style={{background: '#059669', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600}} disabled={newDocument.archivo === null || typeof newDocument.archivo === 'undefined'}>Agregar</button>
                  <button type="button" style={{background: '#6b7280', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600}} onClick={() => setShowDocumentModal(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        </div>

      {/* Gestión de Firmas Modal - Fuera del contenedor principal */}
      {showGestionFirmas && (
        <GestionFirmas 
          isOpen={showGestionFirmas}
          onClose={() => {
            console.log('Cerrando modal GestionFirmas');
            setShowGestionFirmas(false);
          }}
          usuario={usuario || { id: 0, nombre_completo: 'Usuario', email: 'test@test.com' }}
        />
      )}

      {/* Modal para enviar expediente - Fuera del contenedor principal */}
      {showEnvioModal && expedienteAEnviar && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEnvioModal(false);
            }
          }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '24px',
              color: '#1f2937'
            }}>
              Enviar Expediente
            </h2>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ marginBottom: '16px', color: '#374151' }}>
                <strong>Expediente:</strong> {expedienteAEnviar.titulo}
              </p>
              
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#374151'
              }}>
                Oficina Destino
              </label>
              <select 
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '16px',
                  backgroundColor: 'white'
                }}
                value={envioData.oficina_destino_id}
                onChange={e => setEnvioData({ ...envioData, oficina_destino_id: e.target.value })}
              >
                <option value="">Seleccione oficina destino</option>
                {oficinasDisponibles.map(oficina => (
                  <option key={oficina.id} value={oficina.id}>{oficina.nombre}</option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#374151'
              }}>
                Comentario (opcional)
              </label>
              <textarea 
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '16px',
                  resize: 'vertical',
                  minHeight: '80px'
                }}
                rows="3"
                value={envioData.comentario}
                onChange={e => setEnvioData({ ...envioData, comentario: e.target.value })}
                placeholder="Comentarios sobre el envío..."
              />
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button 
                onClick={() => {
                  setShowEnvioModal(false);
                  setEnvioData({ oficina_destino_id: '', comentario: '' });
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backgroundColor: '#6b7280',
                  color: 'white'
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={enviarExpediente}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backgroundColor: '#059669',
                  color: 'white'
                }}
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default ExpedienteManager;