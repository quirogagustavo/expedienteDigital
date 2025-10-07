import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import sharp from 'sharp';

class FirmaService {
  
  /**
   * Validar archivo de imagen para firma
   * @param {Object} archivo - Archivo multer
   * @returns {Object} - Resultado de validación
   */
  static validarImagenFirma(archivo) {
    const errores = [];
    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    const tamañoMaximo = 5 * 1024 * 1024; // 5MB
    
    // Validar tipo de archivo
    if (!tiposPermitidos.includes(archivo.mimetype)) {
      errores.push('Tipo de archivo no permitido. Solo se aceptan PNG, JPG y SVG.');
    }
    
    // Validar tamaño
    if (archivo.size > tamañoMaximo) {
      errores.push('El archivo es demasiado grande. Máximo 5MB.');
    }
    
    // Validar que tenga contenido
    if (archivo.size === 0) {
      errores.push('El archivo está vacío.');
    }
    
    return {
      valido: errores.length === 0,
      errores: errores
    };
  }

  /**
   * Procesar imagen de firma (redimensionar y optimizar)
   * @param {Buffer} buffer - Buffer de la imagen
   * @param {string} tipo - Tipo de imagen
   * @returns {Object} - Imagen procesada
   */
  static async procesarImagen(buffer, tipo) {
    try {
      let imagenProcesada;
      const maxAncho = 800;
      const maxAlto = 200;
      
      if (tipo === 'image/svg+xml') {
        // Para SVG, no procesamos, solo validamos tamaño
        return {
          buffer: buffer,
          ancho: null, // SVG es vectorial
          alto: null,
          tamaño: buffer.length,
          tipo: 'svg'
        };
      }
      
      // Procesar con Sharp para PNG/JPG
      const imagen = sharp(buffer);
      const metadata = await imagen.metadata();
      
      // Redimensionar si es necesario, manteniendo aspecto
      if (metadata.width > maxAncho || metadata.height > maxAlto) {
        imagenProcesada = await imagen
          .resize(maxAncho, maxAlto, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .png({ quality: 90 })
          .toBuffer();
      } else {
        // Convertir a PNG para consistencia
        imagenProcesada = await imagen
          .png({ quality: 90 })
          .toBuffer();
      }
      
      // Obtener nuevas dimensiones
      const imagenFinal = sharp(imagenProcesada);
      const metadataFinal = await imagenFinal.metadata();
      
      return {
        buffer: imagenProcesada,
        ancho: metadataFinal.width,
        alto: metadataFinal.height,
        tamaño: imagenProcesada.length,
        tipo: 'png'
      };
      
    } catch (error) {
      throw new Error(`Error procesando imagen: ${error.message}`);
    }
  }

  /**
   * Aplicar firma a un documento PDF
   * @param {Buffer} pdfBuffer - Buffer del PDF original
   * @param {Buffer} firmaBuffer - Buffer de la imagen de firma
   * @param {Object} opciones - Opciones de aplicación
   * @returns {Buffer} - PDF con firma aplicada
   */
  static async aplicarFirmaAPDF(pdfBuffer, firmaBuffer, opciones = {}) {
    try {
      const {
        posicion = { x: 100, y: 100 },
        tamaño = 'mediano',
        pagina = 1,
        tipo = 'png'
      } = opciones;

      // Cargar el PDF
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      
      // Validar número de página
      if (pagina > pages.length || pagina < 1) {
        throw new Error(`Página ${pagina} no existe. El documento tiene ${pages.length} páginas.`);
      }
      
      const page = pages[pagina - 1];
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      // Embebear la imagen según el tipo
      let firmaImagen;
      if (tipo === 'png') {
        firmaImagen = await pdfDoc.embedPng(firmaBuffer);
      } else if (tipo === 'jpg' || tipo === 'jpeg') {
        firmaImagen = await pdfDoc.embedJpg(firmaBuffer);
      } else {
        throw new Error('Tipo de imagen no soportado para PDF. Use PNG o JPG.');
      }
      
      // Calcular dimensiones de la firma
      const firmaAncho = firmaImagen.width;
      const firmaAlto = firmaImagen.height;
      
      // Calcular tamaño según opción
      let scaleFactor;
      switch (tamaño) {
        case 'pequeño':
          scaleFactor = 0.3;
          break;
        case 'mediano':
          scaleFactor = 0.5;
          break;
        case 'grande':
          scaleFactor = 0.7;
          break;
        default:
          scaleFactor = 0.5;
      }
      
      const firmaAnchoFinal = firmaAncho * scaleFactor;
      const firmaAltoFinal = firmaAlto * scaleFactor;
      
      // Calcular posición final (convertir porcentajes a coordenadas)
      const xFinal = (posicion.x / 100) * (pageWidth - firmaAnchoFinal);
      const yFinal = (posicion.y / 100) * (pageHeight - firmaAltoFinal);
      
      // Aplicar la firma
      page.drawImage(firmaImagen, {
        x: xFinal,
        y: yFinal,
        width: firmaAnchoFinal,
        height: firmaAltoFinal,
        opacity: 1.0
      });
      
      // Agregar información de firma como metadatos
      pdfDoc.setTitle(`Documento firmado - ${new Date().toISOString()}`);
      pdfDoc.setProducer('Sistema de Expedientes Digitales');
      pdfDoc.setCreationDate(new Date());
      
      // Serializar el PDF
      const pdfBytes = await pdfDoc.save();
      
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      throw new Error(`Error aplicando firma al PDF: ${error.message}`);
    }
  }

  /**
   * Generar vista previa de cómo quedaría la firma en el documento
   * @param {Object} opciones - Opciones de preview
   * @returns {Object} - Información de preview
   */
  static generarPreviewFirma(opciones = {}) {
    const {
      posicion = { x: 50, y: 50 },
      tamaño = 'mediano',
      firmaAncho = 200,
      firmaAlto = 50,
      pageWidth = 595, // A4 width
      pageHeight = 842 // A4 height
    } = opciones;

    // Calcular tamaño final
    let scaleFactor;
    switch (tamaño) {
      case 'pequeño':
        scaleFactor = 0.3;
        break;
      case 'mediano':
        scaleFactor = 0.5;
        break;
      case 'grande':
        scaleFactor = 0.7;
        break;
      default:
        scaleFactor = 0.5;
    }

    const firmaAnchoFinal = firmaAncho * scaleFactor;
    const firmaAltoFinal = firmaAlto * scaleFactor;

    // Calcular posición final
    const xFinal = (posicion.x / 100) * (pageWidth - firmaAnchoFinal);
    const yFinal = (posicion.y / 100) * (pageHeight - firmaAltoFinal);

    return {
      posicion: {
        x: xFinal,
        y: yFinal
      },
      dimensiones: {
        ancho: firmaAnchoFinal,
        alto: firmaAltoFinal
      },
      coordenadas: {
        porcentaje: posicion,
        pixeles: { x: xFinal, y: yFinal }
      }
    };
  }

  /**
   * Validar posición de firma en página
   * @param {Object} posicion - Posición propuesta
   * @param {Object} dimensiones - Dimensiones de la página
   * @returns {boolean} - Si la posición es válida
   */
  static validarPosicionFirma(posicion, dimensiones) {
    const { x, y } = posicion;
    const { width, height } = dimensiones;

    return (
      x >= 0 && x <= 100 &&
      y >= 0 && y <= 100 &&
      typeof x === 'number' &&
      typeof y === 'number'
    );
  }

  /**
   * Optimizar imagen de firma para uso en PDF
   * @param {Buffer} buffer - Buffer de imagen
   * @returns {Buffer} - Imagen optimizada
   */
  static async optimizarParaPDF(buffer) {
    try {
      // Optimizar para uso en PDF - fondo transparente, alta calidad
      const imagenOptimizada = await sharp(buffer)
        .png({
          quality: 95,
          compressionLevel: 6,
          palette: false
        })
        .toBuffer();

      return imagenOptimizada;
    } catch (error) {
      throw new Error(`Error optimizando imagen: ${error.message}`);
    }
  }
}

export default FirmaService;