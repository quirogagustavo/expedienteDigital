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
    
    // Información del firmante
    lastPage.drawText(`Firmado por: ${signatureData.firmante}`, {
      x: signatureX + 10,
      y: signatureY + signatureBoxHeight - 40,
      size: 9,
      font: font,
      color: rgb(0, 0, 0)
    });
    
    // Fecha de firma
    const fechaFirma = new Date(signatureData.fechaFirma).toLocaleString('es-ES');
    lastPage.drawText(`Fecha: ${fechaFirma}`, {
      x: signatureX + 10,
      y: signatureY + signatureBoxHeight - 55,
      size: 9,
      font: font,
      color: rgb(0, 0, 0)
    });
    
    // Hash de la firma (primeros 16 caracteres)
    const shortHash = signatureData.hashFirma ? signatureData.hashFirma.substring(0, 16) + '...' : 'N/A';
    lastPage.drawText(`Hash: ${shortHash}`, {
      x: signatureX + 10,
      y: signatureY + signatureBoxHeight - 70,
      size: 8,
      font: font,
      color: rgb(0.3, 0.3, 0.3)
    });
    
    // Código de verificación
    lastPage.drawText('Verificable en sistema digital', {
      x: signatureX + 10,
      y: signatureY + signatureBoxHeight - 85,
      size: 7,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });
    
    // Generar el PDF firmado
    const pdfBytes = await pdfDoc.save();
    
    console.log('Firma visible añadida correctamente');
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