// Rutas básicas para certificados - versión simplificada
import express from 'express';
import { Op } from 'sequelize';
import Certificado from '../models/Certificado.js';
import { authenticateToken } from '../middleware/auth.js';
import { signBuffer } from '../signature.js';

const router = express.Router();

// GET /api/certificates - Obtener certificados del usuario
router.get('/certificates', authenticateToken, async (req, res) => {
  try {
    const certificados = await Certificado.findAll({
      where: { 
        usuario_id: req.user.id,
        activo: true 
      },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      certificates: certificados
    });
  } catch (error) {
    console.error('Error al obtener certificados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Resto de rutas comentadas temporalmente para funcionalidad básica
export default router;

// POST /api/request-certificate - Solicitar certificado híbrido
router.post('/request-certificate', authenticateToken, async (req, res) => {
  try {
    const {
      certificateTypeId,
      certificateAuthorityId,
      identityData,
      businessData
    } = req.body;

    const userId = req.user.id;

    // Validar que el tipo y autoridad existan
    const certificateType = await CertificateType.findByPk(certificateTypeId);
    const certificateAuthority = await CertificateAuthority.findByPk(certificateAuthorityId);

    if (!certificateType || !certificateAuthority) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de certificado o autoridad certificadora inválida'
      });
    }

    // Preparar datos del usuario
    const userData = {
      nombre: req.user.nombre,
      email: req.user.email,
      dni: identityData?.dni,
      cuit: businessData?.cuit,
      razonSocial: businessData?.businessName,
      ...identityData,
      ...businessData
    };

    // Determinar el proveedor CA según el tipo de autoridad
    let caType;
    switch (certificateAuthority.name) {
      case 'Internal CA':
        caType = 'internal';
        break;
      case 'AFIP Argentina':
        caType = 'afip_ar';
        break;
      case 'ONTI Argentina':
        caType = 'onti_ar';
        break;
      default:
        caType = 'internal';
    }

    // Solicitar certificado al servicio
    const certificateResult = await CertificateAuthorityService.requestCertificate(
      caType,
      userData,
      certificateType.name
    );

    // Crear registro en base de datos
    const newCertificate = await Certificado.create({
      usuario_id: userId,
      certificate_type_id: certificateTypeId,
      certificate_authority_id: certificateAuthorityId,
      nombre_certificado: `${certificateType.name}_${Date.now()}`,
      certificado_pem: certificateResult.certificatePem || 'PENDING',
      clave_privada_pem: certificateResult.privateKeyPem || null,
      fecha_emision: certificateResult.validFrom || new Date(),
      fecha_expiracion: certificateResult.validTo || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: certificateResult.status,
      external_certificate_id: certificateResult.externalCertificateId,
      serial_number: certificateResult.serialNumber,
      issuer_dn: certificateResult.issuerDN,
      subject_dn: certificateResult.subjectDN,
      validation_data: {
        identityData,
        businessData,
        requestedAt: new Date()
      },
      activo: certificateResult.status === 'active'
    });

    // Respuesta según el tipo de certificado
    if (certificateResult.status === 'pending') {
      res.json({
        success: true,
        status: 'pending',
        message: 'Solicitud de certificado enviada. Se requiere validación adicional.',
        certificate: {
          id: newCertificate.id,
          status: certificateResult.status,
          estimatedTime: certificateResult.estimatedTime,
          validationUrl: certificateResult.validationUrl,
          requiredDocuments: certificateResult.requiredDocuments
        }
      });
    } else {
      res.json({
        success: true,
        status: 'active',
        message: 'Certificado generado exitosamente',
        certificate: {
          id: newCertificate.id,
          name: newCertificate.nombre_certificado,
          serialNumber: newCertificate.serial_number,
          validFrom: newCertificate.fecha_emision,
          validTo: newCertificate.fecha_expiracion,
          issuer: newCertificate.issuer_dn,
          subject: newCertificate.subject_dn
        }
      });
    }

  } catch (error) {
    console.error('Error al solicitar certificado:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
});

// GET /api/certificates - Obtener certificados del usuario con información completa
router.get('/certificates', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const certificates = await Certificado.findAll({
      where: { usuario_id: userId },
      include: [
        {
          model: CertificateType,
          as: 'certificate_type',
          attributes: ['name', 'description', 'validity_level']
        },
        {
          model: CertificateAuthority,
          as: 'certificate_authority',
          attributes: ['name', 'type', 'country']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const formattedCertificates = certificates.map(cert => ({
      id: cert.id,
      name: cert.nombre_certificado,
      status: cert.status,
      isActive: cert.activo,
      validFrom: cert.fecha_emision,
      validTo: cert.fecha_expiracion,
      serialNumber: cert.serial_number,
      issuer: cert.issuer_dn,
      subject: cert.subject_dn,
      externalId: cert.external_certificate_id,
      certificateType: {
        name: cert.certificate_type?.name,
        description: cert.certificate_type?.description,
        validityLevel: cert.certificate_type?.validity_level
      },
      certificateAuthority: {
        name: cert.certificate_authority?.name,
        type: cert.certificate_authority?.type,
        country: cert.certificate_authority?.country
      },
      createdAt: cert.created_at,
      updatedAt: cert.updated_at
    }));

    res.json({
      success: true,
      certificates: formattedCertificates
    });

  } catch (error) {
    console.error('Error al obtener certificados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/certificate/:id/status - Verificar estado de un certificado
router.get('/certificate/:id/status', authenticateToken, async (req, res) => {
  try {
    const certificateId = req.params.id;
    const userId = req.user.id;

    const certificate = await Certificado.findOne({
      where: {
        id: certificateId,
        usuario_id: userId
      },
      include: [{
        model: CertificateAuthority,
        as: 'certificate_authority'
      }]
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificado no encontrado'
      });
    }

    // Si tiene ID externo, consultar estado a la CA
    if (certificate.external_certificate_id) {
      let caType;
      switch (certificate.certificate_authority.name) {
        case 'AFIP Argentina':
          caType = 'afip_ar';
          break;
        case 'ONTI Argentina':
          caType = 'onti_ar';
          break;
        default:
          caType = 'internal';
      }

      const provider = CertificateAuthorityService.caProviders.get(caType);
      if (provider) {
        const externalStatus = await provider.getCertificateStatus(certificate.external_certificate_id);
        
        // Actualizar estado si es necesario
        if (externalStatus.status !== certificate.status) {
          await certificate.update({
            status: externalStatus.status,
            activo: externalStatus.status === 'active'
          });
        }
      }
    }

    res.json({
      success: true,
      certificate: {
        id: certificate.id,
        status: certificate.status,
        isActive: certificate.activo,
        validUntil: certificate.fecha_expiracion,
        lastChecked: new Date()
      }
    });

  } catch (error) {
    console.error('Error al verificar estado del certificado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/request-government-certificate - Solicitar certificado gubernamental
router.post('/request-government-certificate', authenticateToken, async (req, res) => {
  try {
    const { user } = req;
    
    // Verificar si ya tiene un certificado activo
    const existingCertificate = await Certificado.findOne({
      where: {
        usuario_id: user.id,
        status: 'active'
      }
    });

    if (existingCertificate) {
      return res.status(400).json({
        success: false,
        message: 'Ya posee un certificado digital activo',
        certificate: {
          name: existingCertificate.nombre_certificado,
          issued: existingCertificate.fecha_emision,
          expires: existingCertificate.fecha_expiracion
        }
      });
    }

    // Para ente gubernamental: certificado oficial
    const certificateData = {
      userId: user.id,
      fullName: user.nombre_completo,
      email: user.email,
      certificateType: 'official_government', // Oficial gubernamental
      identityVerification: {
        required: true,
        documents: ['DNI', 'CUIL', 'Constancia de trabajo']
      }
    };

    // Crear certificado en estado pending
    const buffer = Buffer.from(`GOV_${user.username}_${Date.now()}`, 'utf8');
    const { signature, publicKeyPem, privateKeyPem } = signBuffer(buffer);

    const certificate = await Certificado.create({
      usuario_id: user.id,
      nombre_certificado: `Certificado Gubernamental - ${user.nombre_completo}`,
      certificado_pem: publicKeyPem,
      clave_privada_pem: privateKeyPem,
      fecha_emision: new Date(),
      fecha_expiracion: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000), // 3 años
      activo: false, // Se activará después de verificación
      certificate_type_id: 2, // official_government
      certificate_authority_id: 2, // AFIP Argentina
      status: 'pending', // Pendiente de verificación
      external_certificate_id: `AFIP-GOV-${Date.now()}`,
      validation_data: JSON.stringify({
        requestDate: new Date(),
        verificationType: 'government_employee',
        documentsPending: true,
        estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })
    });

    res.json({
      success: true,
      message: 'Solicitud de certificado gubernamental iniciada',
      certificate: {
        id: certificate.id,
        status: 'pending',
        type: 'Oficial Gubernamental',
        authority: 'AFIP Argentina',
        cost: 0, // Gratuito para empleados gubernamentales
        estimatedCompletion: '5-7 días hábiles',
        nextSteps: [
          'Verificación de documentos de identidad',
          'Confirmación de relación laboral gubernamental', 
          'Emisión del certificado digital oficial'
        ],
        trackingId: certificate.external_certificate_id
      }
    });

  } catch (error) {
    console.error('Error al solicitar certificado gubernamental:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;