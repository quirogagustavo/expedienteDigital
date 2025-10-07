import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Building, Users, Plus, Edit, Trash2, Mail, Phone, User } from 'lucide-react';

const OficinasManager = () => {
  const [oficinas, setOficinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingOficina, setEditingOficina] = useState(null);

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    codigo: '',
    responsable: '',
    email: '',
    telefono: ''
  });

  useEffect(() => {
    cargarOficinas();
  }, []);

  const cargarOficinas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/oficinas');
      setOficinas(response.data);
      setError(null);
    } catch (error) {
      console.error('Error al cargar oficinas:', error);
      
      if (error.response?.status === 403) {
        setError('❌ Acceso denegado. Solo los administradores pueden gestionar oficinas.');
      } else if (error.response?.status === 401) {
        setError('🔐 Sesión expirada. Por favor, inicie sesión nuevamente.');
      } else {
        setError('Error al cargar las oficinas. Verifique su conexión.');
      }
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (oficina = null) => {
    setEditingOficina(oficina);
    if (oficina) {
      setFormData({
        nombre: oficina.nombre || '',
        descripcion: oficina.descripcion || '',
        codigo: oficina.codigo || '',
        responsable: oficina.responsable || '',
        email: oficina.email || '',
        telefono: oficina.telefono || ''
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        codigo: '',
        responsable: '',
        email: '',
        telefono: ''
      });
    }
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditingOficina(null);
    setFormData({
      nombre: '',
      descripcion: '',
      codigo: '',
      responsable: '',
      email: '',
      telefono: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const guardarOficina = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.codigo) {
      alert('Nombre y código son requeridos');
      return;
    }

    try {
      if (editingOficina) {
        // Actualizar oficina existente
        await api.put(`/api/oficinas/${editingOficina.id}`, {
          ...formData,
          activa: true
        });
      } else {
        // Crear nueva oficina
        await api.post('/api/oficinas', formData);
      }
      
      await cargarOficinas();
      cerrarModal();
    } catch (error) {
      console.error('Error al guardar oficina:', error);
      
      if (error.response?.status === 403) {
        alert('❌ Acceso denegado. Solo los administradores pueden gestionar oficinas.');
      } else if (error.response?.data?.error) {
        alert(`❌ ${error.response.data.error}`);
      } else {
        alert('❌ Error al guardar la oficina. Verifique su conexión.');
      }
    }
  };

  const desactivarOficina = async (id, nombre) => {
    if (window.confirm(`¿Está seguro de desactivar la oficina "${nombre}"?`)) {
      try {
        await api.delete(`/api/oficinas/${id}`);
        await cargarOficinas();
      } catch (error) {
        console.error('Error al desactivar oficina:', error);
        
        if (error.response?.status === 403) {
          alert('❌ Acceso denegado. Solo los administradores pueden desactivar oficinas.');
        } else if (error.response?.data?.error) {
          alert(`❌ ${error.response.data.error}`);
        } else {
          alert('❌ Error al desactivar la oficina. Verifique su conexión.');
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando oficinas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Oficinas</h1>
                <p className="text-gray-600">Administra las oficinas del sistema de workflow</p>
              </div>
            </div>
            <button
              onClick={() => abrirModal()}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Nueva Oficina</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Lista de oficinas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {oficinas.map((oficina) => (
            <div key={oficina.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Building className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{oficina.nombre}</h3>
                      <p className="text-sm text-gray-500">Código: {oficina.codigo}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => abrirModal(oficina)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar oficina"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => desactivarOficina(oficina.id, oficina.nombre)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Desactivar oficina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {oficina.descripcion && (
                  <p className="text-gray-600 text-sm mb-4">{oficina.descripcion}</p>
                )}

                <div className="space-y-2">
                  {oficina.responsable && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{oficina.responsable}</span>
                    </div>
                  )}
                  {oficina.email && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{oficina.email}</span>
                    </div>
                  )}
                  {oficina.telefono && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{oficina.telefono}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {oficina.activa ? 'Activa' : 'Inactiva'}
                    </span>
                    <span 
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        oficina.activa 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {oficina.activa ? 'Operativa' : 'Desactivada'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {oficinas.length === 0 && !loading && (
          <div className="text-center py-12">
            <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay oficinas registradas</h3>
            <p className="text-gray-600 mb-6">Comienza creando la primera oficina del sistema</p>
            <button
              onClick={() => abrirModal()}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Crear Primera Oficina</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingOficina ? 'Editar Oficina' : 'Nueva Oficina'}
                </h2>
                <button
                  onClick={cerrarModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={guardarOficina} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Oficina *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Mesa de Entradas"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código *
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: ME001"
                    maxLength="10"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción de la oficina y sus funciones"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsable
                  </label>
                  <input
                    type="text"
                    name="responsable"
                    value={formData.responsable}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nombre del responsable"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="email@oficina.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Número de teléfono"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingOficina ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OficinasManager;