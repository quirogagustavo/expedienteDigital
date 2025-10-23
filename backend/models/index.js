import sequelize from './database.js';
import Usuario from './Usuario.js';
import Certificado from './Certificado.js';
import Document from './Document.js';
import Signature from './Signature.js';
import sequelizeExtended, { initializeDefaultData } from './databaseExtended.js';

// Importar oficina y otros modelos dependientes
import createOficinaModel from './Oficina.js';
import createWorkflowMovimientoModel from './WorkflowMovimiento.js';

// Importar modelos de expedientes
import createExpedienteModel from './Expediente.js';
import createExpedienteDocumentoModel from './ExpedienteDocumento.js';
import createFirmaBatchModel from './FirmaBatch.js';

// Importar modelos de firmas
import createUsuarioFirmaModel from './UsuarioFirma.js';
import createFirmaHistorialModel from './FirmaHistorial.js';

// Crear modelos que no dependen de otros
const Oficina = createOficinaModel(sequelize);
const WorkflowMovimiento = createWorkflowMovimientoModel(sequelize);

const Expediente = createExpedienteModel(sequelize);
const ExpedienteDocumento = createExpedienteDocumentoModel(sequelize);
const FirmaBatch = createFirmaBatchModel(sequelize);
const UsuarioFirma = createUsuarioFirmaModel(sequelize);
const FirmaHistorial = createFirmaHistorialModel(sequelize);

// Sincronizar todos los modelos con la base de datos
const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');
    
    // Definir asociaciones para modelos de expedientes
    defineAssociations();
    
    // NO sincronizar en producción - usar migraciones en su lugar
    // await sequelize.sync({ force: false });
    console.log('Modelos cargados correctamente (sin sync - usar migraciones).');

    // Agregar campos nuevos manualmente si no existen
    try {
      await sequelize.query(`
        ALTER TABLE expediente_documentos 
        ADD COLUMN IF NOT EXISTS hash_firma VARCHAR(512),
        ADD COLUMN IF NOT EXISTS usuario_firmante INTEGER REFERENCES usuarios(id)
      `);
      console.log('Campos de firma agregados correctamente.');
    } catch (error) {
      console.log('Los campos de firma ya existen o hubo un error:', error.message);
    }

    // NO sincronizar en producción - las tablas ya existen vía migraciones
    // await sequelizeExtended.authenticate();
    // console.log('Conexión extendida a la base de datos establecida.');
    
    // await sequelizeExtended.sync({ force: false });
    // console.log('Tablas extendidas sincronizadas correctamente.');
    
    // Inicializar datos predeterminados
    // await initializeDefaultData();
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
    throw error; // Re-lanzar el error para que el servidor no se inicie si la BD falla
  }
};

// Definir asociaciones entre modelos
const defineAssociations = () => {
  // Relaciones para Expediente
  Expediente.belongsTo(Usuario, {
    foreignKey: 'usuario_responsable',
    as: 'responsable'
  });
  
  Usuario.hasMany(Expediente, {
    foreignKey: 'usuario_responsable',
    as: 'expedientes'
  });
  
  // Relaciones para ExpedienteDocumento
  ExpedienteDocumento.belongsTo(Expediente, {
    foreignKey: 'expediente_id',
    as: 'expediente'
  });
  
  Expediente.hasMany(ExpedienteDocumento, {
    foreignKey: 'expediente_id',
    as: 'documentos'
  });
  
  ExpedienteDocumento.belongsTo(Usuario, {
    foreignKey: 'usuario_agregado',
    as: 'creator'
  });
  
  ExpedienteDocumento.belongsTo(Usuario, {
    foreignKey: 'usuario_firmante',
    as: 'firmante'
  });
  
  ExpedienteDocumento.belongsTo(Signature, {
    foreignKey: 'signature_id',
    as: 'signature'
  });
  
  // Relaciones para FirmaBatch
  FirmaBatch.belongsTo(Expediente, {
    foreignKey: 'expediente_id',
    as: 'expediente'
  });
  
  Expediente.hasMany(FirmaBatch, {
    foreignKey: 'expediente_id',
    as: 'firmasBatch'
  });
  
  FirmaBatch.belongsTo(Usuario, {
    foreignKey: 'usuario_firmante',
    as: 'firmante'
  });
  
  FirmaBatch.belongsTo(Certificado, {
    foreignKey: 'certificado_usado',
    as: 'certificado'
  });

  // Relaciones para UsuarioFirma
  UsuarioFirma.belongsTo(Usuario, {
    foreignKey: 'usuario_id',
    as: 'usuario'
  });

  UsuarioFirma.belongsTo(Usuario, {
    foreignKey: 'subida_por',
    as: 'subidaPor'
  });

  Usuario.hasMany(UsuarioFirma, {
    foreignKey: 'usuario_id',
    as: 'firmasVisuales'
  });

  // Relaciones para FirmaHistorial
  FirmaHistorial.belongsTo(UsuarioFirma, {
    foreignKey: 'usuario_firma_id',
    as: 'usuarioFirma'
  });

  FirmaHistorial.belongsTo(ExpedienteDocumento, {
    foreignKey: 'documento_id',
    as: 'documento'
  });

  FirmaHistorial.belongsTo(Expediente, {
    foreignKey: 'expediente_id',
    as: 'expediente'
  });

  FirmaHistorial.belongsTo(Usuario, {
    foreignKey: 'aplicada_por',
    as: 'aplicadoPor'
  });

  ExpedienteDocumento.hasMany(FirmaHistorial, {
    foreignKey: 'documento_id',
    as: 'historialFirmas'
  });
};

export {
  sequelize,
  Usuario,
  Certificado,
  Document,
  Signature,
  Expediente,
  ExpedienteDocumento,
  FirmaBatch,
  UsuarioFirma,
  FirmaHistorial,
  syncDatabase
};