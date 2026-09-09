import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { EmitCpeSchema } from "@/schemas/cpe.schema";
import { env } from "@/config/env";
import {
  buildUblXml,
  SunatDocumentData,
  SunatItem,
  SunatSoapClient,
  createSunatZip,
} from "@/core";

export const cpeRouter = new Hono();

cpeRouter.post("/emitir", zValidator("json", EmitCpeSchema), async (c) => {
  const body = c.req.valid("json");

  const now = new Date();
  const fechaEmision = body.fechaEmision || now.toISOString().split("T")[0]!;
  const horaEmision = body.horaEmision || now.toTimeString().split(" ")[0]!;

  // Emisor: usar el enviado en el payload o tomar los defaults de entorno
  const emisor = {
    ruc: body.emisor?.ruc || env.SUNAT_RUC,
    razonSocial: body.emisor?.razonSocial || "NOVAMARKET SUPERMERCADOS S.A.C.",
    nombreComercial: body.emisor?.nombreComercial || "NovaMarket",
    direccion: body.emisor?.direccion || "Av. Principal 123 - Surco, Lima",
    ubigeo: body.emisor?.ubigeo || "150101",
    departamento: body.emisor?.departamento || "LIMA",
    provincia: body.emisor?.provincia || "LIMA",
    distrito: body.emisor?.distrito || "LIMA",
  };

  // Calcular impuestos y subtotales de cada ítem
  let totalGravadas = 0;
  let totalExoneradas = 0;
  let totalInafectas = 0;
  let totalIgv = 0;
  let totalVenta = 0;

  const items: SunatItem[] = body.items.map((item, index) => {
    const afectacion = item.tipoAfectacionIgv || "10";
    let valorUnitario = item.valorUnitario;
    let igvItem = 0;

    if (afectacion === "10") {
      // Gravado: precioUnitario incluye 18% IGV
      if (valorUnitario === undefined) {
        valorUnitario = +(item.precioUnitario / 1.18).toFixed(4);
      }
      const valorTotal = +(valorUnitario * item.cantidad).toFixed(2);
      const totalLinea = +(item.precioUnitario * item.cantidad).toFixed(2);
      igvItem = +(totalLinea - valorTotal).toFixed(2);

      totalGravadas += valorTotal;
      totalIgv += igvItem;
      totalVenta += totalLinea;
    } else if (afectacion === "20") {
      // Exonerado
      valorUnitario = item.precioUnitario;
      const totalLinea = +(item.precioUnitario * item.cantidad).toFixed(2);
      totalExoneradas += totalLinea;
      totalVenta += totalLinea;
    } else {
      // Inafecto
      valorUnitario = item.precioUnitario;
      const totalLinea = +(item.precioUnitario * item.cantidad).toFixed(2);
      totalInafectas += totalLinea;
      totalVenta += totalLinea;
    }

    return {
      id: item.id || `item-${index + 1}`,
      sku: item.sku,
      descripcion: item.descripcion,
      unidadMedida: item.unidadMedida,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      valorUnitario,
      tipoAfectacionIgv: afectacion,
      igv: igvItem,
      total: +(item.precioUnitario * item.cantidad).toFixed(2),
    };
  });

  const docData: SunatDocumentData = {
    tipoComprobante: body.tipoComprobante,
    serie: body.serie,
    numero: body.numero,
    fechaEmision,
    horaEmision,
    moneda: body.moneda,
    emisor,
    cliente: body.cliente,
    items,
    totalGravadas: +totalGravadas.toFixed(2),
    totalExoneradas: +totalExoneradas.toFixed(2),
    totalInafectas: +totalInafectas.toFixed(2),
    totalIgv: +totalIgv.toFixed(2),
    totalVenta: +totalVenta.toFixed(2),
    medioPago: body.medioPago,
    documentoModificado: body.documentoModificado,
  };

  // 1. Construir XML UBL 2.1 y firma digital
  const ublResult = buildUblXml(docData);

  // 2. Si se solicita envío directo a SUNAT
  if (body.enviarASunat) {
    const credentials = {
      ruc: emisor.ruc,
      usuarioSol: body.emisor?.usuarioSol || env.SUNAT_USUARIO_SOL,
      claveSol: body.emisor?.claveSol || env.SUNAT_CLAVE_SOL,
      isBeta: body.emisor?.isBeta ?? (env.SUNAT_ENV === "beta"),
    };

    const soapClient = new SunatSoapClient(credentials);
    const fileName = `${emisor.ruc}-${body.tipoComprobante}-${body.serie}-${String(body.numero).padStart(8, "0")}`;
    const xmlContent = Buffer.from(ublResult.xmlBase64, "base64").toString("utf-8");
    const zipBuffer = await createSunatZip(fileName, xmlContent);

    const sendRes = await soapClient.sendBill(fileName, zipBuffer);

    return c.json({
      success: sendRes.success,
      comprobante: `${body.serie}-${body.numero}`,
      tipoComprobante: body.tipoComprobante,
      hashSunat: ublResult.hash,
      qrString: ublResult.qrString,
      xmlBase64: ublResult.xmlBase64,
      cdrBase64: sendRes.cdrZipBase64,
      sunatResponse: {
        code: sendRes.responseCode || (sendRes.success ? "0" : "ERROR"),
        message: sendRes.description || sendRes.error || "Procesado por SUNAT",
        estado: sendRes.success ? "ACEPTADO" : "RECHAZADO",
      },
      totales: {
        gravadas: docData.totalGravadas,
        exoneradas: docData.totalExoneradas,
        inafectas: docData.totalInafectas,
        igv: docData.totalIgv,
        total: docData.totalVenta,
      },
    });
  }

  // Si no envía a SUNAT por red, retorna la estructura lista para ser despachada o firmada
  return c.json({
    success: true,
    comprobante: `${body.serie}-${body.numero}`,
    tipoComprobante: body.tipoComprobante,
    hashSunat: ublResult.hash,
    qrString: ublResult.qrString,
    xmlBase64: ublResult.xmlBase64,
    cdrBase64: ublResult.cdrBase64,
    sunatResponse: {
      code: "0",
      message: ublResult.descripcionSunat,
      estado: "ACEPTADO",
    },
    totales: {
      gravadas: docData.totalGravadas,
      exoneradas: docData.totalExoneradas,
      inafectas: docData.totalInafectas,
      igv: docData.totalIgv,
      total: docData.totalVenta,
    },
  });
});
