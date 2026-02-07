import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Genera documentación HTML desde el API Spec
 * @param {Object} apiSpec - Especificación de API consolidada
 * @returns {string} HTML completo
 */
export function generateHtmlDocumentation(apiSpec) {
  // Leer template HTML
  const templatePath = path.join(__dirname, '../templates/api-documentation.html');
  const template = fs.readFileSync(templatePath, 'utf-8');

  // Insertar JSON del API Spec en el template
  const html = template.replace(
    '{{API_SPEC_JSON}}',
    JSON.stringify(apiSpec, null, 2)
  );

  return html;
}
