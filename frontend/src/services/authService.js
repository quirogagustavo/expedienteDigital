import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000';

// Configurar instancia de axios para autenticación
const authService = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Interceptor para agregar token automáticamente
authService.interceptors.request.use(
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

// Interceptor para manejar respuestas
authService.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // No redirigir automáticamente, dejar que el componente maneje
    }
    return Promise.reject(error);
  }
);

// Funciones de autenticación
export const auth = {
  login: async (credentials) => {
    const response = await authService.post('/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  register: async (userData) => {
    const response = await authService.post('/register', userData);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  getProfile: async () => {
    const response = await authService.get('/profile');
    return response.data;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  getToken: () => {
    return localStorage.getItem('token');
  }
};

export { authService };
export default authService;