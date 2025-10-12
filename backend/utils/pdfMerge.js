import PDFMerger from 'pdf-merger-js';
import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';
import { spawnSync } from 'child_process';

/**
 * Une varios archivos PDF en uno solo usando PDFMerger.
 * Esta es la implementación original que puede tener problemas con las firmas visuales.
 * @param {string[]} pdfPaths - Rutas absolutas de los PDFs a unir (en orden).
 * @param {string} outputPath - Ruta de salida para el PDF unificado.
 * @returns {Promise<string>} Ruta del PDF generado.
 */
export async function mergePDFsUsingMerger(pdfPaths, outputPath) {
  console.log('=== UNIFICANDO PDFs CON PDF-MERGER-JS ===');
  const merger = new PDFMerger();
  for (const pdfPath of pdfPaths) {
    if (fs.existsSync(pdfPath)) {
      await merger.add(pdfPath);
      console.log(`Añadido al merge: ${pdfPath}`);
    } else {
      console.warn(`[mergePDFs] Archivo no encontrado: ${pdfPath}`);
    }
  }
  await merger.save(outputPath);
  console.log(`Archivo unificado guardado en: ${outputPath}`);
  return outputPath;
}

/**
 * Encuentra el archivo en múltiples rutas posibles
 * @param {string} originalPath - Ruta original del archivo
 * @returns {string|null} Ruta válida si se encuentra, null si no
 */
function findValidPath(originalPath) {
  if (fs.existsSync(originalPath)) {
    return originalPath;
  }
  
  // Probar sin backend/ prefijo
  const withoutBackendPrefix = originalPath.replace(/^backend\//, '');
  if (fs.existsSync(withoutBackendPrefix)) {
    console.log(`Archivo encontrado en ruta alternativa: ${withoutBackendPrefix}`);
    return withoutBackendPrefix;
  }
  
  // Probar con backend/ prefijo si no lo tiene
  if (!originalPath.startsWith('backend/')) {
    const withBackendPrefix = `backend/${originalPath}`;
    if (fs.existsSync(withBackendPrefix)) {
      console.log(`Archivo encontrado en ruta alternativa: ${withBackendPrefix}`);
      return withBackendPrefix;
    }
  }
  
  console.warn(`No se pudo encontrar una ruta válida para: ${originalPath}`);
  return null;
}

/**
 * Une varios archivos PDF en uno solo utilizando pdftk como primera opción (mejor preservación de firmas),
 * luego qpdf, ghostscript, o PDF-Merger-JS como último recurso.
 * @param {string[]} pdfPaths - Rutas absolutas de los PDFs a unir (en orden).
 * @param {string} outputPath - Ruta de salida para el PDF unificado.
 * @returns {Promise<string>} Ruta del PDF generado.
 */
export async function mergePDFs(pdfPaths, outputPath) {
  try {
    console.log('=== INTENTANDO UNIFICAR PDFs ===');
    
    // Crear directorio de debug si no existe
    const debugDir = '/tmp/debug';
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    fs.writeFileSync('/tmp/debug/pdf_merge_start.log', `Iniciando mergePDFs con ${pdfPaths.length} archivos\n` + 
                   pdfPaths.join('\n') + '\nRuta salida: ' + outputPath);
    
    // Validar rutas (buscando en múltiples ubicaciones posibles)
    const validPaths = [];
    for (const pdfPath of pdfPaths) {
      const validPath = findValidPath(pdfPath);
      if (validPath) {
        validPaths.push(validPath);
        console.log(`PDF válido a unir: ${validPath}`);
      } else {
        console.warn(`[mergePDFs] Archivo no encontrado en ninguna ruta: ${pdfPath}`);
      }
    }
    
    if (validPaths.length === 0) {
      throw new Error('No hay archivos PDF válidos para unificar');
    }
    
    // Crear directorio de salida si no existe
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Primero intentar con PDFTK que ofrece mejor preservación de firmas
    try {
      console.log('=== INTENTANDO UNIFICAR CON PDFTK (MEJOR PRESERVACIÓN DE FIRMAS) ===');
      
      // Construir el comando pdftk para unir PDFs
      const pdftkArgs = [
        ...validPaths,
        'cat',
        'output', outputPath
      ];
      
      // Log para debug
      fs.writeFileSync('/tmp/debug/pdftk_attempt.log', 'Intentando PDFtk con argumentos:\n' + 
                      pdftkArgs.join('\n'));
      
      console.log('=== ARGUMENTOS DE PDFTK ===');
      console.log(pdftkArgs.join(' '));
      
      const pdftkResult = spawnSync('pdftk', pdftkArgs, { 
        encoding: 'utf8', 
        maxBuffer: 10 * 1024 * 1024 
      });
      
      // Guardar salida para debug
      fs.writeFileSync('/tmp/debug/pdftk_result.log', 
                     `Status: ${pdftkResult.status}\n` +
                     `Stdout: ${pdftkResult.stdout?.toString()}\n` +
                     `Stderr: ${pdftkResult.stderr?.toString()}`);
      
      if (pdftkResult.status === 0) {
        console.log(`✅ PDFs unidos correctamente con pdftk: ${outputPath}`);
        fs.writeFileSync('/tmp/debug/pdf_merge_success.log', 'Método: pdftk');
        
        // Verificar el tamaño del archivo resultante
        const stats = fs.statSync(outputPath);
        console.log(`Tamaño del archivo generado: ${stats.size} bytes`);
        
        return outputPath;
      } else {
        console.log('pdftk falló, intentando con método alternativo...');
        console.log(pdftkResult.stderr?.toString());
      }
    } catch (pdftkError) {
      console.log('pdftk no disponible o falló, intentando con método alternativo...');
      fs.writeFileSync('/tmp/debug/pdftk_error.log', pdftkError.toString());
    }
    
    // Intentar con qpdf (versión actualizada con soporte correcto)
    try {
      console.log('=== INTENTANDO UNIFICAR CON QPDF ===');
      // Configuración básica de QPDF (sin argumentos no soportados)
      const qpdfArgs = [
        '--empty',
        '--pages', 
        ...validPaths, 
        '--', 
        outputPath
      ];

      console.log('=== ARGUMENTOS DE QPDF ===');
      console.log(qpdfArgs.join(' '));
      
      const qpdfResult = spawnSync('qpdf', qpdfArgs, { 
        encoding: 'utf8', 
        maxBuffer: 10 * 1024 * 1024  // Aumentar buffer para manejar salidas grandes
      });
      
      // Guardar salida para debug
      fs.writeFileSync('/tmp/debug/qpdf_result.log', 
                     `Status: ${qpdfResult.status}\n` +
                     `Stdout: ${qpdfResult.stdout?.toString()}\n` +
                     `Stderr: ${qpdfResult.stderr?.toString()}`);
      
      if (qpdfResult.status === 0) {
        console.log(`✅ PDFs unidos correctamente con qpdf: ${outputPath}`);
        fs.writeFileSync('/tmp/debug/pdf_merge_success.log', 'Método: qpdf');
        
        // Verificar el tamaño del archivo resultante
        const stats = fs.statSync(outputPath);
        console.log(`Tamaño del archivo generado: ${stats.size} bytes`);
        
        return outputPath;
      } else {
        console.log('qpdf falló, intentando con método alternativo...');
        console.log(qpdfResult.stderr?.toString());
      }
    } catch (qpdfError) {
      console.log('qpdf no disponible o falló, intentando con método alternativo...');
      fs.writeFileSync('/tmp/debug/qpdf_error.log', qpdfError.toString());
    }
    
    // Intentar con ghostscript (mejor renderizado visual pero posibles problemas con firmas)
    try {
      console.log('=== INTENTANDO UNIFICAR CON GHOSTSCRIPT ===');
      // Construir el comando gs para unir PDFs con optimización para preservar firmas
      const gsArgs = [
        '-q', '-dNOPAUSE', '-dBATCH', '-sDEVICE=pdfwrite',
        '-dPDFSETTINGS=/prepress', // Calidad alta
        '-dAutoRotatePages=/None', // Mantener orientación
        '-sOutputFile=' + outputPath
      ];
      
      validPaths.forEach(pdfPath => {
        gsArgs.push(pdfPath);
      });
      
      // Log para debug
      fs.writeFileSync('/tmp/debug/gs_attempt.log', 'Intentando GhostScript con argumentos:\n' + 
                      gsArgs.join('\n'));
      
      console.log('=== ARGUMENTOS DE GHOSTSCRIPT ===');
      console.log(gsArgs.join(' '));
      
      const gsResult = spawnSync('gs', gsArgs, { 
        encoding: 'utf8', 
        maxBuffer: 10 * 1024 * 1024 
      });
      
      // Guardar salida para debug
      fs.writeFileSync('/tmp/debug/gs_result.log', 
                     `Status: ${gsResult.status}\n` +
                     `Stdout: ${gsResult.stdout?.toString()}\n` +
                     `Stderr: ${gsResult.stderr?.toString()}`);
      
      if (gsResult.status === 0) {
        console.log(`✅ PDFs unidos correctamente con Ghostscript: ${outputPath}`);
        fs.writeFileSync('/tmp/debug/pdf_merge_success.log', 'Método: ghostscript');
        
        // Verificar el tamaño del archivo resultante
        const stats = fs.statSync(outputPath);
        console.log(`Tamaño del archivo generado: ${stats.size} bytes`);
        
        return outputPath;
      } else {
        console.log('Ghostscript falló, intentando con PDF-Merger-JS...');
        console.log(gsResult.stderr?.toString());
      }
    } catch (gsError) {
      console.log('Ghostscript no disponible o falló, intentando con PDF-Merger-JS...');
      fs.writeFileSync('/tmp/debug/gs_error.log', gsError.toString());
    }
    
    // Si los métodos anteriores fallan, usar PDF-Merger-JS como último recurso
    console.log('=== USANDO PDF-MERGER-JS COMO ÚLTIMO RECURSO ===');
    fs.writeFileSync('/tmp/debug/merger_fallback.log', 'Todos los métodos previos fallaron, usando PDF-Merger-JS');
    
    // Para mayor compatibilidad, copiar los archivos a un directorio temporal 
    // para asegurar que PDF-Merger-JS pueda acceder a ellos correctamente
    const tempDir = path.join('/tmp', 'pdf-merger-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Copiar los archivos al directorio temporal
    const tempPaths = [];
    for (let i = 0; i < validPaths.length; i++) {
      const tempPath = path.join(tempDir, `file_${i+1}.pdf`);
      fs.copyFileSync(validPaths[i], tempPath);
      tempPaths.push(tempPath);
      fs.writeFileSync('/tmp/debug/copy_log.txt', `Copiado ${validPaths[i]} a ${tempPath}\n`, { flag: 'a' });
    }
    
    const result = await mergePDFsUsingMerger(tempPaths, outputPath);
    fs.writeFileSync('/tmp/debug/pdf_merge_success.log', 'Método: pdf-merger-js');
    
    // Verificar el tamaño del archivo resultante
    const stats = fs.statSync(outputPath);
    console.log(`Tamaño del archivo generado: ${stats.size} bytes`);
    
    // Limpiar archivos temporales
    for (const tempPath of tempPaths) {
      try {
        fs.unlinkSync(tempPath);
      } catch (err) {
        console.warn(`No se pudo eliminar archivo temporal: ${tempPath}`, err);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Error en mergePDFs:', error);
    fs.writeFileSync('/tmp/debug/merge_error.log', error.toString());
    
    // En caso de error, intentar con la implementación original como último recurso
    console.log('Error detectado, intentando método de emergencia...');
    try {
      // Implementación de emergencia usando concatenación básica
      console.log('=== IMPLEMENTANDO SOLUCIÓN DE EMERGENCIA ===');
      
      // Método directo con cp y cat para crear un PDF sin procesar
      // Esto puede no preservar todas las características pero al menos entregará algo
      const tempFiles = [];
      const tempDir = path.join('/tmp', 'pdf-emergency');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Intentar con método de último recurso
      const result = await mergePDFsUsingMerger(pdfPaths, outputPath);
      fs.writeFileSync('/tmp/debug/pdf_merge_success.log', 'Método: pdf-merger-js (fallback de emergencia)');
      return result;
    } catch (finalError) {
      fs.writeFileSync('/tmp/debug/final_error.log', finalError.toString());
      throw new Error(`No se pudo unificar los PDFs después de intentar todos los métodos disponibles: ${finalError.message}`);
    }
  }
}
