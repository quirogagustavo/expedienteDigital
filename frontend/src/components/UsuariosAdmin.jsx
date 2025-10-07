import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FirmaManager from './FirmaManager';

const UsuariosAdmin = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [oficinas, setOficinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editandoUsuario, setEditandoUsuario] = useState(null);
  const [tabActiva, setTabActiva] = useState('usuarios'); // 'usuarios' o 'firmas'
  const [usuarioFirmasSeleccionado, setUsuarioFirmasSeleccionado] = useState(null);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    username: '',
    nombre_completo: '',
    email: '',
    password: '',
    rol_usuario: 'empleado_interno',
    oficina_id: ''
  });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const token = localStorage.getItem('token');
      const [usuariosRes, oficinasRes] = await Promise.all([
        axios.get('http://localhost:4000/api/admin/usuarios', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:4000/api/oficinas', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      // Asegurarse de que usuarios es un array
      setUsuarios(Array.isArray(usuariosRes.data) ? usuariosRes.data : []);
      setOficinas(Array.isArray(oficinasRes.data) ? oficinasRes.data : []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('Error al cargar datos de usuarios y oficinas');
      // Establecer arrays vacíos en caso de error
      setUsuarios([]);
      setOficinas([]);
    }
    setLoading(false);
  };

  const crearUsuario = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:4000/api/admin/usuarios', nuevoUsuario, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Usuario creado exitosamente');
      setNuevoUsuario({
        username: '',
        nombre_completo: '',
        email: '',
        password: '',
        rol_usuario: 'empleado_interno',
        oficina_id: ''
      });
      setMostrarFormulario(false);
      cargarDatos();
    } catch (error) {
      console.error('Error al crear usuario:', error);
      alert('Error al crear usuario: ' + (error.response?.data?.error || 'Error desconocido'));
    }
  };

  const actualizarUsuario = async (usuarioId, datosActualizados) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:4000/api/admin/usuarios/${usuarioId}`, datosActualizados, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Usuario actualizado exitosamente');
      setEditandoUsuario(null);
      cargarDatos();
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      alert('Error al actualizar usuario: ' + (error.response?.data?.error || 'Error desconocido'));
    }
  };

  const eliminarUsuario = async (usuarioId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:4000/api/admin/usuarios/${usuarioId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Usuario eliminado exitosamente');
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      alert('Error al eliminar usuario: ' + (error.response?.data?.error || 'Error desconocido'));
    }
  };

  const obtenerNombreOficina = (oficinaId) => {
    const oficina = oficinas.find(o => o.id === oficinaId);
    return oficina ? oficina.nombre : 'Sin asignar';
  };

  const obtenerColorRol = (rol) => {
    switch (rol) {
      case 'administrador': return '#dc3545';
      case 'funcionario_oficial': return '#fd7e14';
      case 'empleado_interno': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return <div style={styles.loading}>Cargando datos de administración...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>🔧 Administración de Usuarios y Oficinas</h2>
        <button 
          style={styles.crearButton}
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? '❌ Cancelar' : '➕ Crear Usuario'}
        </button>
      </div>

      {/* Pestañas de navegación */}
      <div style={styles.tabsContainer}>
        <button
          style={{
            ...styles.tab,
            ...(tabActiva === 'usuarios' ? styles.tabActiva : {})
          }}
          onClick={() => {
            setTabActiva('usuarios');
            setUsuarioFirmasSeleccionado(null);
          }}
        >
          👥 Gestión de Usuarios
        </button>
        <button
          style={{
            ...styles.tab,
            ...(tabActiva === 'firmas' ? styles.tabActiva : {})
          }}
          onClick={() => setTabActiva('firmas')}
        >
          🖋️ Gestión de Firmas
        </button>
      </div>

      {/* Contenido según pestaña activa */}
      {tabActiva === 'usuarios' && (
        <>
          {/* Información de testing */}
          <div style={styles.testingInfo}>
            <h3>🧪 Usuarios para Testing:</h3>
            <div style={styles.testingGrid}>
              <div style={styles.testingCard}>
                <strong>👑 Administrador</strong>
                <p>Usuario: <code>admin</code></p>
                <p>Contraseña: <code>admin123</code></p>
                <p>Acceso: Todos los expedientes</p>
              </div>
              <div style={styles.testingCard}>
                <strong>⚖️ Usuario Legal</strong>
                <p>Usuario: <code>usuario_legal</code></p>
                <p>Contraseña: <code>admin123</code></p>
                <p>Acceso: Solo Área Legal</p>
              </div>
              <div style={styles.testingCard}>
                <strong>📊 Usuario Admin</strong>
                <p>Usuario: <code>usuario_admin</code></p>
                <p>Contraseña: <code>admin123</code></p>
                <p>Acceso: Solo Área Administrativa</p>
              </div>
            </div>
          </div>

          {/* Formulario para crear usuario */}
          {mostrarFormulario && (
            <form onSubmit={crearUsuario} style={styles.form}>
              <h3>➕ Crear Nuevo Usuario</h3>
              <div style={styles.formRow}>
                <input
                  type="text"
                  placeholder="Username"
                  value={nuevoUsuario.username}
                  onChange={(e) => setNuevoUsuario({...nuevoUsuario, username: e.target.value})}
                  style={styles.input}
                  required
            />
            <input
              type="text"
              placeholder="Nombre Completo"
              value={nuevoUsuario.nombre_completo}
              onChange={(e) => setNuevoUsuario({...nuevoUsuario, nombre_completo: e.target.value})}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formRow}>
            <input
              type="email"
              placeholder="Email"
              value={nuevoUsuario.email}
              onChange={(e) => setNuevoUsuario({...nuevoUsuario, email: e.target.value})}
              style={styles.input}
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={nuevoUsuario.password}
              onChange={(e) => setNuevoUsuario({...nuevoUsuario, password: e.target.value})}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formRow}>
            <select
              value={nuevoUsuario.rol_usuario}
              onChange={(e) => setNuevoUsuario({...nuevoUsuario, rol_usuario: e.target.value})}
              style={styles.select}
            >
              <option value="empleado_interno">Empleado Interno</option>
              <option value="funcionario_oficial">Funcionario Oficial</option>
              <option value="administrador">Administrador</option>
            </select>
            <select
              value={nuevoUsuario.oficina_id}
              onChange={(e) => setNuevoUsuario({...nuevoUsuario, oficina_id: e.target.value})}
              style={styles.select}
            >
              <option value="">Seleccionar Oficina</option>
              {oficinas.map(oficina => (
                <option key={oficina.id} value={oficina.id}>
                  {oficina.nombre}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" style={styles.submitButton}>
            Crear Usuario
          </button>
        </form>
      )}

      {/* Lista de usuarios */}
      <div style={styles.usuariosList}>
        <h3>👥 Usuarios Existentes</h3>
        {usuarios.map(usuario => (
          <div key={usuario.id} style={styles.usuarioCard}>
            <div style={styles.usuarioInfo}>
              <div style={styles.usuarioHeader}>
                <strong>{usuario.nombre_completo}</strong>
                <span 
                  style={{
                    ...styles.rolBadge,
                    backgroundColor: obtenerColorRol(usuario.rol_usuario)
                  }}
                >
                  {usuario.rol_usuario}
                </span>
              </div>
              <p>👤 Username: <code>{usuario.username}</code></p>
              <p>📧 Email: {usuario.email}</p>
              <p>🏢 Oficina: {obtenerNombreOficina(usuario.oficina_id)}</p>
            </div>
            
            <div style={styles.usuarioAcciones}>
              {editandoUsuario === usuario.id ? (
                <div style={styles.editForm}>
                  <select
                    defaultValue={usuario.oficina_id || ''}
                    onChange={(e) => {
                      actualizarUsuario(usuario.id, {
                        ...usuario,
                        oficina_id: e.target.value || null
                      });
                    }}
                    style={styles.selectSmall}
                  >
                    <option value="">Sin oficina</option>
                    {oficinas.map(oficina => (
                      <option key={oficina.id} value={oficina.id}>
                        {oficina.nombre}
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={() => setEditandoUsuario(null)}
                    style={styles.cancelButton}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setEditandoUsuario(usuario.id)}
                    style={styles.editButton}
                  >
                    ✏️ Editar Oficina
                  </button>
                  <button 
                    onClick={() => eliminarUsuario(usuario.id)}
                    style={styles.deleteButton}
                  >
                    🗑️ Eliminar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
        </>
      )}

      {/* Pestaña de Gestión de Firmas */}
      {tabActiva === 'firmas' && (
        <div>
          <FirmaManager 
            isAdminMode={true}
            targetUserId={usuarioFirmasSeleccionado}
          />
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '2px solid #007bff',
    paddingBottom: '10px'
  },
  tabsContainer: {
    display: 'flex',
    marginBottom: '20px',
    borderBottom: '1px solid #dee2e6'
  },
  tab: {
    padding: '12px 24px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#666',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease'
  },
  tabActiva: {
    color: '#007bff',
    borderBottomColor: '#007bff',
    backgroundColor: '#f8f9fa'
  },
  testingInfo: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #dee2e6'
  },
  testingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
    marginTop: '10px'
  },
  testingCard: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    textAlign: 'center'
  },
  loading: {
    textAlign: 'center',
    padding: '50px',
    fontSize: '18px',
    color: '#666'
  },
  crearButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  form: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #dee2e6'
  },
  formRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px'
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '14px'
  },
  select: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '14px'
  },
  selectSmall: {
    padding: '5px 8px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '12px',
    marginRight: '10px'
  },
  submitButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  usuariosList: {
    marginTop: '30px'
  },
  usuarioCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '10px',
    border: '1px solid #dee2e6',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  usuarioInfo: {
    flex: 1
  },
  usuarioHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px'
  },
  rolBadge: {
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  usuarioAcciones: {
    display: 'flex',
    gap: '10px'
  },
  editForm: {
    display: 'flex',
    alignItems: 'center'
  },
  editButton: {
    backgroundColor: '#ffc107',
    color: 'black',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  }
};

export default UsuariosAdmin;