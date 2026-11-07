import fs from "fs";
import path from "path";
import crypto from "crypto";
import forge from "node-forge";
import { env } from "../config/env.js";
import { SunatDocumentData } from "./types.js";

export interface CertificateOptions {
  certPath?: string;
  certPassword?: string;
  certBase64?: string;
}

export interface LoadedCertificate {
  privateKeyPem: string;
  certBase64: string;
  isTestCert: boolean;
  subject?: string;
}

export interface XmlSignatureResult {
  signedXml: string;
  digestValue: string;
  signatureValue: string;
  certBase64: string;
  isTestCert: boolean;
}

let cachedDefaultCert: LoadedCertificate | null = null;

/**
 * Normaliza el tipo de documento del cliente al catálogo 06 de SUNAT
 * 1: DNI, 6: RUC, 4: Carnet de Extranjería, 7: Pasaporte, 0: Sin documento
 */
export function normalizeCustomerDocType(tipo: string): string {
  const t = (tipo || "").toLowerCase().trim();
  if (t === "ruc" || t === "6") return "6";
  if (t === "dni" || t === "1") return "1";
  if (t === "ce" || t === "4") return "4";
  if (t === "pasaporte" || t === "7") return "7";
  return "0";
}

/**
 * Genera la cadena canónica oficial para el código QR impreso en el comprobante fiscal
 * Formato SUNAT: RUC|TIPO_DOC|SERIE|NUMERO|MTO_IGV|TOTAL|FECHA|TIPO_DOC_CLIENTE|NUM_DOC_CLIENTE|HASH|
 */
export function generateSunatQrString(data: SunatDocumentData, hash: string): string {
  const tipoDocCliente = normalizeCustomerDocType(data.cliente.tipoDoc);
  const numDocCliente = data.cliente.numDoc || "00000000";
  const fecha = data.fechaEmision;
  const igv = data.totalIgv.toFixed(2);
  const total = data.totalVenta.toFixed(2);

  return `${data.emisor.ruc}|${data.tipoComprobante}|${data.serie}|${data.numero}|${igv}|${total}|${fecha}|${tipoDocCliente}|${numDocCliente}|${hash}|`;
}

/**
 * Genera un digest / hash SHA-256 canónico para comprobantes o consultas
 */
export function generateDigestHash(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("base64");
}

/**
 * Extrae la clave privada PEM y el certificado X.509 Base64 de un buffer PKCS#12 (.pfx / .p12)
 */
function extractFromP12Buffer(p12Buffer: Buffer, password = ""): LoadedCertificate | null {
  try {
    const p12Der = p12Buffer.toString("binary");
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // 1. Extraer clave privada (PKCS#8 shrouded o plain)
    let privateKeyPem = "";
    const shroudedBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag];
    if (shroudedBags && shroudedBags.length > 0 && shroudedBags[0]?.key) {
      privateKeyPem = forge.pki.privateKeyToPem(shroudedBags[0].key);
    } else {
      const plainKeyBags = p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag];
      if (plainKeyBags && plainKeyBags.length > 0 && plainKeyBags[0]?.key) {
        privateKeyPem = forge.pki.privateKeyToPem(plainKeyBags[0].key);
      }
    }

    // 2. Extraer certificado X.509
    let certBase64 = "";
    let subject = "";
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];
    if (certBags && certBags.length > 0 && certBags[0]?.cert) {
      const certObj = certBags[0].cert;
      const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certObj)).getBytes();
      certBase64 = Buffer.from(certDer, "binary").toString("base64");
      subject = certObj.subject.attributes.map((a: any) => `${a.name}=${a.value}`).join(", ");
    }

    if (privateKeyPem && certBase64) {
      return {
        privateKeyPem,
        certBase64,
        isTestCert: false,
        subject,
      };
    }
  } catch (err: any) {
    console.warn("[SunatSigner] Advertencia al decodificar PKCS#12:", err.message || err);
  }
  return null;
}

/**
 * Genera un certificado digital X.509 RSA-2048 autofirmado en memoria para ambientes de desarrollo y pruebas
 */
function generateTestCertificate(): LoadedCertificate {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01" + Date.now().toString(16);
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2);

  const attrs = [
    { name: "commonName", value: "CERTIFICADO TRIBUTARIO PRUEBA SUNAT" },
    { name: "organizationName", value: "SUNAT BILLING API" },
    { name: "countryName", value: "PE" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const certBase64 = Buffer.from(certDer, "binary").toString("base64");

  return {
    privateKeyPem,
    certBase64,
    isTestCert: true,
    subject: "CN=CERTIFICADO TRIBUTARIO PRUEBA SUNAT, O=SUNAT BILLING API, C=PE",
  };
}

/**
 * Carga el certificado digital configurado o genera uno de prueba seguro si no existe
 */
export function loadCertificate(options?: CertificateOptions): LoadedCertificate {
  // 1. Si se envía el certificado en Base64 directamente (ej. por empresa desde la BD o env var)
  const base64Input = options?.certBase64 || env.SUNAT_CERT_BASE64;
  if (base64Input) {
    const pfxBuffer = Buffer.from(base64Input, "base64");
    const cert = extractFromP12Buffer(pfxBuffer, options?.certPassword ?? env.SUNAT_CERT_PASSWORD);
    if (cert) return cert;
  }

  // 2. Si se especifica una ruta de archivo
  const targetPath = options?.certPath || env.SUNAT_CERT_PATH;
  const targetPassword = options?.certPassword ?? env.SUNAT_CERT_PASSWORD;

  if (targetPath) {
    const resolvedPath = path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath);
    if (fs.existsSync(resolvedPath)) {
      try {
        const pfxBuffer = fs.readFileSync(resolvedPath);
        const cert = extractFromP12Buffer(pfxBuffer, targetPassword);
        if (cert) return cert;
      } catch (err: any) {
        console.warn(`[SunatSigner] No se pudo leer el archivo PFX en ${resolvedPath}:`, err.message || err);
      }
    }
  }

  // 3. Fallback en memoria con caché para desarrollo
  if (!cachedDefaultCert) {
    cachedDefaultCert = generateTestCertificate();

    // Crear carpeta ./certs y archivo de prueba si no existe
    try {
      const defaultDir = path.resolve(process.cwd(), "certs");
      const defaultPfx = path.join(defaultDir, "certificate.pfx");
      if (!fs.existsSync(defaultDir)) {
        fs.mkdirSync(defaultDir, { recursive: true });
      }
      if (!fs.existsSync(defaultPfx)) {
        const keyObj = forge.pki.privateKeyFromPem(cachedDefaultCert.privateKeyPem);
        const certAsn1 = forge.asn1.fromDer(Buffer.from(cachedDefaultCert.certBase64, "base64").toString("binary"));
        const certObj = forge.pki.certificateFromAsn1(certAsn1);
        const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keyObj, [certObj], "");
        const p12Bytes = forge.asn1.toDer(p12Asn1).getBytes();
        fs.writeFileSync(defaultPfx, Buffer.from(p12Bytes, "binary"));
      }
    } catch {
      // Ignorar errores de escritura de fallback en entornos de solo lectura (como Vercel lambda)
    }
  }

  return cachedDefaultCert;
}

/**
 * Normaliza y canonicaliza el XML eliminando declaraciones previas para el cómputo del digest
 */
function canonicalizeXmlForEnvelopedDigest(xml: string): string {
  // Elimina la firma existente si la hubiera para el cálculo del transform enveloped-signature
  let clean = xml.replace(/<ds:Signature[\s\S]*?<\/ds:Signature>/gi, "");
  // Remueve la declaración XML inicial
  clean = clean.replace(/<\?xml[^>]*\?>/gi, "");
  // Normaliza saltos de línea
  clean = clean.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return clean.trim();
}

/**
 * Aplica la Firma Digital XMLDSig (W3C / SUNAT UBL 2.1) al contenido XML
 */
export function signXml(xmlContent: string, options?: CertificateOptions): XmlSignatureResult {
  const cert = loadCertificate(options);

  // 1. Calcular DigestValue sobre el documento canonicalizado (Enveloped Signature)
  const canonicalDoc = canonicalizeXmlForEnvelopedDigest(xmlContent);
  const digestValue = crypto.createHash("sha256").update(canonicalDoc, "utf8").digest("base64");

  // 2. Construir elemento <ds:SignedInfo> canónico
  const signedInfo = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><ds:Reference URI=""><ds:Transforms><ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${digestValue}</ds:DigestValue></ds:Reference></ds:SignedInfo>`;

  // 3. Firmar <ds:SignedInfo> con la clave privada RSA-SHA256
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signedInfo, "utf8");
  const signatureValue = signer.sign(cert.privateKeyPem, "base64");

  // 4. Construir bloque completo <ds:Signature Id="Signature-SunatBilling">
  const signatureXml = `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="Signature-SunatBilling">
          ${signedInfo}
          <ds:SignatureValue>${signatureValue}</ds:SignatureValue>
          <ds:KeyInfo>
            <ds:X509Data>
              <ds:X509Certificate>${cert.certBase64}</ds:X509Certificate>
            </ds:X509Data>
          </ds:KeyInfo>
        </ds:Signature>`;

  // 5. Inyectar <ds:Signature> dentro de <ext:ExtensionContent>
  let signedXml = xmlContent;
  if (signedXml.includes("<ext:ExtensionContent/>")) {
    signedXml = signedXml.replace(
      "<ext:ExtensionContent/>",
      `<ext:ExtensionContent>\n        ${signatureXml}\n      </ext:ExtensionContent>`
    );
  } else if (signedXml.includes("<ext:ExtensionContent></ext:ExtensionContent>")) {
    signedXml = signedXml.replace(
      "<ext:ExtensionContent></ext:ExtensionContent>",
      `<ext:ExtensionContent>\n        ${signatureXml}\n      </ext:ExtensionContent>`
    );
  } else if (/<ext:ExtensionContent>[\s\S]*?<\/ext:ExtensionContent>/i.test(signedXml)) {
    signedXml = signedXml.replace(
      /<ext:ExtensionContent>[\s\S]*?<\/ext:ExtensionContent>/i,
      `<ext:ExtensionContent>\n        ${signatureXml}\n      </ext:ExtensionContent>`
    );
  } else if (signedXml.includes("<ext:UBLExtensions>")) {
    signedXml = signedXml.replace(
      "<ext:UBLExtensions>",
      `<ext:UBLExtensions>\n    <ext:UBLExtension>\n      <ext:ExtensionContent>\n        ${signatureXml}\n      </ext:ExtensionContent>\n    </ext:UBLExtension>`
    );
  }

  return {
    signedXml,
    digestValue,
    signatureValue,
    certBase64: cert.certBase64,
    isTestCert: cert.isTestCert,
  };
}
