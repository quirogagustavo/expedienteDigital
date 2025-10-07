import { createCanvas } from 'canvas';
import sharp from 'sharp';

class FirmaDigitalService {
  
  /**
   * Genera una firma digital automática basada en texto
   * @param {string} texto - El texto a convertir en firma
   * @param {string} estilo - Estilo de la firma ('elegante', 'simple', 'cursiva')
   * @returns {Promise<Buffer>} - Buffer de imagen PNG
   */
  static async generarFirmaAutomatica(texto, estilo = 'elegante') {
    try {
      // Configuraciones por estilo
      const estilos = {
        elegante: {
          fontFamily: 'Georgia, serif',
          fontSize: 48,
          color: '#1a365d',
          italic: true,
          weight: 'normal'
        },
        simple: {
          fontFamily: 'Arial, sans-serif',
          fontSize: 42,
          color: '#2d3748',
          italic: false,
          weight: 'bold'
        },
        cursiva: {
          fontFamily: 'Times New Roman, serif',
          fontSize: 52,
          color: '#2b6cb0',
          italic: true,
          weight: 'normal'
        }
      };

      const config = estilos[estilo] || estilos.elegante;

      // Crear canvas con dimensiones dinámicas basadas en el texto
      const canvas = createCanvas(600, 150);
      const ctx = canvas.getContext('2d');

      // Configurar fondo transparente
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Configurar fuente
      const fontStyle = `${config.italic ? 'italic ' : ''}${config.weight} ${config.fontSize}px ${config.fontFamily}`;
      ctx.font = fontStyle;
      ctx.fillStyle = config.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Medir texto para centrar perfectamente
      const metrics = ctx.measureText(texto);
      const textWidth = metrics.width;
      const textHeight = config.fontSize;

      // Ajustar canvas al tamaño del texto + padding
      const padding = 40;
      const finalWidth = Math.ceil(textWidth) + padding;
      const finalHeight = Math.ceil(textHeight) + padding;

      // Crear canvas final con dimensiones optimizadas
      const finalCanvas = createCanvas(finalWidth, finalHeight);
      const finalCtx = finalCanvas.getContext('2d');

      // Configurar canvas final
      finalCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
      finalCtx.font = fontStyle;
      finalCtx.fillStyle = config.color;
      finalCtx.textAlign = 'center';
      finalCtx.textBaseline = 'middle';

      // Dibujar texto centrado
      finalCtx.fillText(texto, finalWidth / 2, finalHeight / 2);

      // Agregar efecto de subrayado para firmas elegantes
      if (estilo === 'elegante' || estilo === 'cursiva') {
        finalCtx.strokeStyle = config.color;
        finalCtx.lineWidth = 2;
        finalCtx.beginPath();
        const underlineY = (finalHeight / 2) + (textHeight / 3);
        const underlineStart = (finalWidth - textWidth) / 2;
        const underlineEnd = underlineStart + textWidth;
        finalCtx.moveTo(underlineStart, underlineY);
        finalCtx.lineTo(underlineEnd, underlineY);
        finalCtx.stroke();
      }

      // Convertir canvas a buffer PNG
      const buffer = finalCanvas.toBuffer('image/png');

      // Optimizar imagen con Sharp
      const imagenOptimizada = await sharp(buffer)
        .png({ 
          compressionLevel: 9,
          quality: 95,
          palette: true 
        })
        .toBuffer();

      return {
        buffer: imagenOptimizada,
        tipo: 'png',
        dimensiones: {
          ancho: finalWidth,
          alto: finalHeight
        },
        tamaño: imagenOptimizada.length,
        metadatos: {
          texto_original: texto,
          estilo_aplicado: estilo,
          fuente: config.fontFamily,
          generada_automaticamente: true,
          fecha_generacion: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error generando firma digital automática:', error);
      throw new Error(`Error generando firma digital: ${error.message}`);
    }
  }

  /**
   * Valida parámetros para generación de firma
   * @param {string} texto 
   * @param {string} estilo 
   */
  static validarParametrosFirma(texto, estilo) {
    const errores = [];

    if (!texto || texto.trim().length === 0) {
      errores.push('El texto es requerido');
    }

    if (texto && texto.trim().length > 50) {
      errores.push('El texto no puede exceder 50 caracteres');
    }

    if (texto && !/^[a-záéíóúñü\s]+$/i.test(texto.trim())) {
      errores.push('El texto solo puede contener letras y espacios');
    }

    const estilosPermitidos = ['elegante', 'simple', 'cursiva'];
    if (estilo && !estilosPermitidos.includes(estilo)) {
      errores.push(`Estilo debe ser uno de: ${estilosPermitidos.join(', ')}`);
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  /**
   * Genera múltiples variaciones de firma para que el usuario elija
   * @param {string} texto 
   */
  static async generarVariacionesFirma(texto) {
    const estilos = ['elegante', 'simple', 'cursiva'];
    const variaciones = [];

    for (const estilo of estilos) {
      try {
        const firma = await this.generarFirmaAutomatica(texto, estilo);
        variaciones.push({
          estilo,
          ...firma
        });
      } catch (error) {
        console.error(`Error generando variación ${estilo}:`, error);
      }
    }

    return variaciones;
  }

  /**
   * Crea una firma simple basada en iniciales
   * @param {string} nombreCompleto 
   */
  static async generarFirmaIniciales(nombreCompleto) {
    const iniciales = nombreCompleto
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase())
      .join('');

    return await this.generarFirmaAutomatica(iniciales, 'elegante');
  }
}

export default FirmaDigitalService;