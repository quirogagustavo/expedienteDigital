import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import DocumentUpload from './components/DocumentUpload';
import SignatureHistory from './components/SignatureHistory.jsx';
import CertificateTypeSelector from './components/CertificateTypeSelector';
import GovernmentCertificateRequest from './components/GovernmentCertificateRequest';
import GovernmentCertificateManager from './components/GovernmentCertificateManager';
import DigitalSignatureWithToken from './components/DigitalSignatureWithToken';
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
      <div className="app-container">
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
      case 'upload':
        return <DocumentUpload selectedCertificateType={selectedCertificateType} />;
      case 'history':
        return <SignatureHistory />;
      case 'certificates':
        return (
          <CertificateTypeSelector 
            selectedType={selectedCertificateType}
            onCertificateTypeSelect={setSelectedCertificateType}
          />
        );
      case 'government-certificate':
        return <GovernmentCertificateManager />;
      case 'government-request':
        return <GovernmentCertificateRequest />;
      case 'digital-signature':
        try {
          return <DigitalSignatureWithToken />;
        } catch (error) {
          console.error('Error rendering DigitalSignatureWithToken:', error);
          return <div>Error cargando el componente de firma digital</div>;
        }
      default:
        return <DocumentUpload selectedCertificateType={selectedCertificateType} />;
    }
  };

  return (
    <div className="app-container">
      <Navbar />
      <div className="container">
        <h1>Firma Digital de Documentos - Gobierno Argentino</h1>
        
        {user && (
          <nav className="main-nav">
            <button 
              className={activeTab === 'upload' ? 'active' : ''}
              onClick={() => setActiveTab('upload')}
            >
              📄 Firmar Documentos
            </button>
            <button 
              className={activeTab === 'digital-signature' ? 'active' : ''}
              onClick={() => setActiveTab('digital-signature')}
            >
              🔐 Firma con Token
            </button>
            <button 
              className={activeTab === 'history' ? 'active' : ''}
              onClick={() => setActiveTab('history')}
            >
              📋 Historial
            </button>
            <button 
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
              🏛️ Solicitar Gubernamental
            </button>
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
