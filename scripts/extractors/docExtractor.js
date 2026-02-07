import fs from 'fs';
import path from 'path';

/**
 * Extrae ejemplos de la documentación Markdown existente
 * @param {string} docsDir - Directorio de documentación
 * @returns {Promise<Array>} Array de ejemplos extraídos
 */
export async function extractDocExamples(docsDir) {
  const examples = [];

  const docFiles = [
    'FIRMA_DIGITAL_API.md',
    'documentacion_backend.md'
  ];

  for (const docFile of docFiles) {
    const filePath = path.join(docsDir, docFile);

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileExamples = parseMarkdownExamples(content, docFile);
      examples.push(...fileExamples);

      console.log(`   ✓ ${docFile}: ${fileExamples.length} ejemplos extraídos`);
    }
  }

  return examples;
}

/**
 * Parsea ejemplos desde un archivo Markdown
 */
function parseMarkdownExamples(markdown, sourceFile) {
  const examples = [];

  // Dividir por secciones (headers)
  const sections = splitByHeaders(markdown);

  for (const section of sections) {
    // Detectar endpoint en el header o contenido
    const endpoint = detectEndpoint(section);

    // Extraer bloques de código JSON
    const jsonBlocks = extractJsonBlocks(section);

    for (const jsonBlock of jsonBlocks) {
      // Determinar tipo (request o response)
      const type = determineBlockType(section, jsonBlock.position);

      examples.push({
        endpoint,
        type,
        json: jsonBlock.data,
        sourceFile,
        context: section.header || section.content.substring(0, 100)
      });
    }
  }

  return examples;
}

/**
 * Divide el markdown en secciones por headers
 */
function splitByHeaders(markdown) {
  const sections = [];
  const lines = markdown.split('\n');

  let currentSection = {
    header: '',
    content: ''
  };

  for (const line of lines) {
    // Detectar headers (##, ###)
    if (line.match(/^#{2,4}\s+/)) {
      // Guardar sección anterior si tiene contenido
      if (currentSection.content.length > 0) {
        sections.push(currentSection);
      }

      // Iniciar nueva sección
      currentSection = {
        header: line.replace(/^#+\s+/, '').trim(),
        content: line + '\n'
      };
    } else {
      currentSection.content += line + '\n';
    }
  }

  // Añadir última sección
  if (currentSection.content.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Detecta el endpoint de una sección
 */
function detectEndpoint(section) {
  const content = section.header + ' ' + section.content;

  // Patrones comunes para endpoints
  const patterns = [
    // POST /path, GET /path, etc.
    /(POST|GET|PUT|PATCH|DELETE)\s+(\/[\w\-\/{}:]+)/i,
    // Endpoint: POST /path
    /Endpoint:\s*(POST|GET|PUT|PATCH|DELETE)\s+(\/[\w\-\/{}:]+)/i,
    // URL: POST /path
    /URL:\s*(POST|GET|PUT|PATCH|DELETE)\s+(\/[\w\-\/{}:]+)/i,
    // **POST /path**
    /\*\*(POST|GET|PUT|PATCH|DELETE)\s+(\/[\w\-\/{}:]+)\*\*/i
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return `${match[1].toUpperCase()} ${match[2]}`;
    }
  }

  return null;
}

/**
 * Extrae bloques de código JSON
 */
function extractJsonBlocks(section) {
  const blocks = [];
  const content = section.content;

  // Regex para bloques de código con o sin especificador de lenguaje
  const codeBlockRegex = /```(?:json|javascript|js)?\s*\n([\s\S]*?)\n```/g;

  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const codeContent = match[1].trim();
    const position = match.index;

    // Intentar parsear como JSON
    try {
      const jsonData = JSON.parse(codeContent);
      blocks.push({
        data: jsonData,
        position,
        raw: codeContent
      });
    } catch (error) {
      // No es JSON válido, ignorar
      // Podría ser código JavaScript que contiene JSON
      // Intentar extraer objetos JSON del código
      const jsonObjects = extractJsonFromCode(codeContent);
      if (jsonObjects.length > 0) {
        jsonObjects.forEach(obj => {
          blocks.push({
            data: obj,
            position,
            raw: JSON.stringify(obj, null, 2)
          });
        });
      }
    }
  }

  return blocks;
}

/**
 * Extrae objetos JSON de código JavaScript
 */
function extractJsonFromCode(code) {
  const objects = [];

  // Buscar objetos literales en el código
  // Ejemplo: { key: 'value', ... }
  const objectRegex = /\{[\s\S]*?\}/g;

  let match;
  while ((match = objectRegex.exec(code)) !== null) {
    try {
      // Intentar evaluar como JSON (inseguro, pero en este contexto controlado está bien)
      const jsonStr = match[0]
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Añadir comillas a keys
        .replace(/'/g, '"'); // Cambiar comillas simples a dobles

      const obj = JSON.parse(jsonStr);
      objects.push(obj);
    } catch (e) {
      // No es un objeto JSON válido
    }
  }

  return objects;
}

/**
 * Determina si un bloque es request o response
 */
function determineBlockType(section, blockPosition) {
  const content = section.content;

  // Buscar hacia atrás desde la posición del bloque
  const beforeBlock = content.substring(Math.max(0, blockPosition - 300), blockPosition).toLowerCase();

  // Buscar hacia adelante desde la posición del bloque
  const afterBlock = content.substring(blockPosition, Math.min(content.length, blockPosition + 100)).toLowerCase();

  // Palabras clave para request
  const requestKeywords = [
    'request',
    'body',
    'parámetros',
    'parameters',
    'enviar',
    'send',
    'entrada',
    'input'
  ];

  // Palabras clave para response
  const responseKeywords = [
    'response',
    'respuesta',
    'salida',
    'output',
    'resultado',
    'result',
    'return'
  ];

  // Contar coincidencias
  let requestScore = 0;
  let responseScore = 0;

  for (const keyword of requestKeywords) {
    if (beforeBlock.includes(keyword) || afterBlock.includes(keyword)) {
      requestScore++;
    }
  }

  for (const keyword of responseKeywords) {
    if (beforeBlock.includes(keyword) || afterBlock.includes(keyword)) {
      responseScore++;
    }
  }

  // Si el JSON tiene un campo "token" o "message", probablemente es response
  // Si tiene campos típicos de input como "username", "password", es request
  // Esta heurística puede refinarse

  if (responseScore > requestScore) {
    return 'response';
  } else if (requestScore > responseScore) {
    return 'request';
  } else {
    return 'example'; // No está claro
  }
}
