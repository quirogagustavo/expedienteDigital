import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Register = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    nombre_completo: '',
    email: '',
    password: '',
    confirmPassword: '',
    rol_usuario: 'empleado_interno'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validar contraseñas
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    const { confirmPassword, ...userData } = formData;
    const result = await register(userData);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <h2>Crear Cuenta</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label>Usuario:</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Nombre Completo:</label>
          <input
            type="text"
            name="nombre_completo"
            value={formData.nombre_completo}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Rol de Usuario:</label>
          <select
            name="rol_usuario"
            value={formData.rol_usuario}
            onChange={handleChange}
            required
          >
            <option value="empleado_interno">👤 Empleado Interno</option>
            <option value="funcionario_oficial">🔒 Funcionario Oficial</option>
            <option value="administrador">⚙️ Administrador</option>
          </select>
          <small className="help-text">
            • <strong>Empleado Interno:</strong> Acceso básico, certificados internos<br/>
            • <strong>Funcionario Oficial:</strong> Gestión de certificados, solicitudes gubernamentales<br/>
            • <strong>Administrador:</strong> Control total del sistema
          </small>
        </div>
        
        <div className="form-group">
          <label>Contraseña:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Confirmar Contraseña:</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        {error && <div className="error">{error}</div>}
        
        <button type="submit" disabled={loading}>
          {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </button>
      </form>
      
      <p>
        ¿Ya tienes cuenta?{' '}
        <button type="button" className="link-button" onClick={onSwitchToLogin}>
          Iniciar Sesión
        </button>
      </p>
    </div>
  );
};

export default Register;