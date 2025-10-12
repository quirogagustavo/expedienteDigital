import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
//import DocumentUpload from './components/DocumentUpload';
import SignatureHistory from './components/SignatureHistory.jsx';
//import CertificateTypeSelector from './components/CertificateTypeSelector';
//import GovernmentCertificateRequest from './components/GovernmentCertificateRequest';
//import GovernmentCertificateManager from './components/GovernmentCertificateManager';
// import CertificadoManager from './components/CertificadoManager';
// import DigitalSignatureWithToken from './components/DigitalSignatureWithToken';
import ExpedienteManager from './components/ExpedienteManager';
import OficinasManager from './components/OficinasManager';
import UsuariosAdmin from './components/UsuariosAdmin';
import './App.css';

function MainApp() {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedCertificateType, setSelectedCertificateType] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  const { user, token, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div className="loading">Cargando...</div>;
  }

  if (!user) {
    return (
      <div className="auth-container">
        {isLoginMode ? (
          <Login onSwitchToRegister={() => setIsLoginMode(false)} />
        ) : (
          <Register onSwitchToLogin={() => setIsLoginMode(true)} />
        )}
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'expedientes':
        return <ExpedienteManager />;
      case 'history':
        return <SignatureHistory />;
  /*     case 'certificates':
        return (
          <CertificateTypeSelector
            selectedType={selectedCertificateType}
            onCertificateTypeSelect={setSelectedCertificateType}
          />
        ); */
      // case 'mis-certificados':
      //   return <CertificadoManager />;
      /* case 'government-certificate':
        return <GovernmentCertificateManager />;
      case 'government-request':
        return <GovernmentCertificateRequest />; */
      // case 'digital-signature':
      //   try {
      //     return <DigitalSignatureWithToken />;
      //   } catch (error) {
      //     console.error('Error rendering DigitalSignatureWithToken:', error);
      //     return <div>Error cargando el componente de firma digital</div>;
      //   }
      case 'oficinas':
        if (user.rol_usuario !== 'administrador') {
          return (
            <div className="error-message">
              <h3>❌ Acceso Denegado</h3>
              <p>No tienes permisos para acceder a la gestión de oficinas.</p>
              <p>Rol actual: {user.rol_usuario}</p>
              <p>Solo los administradores pueden gestionar oficinas.</p>
            </div>
          );
        }
        return <OficinasManager />;
      case 'admin-usuarios':
        if (user.rol_usuario !== 'administrador') {
          return (
            <div className="error-message">
              <h3>❌ Acceso Denegado</h3>
              <p>No tienes permisos para acceder a la administración de usuarios.</p>
              <p>Rol actual: {user.rol_usuario}</p>
            </div>
          );
        }
        return <UsuariosAdmin />;
      /* default:
        return <DocumentUpload selectedCertificateType={selectedCertificateType} />; */
        default:
  return <ExpedienteManager />;
    }
  };

  return (
    <div className="app-container">
      <Navbar />
      <div className="container">
        <h1>Expediente Digital - Versión Preliminar</h1>
        
        {user && (
          <nav className="main-nav">
            {/* <button 
              className={activeTab === 'upload' ? 'active' : ''}
              onClick={() => setActiveTab('upload')}
            >
              📄 Firmar Documentos
            </button> */}
            <button 
              className={activeTab === 'expedientes' ? 'active' : ''}
              onClick={() => setActiveTab('expedientes')}
            >
              📁 Expedientes Digitales
            </button>
            {user.rol_usuario === 'administrador' && (
              <button 
                className={activeTab === 'oficinas' ? 'active' : ''}
                onClick={() => setActiveTab('oficinas')}
              >
                🏢 Gestión de Oficinas
              </button>
            )}
            {user.rol_usuario === 'administrador' && (
              <button 
                className={activeTab === 'admin-usuarios' ? 'active' : ''}
                onClick={() => setActiveTab('admin-usuarios')}
              >
                👥 Administración de Usuarios
              </button>
            )}
            {/* <button 
              className={activeTab === 'digital-signature' ? 'active' : ''}
              onClick={() => setActiveTab('digital-signature')}
            >
              🔐 Firma con Token
            </button> */}
            <button 
              className={activeTab === 'history' ? 'active' : ''}
              onClick={() => setActiveTab('history')}
            >
              📋 Historial
            </button>
            {/* <button 
              className={activeTab === 'certificates' ? 'active' : ''}
              onClick={() => setActiveTab('certificates')}
            >
              🔒 Tipos de Certificado
            </button>
            <button 
              className={activeTab === 'government-certificate' ? 'active' : ''}
              onClick={() => setActiveTab('government-certificate')}
            >
              📥 Importar P12/PFX
            </button>
            <button 
              className={activeTab === 'government-request' ? 'active' : ''}
              onClick={() => setActiveTab('government-request')}
            >
              📝 Solicitar Cert. Gobierno
            </button> */}
            {/*
            <button 
              className={activeTab === 'mis-certificados' ? 'active' : ''}
              onClick={() => setActiveTab('mis-certificados')}
            >
              📄 Mis Certificados
            </button>
            */}
          </nav>
        )}

        <div className="tab-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;