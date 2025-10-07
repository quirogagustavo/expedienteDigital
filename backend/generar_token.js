// Ejecuta este archivo con: node generar_token.js
// Cambia el userId por el ID de tu usuario real

const jwt = require('jsonwebtoken');
const JWT_SECRET = 'tu_clave_secreta_muy_segura'; // Debe coincidir con el backend

const userId = 1; // Cambia por el ID de tu usuario
const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });

console.log('Token JWT válido:', token);