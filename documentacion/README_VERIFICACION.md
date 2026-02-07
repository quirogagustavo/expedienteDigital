# 🔐 CERTIFICADO Y FIRMA DIGITAL - INFORMACIÓN COMPLETA

## 📄 Documento Original
**Archivo:** documento-ejemplo.txt
**Ubicación:** /home/gustavo/Documentos/firma_digital/documento-ejemplo.txt

## 🔑 Clave Pública RSA
**Archivo:** mi_clave_publica.pem
**Formato:** PEM (Privacy Enhanced Mail)
**Algoritmo:** RSA-2048 bits
**Uso:** Verificación de firmas digitales

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwQjsXso3OTDUgw6v6OMH
slXQflJYrPDlDBHI6YJzvaoMYxsYu0ubwm99NtknOe5rZTNft+UeSopGfrU2v4V7
SKOwgl7HMZOcxMWL+EqVMDzjunLxdGBKuFIvlghc5aw1Dau326bmL7bPlS0gHqqd
Mn7IUnJqUAxiDqRm31Jr5BCEUJVZLogcleCHVijPPeGqMu2/W9VIOwmBYJCziwoP
6UsDQCuGa/IgO/qyKVdKM5ERbQDp0CMtt02+ULshgD7tBZW5g0h9bvQujG0Izai0
acscGjm6m9ggNbZc8qc4RjskA4WReo4lUoAR7aM7iazt3m8h5jfTCii9b1T16HXg
4wIDAQAB
-----END PUBLIC KEY-----
```

## ✍️ Firma Digital
**Archivo:** mi_firma_digital.bin
**Formato:** Binario (convertido desde Base64)
**Algoritmo:** RSA-SHA256
**Estado:** ✅ VÁLIDA

**Firma Original (Base64):**
```
rc9coXb6xzymNRZRvVqK2hEvwtQWFp4x95UEwmAy1zDgBuPtJW09uC7gNBUL/ayuMW2zDYviaaHag0Ah8ycYJKufmntC9bVdEviaAb5eCgGNLieDgyc52t6k8t99XjXBlUyEzckXfEK3NOPbr5+j2swmbNTjcJJuoDb3cxWJsATXAtJ/uK5RafvRhiAnf7E1uTD9X1babmEELnokyyxYjzM2NcYiLfy9L6gV2V0jRdEBRWvbGyLFBuuJAC5/ljwSCMtmXhguKzHvXfztyxsNxFelRcoaoqm8u94xraDa7s9SVBADR7yJob1LVsLNTYaZDVz+u8mTR9VPuvo/UHcuvA==
```

## 🛠️ Herramientas de Verificación

### 1. Script Automático
```bash
./verificar_firma.sh
```

### 2. OpenSSL Manual
```bash
# Ver información del certificado
openssl rsa -pubin -in mi_clave_publica.pem -text -noout

# Verificar firma
openssl dgst -sha256 -verify mi_clave_publica.pem -signature mi_firma_digital.bin documento-ejemplo.txt
```

### 3. Kleopatra (Interfaz Gráfica)
```bash
kleopatra
```
1. Importar certificado: mi_clave_publica.pem
2. Usar función "Verify" con el documento y firma

### 4. GPA (GNU Privacy Assistant)
```bash
gpa
```
1. Importar clave pública
2. Verificar documento firmado

## 📊 Resultados de Verificación
- **Estado:** ✅ VÁLIDA
- **Integridad:** ✅ Documento íntegro (no modificado)
- **Autenticidad:** ✅ Firma pertenece al certificado
- **Algoritmo:** RSA-2048 + SHA-256 (Muy seguro)

## 🎯 Casos de Uso
1. **Verificar autenticidad** de documentos legales
2. **Confirmar integridad** de archivos importantes
3. **Autenticar autoría** de documentos firmados
4. **Cumplir normativas** de firma digital

---
*Generado por el Sistema de Firma Digital - $(date)*