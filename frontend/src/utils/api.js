import axios from 'axios';

// Configuración base de la API
const api = axios.create({
  baseURL: '/api', // Usar proxy de Vite para desarrollo
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación automáticamente
api.interceptors.request.use(
  (config) => {
    // Obtener token del localStorage si existe
    const token = localStorage.getItem('token');
    console.debug('[API] Token enviado en request:', token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas de error
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Manejar errores de autenticación
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirigir al login si no estamos ya ahí
      if (!window.location.pathname.includes('/login')) {
        window.location.reload();
      }
    }

    // Manejar errores de conexión
    if (!error.response) {
      console.error('Error de conexión:', error.message);
      error.message = 'Error de conexión con el servidor. Verifique su conexión a internet.';
    }

    return Promise.reject(error);
  }
);

// Métodos auxiliares para peticiones comunes
export const apiMethods = {
  // Autenticación
  login: (credentials) => api.post('/login', credentials),
  register: (userData) => api.post('/register', userData),

  // Certificados
  getCertificateTypes: () => api.get('/api/certificate-types'),
  getCertificateAuthorities: () => api.get('/api/certificate-authorities'),
  requestGovernmentCertificate: () => api.post('/api/request-government-certificate'),
  getUserCertificates: () => api.get('/certificados'),

  // Firmas digitales
  signDocument: (formData) => api.post('/sign', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  verifyDocument: (formData) => api.post('/verify', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),

  // Historial de firmas
  getSignatureHistory: (page = 1, limit = 20) => 
    api.get(`/api/signatures/history?page=${page}&limit=${limit}`),
  getSignatureDetails: (id) => api.get(`/api/signatures/${id}`),
  verifySignature: (id) => api.get(`/api/signatures/verify/${id}`),

  // Utilidades
  healthCheck: () => api.get('/health'),
};

export default api;