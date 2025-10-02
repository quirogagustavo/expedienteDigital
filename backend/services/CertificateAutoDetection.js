// Sistema de Auto-detección Inteligente de Certificados
// Gobierno de San Juan - Seguridad + Usabilidad

class CertificateAutoDetection {
  
  // Determinar certificado sugerido según usuario y documento
  static suggestCertificate(usuario, tipoDocumento) {
    const suggestions = {
      // Matriz de decisión: Usuario + Documento = Certificado Sugerido
      'empleado_interno': {
        'oficial': null, // No puede firmar documentos oficiales
        'no_oficial': 'internal'
      },
      'funcionario_oficial': {
        'oficial': 'government',
        'no_oficial': 'internal' // Puede elegir, pero se sugiere interno para eficiencia
      },
      'administrador': {
        'oficial': 'government',
        'no_oficial': 'internal'
      }
    };

    return suggestions[usuario.rol_usuario]?.[tipoDocumento] || null;
  }

  // Validar si el usuario PUEDE usar un certificado específico
  static canUseCertificate(usuario, tipoCertificado) {
    const permissions = {
      'empleado_interno': ['internal'],
      'funcionario_oficial': ['internal', 'government'],
      'administrador': ['internal', 'government']
    };

    return permissions[usuario.rol_usuario]?.includes(tipoCertificado) || false;
  }

  // Generar mensaje de confirmación de seguridad
  static getSecurityConfirmation(usuario, tipoDocumento, certificadoSugerido) {
    if (tipoDocumento === 'oficial' && certificadoSugerido === 'government') {
      return {
        nivel: 'CRITICO',
        mensaje: `⚠️ DOCUMENTO OFICIAL - CERTIFICADO GUBERNAMENTAL
        
Está a punto de firmar un DOCUMENTO OFICIAL con su CERTIFICADO GUBERNAMENTAL.
Esta firma tiene validez legal completa.

¿Confirma que desea proceder?`,
        requiereConfirmacionExplicita: true
      };
    }

    if (tipoDocumento === 'no_oficial' && certificadoSugerido === 'internal') {
      return {
        nivel: 'NORMAL',
        mensaje: `📋 Documento interno - Certificado interno
        
Firmando documento no oficial con certificado interno.`,
        requiereConfirmacionExplicita: false
      };
    }

    return {
      nivel: 'REVISAR',
      mensaje: 'Revise la configuración de firma antes de continuar.',
      requiereConfirmacionExplicita: true
    };
  }

  // Workflow completo de seguridad
  static getSecureWorkflow(usuario, tipoDocumento) {
    // 1. Sugerir certificado
    const certificadoSugerido = this.suggestCertificate(usuario, tipoDocumento);
    
    // 2. Validar permisos
    if (!certificadoSugerido || !this.canUseCertificate(usuario, certificadoSugerido)) {
      return {
        error: true,
        mensaje: `❌ ${usuario.rol_usuario} no tiene permisos para firmar documentos ${tipoDocumento}`
      };
    }

    // 3. Generar confirmación de seguridad
    const confirmacion = this.getSecurityConfirmation(usuario, tipoDocumento, certificadoSugerido);

    return {
      error: false,
      certificadoSugerido,
      confirmacion,
      usuarioPuedeElegir: usuario.rol_usuario !== 'empleado_interno' // Solo internos no pueden elegir
    };
  }
}

export default CertificateAutoDetection;