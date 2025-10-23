/**
 * Configuración centralizada de la API
 * Usa variables de entorno de Vite
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

/**
 * Helper para construir URLs completas a recursos estáticos del backend
 * @param {string} path - Ruta relativa del recurso (ej: '/uploads/file.pdf')
 * @returns {string} - URL completa
 */
export const getResourceURL = (path) => {
  if (!path) return '';
  // Si ya es una URL absoluta, retornarla tal cual
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Asegurar que el path comience con /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

/**
 * Helper para construir URLs de API
 * @param {string} endpoint - Endpoint de API (ej: '/api/usuarios')
 * @param {object} params - Parámetros de query string opcionales
 * @returns {string} - URL completa con query string si hay params
 */
export const getApiURL = (endpoint, params = {}) => {
  const url = getResourceURL(endpoint);
  const queryString = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  return queryString ? `${url}?${queryString}` : url;
};

export default {
  API_BASE_URL,
  getResourceURL,
  getApiURL
};
