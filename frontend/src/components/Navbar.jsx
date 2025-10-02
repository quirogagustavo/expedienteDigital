import React from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <h1>Firma Digital</h1>
      </div>
      
      {user && (
        <div className="nav-user">
          <span>Bienvenido, {user.nombre_completo || user.username}</span>
          <button onClick={logout} className="logout-btn">
            Cerrar Sesión
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;