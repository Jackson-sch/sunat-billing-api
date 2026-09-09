import { SunatDocumentData } from "./types";
import crypto from "crypto";

/**
 * Normaliza el tipo de documento del cliente al catálogo 06 de SUNAT
 * 1: DNI, 6: RUC, 4: Carnet de Extranjería, 7: Pasaporte, 0: Sin documento
 */
export function normalizeCustomerDocType(tipo: string): string {
  const t = tipo.toLowerCase();
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
 * Genera un digest / hash SHA-256 canónico para el comprobante UBL 2.1
 */
export function generateDigestHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("base64").substring(0, 28);
}
