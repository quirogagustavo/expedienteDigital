// Manejo global de errores no controlados
process.on('uncaughtException', (err) => {
  console.error('Excepción no controlada:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa no manejada:', reason);
});
// ...existing code...
import usuariosRoutes from './routes/usuarios.js';

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

import upload from './upload.js';
import { signBuffer, verifyBuffer, signWithPrivateKey } from './signature.js';
import { syncDatabase, Usuario, Certificado, Signature } from './models/index.js';
import { authenticateToken } from './middleware/auth.js';
import { register, login } from './controllers/authController.js';

// Importar nuevas rutas híbridas
import certificateRoutes from './routes/certificateRoutesSimple.js';
import signatureRoutes from './routes/signatureRoutes.js';
// import smartCertificateRoutes from './routes/smartCertificateRoutes.js'; // Comentado temporalmente
// import internalCertificateRoutes from './routes/internalCertificateRoutes.js'; // Comentado temporalmente
// import governmentCertificateRoutes from './routes/governmentCertificateRoutes.js'; // Comentado temporalmente

// Importar rutas de expedientes
import expedienteRoutes from './routes/expedientes.js';
import firmaDocumentosRoutes from './routes/firmaDocumentos.js';

// Importar rutas de workflow
import oficinasRoutes from './routes/oficinas.js';
import workflowRoutes from './routes/workflow.js';

// Importar rutas de administración
import adminRoutes from './routes/admin.js';

// Importar rutas de debug (temporal)
import debugRoutes from './routes/debug.js';

// Importar rutas de gestión de firmas
import firmasRoutes from './routes/firmas.js';

// Importar rutas de gestión de certificados
import certificadosRoutes from './routes/certificados.js';

import { initializeDefaultData } from './models/databaseExtended.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Log de rutas activas para depuración
function printRoutes(app, prefix = '') {
  if (!app._router) {
    console.warn('No hay rutas registradas aún.');
    return;
  }
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Ruta directa
      console.log(`[ROUTE] ${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${prefix}${middleware.route.path}`);
    } else if (middleware.name === 'router' && middleware.handle.stack) {
      // Router anidado
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          console.log(`[ROUTE] ${Object.keys(handler.route.methods).join(',').toUpperCase()} ${prefix}${handler.route.path}`);
        }
      });
    }
  });
}

async function startServer() {
  try {
    // Inicializar base de datos
    await syncDatabase();

    // Inicializar datos predeterminados para CA híbrida
    await initializeDefaultData();

    // Configurar CORS basado en el entorno
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [
          'http://localhost:5174',        // Frontend desarrollo local
          'http://localhost:5175',        // Frontend desarrollo local alternativo
          process.env.FRONTEND_URL,       // Frontend producción (cuando lo despliegues)
        ].filter(Boolean)  // Filtrar undefined si FRONTEND_URL no está definida
      : [
          'http://localhost:5174',
          'http://localhost:5175',
          'http://localhost:5173',
        ];

    app.use(cors({
      origin: (origin, callback) => {
        // Permitir peticiones sin origin (como curl, Postman, apps móviles)
        if (!origin) return callback(null, true);
        
        // Permitir si está en la lista de orígenes permitidos
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        // Permitir cualquier localhost en desarrollo
        if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
          return callback(null, true);
        }
        
        // Rechazar otros orígenes
        callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));
    app.use(express.json());

    // Rutas para gestión de certificados de usuario (después de middlewares)
    app.use('/api/usuarios', usuariosRoutes);

    // Servir archivos estáticos desde la carpeta uploads
    app.use('/uploads', express.static('uploads'));

    // Middleware de logging para todas las peticiones
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      next();
    });

    // Rutas de autenticación
    app.post('/register', register);
    app.post('/login', login);

    // Endpoint para obtener perfil del usuario
    app.get('/profile', authenticateToken, async (req, res) => {
      try {
        const usuario = await Usuario.findByPk(req.user.id, {
          attributes: ['id', 'username', 'nombre_completo', 'email', 'rol_usuario', 'oficina_id']
        });

        if (!usuario) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ user: usuario });
      } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
      }
    });

    // Nuevas rutas híbridas para certificados CA
    app.use('/api', certificateRoutes);

    // Rutas para historial de firmas
    app.use('/api/signatures', signatureRoutes);

    // Rutas para expedientes digitales
    app.use('/api/expedientes', expedienteRoutes);
    app.use('/api/firma-documentos', firmaDocumentosRoutes);

    // Rutas para workflow
    app.use('/api/oficinas', oficinasRoutes);
    app.use('/api/workflow', workflowRoutes);

// Rutas para administración
app.use('/api/admin', adminRoutes);

// Rutas para debug (temporal)
app.use('/api/debug', debugRoutes);

// Rutas para gestión de firmas de usuarios
app.use('/api', firmasRoutes);

// Rutas para gestión de certificados
app.use('/api/certificates', certificadosRoutes);

// Rutas para auto-detección inteligente de certificados
// app.use('/api/certificates', smartCertificateRoutes); // Comentado temporalmente

// Rutas para gestión de certificados internos
// app.use('/api/internal-certificates', internalCertificateRoutes); // Comentado temporalmente

// Rutas para certificados gubernamentales
// app.use('/api/government-certificates', governmentCertificateRoutes); // Comentado temporalmente

// Endpoint para obtener certificados del usuario
app.get('/certificados', authenticateToken, async (req, res) => {
  try {
    const certificados = await Certificado.findAll({
      where: { usuario_id: req.user.id },
      attributes: ['id', 'nombre_certificado', 'fecha_emision', 'fecha_expiracion', 'activo', 'certificado_pem']
    });

    res.json({ certificados });
  } catch (error) {
    console.error('Error al obtener certificados:', error);
    res.status(500).json({ error: 'Error al obtener certificados' });
  }
});

// Endpoint para recibir archivo y simular firma digital
// Endpoint para firmar documentos (requiere autenticación)
app.post('/sign', authenticateToken, upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se envió ningún archivo' });
  }
  
  try {
    // Obtener información del tipo de documento y certificado solicitado
    const { tipo_documento, certificate_type, aplicar_firma_visual, posicion_firma } = req.body;
    
    // Validar tipo de documento
    if (!tipo_documento || !['oficial', 'no_oficial'].includes(tipo_documento)) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }

    // Validar tipo de certificado
    if (!certificate_type || !['internal', 'government'].includes(certificate_type)) {
      return res.status(400).json({ error: 'Tipo de certificado inválido' });
    }

    // Validar combinación documento + certificado
    if (tipo_documento === 'oficial' && certificate_type !== 'government') {
      return res.status(400).json({ 
        error: 'Los documentos oficiales SOLO pueden firmarse con certificado gubernamental' 
      });
    }

    const usuario = await Usuario.findByPk(req.user.id);
    
    // Verificar permisos del usuario para el tipo de certificado
    if (certificate_type === 'government' && !['funcionario_oficial', 'administrador'].includes(usuario.rol_usuario)) {
      return res.status(403).json({
        error: 'Su rol no permite usar certificados gubernamentales'
      });
    }

    // Para certificados internos: asegurar que exista, si no, crearlo automáticamente
    if (certificate_type === 'internal') {
      const { InternalCertificateManager } = await import('./services/InternalCertificateManager.js');
      const certResult = await InternalCertificateManager.ensureUserHasCertificate(usuario);
      
      if (certResult.action === 'created') {
        console.log(`[AUTO_CERT] Certificado interno auto-generado para ${usuario.email}`);
      }
    }

    // Buscar certificado específico del tipo solicitado
    const certificado = await Certificado.findOne({
      where: {
        usuario_id: req.user.id,
        tipo: certificate_type,
        activo: true
      },
      order: [['fecha_emision', 'DESC']] // El más reciente
    });

    if (!certificado) {
      const tipoTexto = certificate_type === 'government' ? 'gubernamental' : 'interno';
      
      if (certificate_type === 'government') {
        return res.status(404).json({ 
          error: `No tiene certificado gubernamental activo. Debe importar su certificado P12/PFX o solicitar uno nuevo desde el panel de Certificados Gubernamentales.`,
          action_required: 'import_or_request_government_certificate',
          redirect_to: '/government-certificates'
        });
      } else {
        return res.status(500).json({ 
          error: `Error generando certificado interno automáticamente. Intente nuevamente.`,
          action_required: 'retry_internal_certificate_generation'
        });
      }
    }

    // Para certificados gubernamentales: verificar estado contra CRL/OCSP
    if (certificate_type === 'government') {
      const { GovernmentCertificateManager } = await import('./services/GovernmentCertificateManager.js');
      const revocationStatus = await GovernmentCertificateManager.checkCertificateRevocationStatus(certificado);
      
      if (revocationStatus.revoked) {
        return res.status(403).json({
          error: 'Su certificado gubernamental ha sido REVOCADO y no puede usarse para firmar',
          revocation_reason: revocationStatus.reason,
          revocation_date: revocationStatus.revocation_date
        });
      }

      // Verificar que no esté vencido
      if (certificado.fecha_expiracion < new Date()) {
        return res.status(403).json({
          error: 'Su certificado gubernamental está VENCIDO. Debe renovar o importar un certificado vigente.',
          expired_date: certificado.fecha_expiracion
        });
      }
    }

    // Firmar con el certificado del usuario
    const signature = signWithPrivateKey(req.file.buffer, certificado.clave_privada_pem);
    
    // Aplicar firma visual del usuario si está habilitada
    let documentoConFirmaVisual = req.file.buffer;
    let firmaVisualAplicada = false;
    
    if (aplicar_firma_visual === 'true') {
      try {
        const { UsuarioFirma } = await import('./models/index.js');
        const { default: FirmaService } = await import('./services/FirmaService.js');
        
        // Obtener firma predeterminada del usuario
        const firmaUsuario = await UsuarioFirma.findFirmaPredeterminada(usuario.id);
        
        if (firmaUsuario) {
          console.log(`[FIRMA_VISUAL] Aplicando firma visual del usuario ${usuario.id}`);
          
          // Parsear posición de firma (puede venir como string JSON)
          let posicion = {
            pagina: 1,
            x: 50,
            y: 50,
            ancho: 150,
            alto: 50
          };
          
          if (posicion_firma) {
            try {
              const posicionParsed = typeof posicion_firma === 'string' 
                ? JSON.parse(posicion_firma) 
                : posicion_firma;
              posicion = { ...posicion, ...posicionParsed };
            } catch (e) {
              console.warn('[FIRMA_VISUAL] Error parseando posición, usando defaults:', e.message);
            }
          }
          
          // Aplicar firma visual al PDF
          documentoConFirmaVisual = await FirmaService.aplicarFirmaAPDF(
            req.file.buffer,
            firmaUsuario.firma_imagen,
            {
              pagina: posicion.pagina || 1,
              x: posicion.x || 50,
              y: posicion.y || 50,
              ancho: posicion.ancho || 150,
              alto: posicion.alto || 50
            }
          );
          
          firmaVisualAplicada = true;
          console.log(`[FIRMA_VISUAL] Firma visual aplicada exitosamente en página ${posicion.pagina}`);
          
          // Registrar en historial de firmas
          const { FirmaHistorial } = await import('./models/index.js');
          await FirmaHistorial.create({
            usuario_firma_id: firmaUsuario.id,
            documento_nombre: req.file.originalname,
            hash_documento: hashDocumento,
            timestamp_aplicacion: new Date(),
            posicion_aplicada: JSON.stringify(posicion),
            metadata: JSON.stringify({
              tamaño_documento: req.file.size,
              tipo_documento: tipo_documento,
              usuario_id: usuario.id,
              certificado_id: certificado.id
            })
          });
          
        } else {
          console.log(`[FIRMA_VISUAL] Usuario ${usuario.id} no tiene firma configurada, omitiendo firma visual`);
        }
        
      } catch (error) {
        console.error('[FIRMA_VISUAL] Error aplicando firma visual:', error);
        // No fallar la firma completa si hay error en firma visual
        // El documento seguirá teniendo firma digital válida
      }
    }
    
    // Calcular hash del documento para integridad
    const crypto = require('crypto');
    const hashDocumento = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    
    // Registrar la firma en la base de datos
    const nuevaFirma = await Signature.create({
      usuario_id: usuario.id,
      certificado_id: certificado.id,
      nombre_documento: req.file.originalname,
      nombre_archivo_original: req.file.originalname,
      tipo_documento: tipo_documento,
      hash_documento: hashDocumento,
      tamaño_archivo: req.file.size,
      firma_digital: signature.toString('hex'),
      algoritmo_firma: 'RSA-SHA256',
      timestamp_firma: new Date(),
      estado_firma: 'valida',
      verificada: true,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      validez_legal: certificate_type === 'government' ? 'COMPLETA' : 'INTERNA',
      crl_check_status: certificate_type === 'government' ? 'valid' : 'not_checked'
    });
    
    // Log de auditoría completo
    const auditLog = {
      timestamp: new Date().toISOString(),
      signature_id: nuevaFirma.id,
      usuario_id: usuario.id,
      usuario_email: usuario.email,
      usuario_rol: usuario.rol_usuario,
      documento_nombre: req.file.originalname,
      documento_hash: hashDocumento,
      documento_tipo: tipo_documento,
      certificado_id: certificado.id,
      certificado_tipo: certificate_type,
      certificado_serie: certificado.numero_serie,
      ip: req.ip,
      user_agent: req.get('User-Agent')
    };

    console.log(`[FIRMA_COMPLETA_AUDIT]`, JSON.stringify(auditLog));
    
    res.json({
      message: `Documento firmado digitalmente con certificado ${certificate_type === 'government' ? 'gubernamental' : 'interno'}${firmaVisualAplicada ? ' y firma visual aplicada' : ''}`,
      filename: req.file.originalname,
      size: req.file.size,
      fileBase64: documentoConFirmaVisual.toString('base64'),
      signature,
      publicKeyPem: certificado.certificado_pem,
      // Información del documento
      documento: {
        tipo_documento,
        certificate_type,
        estado_firma: certificate_type === 'government' ? 'firmado_gubernamental' : 'firmado_interno',
        validez_legal: certificate_type === 'government' ? 'COMPLETA' : 'INTERNA',
        hash_documento: hashDocumento,
        firma_visual_aplicada: firmaVisualAplicada
      },
      // Información de la firma registrada
      firma: {
        id: nuevaFirma.id,
        timestamp: nuevaFirma.timestamp_firma,
        algoritmo: nuevaFirma.algoritmo_firma,
        estado: nuevaFirma.estado_firma,
        verificada: nuevaFirma.verificada
      },
      usuario: {
        id: req.user.id,
        username: req.user.username,
        nombre_completo: req.user.nombre_completo,
        rol: usuario.rol_usuario
      },
      certificado: {
        id: certificado.id,
        nombre_certificado: certificado.nombre_certificado,
        tipo: certificado.tipo,
        numero_serie: certificado.numero_serie,
        fecha_emision: certificado.fecha_emision,
        fecha_expiracion: certificado.fecha_expiracion,
        dias_para_vencer: Math.ceil((certificado.fecha_expiracion - new Date()) / (1000 * 60 * 60 * 24))
      },
      auditoria: {
        timestamp: auditLog.timestamp,
        firma_id: `FIRMA_${Date.now()}`
      }
    });
  } catch (err) {
    console.error('Error al firmar:', err);
    res.status(500).json({ error: 'Error al firmar el documento', details: err.message });
  }
});

// Endpoint para validar la firma digital
app.post('/verify', upload.single('document'), (req, res) => {
  const { signature, publicKeyPem } = req.body;
  if (!req.file || !signature || !publicKeyPem) {
    return res.status(400).json({ error: 'Faltan datos para la validación' });
  }
  try {
    const isValid = verifyBuffer(req.file.buffer, signature, publicKeyPem);
    res.json({
      valid: isValid,
      message: isValid ? 'La firma es válida' : 'La firma NO es válida'
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al validar la firma', details: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('API de Firma Digital funcionando');
});

    // Iniciar el servidor
    app.listen(PORT, () => {
      console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
      printRoutes(app);
    });

  } catch (error) {
    console.error('Error al iniciar el servidor:', error);

    process.exit(1);
  }
}

// Iniciar el servidor
startServer();
