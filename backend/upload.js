import multer from 'multer';
import path from 'path';

// Configuración de almacenamiento en memoria para archivos
const storage = multer.memoryStorage();
const upload = multer({ storage });

export default upload;
