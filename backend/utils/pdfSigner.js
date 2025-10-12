import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

/**
 * Añade una firma visible a un PDF
 */
export const addVisibleSignatureToPDF = async (originalPdfPath, signatureData) => {
  try {
    console.log('=== AÑADIENDO FIRMA VISIBLE AL PDF ===');
    console.log('Archivo original:', originalPdfPath);
    
    // Leer el PDF original
    const existingPdfBytes = fs.readFileSync(originalPdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Obtener todas las páginas y seleccionar la ÚLTIMA página
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1]; // Última página en lugar de la primera
    const { width, height } = lastPage.getSize();
    
    console.log(`PDF tiene ${pages.length} páginas, añadiendo firma a la página ${pages.length}`);
    
    // Obtener fuente
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Configuración de la firma visual
    const signatureBoxWidth = 300;
    const signatureBoxHeight = 100;
    const margin = 20;
    
    // Posición de la firma (esquina inferior derecha)
    const signatureX = width - signatureBoxWidth - margin;
    const signatureY = margin;
    
    // Dibujar borde de la firma en la última página
    lastPage.drawRectangle({
      x: signatureX,
      y: signatureY,
      width: signatureBoxWidth,
      height: signatureBoxHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(0.95, 0.95, 1) // Fondo azul muy claro
    });
    
    // Título de la firma
    lastPage.drawText('DOCUMENTO FIRMADO DIGITALMENTE', {
      x: signatureX + 10,
      y: signatureY + signatureBoxHeight - 20,
      size: 10,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    
    // Insertar imagen de firma visual si está disponible
    let firmaImagenAltura = 0;
    if (signatureData.firmaVisual && signatureData.firmaVisual.imagen) {
      try {
        console.log('=== PROCESANDO FIRMA VISUAL ===');
        console.log('Tipo de firma visual:', signatureData.firmaVisual.tipo);
        console.log('Tipo de datos de imagen:', typeof signatureData.firmaVisual.imagen, Array.isArray(signatureData.firmaVisual.imagen) ? 'Array' : '');
        if (Buffer.isBuffer(signatureData.firmaVisual.imagen)) {
          console.log('firmaVisual.imagen es un Buffer, tamaño:', signatureData.firmaVisual.imagen.length);
        } else if (typeof signatureData.firmaVisual.imagen === 'string') {
          console.log('firmaVisual.imagen es un string, tamaño:', signatureData.firmaVisual.imagen.length, 'Muestra:', signatureData.firmaVisual.imagen.substring(0, 30));
        } else {
          console.log('firmaVisual.imagen es de tipo desconocido:', typeof signatureData.firmaVisual.imagen);
        }

        // Determinar el tipo de imagen y embedirla
        let firmaImagen;
        let imageBuffer;
        if (Buffer.isBuffer(signatureData.firmaVisual.imagen)) {
          imageBuffer = signatureData.firmaVisual.imagen;
        } else if (typeof signatureData.firmaVisual.imagen === 'string') {
          let rawData = signatureData.firmaVisual.imagen;
          if (rawData.startsWith('data:image/')) {
            console.log('Detectado formato data URI, extrayendo base64...');
            rawData = rawData.split(',')[1] || rawData;
          }
          try {
            imageBuffer = Buffer.from(rawData, 'base64');
          } catch (convErr) {
            console.warn('Fallo conversión a Buffer desde base64:', convErr.message);
            imageBuffer = Buffer.from(rawData);
          }
        } else {
          console.warn('Tipo de firmaVisual.imagen no soportado para embebido:', typeof signatureData.firmaVisual.imagen);
          imageBuffer = null;
        }

        console.log('Buffer de imagen creado, tamaño:', imageBuffer?.length);
        if (!imageBuffer || !imageBuffer.length) {
          console.warn('Buffer de imagen vacío, abortando inserción de firma manuscrita');
        }

        if (signatureData.firmaVisual.tipo === 'png') {
          console.log('Embediendo imagen PNG...');
          firmaImagen = await pdfDoc.embedPng(imageBuffer);
        } else if (signatureData.firmaVisual.tipo === 'jpg' || signatureData.firmaVisual.tipo === 'jpeg') {
          console.log('Embediendo imagen JPG...');
          firmaImagen = await pdfDoc.embedJpg(imageBuffer);
        } else {
          console.log('ADVERTENCIA: Tipo de imagen no soportado:', signatureData.firmaVisual.tipo);
        }
        
        if (firmaImagen) {
          // Calcular dimensiones manteniendo proporción
          // Aumentamos área visible de la firma manuscrita
          const firmaMaxWidth = 140;
          const firmaMaxHeight = 55;
          const { width: imgWidth, height: imgHeight } = firmaImagen.scale(1);
          
          let firmaWidth = firmaMaxWidth;
          let firmaHeight = (imgHeight / imgWidth) * firmaMaxWidth;
          
          if (firmaHeight > firmaMaxHeight) {
            firmaHeight = firmaMaxHeight;
            firmaWidth = (imgWidth / imgHeight) * firmaMaxHeight;
          }
          
          firmaImagenAltura = firmaHeight;
          
          // Dibujar la imagen de firma
          // Nueva posición: parte central-superior del recuadro para más espacio
          const firmaPosX = signatureX + signatureBoxWidth - firmaWidth - 15;
          const firmaPosY = signatureY + signatureBoxHeight - firmaHeight - 15;
          console.log('Posición firma visual (x,y,w,h):', firmaPosX, firmaPosY, firmaWidth, firmaHeight);
          lastPage.drawImage(firmaImagen, {
            x: firmaPosX,
            y: firmaPosY,
            width: firmaWidth,
            height: firmaHeight
          });
          
          console.log('✅ Firma visual insertada correctamente en PDF');
        } else {
          console.log('ADVERTENCIA: No se pudo procesar la imagen de firma visual');
        }
      } catch (imageError) {
        console.error('❌ Error insertando firma visual:', imageError);
      }
    } else {
      console.log('⚠️  No hay firma visual disponible - documento se firmará solo con información textual');
      console.log('signatureData.firmaVisual:', signatureData.firmaVisual ? 'presente' : 'ausente');
      if (signatureData.firmaVisual) {
        console.log('signatureData.firmaVisual.imagen:', signatureData.firmaVisual.imagen ? 'presente' : 'ausente');
      }
    }
    
    // Información del firmante (ajustar posición si hay imagen)
    lastPage.drawText(`Firmado por: ${signatureData.firmante}`, {
      x: signatureX + 10,
      y: signatureY + signatureBoxHeight - 40 - (firmaImagenAltura > 0 ? 10 : 0),
      size: 9,
      font: font,
      color: rgb(0, 0, 0)
    });
    
    // Fecha de firma
    const fechaFirma = new Date(signatureData.fechaFirma).toLocaleString('es-ES');
    lastPage.drawText(`Fecha: ${fechaFirma}`, {
      x: signatureX + 10,
      y: signatureY + signatureBoxHeight - 55 - (firmaImagenAltura > 0 ? 10 : 0),
      size: 9,
      font: font,
      color: rgb(0, 0, 0)
    });
    
    // Hash de la firma (primeros 16 caracteres)
    const shortHash = signatureData.hashFirma ? signatureData.hashFirma.substring(0, 16) + '...' : 'N/A';
    lastPage.drawText(`Hash: ${shortHash}`, {
      x: signatureX + 10,
      y: signatureY + signatureBoxHeight - 70 - (firmaImagenAltura > 0 ? 10 : 0),
      size: 8,
      font: font,
      color: rgb(0.3, 0.3, 0.3)
    });
    
    // Código de verificación
    lastPage.drawText('Verificable en sistema digital', {
      x: signatureX + 10,
      y: signatureY + signatureBoxHeight - 85 - (firmaImagenAltura > 0 ? 10 : 0),
      size: 7,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });
    
  // Generar el PDF firmado (compatibilidad node-signpdf)
  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
    
  console.log('Firma visible añadida correctamente (compatibilidad node-signpdf)');
  return pdfBytes;
    
  } catch (error) {
    console.error('Error añadiendo firma visible al PDF:', error);
    throw error;
  }
};

/**
 * Genera archivo firmado para documentos PDF
 */
export const generateSignedPDF = async (originalPath, outputPath, signatureData) => {
  try {
    console.log('=== GENERANDO PDF FIRMADO ===');
    console.log('Archivo original:', originalPath);
    console.log('Archivo de salida:', outputPath);
    
    // Verificar que el archivo original es PDF
    const fileExtension = path.extname(originalPath).toLowerCase();
    if (fileExtension !== '.pdf') {
      console.log('El archivo no es PDF, no se puede añadir firma visible');
      return null;
    }
    
    // Verificar que el archivo original existe
    if (!fs.existsSync(originalPath)) {
      throw new Error('Archivo original no encontrado');
    }
    
    // Crear directorio de salida si no existe
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generar PDF con firma visible
    const signedPdfBytes = await addVisibleSignatureToPDF(originalPath, signatureData);
    
    // Guardar el PDF firmado
    fs.writeFileSync(outputPath, signedPdfBytes);
    
    console.log('PDF firmado generado exitosamente:', outputPath);
    return outputPath;
    
  } catch (error) {
    console.error('Error generando PDF firmado:', error);
    throw error;
  }
};