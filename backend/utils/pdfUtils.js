import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

/**
 * Cuenta el número de páginas de un archivo PDF
 * @param {string} filePath - Ruta al archivo PDF
 * @returns {Promise<number>} Número de páginas del PDF
 */
async function contarPaginasPDF(filePath) {
    try {
        console.log(`=== CONTANDO PÁGINAS PDF ===`);
        console.log(`Archivo: ${filePath}`);
        
        // Verificar que el archivo existe
        if (!fs.existsSync(filePath)) {
            throw new Error(`Archivo PDF no encontrado: ${filePath}`);
        }
        
        // Leer el archivo PDF
        const dataBuffer = fs.readFileSync(filePath);
        console.log(`Buffer leído, tamaño: ${dataBuffer.length}`);
        
        // Parsear el PDF para obtener información
        const data = await pdf(dataBuffer);
        console.log('Datos del PDF:', JSON.stringify(data, null, 2));
        
        // El pdf-parse retorna el número de páginas en la propiedad 'total'
        const numPages = data.total || data.numpages || data.numPages || 1;
        console.log(`PDF parseado - Páginas: ${numPages}`);
        
        return numPages;
    } catch (error) {
        console.error('Error al contar páginas del PDF:', error);
        // En caso de error, retornar 1 página por defecto
        return 1;
    }
}

/**
 * Calcula la siguiente foja disponible para un expediente
 * @param {Array} documentosExistentes - Array de documentos existentes del expediente
 * @returns {number} Número de la siguiente foja disponible
 */
function calcularSiguienteFoja(documentosExistentes) {
    try {
        console.log(`=== CALCULANDO SIGUIENTE FOJA ===`);
        console.log(`Documentos existentes: ${documentosExistentes.length}`);
        
        if (!documentosExistentes || documentosExistentes.length === 0) {
            console.log('No hay documentos existentes, iniciando en foja 1');
            return 1;
        }
        
        // Ordenar documentos por orden secuencial o fecha de agregado
        const documentosOrdenados = documentosExistentes.sort((a, b) => {
            if (a.orden_secuencial && b.orden_secuencial) {
                return a.orden_secuencial - b.orden_secuencial;
            }
            return new Date(a.fecha_agregado) - new Date(b.fecha_agregado);
        });
        
        let ultimaFoja = 0;
        
        for (const doc of documentosOrdenados) {
            console.log(`Documento: ${doc.documento_nombre}`);
            console.log(`  - Foja inicial: ${doc.foja_inicial || doc.numero_foja}`);
            console.log(`  - Foja final: ${doc.foja_final || doc.numero_foja}`);
            console.log(`  - Páginas: ${doc.cantidad_paginas || 1}`);
            
            const fojaFinal = doc.foja_final || doc.numero_foja || 1;
            if (fojaFinal > ultimaFoja) {
                ultimaFoja = fojaFinal;
            }
        }
        
        const siguienteFoja = ultimaFoja + 1;
        console.log(`Última foja ocupada: ${ultimaFoja}`);
        console.log(`Siguiente foja disponible: ${siguienteFoja}`);
        
        return siguienteFoja;
    } catch (error) {
        console.error('Error al calcular siguiente foja:', error);
        return 1;
    }
}

/**
 * Calcula las fojas inicial y final basadas en el número de páginas
 * @param {number} fojaInicial - Foja donde inicia el documento
 * @param {number} numeroPaginas - Número de páginas del documento
 * @returns {object} Objeto con foja_inicial y foja_final
 */
function calcularRangoFojas(fojaInicial, numeroPaginas) {
    // Validar que numeroPaginas sea un número válido
    const paginasValidas = (typeof numeroPaginas === 'number' && numeroPaginas > 0) ? numeroPaginas : 1;
    const fojaInicialValida = (typeof fojaInicial === 'number' && fojaInicial > 0) ? fojaInicial : 1;
    
    const fojaFinal = fojaInicialValida + paginasValidas - 1;
    
    console.log(`=== CALCULANDO RANGO DE FOJAS ===`);
    console.log(`Foja inicial: ${fojaInicialValida}`);
    console.log(`Número de páginas: ${paginasValidas}`);
    console.log(`Foja final: ${fojaFinal}`);
    
    return {
        foja_inicial: fojaInicialValida,
        foja_final: fojaFinal
    };
}

export {
    contarPaginasPDF,
    calcularSiguienteFoja,
    calcularRangoFojas
};