import JSZip from "jszip";

export interface SunatCredentials {
  ruc: string;
  usuarioSol: string;
  claveSol: string;
  isBeta?: boolean;
}

export interface SendBillResult {
  success: boolean;
  statusCode?: number;
  responseCode?: string; // "0" = Aceptado
  description?: string;
  cdrZipBase64?: string;
  cdrXml?: string;
  hashCdr?: string;
  error?: string;
  rawFault?: string;
}

export interface SendSummaryResult {
  success: boolean;
  ticket?: string;
  error?: string;
  rawFault?: string;
}

export interface GetStatusResult {
  success: boolean;
  statusCode?: number;
  responseCode?: string;
  description?: string;
  cdrZipBase64?: string;
  cdrXml?: string;
  error?: string;
}

export const SUNAT_ENDPOINTS = {
  BETA_BILL_SERVICE: "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService",
  PROD_BILL_SERVICE: "https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService",
  BETA_CONSULTA_CDR: "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billConsultService",
  PROD_CONSULTA_CDR: "https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billConsultService",
};

/**
 * Empaqueta un archivo XML en un buffer ZIP listo para enviar a SUNAT
 * Nombre del archivo interno: {nombre}.xml
 */
export async function createSunatZip(fileName: string, xmlContent: string): Promise<Buffer> {
  const zip = new JSZip();
  const internalXmlName = fileName.endsWith(".zip") ? fileName.replace(/\.zip$/i, ".xml") : `${fileName}.xml`;
  zip.file(internalXmlName, xmlContent);
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
  return zipBuffer;
}

/**
 * Extrae y parsea el XML del CDR desde el ZIP devuelto por SUNAT en Base64
 */
export async function extractCdrFromZipBase64(cdrZipBase64: string): Promise<{
  cdrXml: string;
  responseCode: string;
  description: string;
  hashCdr?: string;
}> {
  try {
    const zipBuffer = Buffer.from(cdrZipBase64, "base64");
    const zip = await JSZip.loadAsync(zipBuffer);
    
    // Buscar el archivo XML del CDR (comienza con R-)
    const xmlFileKey = Object.keys(zip.files).find((k) => k.endsWith(".xml") || k.startsWith("R-"));
    if (!xmlFileKey) {
      throw new Error("No se encontró archivo XML dentro de la Constancia de Recepción (CDR) devuelta por SUNAT.");
    }

    const cdrXml = await zip.files[xmlFileKey]!.async("text");

    // Extraer código de respuesta (<cbc:ResponseCode>0</cbc:ResponseCode>)
    const codeMatch = cdrXml.match(/<cbc:ResponseCode[^>]*>([^<]+)<\/cbc:ResponseCode>/i);
    const responseCode = codeMatch ? codeMatch[1].trim() : "0";

    // Extraer descripción (<cbc:Description>...</cbc:Description>)
    const descMatch = cdrXml.match(/<cbc:Description[^>]*>([^<]+)<\/cbc:Description>/i);
    const description = descMatch ? descMatch[1].trim() : "Comprobante procesado por SUNAT";

    // Extraer DigestValue del CDR
    const digestMatch = cdrXml.match(/<ds:DigestValue[^>]*>([^<]+)<\/ds:DigestValue>/i);
    const hashCdr = digestMatch ? digestMatch[1].trim() : undefined;

    return {
      cdrXml,
      responseCode,
      description,
      hashCdr,
    };
  } catch (err: any) {
    return {
      cdrXml: "",
      responseCode: "9999",
      description: err instanceof Error ? err.message : "Error al procesar el archivo CDR.",
    };
  }
}

/**
 * Genera el sobre SOAP con cabecera de autenticación WS-Security
 */
function buildSoapEnvelope(username: string, password: string, bodyContent: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ser="http://service.sunat.gob.pe"
                  xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${username}</wsse:Username>
        <wsse:Password>${password}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    ${bodyContent}
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Cliente SOAP para emitir y consultar comprobantes electrónicos ante SUNAT
 */
export class SunatSoapClient {
  private ruc: string;
  private usuarioSol: string;
  private claveSol: string;
  private isBeta: boolean;

  constructor(credentials: SunatCredentials) {
    this.ruc = credentials.ruc;
    this.usuarioSol = credentials.usuarioSol;
    this.claveSol = credentials.claveSol;
    this.isBeta = credentials.isBeta ?? true;
  }

  /**
   * Construye el nombre de usuario completo para WS-Security: {RUC}{USUARIO_SOL}
   */
  private get fullUsername(): string {
    const u = (this.usuarioSol || "MODDATOS").trim();
    if (this.isBeta) {
      return `${this.ruc}MODDATOS`;
    }
    if (u.startsWith(this.ruc)) return u;
    return `${this.ruc}${u}`;
  }

  private get authPassword(): string {
    if (this.isBeta) {
      return "MODDATOS";
    }
    return this.claveSol;
  }

  private get billServiceUrl(): string {
    return this.isBeta ? SUNAT_ENDPOINTS.BETA_BILL_SERVICE : SUNAT_ENDPOINTS.PROD_BILL_SERVICE;
  }

  /**
   * Envía un comprobante individual (Factura, Boleta, Nota de Crédito/Débito) mediante sendBill
   */
  async sendBill(fileName: string, zipBuffer: Buffer | string): Promise<SendBillResult> {
    try {
      const base64Content = typeof zipBuffer === "string" ? zipBuffer : zipBuffer.toString("base64");
      const zipFileName = fileName.endsWith(".zip") ? fileName : `${fileName}.zip`;

      const body = `
        <ser:sendBill>
          <fileName>${zipFileName}</fileName>
          <contentFile>${base64Content}</contentFile>
        </ser:sendBill>
      `;

      const soapXml = buildSoapEnvelope(this.fullUsername, this.authPassword, body);
      const basicAuth = Buffer.from(`${this.fullUsername}:${this.authPassword}`).toString("base64");

      const response = await fetch(this.billServiceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          Authorization: `Basic ${basicAuth}`,
        },
        body: soapXml,
      });

      const responseText = await response.text();

      // Verificar si hay SOAP Fault
      if (!response.ok || responseText.includes("soap-env:Fault") || responseText.includes("soap:Fault") || responseText.includes("<faultcode>")) {
        const faultCodeMatch = responseText.match(/<faultcode[^>]*>([^<]+)<\/faultcode>/i);
        const faultStringMatch = responseText.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i);
        const faultMsg = faultStringMatch ? faultStringMatch[1] : `Error HTTP ${response.status} de SUNAT.`;

        return {
          success: false,
          statusCode: response.status,
          responseCode: faultCodeMatch ? faultCodeMatch[1] : "SOAP_FAULT",
          description: faultMsg,
          rawFault: responseText,
          error: faultMsg,
        };
      }

      // Extraer applicationResponse (Base64 del ZIP CDR devuelto por SUNAT)
      const appRespMatch = responseText.match(/<applicationResponse[^>]*>([^<]+)<\/applicationResponse>/i);
      if (!appRespMatch) {
        return {
          success: false,
          statusCode: response.status,
          error: "SUNAT no devolvió Constancia de Recepción (applicationResponse).",
          rawFault: responseText,
        };
      }

      const cdrZipBase64 = appRespMatch[1].trim();
      const cdrData = await extractCdrFromZipBase64(cdrZipBase64);

      return {
        success: cdrData.responseCode === "0",
        statusCode: response.status,
        responseCode: cdrData.responseCode,
        description: cdrData.description,
        cdrZipBase64,
        cdrXml: cdrData.cdrXml,
        hashCdr: cdrData.hashCdr,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Error de comunicación con el Web Service de SUNAT.",
      };
    }
  }

  /**
   * Envía un paquete de Resumen Diario de Boletas (RC) o Comunicación de Bajas (RA) mediante sendSummary
   */
  async sendSummary(fileName: string, zipBuffer: Buffer | string): Promise<SendSummaryResult> {
    try {
      const base64Content = typeof zipBuffer === "string" ? zipBuffer : zipBuffer.toString("base64");
      const zipFileName = fileName.endsWith(".zip") ? fileName : `${fileName}.zip`;

      const body = `
        <ser:sendSummary>
          <fileName>${zipFileName}</fileName>
          <contentFile>${base64Content}</contentFile>
        </ser:sendSummary>
      `;

      const soapXml = buildSoapEnvelope(this.fullUsername, this.claveSol, body);

      const response = await fetch(this.billServiceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "urn:sendSummary",
        },
        body: soapXml,
      });

      const responseText = await response.text();

      if (!response.ok || responseText.includes("<faultcode>")) {
        const faultStringMatch = responseText.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i);
        return {
          success: false,
          error: faultStringMatch ? faultStringMatch[1] : `Error HTTP ${response.status} de SUNAT.`,
          rawFault: responseText,
        };
      }

      const ticketMatch = responseText.match(/<ticket[^>]*>([^<]+)<\/ticket>/i);
      if (!ticketMatch) {
        return {
          success: false,
          error: "SUNAT no devolvió número de ticket de resumen.",
          rawFault: responseText,
        };
      }

      return {
        success: true,
        ticket: ticketMatch[1].trim(),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Error al enviar resumen a SUNAT.",
      };
    }
  }

  /**
   * Consulta el estado de un ticket generado por sendSummary y descarga su CDR
   */
  async getStatus(ticket: string): Promise<GetStatusResult> {
    try {
      const body = `
        <ser:getStatus>
          <ticket>${ticket}</ticket>
        </ser:getStatus>
      `;

      const soapXml = buildSoapEnvelope(this.fullUsername, this.claveSol, body);

      const response = await fetch(this.billServiceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "urn:getStatus",
        },
        body: soapXml,
      });

      const responseText = await response.text();

      const statusCodeMatch = responseText.match(/<statusCode[^>]*>([^<]+)<\/statusCode>/i);
      const statusCode = statusCodeMatch ? parseInt(statusCodeMatch[1], 10) : 99;

      const contentMatch = responseText.match(/<content[^>]*>([^<]+)<\/content>/i);
      if (contentMatch) {
        const cdrZipBase64 = contentMatch[1].trim();
        const cdrData = await extractCdrFromZipBase64(cdrZipBase64);
        return {
          success: cdrData.responseCode === "0",
          statusCode,
          responseCode: cdrData.responseCode,
          description: cdrData.description,
          cdrZipBase64,
          cdrXml: cdrData.cdrXml,
        };
      }

      return {
        success: statusCode === 0,
        statusCode,
        description: statusCode === 98 ? "Ticket en proceso de validación por SUNAT" : "Ticket sin constancia disponible",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Error al consultar estado de ticket en SUNAT.",
      };
    }
  }
}
