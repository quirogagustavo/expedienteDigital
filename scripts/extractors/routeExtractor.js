import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapeo de archivos de rutas a módulos
const FILE_TO_MODULE = {
  'login.js': 'Autenticación',
  'usuarios.js': 'Usuarios',
  'expedientes.js': 'Expedientes',
  'certificados.js': 'Certificados',
  'certificateRoutes.js': 'Certificados',
  'certificateRoutesSimple.js': 'Certificados',
  'governmentCertificateRoutes.js': 'Certificados',
  'internalCertificateRoutes.js': 'Certificados',
  'smartCertificateRoutes.js': 'Certificados',
  'firmas.js': 'Firmas',
  'firmaDocumentos.js': 'Firmas',
  'signatureRoutes.js': 'Firmas',
  'workflow.js': 'Workflow',
  'oficinas.js': 'Oficinas',
  'admin.js': 'Administración',
  'laravelIntegration.js': 'Laravel Integration',
  'debug.js': null // Excluir debug
};

// Mapeo de archivos de rutas a prefijos de URL (según app.use en index.js)
const FILE_TO_PREFIX = {
  'login.js': '',
  'usuarios.js': '/api/usuarios',
  'expedientes.js': '/api/expedientes',
  'certificados.js': '/api/certificates',
  'certificateRoutes.js': '/api',
  'certificateRoutesSimple.js': '/api',
  'governmentCertificateRoutes.js': '/api/government-certificates',
  'internalCertificateRoutes.js': '/api/internal-certificates',
  'smartCertificateRoutes.js': '/api/certificates',
  'firmas.js': '/api',
  'firmaDocumentos.js': '/api/firma-documentos',
  'signatureRoutes.js': '/api/signatures',
  'workflow.js': '/api/workflow',
  'oficinas.js': '/api/oficinas',
  'admin.js': '/api/admin',
  'laravelIntegration.js': '/api/laravel',
  'debug.js': ''
};

/**
 * Extrae todos los endpoints de los archivos de rutas
 * @param {string} routesDir - Directorio de rutas (backend/routes)
 * @returns {Promise<Array>} Array de endpoints extraídos
 */
export async function extractRoutes(routesDir) {
  const routeFiles = fs.readdirSync(routesDir)
    .filter(f => f.endsWith('.js'))
    .filter(f => !f.includes('test') && !f.includes('spec'));

  const allRoutes = [];

  for (const file of routeFiles) {
    const module = FILE_TO_MODULE[file];

    // Excluir archivos que no tienen módulo asignado (como debug.js)
    if (module === null) {
      console.log(`   ⚠️  Excluyendo ${file}`);
      continue;
    }

    const filePath = path.join(routesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const prefix = FILE_TO_PREFIX[file] || '';

    // Extraer endpoints del archivo
    const routes = extractRoutesFromFile(content, file, module || 'Sin Categoría', prefix);
    allRoutes.push(...routes);

    console.log(`   ✓ ${file}: ${routes.length} endpoints`);
  }

  // Extraer rutas de index.js (endpoints definidos directamente)
  const indexPath = path.join(routesDir, '../index.js');
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const indexRoutes = extractDirectEndpoints(indexContent);
    if (indexRoutes.length > 0) {
      allRoutes.push(...indexRoutes);
      console.log(`   ✓ index.js: ${indexRoutes.length} endpoints directos`);
    }
  }

  // Deduplicar endpoints por método + path
  const uniqueRoutes = deduplicateRoutes(allRoutes);

  return uniqueRoutes;
}

/**
 * Extrae endpoints de un archivo individual
 */
function extractRoutesFromFile(content, filename, module, prefix = '') {
  const routes = [];

  // Regex para detectar definiciones de rutas
  // Captura: router.METHOD('path', [middleware...], handler)
  const routeRegex = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const [fullMatch, method, routePath] = match;
    const startIndex = match.index;

    // Extraer contexto alrededor del endpoint
    const beforeContext = content.substring(Math.max(0, startIndex - 500), startIndex);
    const afterContext = content.substring(startIndex, Math.min(content.length, startIndex + 800));

    // Extraer comentario anterior si existe
    const comment = extractComment(beforeContext);

    // Detectar middleware
    const middlewareInfo = detectMiddleware(afterContext);

    // Construir path completo con prefijo
    const fullPath = prefix + routePath;

    // Detectar parámetros del path
    const pathParams = extractPathParams(routePath);

    // Intentar inferir request body
    const requestBodyHints = inferRequestBody(afterContext);

    const route = {
      method: method.toUpperCase(),
      path: fullPath,
      module,
      sourceFile: filename,
      summary: comment.summary || `${method.toUpperCase()} ${fullPath}`,
      description: comment.description || '',
      auth: middlewareInfo.auth,
      requiresAdmin: middlewareInfo.requiresAdmin,
      requiresOfficeAccess: middlewareInfo.requiresOfficeAccess,
      hasFileUpload: middlewareInfo.hasFileUpload,
      uploadField: middlewareInfo.uploadField,
      pathParams,
      requestBodyHints
    };

    routes.push(route);
  }

  return routes;
}

/**
 * Extrae comentarios antes de un endpoint
 */
function extractComment(beforeContext) {
  // Buscar comentario de línea simple
  const singleLineMatch = beforeContext.match(/\/\/\s*(.+)$/m);
  if (singleLineMatch) {
    return {
      summary: singleLineMatch[1].trim(),
      description: ''
    };
  }

  // Buscar comentario multilínea
  const multiLineMatch = beforeContext.match(/\/\*\*([\s\S]*?)\*\//);
  if (multiLineMatch) {
    const commentContent = multiLineMatch[1]
      .split('\n')
      .map(line => line.replace(/^\s*\*\s?/, '').trim())
      .filter(line => line.length > 0 && !line.startsWith('@'))
      .join(' ');

    return {
      summary: commentContent.substring(0, 100),
      description: commentContent
    };
  }

  return { summary: '', description: '' };
}

/**
 * Detecta middleware aplicado al endpoint
 */
function detectMiddleware(afterContext) {
  return {
    auth: afterContext.includes('authenticateToken'),
    requiresAdmin: afterContext.includes('requireAdmin'),
    requiresOfficeAccess: afterContext.includes('verificarAcceso'),
    hasFileUpload: /upload\.(single|array|fields)/.test(afterContext),
    uploadField: extractUploadField(afterContext)
  };
}

/**
 * Extrae el nombre del campo de upload
 */
function extractUploadField(content) {
  const uploadMatch = content.match(/upload\.(single|array)\(['"`]([^'"`]+)['"`]\)/);
  if (uploadMatch) {
    return uploadMatch[2];
  }
  return null;
}

/**
 * Extrae parámetros del path
 */
function extractPathParams(routePath) {
  const params = [];
  const paramRegex = /:(\w+)/g;

  let match;
  while ((match = paramRegex.exec(routePath)) !== null) {
    params.push({
      name: match[1],
      type: 'string',
      required: true,
      description: `ID de ${match[1]}`
    });
  }

  return params;
}

/**
 * Intenta inferir el request body analizando req.body destructuring
 */
function inferRequestBody(afterContext) {
  const hints = {
    hasBody: false,
    fields: []
  };

  // Buscar destructuring de req.body
  const destructuringMatch = afterContext.match(/const\s*\{\s*([^}]+)\s*\}\s*=\s*req\.body/);
  if (destructuringMatch) {
    hints.hasBody = true;
    const fields = destructuringMatch[1]
      .split(',')
      .map(f => {
        const parts = f.trim().split('=');
        const fieldName = parts[0].trim();
        const defaultValue = parts[1]?.trim();

        return {
          name: fieldName,
          hasDefault: !!defaultValue,
          defaultValue
        };
      });

    hints.fields = fields;
  }

  return hints;
}

/**
 * Deduplica endpoints por método + path
 * Prioriza el endpoint más completo (más middleware, más documentación)
 */
function deduplicateRoutes(routes) {
  const routeMap = new Map();

  for (const route of routes) {
    const key = `${route.method}:${route.path}`;

    if (!routeMap.has(key)) {
      routeMap.set(key, route);
    } else {
      const existing = routeMap.get(key);

      // Calcular "score" de completitud
      const existingScore = calculateCompletenessScore(existing);
      const newScore = calculateCompletenessScore(route);

      // Mantener el más completo
      if (newScore > existingScore) {
        console.log(`   ⚠️  Duplicado detectado: ${key} - Manteniendo ${route.sourceFile} sobre ${existing.sourceFile}`);
        routeMap.set(key, route);
      }
    }
  }

  return Array.from(routeMap.values());
}

/**
 * Calcula un score de completitud de un endpoint
 */
function calculateCompletenessScore(route) {
  let score = 0;

  if (route.summary && route.summary.length > 10) score += 2;
  if (route.description && route.description.length > 20) score += 2;
  if (route.auth) score += 1;
  if (route.requiresAdmin) score += 1;
  if (route.pathParams && route.pathParams.length > 0) score += 1;
  if (route.requestBodyHints && route.requestBodyHints.fields.length > 0) score += 2;

  return score;
}

/**
 * Extrae endpoints definidos directamente en index.js
 * Detecta: app.post('/path', handler) o app.post('/path', middleware, handler)
 */
function extractDirectEndpoints(content) {
  const routes = [];

  // Regex para detectar: app.METHOD('path', ...)
  const appRouteRegex = /app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`][^;)]*\)/gi;

  let match;
  while ((match = appRouteRegex.exec(content)) !== null) {
    const [fullMatch, method, routePath] = match;
    const startIndex = match.index;

    // Extraer contexto
    const beforeContext = content.substring(Math.max(0, startIndex - 300), startIndex);
    const afterContext = content.substring(startIndex, Math.min(content.length, startIndex + 400));

    // Extraer comentario (pero filtrar comentarios genéricos sobre middleware)
    const comment = extractComment(beforeContext);
    const isGenericMiddlewareComment = comment.summary.toLowerCase().includes('middleware') &&
                                       !comment.summary.toLowerCase().includes('auth');

    // Detectar si usa authenticateToken en los argumentos de la función
    const lineContent = fullMatch;
    const requiresAuth = lineContent.includes('authenticateToken');

    // Detectar si usa upload
    const hasFileUpload = /upload\.(single|array|fields)/.test(lineContent);

    // Determinar módulo y summary según el path
    let module = 'Autenticación';
    let summary = '';
    let description = '';

    if (routePath === '/register') {
      module = 'Autenticación';
      summary = 'Registrar nuevo usuario (público)';
      description = 'Permite el auto-registro de nuevos usuarios sin autenticación previa';
    } else if (routePath === '/login') {
      module = 'Autenticación';
      summary = 'Iniciar sesión';
      description = 'Autentica usuario con username/email y password, devuelve token JWT';
    } else if (routePath === '/profile') {
      module = 'Usuarios';
      summary = 'Obtener perfil del usuario autenticado';
      description = 'Retorna información del usuario actual basándose en el token JWT';
    } else if (routePath.includes('certificado')) {
      module = 'Certificados';
      summary = `${method.toUpperCase()} ${routePath}`;
    } else if (routePath === '/sign') {
      module = 'Firmas';
      summary = 'Firmar documento digitalmente';
      description = 'Firma un documento con certificado digital (interno o gubernamental) del usuario';
    } else if (routePath === '/verify') {
      module = 'Firmas';
      summary = 'Verificar firma digital';
      description = 'Verifica la validez de una firma digital de un documento';
    } else {
      summary = `${method.toUpperCase()} ${routePath}`;
    }

    // Usar el summary/description inferido si el comentario es genérico o vacío
    const finalSummary = (isGenericMiddlewareComment || !comment.summary)
      ? summary
      : comment.summary;

    const finalDescription = comment.description || description;

    const route = {
      method: method.toUpperCase(),
      path: routePath,
      module,
      sourceFile: 'index.js',
      summary: finalSummary,
      description: finalDescription,
      auth: requiresAuth,
      requiresAdmin: false,
      requiresOfficeAccess: false,
      hasFileUpload,
      uploadField: hasFileUpload ? extractUploadField(lineContent) : null,
      pathParams: extractPathParams(routePath),
      requestBodyHints: inferRequestBody(afterContext)
    };

    routes.push(route);
  }

  return routes;
}
