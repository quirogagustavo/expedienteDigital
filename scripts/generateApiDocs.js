import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractRoutes } from './extractors/routeExtractor.js';
import { extractModels } from './extractors/modelExtractor.js';
import { extractDocExamples } from './extractors/docExtractor.js';
import { generatePostmanCollection } from './generators/postmanGenerator.js';
import { generateHtmlDocumentation } from './generators/htmlGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.resolve(__dirname, '..');
const ROUTES_DIR = path.join(BASE_DIR, 'backend/routes');
const MODELS_DIR = path.join(BASE_DIR, 'backend/models');
const DOCS_DIR = path.join(BASE_DIR, 'documentacion');
const OUTPUT_DIR = path.join(BASE_DIR, 'documentacion/api');

async function main() {
  console.log('🚀 Iniciando generación de documentación API...\n');

  // Asegurar que existe el directorio de salida
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Paso 1: Extraer endpoints desde archivos de rutas
  console.log('📂 Extrayendo endpoints desde archivos de rutas...');
  const routes = await extractRoutes(ROUTES_DIR);
  console.log(`   ✅ ${routes.length} endpoints encontrados\n`);

  // Paso 2: Extraer schemas de modelos
  console.log('📊 Extrayendo schemas desde modelos Sequelize...');
  const models = await extractModels(MODELS_DIR);
  console.log(`   ✅ ${Object.keys(models).length} modelos procesados\n`);

  // Paso 3: Extraer ejemplos de documentación
  console.log('📝 Extrayendo ejemplos desde documentación Markdown...');
  const examples = await extractDocExamples(DOCS_DIR);
  console.log(`   ✅ ${examples.length} ejemplos extraídos\n`);

  // Paso 4: Consolidar en JSON intermedio (api-spec.json)
  console.log('🔄 Consolidando información en JSON intermedio...');
  const apiSpec = buildApiSpec(routes, models, examples);

  const apiSpecPath = path.join(OUTPUT_DIR, 'api-spec.json');
  fs.writeFileSync(apiSpecPath, JSON.stringify(apiSpec, null, 2), 'utf-8');
  console.log(`   ✅ api-spec.json generado (${routes.length} endpoints)\n`);

  // Paso 5: Generar Postman Collection
  console.log('📮 Generando Postman Collection...');
  const postmanCollection = generatePostmanCollection(apiSpec);
  const postmanPath = path.join(OUTPUT_DIR, 'postman-collection.json');
  fs.writeFileSync(postmanPath, JSON.stringify(postmanCollection, null, 2), 'utf-8');
  console.log(`   ✅ postman-collection.json generado\n`);

  // Paso 6: Generar HTML
  console.log('🌐 Generando documentación HTML...');
  const htmlDoc = generateHtmlDocumentation(apiSpec);
  const htmlPath = path.join(OUTPUT_DIR, 'api-documentation.html');
  fs.writeFileSync(htmlPath, htmlDoc, 'utf-8');
  console.log(`   ✅ api-documentation.html generado\n`);

  // Resumen final
  console.log('✅ Documentación generada exitosamente!\n');
  console.log('📁 Archivos generados en:', OUTPUT_DIR);
  console.log('   - api-spec.json');
  console.log('   - postman-collection.json');
  console.log('   - api-documentation.html\n');

  console.log('📊 Estadísticas:');
  console.log(`   - ${routes.length} endpoints documentados`);
  console.log(`   - ${apiSpec.modules.length} módulos`);
  console.log(`   - ${Object.keys(models).length} modelos de datos`);
  console.log(`   - ${examples.length} ejemplos de código\n`);
}

/**
 * Consolida toda la información en el formato API Spec
 */
function buildApiSpec(routes, models, examples) {
  // Agrupar rutas por módulos
  const modules = groupRoutesByModule(routes);

  // Enriquecer rutas con ejemplos de documentación
  enrichRoutesWithExamples(modules, examples);

  // Construir API Spec completo
  const apiSpec = {
    info: {
      name: 'Sistema de Expediente Digital API',
      description: 'API completa para gestión de expedientes digitales con firma electrónica y workflow entre oficinas',
      version: '1.0.0',
      baseUrl: {
        development: 'http://localhost:4000',
        production: 'http://10.64.160.220:4000'
      },
      authentication: {
        type: 'Bearer Token (JWT)',
        header: 'Authorization: Bearer {{token}}',
        tokenExpiration: '24h'
      }
    },
    modules,
    commonErrors: {
      '401': 'No autenticado - Token requerido o inválido',
      '403': 'Sin permisos - Requiere rol de administrador',
      '404': 'Recurso no encontrado',
      '500': 'Error interno del servidor'
    },
    models
  };

  return apiSpec;
}

/**
 * Agrupa rutas por módulos
 */
function groupRoutesByModule(routes) {
  const moduleMap = new Map();

  routes.forEach(route => {
    if (!moduleMap.has(route.module)) {
      moduleMap.set(route.module, {
        name: route.module,
        description: getModuleDescription(route.module),
        routes: []
      });
    }

    moduleMap.get(route.module).routes.push(route);
  });

  return Array.from(moduleMap.values());
}

/**
 * Obtiene descripción de un módulo
 */
function getModuleDescription(moduleName) {
  const descriptions = {
    'Autenticación': 'Endpoints para login y gestión de tokens JWT',
    'Usuarios': 'Gestión de usuarios, firmas manuscritas y certificados',
    'Expedientes': 'CRUD completo de expedientes digitales y documentos',
    'Certificados': 'Gestión de certificados digitales (P12/PFX e internos)',
    'Firmas': 'Firma digital de documentos y gestión de firmas visuales',
    'Workflow': 'Envío de expedientes entre oficinas y cambios de estado',
    'Oficinas': 'Administración de oficinas del sistema',
    'Administración': 'Gestión de usuarios y configuración del sistema'
  };

  return descriptions[moduleName] || `Endpoints relacionados con ${moduleName}`;
}

/**
 * Enriquece rutas con ejemplos de documentación
 */
function enrichRoutesWithExamples(modules, examples) {
  modules.forEach(module => {
    module.routes.forEach(route => {
      // Buscar ejemplos para este endpoint
      const endpoint = `${route.method} ${route.path}`;
      const routeExamples = examples.filter(ex => {
        if (!ex.endpoint) return false;
        return ex.endpoint.toUpperCase() === endpoint.toUpperCase();
      });

      // Añadir ejemplos de request
      const requestExamples = routeExamples.filter(ex => ex.type === 'request');
      if (requestExamples.length > 0) {
        route.requestBody = {
          contentType: 'application/json',
          example: requestExamples[0].json
        };
      }

      // Añadir ejemplos predefinidos para endpoints comunes sin ejemplos
      if (!route.requestBody && route.method === 'POST') {
        route.requestBody = getPredefinedRequestExample(route.path, route.method);
      }

      // Añadir ejemplos de response
      const responseExamples = routeExamples.filter(ex => ex.type === 'response');
      if (responseExamples.length > 0) {
        route.responses = {
          '200': {
            description: 'Respuesta exitosa',
            example: responseExamples[0].json
          }
        };
      }

      // Añadir respuesta predefinida si no tiene
      if (!route.responses && route.method === 'POST') {
        const predefinedResponse = getPredefinedResponseExample(route.path, route.method);
        if (predefinedResponse) {
          route.responses = {
            '200': predefinedResponse
          };
        }
      }

      // Si no hay responses, añadir errores comunes
      if (!route.responses) {
        route.responses = {};
      }

      // Añadir errores comunes basados en autenticación
      if (route.auth !== false) {
        route.responses['401'] = {
          description: 'No autenticado',
          example: { error: 'Token inválido o expirado' }
        };
      }

      if (route.requiresAdmin) {
        route.responses['403'] = {
          description: 'Sin permisos de administrador',
          example: { error: 'Acceso denegado' }
        };
      }

      // Error 404 para rutas con parámetros
      if (route.pathParams && route.pathParams.length > 0) {
        route.responses['404'] = {
          description: 'Recurso no encontrado',
          example: { error: 'Recurso no encontrado' }
        };
      }

      // Error 500 genérico
      route.responses['500'] = {
        description: 'Error interno del servidor',
        example: { error: 'Error interno del servidor' }
      };
    });
  });
}

/**
 * Retorna ejemplos de request predefinidos para endpoints comunes
 */
function getPredefinedRequestExample(path, method) {
  const examples = {
    '/register': {
      contentType: 'application/json',
      example: {
        username: 'juan.perez',
        password: 'MiPassword123!',
        nombre_completo: 'Juan Pérez',
        email: 'juan.perez@example.com',
        rol_usuario: 'empleado_interno'
      }
    },
    '/login': {
      contentType: 'application/json',
      example: {
        username: 'admin',
        password: 'admin123'
      }
    }
  };

  return examples[path] || null;
}

/**
 * Retorna ejemplos de response predefinidos para endpoints comunes
 */
function getPredefinedResponseExample(path, method) {
  const examples = {
    '/register': {
      description: 'Usuario creado exitosamente',
      example: {
        message: 'Usuario creado exitosamente',
        usuario: {
          id: 5,
          username: 'juan.perez',
          nombre_completo: 'Juan Pérez',
          email: 'juan.perez@example.com',
          rol_usuario: 'empleado_interno'
        }
      }
    },
    '/login': {
      description: 'Login exitoso',
      example: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          username: 'admin',
          email: 'admin@example.com'
        }
      }
    }
  };

  return examples[path] || null;
}

// Ejecutar script
main().catch(error => {
  console.error('❌ Error al generar documentación:', error);
  process.exit(1);
});
