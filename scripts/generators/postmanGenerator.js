/**
 * Genera una Postman Collection v2.1 desde el API Spec
 * @param {Object} apiSpec - Especificación de API consolidada
 * @returns {Object} Postman Collection v2.1
 */
export function generatePostmanCollection(apiSpec) {
  const collection = {
    info: {
      name: apiSpec.info.name,
      description: apiSpec.info.description,
      version: apiSpec.info.version,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{token}}',
          type: 'string'
        }
      ]
    },
    variable: [
      {
        key: 'baseUrl',
        value: apiSpec.info.baseUrl.development,
        type: 'string'
      },
      {
        key: 'baseUrlProduction',
        value: apiSpec.info.baseUrl.production,
        type: 'string'
      },
      {
        key: 'token',
        value: '',
        type: 'string'
      }
    ],
    item: []
  };

  // Crear carpeta de Setup & Authentication
  const setupFolder = createSetupFolder(apiSpec);
  if (setupFolder) {
    collection.item.push(setupFolder);
  }

  // Crear carpetas para cada módulo
  apiSpec.modules.forEach((module, index) => {
    const folder = createModuleFolder(module, index + 1);
    collection.item.push(folder);
  });

  return collection;
}

/**
 * Crea la carpeta de Setup & Authentication
 */
function createSetupFolder(apiSpec) {
  // Buscar endpoint de login en cualquier módulo
  const loginRoute = findLoginRoute(apiSpec.modules);

  if (!loginRoute) {
    return null;
  }

  return {
    name: '00. Setup & Authentication',
    description: 'Endpoints iniciales para configurar el ambiente y obtener token JWT',
    item: [
      {
        name: 'Login',
        event: [
          {
            listen: 'test',
            script: {
              exec: [
                '// Guardar token automáticamente después del login',
                'if (pm.response.code === 200) {',
                '    var jsonData = pm.response.json();',
                '    if (jsonData.token) {',
                '        pm.collectionVariables.set("token", jsonData.token);',
                '        pm.environment.set("token", jsonData.token);',
                '        console.log("✓ Token guardado:", jsonData.token);',
                '    }',
                '}',
                '',
                '// Validar estructura de respuesta',
                'pm.test("Status code is 200", function () {',
                '    pm.response.to.have.status(200);',
                '});',
                '',
                'pm.test("Response has token", function () {',
                '    var jsonData = pm.response.json();',
                '    pm.expect(jsonData).to.have.property("token");',
                '    pm.expect(jsonData).to.have.property("user");',
                '});'
              ],
              type: 'text/javascript'
            }
          }
        ],
        request: createRequest(loginRoute, false, apiSpec),
        response: createExampleResponses(loginRoute)
      }
    ]
  };
}

/**
 * Busca el endpoint de login en los módulos
 */
function findLoginRoute(modules) {
  for (const module of modules) {
    for (const route of module.routes) {
      if (route.path === '/login' && route.method === 'POST') {
        return route;
      }
    }
  }
  return null;
}

/**
 * Crea una carpeta para un módulo
 */
function createModuleFolder(module, index) {
  const paddedIndex = String(index).padStart(2, '0');

  return {
    name: `${paddedIndex}. ${module.name}`,
    description: module.description || `Endpoints relacionados con ${module.name}`,
    item: module.routes.map(route => createEndpointItem(route, module))
  };
}

/**
 * Crea un item de endpoint para Postman
 */
function createEndpointItem(route, module) {
  const requiresAuth = route.auth !== false;

  const item = {
    name: route.summary || `${route.method} ${route.path}`,
    request: createRequest(route, requiresAuth, module),
    response: createExampleResponses(route)
  };

  // Añadir tests básicos
  if (route.method === 'GET' || route.method === 'POST') {
    item.event = [
      {
        listen: 'test',
        script: {
          exec: [
            '// Test básico de status code',
            'pm.test("Status code is successful", function () {',
            '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
            '});',
            '',
            '// Test de tiempo de respuesta',
            'pm.test("Response time is less than 3000ms", function () {',
            '    pm.expect(pm.response.responseTime).to.be.below(3000);',
            '});'
          ],
          type: 'text/javascript'
        }
      }
    ];
  }

  return item;
}

/**
 * Crea un objeto request para Postman
 */
function createRequest(route, requiresAuth, contextInfo) {
  const request = {
    method: route.method,
    header: [],
    url: buildUrl(route.path),
    description: route.description || route.summary || ''
  };

  // Autenticación
  if (!requiresAuth) {
    request.auth = {
      type: 'noauth'
    };
  }

  // Headers
  if (route.requestBody && !route.hasFileUpload) {
    request.header.push({
      key: 'Content-Type',
      value: 'application/json',
      type: 'text'
    });
  }

  // Body
  if (route.requestBody || route.requestBodyHints?.hasBody || route.hasFileUpload) {
    request.body = buildRequestBody(route);
  }

  return request;
}

/**
 * Construye la URL del endpoint
 */
function buildUrl(path) {
  const pathParts = path.split('/').filter(Boolean);

  return {
    raw: `{{baseUrl}}${path}`,
    host: ['{{baseUrl}}'],
    path: pathParts
  };
}

/**
 * Construye el body del request
 */
function buildRequestBody(route) {
  if (route.hasFileUpload) {
    // Formdata para file uploads
    return {
      mode: 'formdata',
      formdata: buildFormData(route)
    };
  } else {
    // JSON body
    const bodyExample = route.requestBody?.example || buildBodyFromHints(route);

    return {
      mode: 'raw',
      raw: JSON.stringify(bodyExample, null, 2),
      options: {
        raw: {
          language: 'json'
        }
      }
    };
  }
}

/**
 * Construye formdata para file uploads
 */
function buildFormData(route) {
  const formdata = [];

  // Campo de archivo
  if (route.uploadField) {
    formdata.push({
      key: route.uploadField,
      type: 'file',
      src: [],
      description: 'Archivo a subir'
    });
  }

  // Otros campos del body
  if (route.requestBodyHints?.fields) {
    route.requestBodyHints.fields.forEach(field => {
      if (field.name !== route.uploadField) {
        formdata.push({
          key: field.name,
          value: field.defaultValue || '',
          type: 'text',
          description: ''
        });
      }
    });
  }

  return formdata;
}

/**
 * Construye un body de ejemplo desde hints
 */
function buildBodyFromHints(route) {
  if (!route.requestBodyHints?.fields) {
    return {};
  }

  const body = {};

  route.requestBodyHints.fields.forEach(field => {
    // Inferir valores de ejemplo según el nombre del campo
    body[field.name] = inferExampleValue(field.name, field.defaultValue);
  });

  return body;
}

/**
 * Infiere un valor de ejemplo para un campo
 */
function inferExampleValue(fieldName, defaultValue) {
  if (defaultValue !== undefined) {
    return defaultValue;
  }

  const lowerName = fieldName.toLowerCase();

  // Patrones comunes
  if (lowerName.includes('email')) return 'usuario@example.com';
  if (lowerName.includes('password')) return 'password123';
  if (lowerName.includes('username')) return 'usuario';
  if (lowerName.includes('nombre') || lowerName.includes('name')) return 'Nombre Ejemplo';
  if (lowerName.includes('titulo') || lowerName.includes('title')) return 'Título Ejemplo';
  if (lowerName.includes('descripcion') || lowerName.includes('description')) return 'Descripción de ejemplo';
  if (lowerName.includes('fecha') || lowerName.includes('date')) return '2025-01-01';
  if (lowerName.includes('estado') || lowerName.includes('status')) return 'activo';
  if (lowerName.includes('prioridad') || lowerName.includes('priority')) return 'normal';
  if (lowerName.includes('id')) return 1;

  return '';
}

/**
 * Crea ejemplos de responses para un endpoint
 */
function createExampleResponses(route) {
  const responses = [];

  if (route.responses) {
    Object.entries(route.responses).forEach(([code, response]) => {
      responses.push({
        name: `${code} - ${response.description || getStatusText(code)}`,
        originalRequest: {},
        status: getStatusText(code),
        code: parseInt(code),
        _postman_previewlanguage: 'json',
        header: [
          {
            key: 'Content-Type',
            value: 'application/json'
          }
        ],
        body: JSON.stringify(response.example || {}, null, 2)
      });
    });
  }

  return responses;
}

/**
 * Obtiene el texto de status HTTP
 */
function getStatusText(code) {
  const statusTexts = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    500: 'Internal Server Error'
  };

  return statusTexts[code] || 'Response';
}
