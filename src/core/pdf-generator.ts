import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { XMLParser } from "fast-xml-parser";
import { numeroALetras } from "./number-to-words.js";

export interface InvoicePdfItem {
  cantidad: number;
  unidadMedida?: string;
  descripcion: string;
  precioUnitario: number;
  valorUnitario?: number;
  total: number;
}

export interface InvoicePdfData {
  tipoComprobante: string; // "01", "03", "07", "08"
  serie: string;
  numero: number;
  fechaEmision: string;
  horaEmision?: string;
  moneda?: string; // "PEN" | "USD"
  emisor: {
    ruc: string;
    razonSocial: string;
    nombreComercial?: string;
    direccion?: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;
  };
  cliente: {
    tipoDoc?: string;
    numDoc?: string;
    nombre: string;
    direccion?: string;
  };
  items: InvoicePdfItem[];
  totales: {
    gravadas?: number;
    exoneradas?: number;
    inafectas?: number;
    igv?: number;
    total: number;
  };
  medioPago?: string;
  hashSunat?: string;
  qrString?: string;
  observaciones?: string;
  documentoModificado?: {
    tipoDoc: string;
    serieNumero: string;
    motivoDescripcion: string;
  };
}

export function parseUblXmlToPdfData(xmlContent: string, fallback?: Partial<InvoicePdfData>): InvoicePdfData {
  try {
    const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
    const parsed = parser.parse(xmlContent);
    const root = parsed.Invoice || parsed.CreditNote || parsed.DebitNote || parsed.DespatchAdvice;

    if (!root) throw new Error("No se encontró nodo raíz UBL válido");

    const idStr = root.ID || "";
    const [serie = "F001", numStr = "1"] = String(idStr).split("-");
    const numero = parseInt(numStr, 10) || 1;

    // Emisor
    const supplierParty = root.AccountingSupplierParty?.Party || {};
    const emisorRuc = supplierParty.PartyIdentification?.ID || root.AccountingSupplierParty?.CustomerAssignedAccountID || fallback?.emisor?.ruc || "20000000001";
    const emisorRazon = supplierParty.PartyLegalEntity?.RegistrationName || fallback?.emisor?.razonSocial || "EMPRESA FISCAL S.A.C.";
    const emisorDir = supplierParty.PostalAddress?.StreetName || supplierParty.PostalAddress?.AddressLine?.Line || fallback?.emisor?.direccion || "LIMA - PERÚ";

    // Cliente
    const customerParty = root.AccountingCustomerParty?.Party || {};
    const clienteDoc = customerParty.PartyIdentification?.ID || root.AccountingCustomerParty?.CustomerAssignedAccountID || fallback?.cliente?.numDoc || "00000000";
    const clienteNombre = customerParty.PartyLegalEntity?.RegistrationName || customerParty.PartyName?.Name || fallback?.cliente?.nombre || "CLIENTES VARIOS";
    const clienteDir = customerParty.PostalAddress?.StreetName || customerParty.PostalAddress?.AddressLine?.Line || fallback?.cliente?.direccion || "";

    // Items
    const rawLines = root.InvoiceLine || root.CreditNoteLine || root.DebitNoteLine || [];
    const linesArray = Array.isArray(rawLines) ? rawLines : [rawLines].filter(Boolean);

    const items: InvoicePdfItem[] = linesArray.map((line: any) => {
      const cantidad = parseFloat(line.InvoicedQuantity || line.CreditedQuantity || line.DebitedQuantity || 1);
      const descripcion = line.Item?.Description || "Item";
      const precioUnitario = parseFloat(line.PricingReference?.AlternativeConditionPrice?.PriceAmount || line.Price?.PriceAmount || 0);
      const total = parseFloat(line.LineExtensionAmount || (cantidad * precioUnitario));
      const uom = line.InvoicedQuantity?.["@_unitCode"] || "NIU";
      return {
        cantidad,
        unidadMedida: uom,
        descripcion,
        precioUnitario,
        total,
      };
    });

    // Totales
    const totalVenta = parseFloat(root.LegalMonetaryTotal?.PayableAmount || root.LegalMonetaryTotal?.TaxInclusiveAmount || fallback?.totales?.total || 0);
    const totalGravadas = parseFloat(root.LegalMonetaryTotal?.LineExtensionAmount || fallback?.totales?.gravadas || 0);
    const totalIgv = parseFloat(root.TaxTotal?.TaxAmount || fallback?.totales?.igv || 0);

    // Hash Digest
    const hash = root.UBLExtensions?.UBLExtension?.ExtensionContent?.Signature?.SignedInfo?.Reference?.DigestValue || fallback?.hashSunat || "";

    return {
      tipoComprobante: (root.InvoiceTypeCode || (root.CreditNoteTypeCode ? "07" : root.DebitNoteTypeCode ? "08" : "01")),
      serie,
      numero,
      fechaEmision: root.IssueDate || new Date().toISOString().split("T")[0]!,
      horaEmision: root.IssueTime || "00:00:00",
      moneda: root.DocumentCurrencyCode || "PEN",
      emisor: {
        ruc: emisorRuc,
        razonSocial: emisorRazon,
        direccion: emisorDir,
      },
      cliente: {
        numDoc: clienteDoc,
        nombre: clienteNombre,
        direccion: clienteDir,
      },
      items: items.length > 0 ? items : (fallback?.items || []),
      totales: {
        gravadas: totalGravadas,
        igv: totalIgv,
        total: totalVenta,
      },
      medioPago: fallback?.medioPago || "efectivo",
      hashSunat: hash,
      qrString: fallback?.qrString,
    };
  } catch {
    // Si falla el parseo XML, retornar estructura basada en fallback
    return {
      tipoComprobante: fallback?.tipoComprobante || "01",
      serie: fallback?.serie || "F001",
      numero: fallback?.numero || 1,
      fechaEmision: fallback?.fechaEmision || new Date().toISOString().split("T")[0]!,
      horaEmision: fallback?.horaEmision || "00:00:00",
      moneda: fallback?.moneda || "PEN",
      emisor: fallback?.emisor || { ruc: "20000000001", razonSocial: "EMPRESA S.A.C." },
      cliente: fallback?.cliente || { nombre: "CLIENTES VARIOS", numDoc: "00000000" },
      items: fallback?.items || [],
      totales: fallback?.totales || { total: 0 },
      hashSunat: fallback?.hashSunat,
      qrString: fallback?.qrString,
    };
  }
}

function getTipoNombre(tipo: string): string {
  switch (tipo) {
    case "01": return "FACTURA ELECTRÓNICA";
    case "03": return "BOLETA DE VENTA ELECTRÓNICA";
    case "07": return "NOTA DE CRÉDITO ELECTRÓNICA";
    case "08": return "NOTA DE DÉBITO ELECTRÓNICA";
    case "09": return "GUÍA DE REMISIÓN ELECTRÓNICA";
    default: return "COMPROBANTE ELECTRÓNICO";
  }
}

/**
 * Genera PDF en Hoja Completa A4 oficial SUNAT
 */
async function generateA4Pdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 36,
        info: {
          Title: `${data.serie}-${String(data.numero).padStart(8, "0")}`,
          Author: data.emisor.razonSocial,
          Subject: getTipoNombre(data.tipoComprobante),
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const tipoNombre = getTipoNombre(data.tipoComprobante);
      const numDocStr = `${data.serie}-${String(data.numero).padStart(8, "0")}`;
      const simMoneda = data.moneda === "USD" ? "$ " : "S/ ";

      // ── ENCABEZADO ──
      // Datos del Emisor (Izquierda)
      doc.fillColor("#0f172a").fontSize(13).font("Helvetica-Bold").text(data.emisor.razonSocial, 36, 40, { width: 310 });
      if (data.emisor.nombreComercial && data.emisor.nombreComercial !== data.emisor.razonSocial) {
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#334155").text(data.emisor.nombreComercial, { width: 310 });
      }
      doc.fontSize(8).font("Helvetica").fillColor("#475569");
      doc.moveDown(0.2);
      doc.text(`RUC: ${data.emisor.ruc}`);
      if (data.emisor.direccion) doc.text(data.emisor.direccion, { width: 310 });
      const ubigeoTexto = [data.emisor.distrito, data.emisor.provincia, data.emisor.departamento].filter(Boolean).join(" - ");
      if (ubigeoTexto) doc.text(ubigeoTexto);

      // Recuadro Fiscal RUC / Tipo / Número (Derecha)
      const boxX = 360;
      const boxY = 36;
      const boxW = 200;
      const boxH = 85;

      doc.roundedRect(boxX, boxY, boxW, boxH, 4).lineWidth(1.5).strokeColor("#0f172a").stroke();
      doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text(`R.U.C. N° ${data.emisor.ruc}`, boxX, boxY + 12, { width: boxW, align: "center" });
      
      // Fondo sutil para el título
      doc.rect(boxX + 1, boxY + 30, boxW - 2, 24).fillColor("#f1f5f9").fill();
      doc.fillColor("#0f172a").fontSize(10).font("Helvetica-Bold").text(tipoNombre, boxX, boxY + 36, { width: boxW, align: "center" });
      doc.fillColor("#0f172a").fontSize(12).font("Helvetica-Bold").text(numDocStr, boxX, boxY + 62, { width: boxW, align: "center" });

      // ── DATOS DEL CLIENTE / RECEPTOR ──
      const clientY = 135;
      doc.roundedRect(36, clientY, 524, 60, 4).lineWidth(0.8).strokeColor("#cbd5e1").stroke();

      doc.fontSize(8).font("Helvetica-Bold").fillColor("#334155").text("SEÑOR(ES):", 46, clientY + 8);
      doc.font("Helvetica").fillColor("#0f172a").text(data.cliente.nombre || "CLIENTES VARIOS", 110, clientY + 8, { width: 250 });

      doc.font("Helvetica-Bold").fillColor("#334155").text("R.U.C. / D.N.I.:", 46, clientY + 24);
      doc.font("Helvetica").fillColor("#0f172a").text(data.cliente.numDoc || "00000000", 110, clientY + 24);

      doc.font("Helvetica-Bold").fillColor("#334155").text("DIRECCIÓN:", 46, clientY + 40);
      doc.font("Helvetica").fillColor("#0f172a").text(data.cliente.direccion || "-", 110, clientY + 40, { width: 250 });

      // Columna derecha del cliente
      const colRightX = 370;
      doc.font("Helvetica-Bold").fillColor("#334155").text("FECHA EMISIÓN:", colRightX, clientY + 8);
      doc.font("Helvetica").fillColor("#0f172a").text(data.fechaEmision, colRightX + 85, clientY + 8);

      doc.font("Helvetica-Bold").fillColor("#334155").text("HORA EMISIÓN:", colRightX, clientY + 24);
      doc.font("Helvetica").fillColor("#0f172a").text(data.horaEmision || "00:00:00", colRightX + 85, clientY + 24);

      doc.font("Helvetica-Bold").fillColor("#334155").text("MONEDA:", colRightX, clientY + 40);
      doc.font("Helvetica").fillColor("#0f172a").text(data.moneda === "USD" ? "DÓLARES AMERICANOS" : "SOLES (PEN)", colRightX + 85, clientY + 40);

      // ── TABLA DE PRODUCTOS / ÍTEMS ──
      const tableTop = 205;
      const thHeight = 18;

      // Encabezado de tabla
      doc.rect(36, tableTop, 524, thHeight).fillColor("#1e293b").fill();
      doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold");
      doc.text("CANT.", 42, tableTop + 5, { width: 35, align: "center" });
      doc.text("U.M.", 80, tableTop + 5, { width: 35, align: "center" });
      doc.text("DESCRIPCIÓN", 120, tableTop + 5, { width: 260 });
      doc.text("P. UNIT.", 390, tableTop + 5, { width: 70, align: "right" });
      doc.text("IMPORTE", 475, tableTop + 5, { width: 75, align: "right" });

      // Filas
      let curY = tableTop + thHeight;
      doc.font("Helvetica").fontSize(8).fillColor("#0f172a");

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const rowBg = i % 2 === 1 ? "#f8fafc" : "#ffffff";
        const rowHeight = 18;

        doc.rect(36, curY, 524, rowHeight).fillColor(rowBg).fill();
        doc.fillColor("#0f172a");

        doc.text(item.cantidad.toFixed(2), 42, curY + 5, { width: 35, align: "center" });
        doc.text(item.unidadMedida || "NIU", 80, curY + 5, { width: 35, align: "center" });
        doc.text(item.descripcion, 120, curY + 5, { width: 260, ellipsis: true });
        doc.text(item.precioUnitario.toFixed(2), 390, curY + 5, { width: 70, align: "right" });
        doc.text(item.total.toFixed(2), 475, curY + 5, { width: 75, align: "right" });

        curY += rowHeight;
        if (curY > 700) {
          doc.addPage();
          curY = 50;
        }
      }

      // Línea divisoria bajo la tabla
      doc.moveTo(36, curY).lineTo(560, curY).strokeColor("#cbd5e1").lineWidth(0.8).stroke();
      curY += 10;

      // ── TOTALES Y RESUMEN TRIBUTARIO ──
      const bottomY = Math.max(curY, 460);

      // Importe en Letras
      const letras = numeroALetras(data.totales.total, data.moneda);
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#1e293b").text(letras, 36, bottomY, { width: 330 });

      // Cuadro de Totales (Derecha)
      const totalsX = 380;
      const totalsW = 180;
      let totY = bottomY;

      const drawTotRow = (label: string, val: number, isBold = false) => {
        doc.fontSize(8).font(isBold ? "Helvetica-Bold" : "Helvetica").fillColor("#0f172a");
        doc.text(label, totalsX, totY, { width: 100 });
        doc.text(`${simMoneda}${val.toFixed(2)}`, totalsX + 90, totY, { width: 90, align: "right" });
        totY += 14;
      };

      if ((data.totales.gravadas || 0) > 0) drawTotRow("Op. Gravada:", data.totales.gravadas || 0);
      if ((data.totales.exoneradas || 0) > 0) drawTotRow("Op. Exonerada:", data.totales.exoneradas || 0);
      if ((data.totales.inafectas || 0) > 0) drawTotRow("Op. Inafecta:", data.totales.inafectas || 0);
      drawTotRow("I.G.V. (18%):", data.totales.igv || 0);

      // Total Final Destacado
      doc.rect(totalsX - 5, totY - 2, totalsW + 5, 20).fillColor("#0f172a").fill();
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
      doc.text("IMPORTE TOTAL:", totalsX, totY + 4, { width: 90 });
      doc.text(`${simMoneda}${data.totales.total.toFixed(2)}`, totalsX + 90, totY + 4, { width: 85, align: "right" });

      // Código QR e Información Fiscal (Izquierda Inferior)
      const qrData = data.qrString || `${data.emisor.ruc}|${data.tipoComprobante}|${data.serie}|${data.numero}|${data.totales.igv?.toFixed(2) || "0.00"}|${data.totales.total.toFixed(2)}|${data.fechaEmision}|${data.cliente.tipoDoc || "1"}|${data.cliente.numDoc || "0"}|${data.hashSunat || ""}|`;
      const qrBuffer = await QRCode.toBuffer(qrData, { width: 95, margin: 1 });

      const qrY = bottomY + 25;
      doc.image(qrBuffer, 36, qrY, { width: 85, height: 85 });

      doc.fillColor("#475569").fontSize(7).font("Helvetica");
      const legalX = 130;
      doc.text("Representación Impresa de la Factura Electrónica generada", legalX, qrY + 10, { width: 230 });
      doc.text("desde el sistema del contribuyente. Autorizado por SUNAT.", legalX, qrY + 20, { width: 230 });
      if (data.hashSunat) {
        doc.font("Helvetica-Bold").text("Código Hash Digest:", legalX, qrY + 34);
        doc.font("Helvetica").fontSize(6.5).text(data.hashSunat, legalX, qrY + 44, { width: 230 });
      }
      doc.fontSize(7).text(`Forma de pago: ${(data.medioPago || "Contado").toUpperCase()}`, legalX, qrY + 58);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Genera PDF en formato Ticket Térmico (80mm o 58mm)
 */
async function generateTicketPdf(data: InvoicePdfData, is58mm = false): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // 80mm = 226.77 pt; 58mm = 164.4 pt
      const pageWidth = is58mm ? 164.4 : 226.77;
      const margin = is58mm ? 8 : 12;
      const contentWidth = pageWidth - (margin * 2);

      // Calcular altura dinámica aproximada del ticket
      const estimatedHeight = 380 + (data.items.length * 24);

      const doc = new PDFDocument({
        size: [pageWidth, estimatedHeight],
        margin,
        info: {
          Title: `Ticket ${data.serie}-${data.numero}`,
          Author: data.emisor.razonSocial,
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const tipoNombre = getTipoNombre(data.tipoComprobante);
      const numDocStr = `${data.serie}-${String(data.numero).padStart(8, "0")}`;
      const simMoneda = data.moneda === "USD" ? "$ " : "S/ ";

      // ── ENCABEZADO TICKET ──
      doc.fontSize(is58mm ? 9 : 10).font("Helvetica-Bold").fillColor("#000000").text(data.emisor.razonSocial, { width: contentWidth, align: "center" });
      if (data.emisor.nombreComercial && data.emisor.nombreComercial !== data.emisor.razonSocial) {
        doc.fontSize(is58mm ? 7.5 : 8).font("Helvetica").text(data.emisor.nombreComercial, { width: contentWidth, align: "center" });
      }
      doc.fontSize(is58mm ? 7.5 : 8).font("Helvetica").text(`RUC: ${data.emisor.ruc}`, { width: contentWidth, align: "center" });
      if (data.emisor.direccion) {
        doc.text(data.emisor.direccion, { width: contentWidth, align: "center" });
      }

      doc.moveDown(0.3);
      doc.text("---------------------------------------------------------", { width: contentWidth, align: "center" });

      doc.fontSize(is58mm ? 8.5 : 9.5).font("Helvetica-Bold").text(tipoNombre, { width: contentWidth, align: "center" });
      doc.fontSize(is58mm ? 9.5 : 10.5).text(numDocStr, { width: contentWidth, align: "center" });

      doc.fontSize(is58mm ? 7 : 7.5).font("Helvetica");
      doc.moveDown(0.2);
      doc.text(`Fecha: ${data.fechaEmision}  Hora: ${data.horaEmision || "00:00:00"}`);
      doc.text(`Cliente: ${data.cliente.nombre || "CLIENTES VARIOS"}`);
      doc.text(`Doc: ${data.cliente.numDoc || "00000000"}`);

      doc.text("---------------------------------------------------------", { width: contentWidth, align: "center" });

      // ── ITEMS ──
      doc.fontSize(is58mm ? 7 : 7.5).font("Helvetica-Bold");
      doc.text("CANT  DESCRIPCIÓN              TOTAL");
      doc.font("Helvetica");

      for (const item of data.items) {
        const cantStr = `${item.cantidad}x `;
        const totalStr = `${simMoneda}${item.total.toFixed(2)}`;
        doc.text(`${cantStr}${item.descripcion}`, { width: contentWidth - 45, continued: false });
        doc.text(totalStr, { width: contentWidth, align: "right" });
      }

      doc.text("---------------------------------------------------------", { width: contentWidth, align: "center" });

      // ── TOTALES ──
      const printRow = (label: string, val: number, isBold = false) => {
        doc.fontSize(is58mm ? 7.5 : 8).font(isBold ? "Helvetica-Bold" : "Helvetica");
        doc.text(label, { continued: true, width: contentWidth - 60 });
        doc.text(`${simMoneda}${val.toFixed(2)}`, { align: "right", width: contentWidth });
      };

      if ((data.totales.gravadas || 0) > 0) printRow("Op. Gravada:", data.totales.gravadas || 0);
      if ((data.totales.exoneradas || 0) > 0) printRow("Op. Exonerada:", data.totales.exoneradas || 0);
      printRow("IGV (18%):", data.totales.igv || 0);

      doc.moveDown(0.2);
      printRow("TOTAL A PAGAR:", data.totales.total, true);

      doc.moveDown(0.3);
      doc.fontSize(is58mm ? 6.5 : 7).font("Helvetica").text(`Medio de pago: ${(data.medioPago || "Efectivo").toUpperCase()}`);
      doc.text(numeroALetras(data.totales.total, data.moneda), { width: contentWidth });

      // ── QR FISCAL ──
      const qrData = data.qrString || `${data.emisor.ruc}|${data.tipoComprobante}|${data.serie}|${data.numero}|${data.totales.igv?.toFixed(2) || "0.00"}|${data.totales.total.toFixed(2)}|${data.fechaEmision}|${data.cliente.tipoDoc || "1"}|${data.cliente.numDoc || "0"}|${data.hashSunat || ""}|`;
      const qrSize = is58mm ? 65 : 80;
      const qrBuffer = await QRCode.toBuffer(qrData, { width: qrSize, margin: 1 });

      doc.moveDown(0.4);
      const qrX = (pageWidth - qrSize) / 2;
      doc.image(qrBuffer, qrX, doc.y, { width: qrSize, height: qrSize });
      doc.y += qrSize + 4;

      if (data.hashSunat) {
        doc.fontSize(6).text(`Hash: ${data.hashSunat.substring(0, 24)}...`, { width: contentWidth, align: "center" });
      }
      doc.fontSize(6).text("Representación impresa del Comprobante de Pago Electrónico.", { width: contentWidth, align: "center" });
      doc.text("¡Gracias por su compra!", { width: contentWidth, align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Genera el buffer PDF del comprobante en el formato solicitado
 */
export async function generateInvoicePdf(
  data: InvoicePdfData,
  format: "a4" | "ticket" | "ticket58" = "a4"
): Promise<Buffer> {
  if (format === "ticket") {
    return generateTicketPdf(data, false);
  }
  if (format === "ticket58") {
    return generateTicketPdf(data, true);
  }
  return generateA4Pdf(data);
}
