import fs from 'fs';
import path from 'path';

/**
 * Extrae schemas de modelos Sequelize
 * @param {string} modelsDir - Directorio de modelos (backend/models)
 * @returns {Promise<Object>} Objeto con modelos y sus schemas
 */
export async function extractModels(modelsDir) {
  const modelFiles = fs.readdirSync(modelsDir)
    .filter(f => f.endsWith('.js'))
    .filter(f => !['index.js', 'database.js', 'databaseExtended.js'].includes(f))
    .filter(f => !f.includes('test') && !f.includes('spec'));

  const models = {};

  for (const file of modelFiles) {
    const filePath = path.join(modelsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    const modelName = path.basename(file, '.js');

    try {
      const modelSchema = extractModelSchema(content, modelName);

      if (modelSchema) {
        models[modelName] = modelSchema;
        console.log(`   ✓ ${file}: ${Object.keys(modelSchema.fields).length} campos`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${file}: Error al parsear - ${error.message}`);
    }
  }

  return models;
}

/**
 * Extrae el schema de un archivo de modelo individual
 */
function extractModelSchema(content, modelName) {
  // Buscar definición del modelo con sequelize.define
  const defineMatch = content.match(/(?:sequelize|db)\.define\s*\(\s*['"`](\w+)['"`]\s*,\s*\{([\s\S]*?)\}\s*(?:,\s*\{[\s\S]*?\})?\s*\)/);

  if (!defineMatch) {
    return null;
  }

  const [, tableName, fieldsContent] = defineMatch;

  // Parsear campos
  const fields = parseFields(fieldsContent);

  // Intentar extraer descripción del modelo desde comentarios
  const descriptionMatch = content.match(/\/\*\*\s*([\s\S]*?)\*\//);
  const description = descriptionMatch
    ? descriptionMatch[1].replace(/\*\s*/g, '').trim().split('\n')[0]
    : '';

  return {
    tableName,
    description,
    fields
  };
}

/**
 * Parsea los campos de un modelo Sequelize
 */
function parseFields(fieldsContent) {
  const fields = {};

  // Regex para capturar definiciones de campos
  // Captura tanto formato simple como formato objeto
  const fieldRegex = /(\w+)\s*:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;

  let match;
  while ((match = fieldRegex.exec(fieldsContent)) !== null) {
    const [, fieldName, fieldDefinition] = match;

    // Saltar campos de timestamps automáticos
    if (['createdAt', 'updatedAt', 'deletedAt'].includes(fieldName)) {
      continue;
    }

    const fieldSchema = parseFieldDefinition(fieldDefinition);

    if (fieldSchema) {
      fields[fieldName] = fieldSchema;
    }
  }

  return fields;
}

/**
 * Parsea la definición de un campo individual
 */
function parseFieldDefinition(definition) {
  const field = {
    type: extractFieldType(definition),
    required: false,
    unique: false,
    primaryKey: false,
    defaultValue: null,
    description: ''
  };

  // allowNull
  if (definition.includes('allowNull: false') || definition.includes('allowNull:false')) {
    field.required = true;
  }

  // unique
  if (definition.includes('unique: true') || definition.includes('unique:true')) {
    field.unique = true;
  }

  // primaryKey
  if (definition.includes('primaryKey: true') || definition.includes('primaryKey:true')) {
    field.primaryKey = true;
  }

  // autoIncrement
  if (definition.includes('autoIncrement: true') || definition.includes('autoIncrement:true')) {
    field.autoIncrement = true;
  }

  // defaultValue
  const defaultMatch = definition.match(/defaultValue:\s*['"`]?([^,}\n]+)['"`]?/);
  if (defaultMatch) {
    field.defaultValue = defaultMatch[1].trim();
  }

  // comment (descripción)
  const commentMatch = definition.match(/comment:\s*['"`]([^'"`]+)['"`]/);
  if (commentMatch) {
    field.description = commentMatch[1];
  }

  // Extraer enum values si existe
  if (field.type.includes('enum')) {
    field.enum = extractEnumValues(definition);
  }

  // Limpiar campos null
  Object.keys(field).forEach(key => {
    if (field[key] === null || field[key] === '' || field[key] === false) {
      delete field[key];
    }
  });

  return field;
}

/**
 * Extrae el tipo de dato de un campo
 */
function extractFieldType(definition) {
  const typeMapping = {
    'DataTypes.STRING': 'string',
    'DataTypes.TEXT': 'string',
    'DataTypes.CHAR': 'string',
    'DataTypes.INTEGER': 'integer',
    'DataTypes.BIGINT': 'integer',
    'DataTypes.FLOAT': 'number',
    'DataTypes.DOUBLE': 'number',
    'DataTypes.DECIMAL': 'number',
    'DataTypes.REAL': 'number',
    'DataTypes.BOOLEAN': 'boolean',
    'DataTypes.DATE': 'string (date-time)',
    'DataTypes.DATEONLY': 'string (date)',
    'DataTypes.TIME': 'string (time)',
    'DataTypes.NOW': 'string (date-time)',
    'DataTypes.ENUM': 'string (enum)',
    'DataTypes.JSONB': 'object',
    'DataTypes.JSON': 'object',
    'DataTypes.ARRAY': 'array',
    'DataTypes.BLOB': 'binary',
    'DataTypes.UUID': 'string (uuid)',
    'DataTypes.UUIDV4': 'string (uuid)',
    'DataTypes.VIRTUAL': 'virtual'
  };

  // Buscar tipo en el contenido
  for (const [sequelizeType, jsonType] of Object.entries(typeMapping)) {
    if (definition.includes(sequelizeType)) {
      return jsonType;
    }
  }

  // Caso especial: type: STRING sin DataTypes
  if (/type:\s*(STRING|INTEGER|TEXT|BOOLEAN|DATE)/i.test(definition)) {
    const simpleTypeMatch = definition.match(/type:\s*(\w+)/i);
    if (simpleTypeMatch) {
      const type = simpleTypeMatch[1].toUpperCase();
      return typeMapping[`DataTypes.${type}`] || 'unknown';
    }
  }

  return 'unknown';
}

/**
 * Extrae valores de un ENUM
 */
function extractEnumValues(definition) {
  // Buscar DataTypes.ENUM('valor1', 'valor2', ...)
  const enumMatch = definition.match(/DataTypes\.ENUM\s*\(([\s\S]*?)\)/);

  if (enumMatch) {
    const valuesString = enumMatch[1];
    const values = valuesString
      .split(',')
      .map(v => v.trim().replace(/^['"`]|['"`]$/g, ''))
      .filter(v => v.length > 0);

    return values;
  }

  return [];
}
