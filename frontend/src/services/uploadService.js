import axios from 'axios';

// Configurar la instancia de axios para las llamadas al backend
const uploadService = axios.create({
  baseURL: 'http://localhost:4000',
  timeout: 30000, // 30 segundos para uploads
});

// Interceptor para agregar el token de autenticación automáticamente
uploadService.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
uploadService.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { uploadService };
export default uploadService;