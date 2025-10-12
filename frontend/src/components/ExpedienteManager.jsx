import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { FileText, Plus, Eye, Edit, Trash2, Download, FileSignature, CheckCircle, Clock, AlertCircle, FolderOpen, Settings, User, Send } from 'lucide-react';
import GestionFirmas from './GestionFirmasFixed';
import TokenFirmaSimulator from './TokenFirmaSimulator';
// import DigitalSignatureWithToken from './DigitalSignatureWithToken';

const ExpedienteManager = () => {

  // TODOS LOS useState VAN AL INICIO PARA EVITAR ERRORES DE REFERENCIA
  const [usuario, setUsuario] = useState(null);
  const [certificados, setCertificados] = useState([]);
  const [showGestionFirmas, setShowGestionFirmas] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [newDocument, setNewDocument] = useState({ documento_nombre: '', documento_tipo: '', archivo: null });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExpedienteModal, setShowExpedienteModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [expedientes, setExpedientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ estado: '', prioridad: '' });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [selectedExpediente, setSelectedExpediente] = useState(null);
  const [newExpediente, setNewExpediente] = useState({ titulo: '', descripcion: '', reparticion: '', prioridad: 'normal' });
  const [showMetodoFirmaModal, setShowMetodoFirmaModal] = useState(false);
  const [docIdAFirmar, setDocIdAFirmar] = useState(null);
  const [metodoFirma, setMetodoFirma] = useState('interno');
  const [certSeleccionado, setCertSeleccionado] = useState(null);
  const [showTokenFirmaModal, setShowTokenFirmaModal] = useState(false);
  const [docParaToken, setDocParaToken] = useState(null);
  const [showEnvioModal, setShowEnvioModal] = useState(false);
  const [expedienteAEnviar, setExpedienteAEnviar] = useState(null);
  const [oficinasDisponibles, setOficinasDisponibles] = useState([]);
  const [envioData, setEnvioData] = useState({ oficina_destino_id: '', comentario: '' });

  // Cargar detalles de un expediente por id
  const loadExpedienteDetails = async (expedienteId) => {
    try {
      console.log('[DEBUG] Llamando a /expedientes/' + expedienteId);
      const response = await api.get(`/expedientes/${expedienteId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('[DEBUG] Respuesta de backend:', response.data);
      const data = response.data || {};
      // Si la respuesta es { expediente: { ... } }, acceder correctamente
      const expediente = data.expediente || {};
      console.log('[DEBUG] Expediente extraído:', expediente);
      if (!Array.isArray(expediente.documentos)) {
        console.log('[DEBUG] Normalizando documentos a array vacío');
        expediente.documentos = [];
      }
      setSelectedExpediente(expediente);
    } catch (error) {
      console.error('[ERROR] al cargar detalles del expediente:', error);
      alert('Error al cargar detalles del expediente');
    }
  };

  // Función para actualizar el expediente seleccionado después de cambios
  const refreshSelectedExpediente = async () => {
    if (selectedExpediente?.id) {
      await loadExpedienteDetails(selectedExpediente.id);
    }
  };

  // Función para mostrar información detallada de la firma
  const mostrarInfoFirma = (doc) => {
    if (doc.estado_firma === 'firmado') {
      return (
        <div className="text-sm">
          <div className="flex items-center gap-1 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-green-600 font-semibold">Firmado Digitalmente</span>
          </div>
          {doc.firmante && (
            <div className="text-xs text-gray-600">
              👤 Por: <span className="font-medium">{doc.firmante.nombre_completo}</span>
            </div>
          )}
          {doc.fecha_firma && (
            <div className="text-xs text-gray-600">
              📅 El: <span className="font-medium">{new Date(doc.fecha_firma).toLocaleString('es-AR')}</span>
            </div>
          )}
          {doc.metadatos?.metodo && (
            <div className="text-xs text-gray-600">
              🔐 Método: <span className="font-medium">{doc.metadatos.metodo === 'token' ? 'Token Digital' : 'Certificado Interno'}</span>
            </div>
          )}
          {doc.archivo_firmado_path && (
            <div className="text-xs text-blue-600">
              � Firma digital criptográfica embedida
            </div>
          )}
          {doc.archivo_firmado_path && (
            <div className="text-xs text-green-600">
              �📄 Incluye firma visual en el documento
            </div>
          )}
        </div>
      );
    } else if (doc.estado_firma === 'pendiente') {
      return (
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-yellow-600" />
          <span className="text-yellow-600 font-semibold">Pendiente de firma</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-red-600 font-semibold">Rechazado</span>
        </div>
      );
    }
  };

  // Eliminar documento
  const eliminarDocumento = async (docId, docNombre) => {
    if (!selectedExpediente) return;
    if (!window.confirm(`¿Seguro que deseas eliminar el documento "${docNombre}"?`)) return;
    try {
      await api.delete(`/expedientes/${selectedExpediente.id}/documentos/${docId}`);
      alert('Documento eliminado correctamente');
      fetchExpedientes();
    } catch (error) {
      alert('Error al eliminar documento');
    }
  };

  // Verificar firma digital de un documento
  const verificarFirmaDigital = async (docId) => {
    try {
      const response = await api.get(`/expedientes/${selectedExpediente.id}/documentos/${docId}/verificar-firma`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const { verificacion, firmante, fecha_firma, metadatos } = response.data;
      
      let mensaje = '🔐 VERIFICACIÓN DE FIRMA DIGITAL\n\n';
      mensaje += `Estado: ${verificacion.isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}\n`;
      mensaje += `Firmante: ${firmante?.nombre_completo || 'No disponible'}\n`;
      mensaje += `Fecha: ${fecha_firma ? new Date(fecha_firma).toLocaleString('es-AR') : 'No disponible'}\n`;
      
      if (metadatos?.metodo) {
        mensaje += `Método: ${metadatos.metodo === 'token' ? 'Token Digital' : 'Certificado Interno'}\n`;
      }
      
      if (verificacion.signatures && verificacion.signatures.length > 0) {
        mensaje += '\n📋 DETALLES DE LA FIRMA:\n';
        verificacion.signatures.forEach((sig, index) => {
          mensaje += `• Firmante: ${sig.signer}\n`;
          mensaje += `• Fecha de firma: ${new Date(sig.signDate).toLocaleString('es-AR')}\n`;
          mensaje += `• Razón: ${sig.reason}\n`;
          mensaje += `• Válida ahora: ${sig.isValidNow ? 'Sí' : 'No'}\n`;
        });
      }
      
      alert(mensaje);
      
    } catch (error) {
      console.error('Error verificando firma digital:', error);
      alert('Error al verificar la firma digital: ' + (error.response?.data?.error || 'Error desconocido'));
    }
  };

  // Mostrar PDF unificado en un modal
  const mostrarPDFUnificado = async (expedienteId) => {
    try {
      // Mostrar un mensaje de carga
      alert('Generando vista previa del PDF unificado, por favor espere...');
      
      // Configurar un objeto para la previsualización
      const pdfPreviewData = {
        id: `unificado_${expedienteId}`,
        documento_nombre: `Expediente ${expedienteId} Completo`,
        ruta_activa: `api/expedientes/${expedienteId}/merged-pdf`,
        cache_token: Date.now() // Para evitar caché
      };
      
      // Usar el modal de previsualización existente
      setPreviewDoc(pdfPreviewData);
      setShowPreviewModal(true);
      
      console.log(`Vista previa del PDF unificado del expediente ${expedienteId} generada`);
    } catch (error) {
      console.error('Error al mostrar PDF unificado:', error);
      alert(`Error al mostrar el PDF unificado: ${error.message}`);
    }
  };

  // Enviar expediente
  const enviarExpediente = async () => {
    if (!expedienteAEnviar || !envioData.oficina_destino_id) {
      alert('Selecciona la oficina destino');
      return;
    }
    try {
      await api.post(`/expedientes/${expedienteAEnviar.id}/enviar`, envioData);
      alert('Expediente enviado correctamente');
      setShowEnvioModal(false);
      setEnvioData({ oficina_destino_id: '', comentario: '' });
      fetchExpedientes();
    } catch (error) {
      alert('Error al enviar expediente');
    }
  };

  // Función para cargar expedientes desde la API
  const fetchExpedientes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.estado) params.append('estado', filter.estado);
      if (filter.prioridad) params.append('prioridad', filter.prioridad);
      params.append('page', pagination.page);
      params.append('pageSize', pagination.pageSize);
      if (usuario?.oficina_id) params.append('oficina_id', usuario.oficina_id);
      const response = await api.get(`/expedientes?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Normalizar expedientes para asegurar que documentos siempre sea un array
      const expedientesRaw = response.data?.expedientes || [];
      const expedientesNorm = expedientesRaw.map(exp => ({
        ...exp,
        documentos: Array.isArray(exp.documentos) ? exp.documentos : []
      }));
      setExpedientes(expedientesNorm);
    } catch (error) {
      setExpedientes([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar expedientes cuando cambian filtros, paginación o usuario
  useEffect(() => {
    if (usuario?.oficina_id) {
      fetchExpedientes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, pagination, usuario]);

  // Cargar usuario simulado si no está definido
  useEffect(() => {
    // Simulación: obtener usuario de localStorage o API si es necesario
    const userStr = localStorage.getItem('usuario');
    if (userStr) {
      setUsuario(JSON.parse(userStr));
    } else {
      // Usuario simulado por defecto
      setUsuario({ id: 1, nombre_completo: 'Usuario', email: 'test@test.com', oficina_id: 1 });
    }
  }, []);

  // Cargar certificados del usuario
  const cargarCertificados = async () => {
    try {
      // Usar ruta pública para desarrollo
      const response = await fetch('/api/usuarios/certificados-publicos');
      if (response.ok) {
        const data = await response.json();
        console.log('Certificados cargados (público):', data);
        setCertificados(data.certificados || []);
      } else {
        console.error('Error al cargar certificados:', response.status);
      }
    } catch (error) {
      console.error('Error al cargar certificados:', error);
    }
  };

  // Cargar certificados cuando el componente se monta
  useEffect(() => {
    cargarCertificados();
  }, []);

  // (Eliminado bloque duplicado de hooks y funciones)
  // El resto del código del componente continúa normalmente

  const abrirModalEnvio = async (expediente) => {
    try {
      console.log('🚀 ABRIENDO MODAL ENVÍO - Expediente:', expediente.id);
      console.log('Debug - Usuario completo:', usuario);
      console.log('Debug - Usuario oficina_id:', usuario?.oficina_id);
      setExpedienteAEnviar(expediente);
      setShowEnvioModal(true);
    } catch (error) {
      alert('Error al abrir el modal de envío');
    }
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

  // Función para obtener el badge del estado
  const getEstadoBadge = (estado) => {
    const badges = {
      borrador: <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm">Borrador</span>,
      en_proceso: <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">En Proceso</span>,
      consolidado: <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">Consolidado</span>,
      cerrado: <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm">Cerrado</span>
    };
    return badges[estado] || <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm">{estado}</span>;
  };

  // Manejar firma de documento
  const handleFirmarDocumento = (docId) => {
    setDocIdAFirmar(docId);
    setShowMetodoFirmaModal(true);
  };

  // Confirmar firma de documento
  const confirmarFirmaDocumento = async () => {
    if (!docIdAFirmar) return;
    
    try {
      if (metodoFirma === 'token') {
        // Buscar el documento para abrir el modal de token
        const documento = selectedExpediente?.documentos?.find(doc => doc.id === docIdAFirmar);
        setDocParaToken(documento);
        setShowTokenFirmaModal(true);
        setShowMetodoFirmaModal(false);
        return;
      }

      // Para otros métodos de firma (interno o certificado)
      const firmaData = {
        metodo: metodoFirma,
        certificado_id: metodoFirma === 'certificado' ? certSeleccionado : null
      };

      await api.post(`/expedientes/${selectedExpediente.id}/documentos/${docIdAFirmar}/firmar`, firmaData);

      alert('Documento firmado correctamente');
      setShowMetodoFirmaModal(false);
      setDocIdAFirmar(null);
      setMetodoFirma('interno');
      setCertSeleccionado(null);
      
      // Actualizar tanto la lista como los detalles del expediente seleccionado
      await fetchExpedientes();
      await refreshSelectedExpediente();
    } catch (error) {
      console.error('Error al firmar documento:', error);
      alert('Error al firmar documento');
    }
  };

  // Crear expediente
  const createExpediente = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/expedientes', newExpediente);
      alert('Expediente creado correctamente');
      setShowCreateModal(false);
      setNewExpediente({ titulo: '', descripcion: '', reparticion: '', prioridad: 'normal' });
      fetchExpedientes();
    } catch (error) {
      alert('Error al crear expediente');
    }
  };

  // Agregar documento
  const addDocument = async (e) => {
    e.preventDefault();
    if (!selectedExpediente) return;
    try {
      const formData = new FormData();
      formData.append('documento_nombre', newDocument.documento_nombre);
      formData.append('documento_tipo', newDocument.documento_tipo);
      formData.append('archivo', newDocument.archivo);
      await api.post(`/expedientes/${selectedExpediente.id}/documentos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('Documento agregado correctamente');
      setShowDocumentModal(false);
      setNewDocument({ documento_nombre: '', documento_tipo: '', archivo: null });
      fetchExpedientes();
    } catch (error) {
      alert('Error al agregar documento');
    }
  };
  return (
    <>
    <div className="p-6 max-w-7xl mx-auto" style={{ position: 'relative' }}>
        {/* Debug overlay detector (solo visible si hay bloqueo de puntero accidental) */}
        {false && (
          <div style={{position:'fixed',inset:0,zIndex:20000,pointerEvents:'none'}}>
            <div style={{position:'absolute',top:0,left:0,background:'rgba(255,0,0,0.15)',padding:4,fontSize:10,fontFamily:'monospace'}}>DEBUG OVERLAY ACTIVE</div>
          </div>
        )}
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
                    <li key={exp.id} className={`py-6 border-b border-gray-100 w-full max-w-5xl mx-auto ${(Array.isArray(exp.documentos) ? exp.documentos : []).some(doc => doc.estado_firma === 'pendiente') ? 'bg-orange-50' : ''}`}> 
                      <div className="flex items-center justify-between w-full min-w-0">
                        {/* Izquierda: Título y badges */}
                        <div className="flex items-center min-w-0 flex-1 gap-2">
                          <span className={`font-extrabold text-xl md:text-2xl mr-2 truncate whitespace-nowrap min-w-0 ${(Array.isArray(exp.documentos) ? exp.documentos : []).some(doc => doc.estado_firma === 'pendiente') ? 'text-red-700' : 'text-blue-800'}`}> 
                            <FolderOpen className={`w-6 h-6 inline-block mr-2 align-middle ${(Array.isArray(exp.documentos) ? exp.documentos : []).some(doc => doc.estado_firma === 'pendiente') ? 'text-red-500' : 'text-blue-400'}`} />
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
                          <button 
                            className={`border rounded-lg px-1 py-1 flex items-center gap-1 transition text-xs ${
                              exp.estado === 'cerrado' 
                                ? 'text-gray-400 border-gray-200 cursor-not-allowed opacity-60' 
                                : 'text-green-600 border-green-200 hover:text-green-800 hover:border-green-400'
                            }`} 
                            disabled={exp.estado === 'cerrado'}
                            onClick={() => { 
                              if (exp.estado === 'cerrado') { 
                                console.log('[DEBUG] Intento de agregar documento en expediente cerrado:', exp.id); 
                                return; 
                              }
                              console.log('[DEBUG] Abriendo modal agregar documento para expediente', exp.id);
                              setSelectedExpediente(exp); 
                              setShowDocumentModal(true); 
                            }}
                            title={exp.estado === 'cerrado' ? 'Expediente cerrado: no se pueden agregar documentos' : 'Agregar documento al expediente'}
                          >
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
              (() => {
                // Normalizar documentos para evitar errores de renderizado
                const documentos = Array.isArray(selectedExpediente.documentos) ? selectedExpediente.documentos : [];
                return (
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
                            <span className="text-xs text-gray-400">Documentos: {documentos.length}</span>
                            <button
                              onClick={() => mostrarPDFUnificado(selectedExpediente.id)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                            >
                              <FileText className="w-4 h-4" />
                              Ver Expediente Completo
                            </button>
                          </div>
                        </div>
                        <div className="mt-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Documentos</h3>
                          {/* Documentos asociados - tarjetas */}
                          <div className="grid grid-cols-1 gap-4 mt-2">
                            {documentos.length > 0 ? (
                              documentos.map((doc) => (
                                <div key={doc.id} className="bg-gray-50 rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center justify-between border border-gray-200">
                                  <div className="flex items-center gap-3">
                                    <FileText className="w-6 h-6 text-blue-500" />
                                    <div>
                                      <div className="font-semibold text-lg text-gray-800">{doc.documento_nombre}</div>
                                      <div className="text-sm text-gray-500">Tipo: <span className="font-medium">{doc.documento_tipo}</span></div>
                                      <div className="text-sm text-gray-500">Foja: <span className="font-medium">{doc.numero_foja}</span></div>
                                      {mostrarInfoFirma(doc)}
                                    </div>
                                  </div>
                                  <div className="flex gap-2 mt-3 md:mt-0">
                                    <button
                                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 flex items-center gap-1 text-sm"
                                      onClick={() => { 
                                        const normalizado = {
                                          ...doc,
                                          ruta_activa: doc.ruta_activa || doc.archivo_firmado_path || doc.archivo_path,
                                          cache_token: doc.cache_token || doc.hash_firma || Date.now()
                                        };
                                        console.log('[PREVIEW] Documento normalizado:', normalizado);
                                        setPreviewDoc(normalizado); 
                                        setShowPreviewModal(true); 
                                      }}
                                    >
                                      <Eye className="w-4 h-4" />Ver
                                    </button>
                                    {doc.estado_firma === 'firmado' && doc.archivo_firmado_path && (
                                      <button
                                        className="bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 flex items-center gap-1 text-sm"
                                        onClick={() => verificarFirmaDigital(doc.id)}
                                      >
                                        🔐 Verificar
                                      </button>
                                    )}
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
            <div style={{marginBottom: 12, color: '#888', fontSize: 13}}>
              <strong>DEBUG:</strong> método seleccionado: <span style={{color: '#059669'}}>{metodoFirma}</span><br/>
              <strong>Certificados cargados:</strong> {certificados.length} (vigentes: {certificados.filter(cert => cert.estado === 'vigente').length})
            </div>
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
                  {certificados.filter(cert => cert.estado === 'vigente').map(cert => (
                    <option key={cert.id} value={cert.id}>{cert.nombre_certificado || cert.emisor || `Certificado ${cert.id}`}</option>
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
                );
              })()
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
              {(() => { try { console.log('[PREVIEW MODAL] Documento:', previewDoc); } catch(e){} })()}
              {/* Renderizar PDF o imagen (priorizar archivo firmado) */}
              <div className="mb-3">
                <div className="text-sm text-gray-600 mb-2">
                  Ruta activa: {previewDoc.ruta_activa || previewDoc.archivo_firmado_path || previewDoc.archivo_path || 'No disponible'}<br/>
                  {previewDoc.archivo_firmado_path ? (
                    <span className="text-green-600">(Firmado)</span>
                  ) : (
                    <span className="text-yellow-600">(Original)</span>
                  )}
                </div>
                {(() => { try { console.log('[PREVIEW MODAL] Usando ruta para ver (ruta_activa):', previewDoc.ruta_activa || (previewDoc.archivo_firmado_path || previewDoc.archivo_path)); } catch(e){} })()}
                {(() => {
                const path = previewDoc.ruta_activa || previewDoc.archivo_firmado_path || previewDoc.archivo_path;
                // Si la ruta comienza con api/, es una ruta de API que necesita autenticación - crear un manejador especial
                if (path.startsWith('api/')) {
                  return (
                    <button
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const pdfUrl = `http://localhost:4000/${path}?v=${previewDoc.cache_token || Date.now()}`;
                          
                          // Descargar el PDF y abrirlo en nueva pestaña
                          const response = await fetch(pdfUrl, {
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          
                          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                          
                          const blob = await response.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          
                          window.open(blobUrl, '_blank');
                        } catch (error) {
                          console.error('Error abriendo PDF en nueva pestaña:', error);
                          alert('Error al abrir PDF en nueva pestaña: ' + error.message);
                        }
                      }}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 mr-2"
                    >
                      Abrir en Nueva Pestaña
                    </button>
                  );
                } else {
                  // Para rutas normales, mantener el enlace original
                  return (
                    <a 
                      href={`http://localhost:4000/${path}?v=${previewDoc.cache_token || Date.now()}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 mr-2"
                    >
                      Abrir en Nueva Pestaña
                    </a>
                  );
                }
              })()}
              </div>
              {(() => { try { console.log('[PREVIEW MODAL] Detectando tipo de archivo'); } catch(e){} })()}
              {(previewDoc.ruta_activa || previewDoc.archivo_firmado_path || previewDoc.archivo_path) && 
               ((previewDoc.ruta_activa || previewDoc.archivo_firmado_path || previewDoc.archivo_path).match(/\.pdf$/i) || 
                (previewDoc.ruta_activa || previewDoc.archivo_firmado_path || previewDoc.archivo_path).startsWith('api/expedientes/')) ? (
                <iframe 
                  src={(() => {
                    const path = previewDoc.ruta_activa || previewDoc.archivo_firmado_path || previewDoc.archivo_path;
                    // Si la ruta comienza con api/, es una ruta de API que necesita autenticación
                    if (path.startsWith('api/')) {
                      const token = localStorage.getItem('token');
                      // Crear un blob URL con el contenido del PDF
                      const pdfUrl = `http://localhost:4000/${path}?v=${previewDoc.cache_token || Date.now()}`;
                      
                      // Para rutas de API, iniciar descarga en segundo plano y mostrar el PDF
                      (async () => {
                        try {
                          const response = await fetch(pdfUrl, {
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                          
                          const blob = await response.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          
                          // Actualizar el src del iframe
                          document.getElementById('pdf-preview-iframe').src = blobUrl;
                        } catch (error) {
                          console.error('Error cargando PDF de API:', error);
                        }
                      })();
                      
                      // Retornar URL temporal mientras se carga
                      return 'about:blank';
                    } else {
                      // Para rutas normales, usar la URL directa
                      return `http://localhost:4000/${path}?v=${previewDoc.cache_token || Date.now()}`;
                    }
                  })()} 
                  id="pdf-preview-iframe"
                  title="PDF Preview" 
                  style={{width: '100%', height: '70vh', border: '1px solid #ccc', borderRadius: '0.5rem'}}
                  onError={(e) => {
                    console.error('Error loading PDF in modal:', e);
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
              ) : (previewDoc.ruta_activa || previewDoc.archivo_firmado_path || previewDoc.archivo_path) && (previewDoc.ruta_activa || previewDoc.archivo_firmado_path || previewDoc.archivo_path).match(/\.(png|jpg|jpeg)$/i) ? (
                <img 
                  src={`http://localhost:4000/${(previewDoc.ruta_activa || previewDoc.archivo_firmado_path || previewDoc.archivo_path)}?v=${previewDoc.cache_token || Date.now()}`} 
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
                                <div className="mt-1">{mostrarInfoFirma(doc)}</div>
                              </div>
                            </div>
                            <div className="text-sm">
                              {mostrarInfoFirma(doc)}
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

      {/* Modal de Token Firma Simulator */}
      {showTokenFirmaModal && docParaToken && (
        <TokenFirmaSimulator
          documento={docParaToken}
          onFirmaExitosa={async (firmaData) => {
            console.log('Firma exitosa:', firmaData);
            console.log('Certificado recibido:', firmaData.certificado);
            
            const datosParaEnviar = {
              metodo: 'token',
              firmaDigital: firmaData.hash,
              certificado: {
                emisor: firmaData.certificado?.emisor || 'AFIP - Administración Federal de Ingresos Públicos',
                titular: firmaData.certificado?.nombre || 'Certificado de Firma - Juan Pérez'
              },
              algoritmo: firmaData.algoritmo,
              timestampFirma: firmaData.timestamp
            };
            console.log('Datos a enviar al backend:', datosParaEnviar);
            
            try {
              // Llamar al backend para marcar el documento como firmado
              console.log('=== ENVIANDO PETICIÓN DE FIRMA ===');
              console.log('URL:', `/expedientes/${selectedExpediente.id}/documentos/${docParaToken.id}/firmar`);
              console.log('Datos:', JSON.stringify(datosParaEnviar, null, 2));
              
              const response = await api.post(`/expedientes/${selectedExpediente.id}/documentos/${docParaToken.id}/firmar`, datosParaEnviar);
              
              console.log('=== RESPUESTA DEL SERVIDOR ===');
              console.log('Status:', response.status);
              console.log('Data:', response.data);
              
              alert('Documento firmado correctamente');
            } catch (error) {
              console.error('=== ERROR EN FIRMA ===');
              console.error('Error completo:', error);
              console.error('Response:', error.response?.data);
              console.error('Status:', error.response?.status);
              alert('Error al guardar la firma en el servidor: ' + (error.response?.data?.error || error.message));
            }
            
            setShowTokenFirmaModal(false);
            setDocParaToken(null);
            setDocIdAFirmar(null);
            setMetodoFirma('interno');
            
            // Actualizar tanto la lista como los detalles del expediente seleccionado
            await fetchExpedientes();
            await refreshSelectedExpediente();
          }}
          onCancel={() => {
            setShowTokenFirmaModal(false);
            setDocParaToken(null);
          }}
        />
      )}
    </>
  );
}
export default ExpedienteManager;
