import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { EmitCpeSchema } from "../schemas/cpe.schema.js";
import { env } from "../config/env.js";
import { registrarComprobante, obtenerComprobantePorId } from "../config/db.js";
import {
  buildUblXml,
  SunatDocumentData,
  SunatItem,
  SunatSoapClient,
  createSunatZip,
  generateInvoicePdf,
  parseUblXmlToPdfData,
} from "../core/index.js";

export const cpeRouter = new Hono();

cpeRouter.post("/emitir", zValidator("json", EmitCpeSchema), async (c) => {
  const body = c.req.valid("json");

  const now = new Date();
  const fechaEmision = body.fechaEmision || now.toISOString().split("T")[0]!;
  const horaEmision = body.horaEmision || now.toTimeString().split(" ")[0]!;
  const empresaAuth = (c as any).get("empresa");

  // Emisor: usar el enviado en el payload, los datos de la empresa autenticada, o defaults
  const emisor = {
    ruc: body.emisor?.ruc || empresaAuth?.ruc || env.SUNAT_RUC,
    razonSocial: body.emisor?.razonSocial || empresaAuth?.razon_social || "EMPRESA S.A.C.",
    nombreComercial: body.emisor?.nombreComercial || empresaAuth?.razon_social || "MiNegocio",
    direccion: body.emisor?.direccion || "Av. Principal 123 - Lima",
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

  // 1. Construir XML UBL 2.1 y firma digital XMLDSig
  const certOptions = {
    certPath: body.certificado?.path,
    certPassword: body.certificado?.password,
    certBase64: body.certificado?.base64 || empresaAuth?.certificado_pfx,
  };
  const ublResult = buildUblXml(docData, certOptions);

  // 2. Si se solicita envío directo a SUNAT
  if (body.enviarASunat) {
    const credentials = {
      ruc: emisor.ruc,
      usuarioSol: body.emisor?.usuarioSol || empresaAuth?.usuario_sol || env.SUNAT_USUARIO_SOL,
      claveSol: body.emisor?.claveSol || empresaAuth?.clave_sol || env.SUNAT_CLAVE_SOL,
      isBeta: body.emisor?.isBeta ?? empresaAuth?.is_beta ?? (env.SUNAT_ENV === "beta"),
    };

    const soapClient = new SunatSoapClient(credentials);
    const fileName = `${emisor.ruc}-${body.tipoComprobante}-${body.serie}-${String(body.numero).padStart(8, "0")}`;
    const xmlContent = Buffer.from(ublResult.xmlBase64, "base64").toString("utf-8");
    const zipBuffer = await createSunatZip(fileName, xmlContent);

    const sendRes = await soapClient.sendBill(fileName, zipBuffer);

    await registrarComprobante({
      empresaId: empresaAuth?.id || null,
      empresaRuc: emisor.ruc,
      tipoComprobante: body.tipoComprobante,
      serie: body.serie,
      numero: body.numero,
      fechaEmision,
      horaEmision,
      moneda: body.moneda,
      clienteTipoDoc: body.cliente.tipoDoc,
      clienteNumDoc: body.cliente.numDoc,
      clienteNombre: body.cliente.nombre,
      totalGravadas: docData.totalGravadas,
      totalIgv: docData.totalIgv,
      total: docData.totalVenta,
      estadoSunat: sendRes.success ? "ACEPTADO" : "RECHAZADO",
      sunatCode: sendRes.responseCode || (sendRes.success ? "0" : "ERROR"),
      sunatDescription: sendRes.description || sendRes.error || "Procesado por SUNAT",
      hashSunat: ublResult.hash,
      qrString: ublResult.qrString,
      xmlBase64: ublResult.xmlBase64,
      cdrBase64: sendRes.cdrZipBase64,
    });

    // Generar PDF (A4 o Ticket)
    const formatoPdf = (body.formatoPdf || c.req.query("pdf") || "a4") as "a4" | "ticket" | "ticket58";
    const pdfBuffer = await generateInvoicePdf(
      {
        tipoComprobante: body.tipoComprobante,
        serie: body.serie,
        numero: body.numero,
        fechaEmision,
        horaEmision,
        moneda: body.moneda,
        emisor,
        cliente: body.cliente,
        items: body.items.map((i) => ({
          cantidad: i.cantidad,
          unidadMedida: i.unidadMedida,
          descripcion: i.descripcion,
          precioUnitario: i.precioUnitario,
          total: +(i.cantidad * i.precioUnitario).toFixed(2),
        })),
        totales: {
          gravadas: docData.totalGravadas,
          exoneradas: docData.totalExoneradas,
          inafectas: docData.totalInafectas,
          igv: docData.totalIgv,
          total: docData.totalVenta,
        },
        medioPago: body.medioPago,
        hashSunat: ublResult.hash,
        qrString: ublResult.qrString,
      },
      formatoPdf
    );
    const pdfBase64 = pdfBuffer.toString("base64");

    return c.json({
      success: sendRes.success,
      comprobante: `${body.serie}-${body.numero}`,
      tipoComprobante: body.tipoComprobante,
      hashSunat: ublResult.hash,
      qrString: ublResult.qrString,
      xmlBase64: ublResult.xmlBase64,
      cdrBase64: sendRes.cdrZipBase64,
      pdfBase64,
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
  await registrarComprobante({
    empresaId: empresaAuth?.id || null,
    empresaRuc: emisor.ruc,
    tipoComprobante: body.tipoComprobante,
    serie: body.serie,
    numero: body.numero,
    fechaEmision,
    horaEmision,
    moneda: body.moneda,
    clienteTipoDoc: body.cliente.tipoDoc,
    clienteNumDoc: body.cliente.numDoc,
    clienteNombre: body.cliente.nombre,
    totalGravadas: docData.totalGravadas,
    totalIgv: docData.totalIgv,
    total: docData.totalVenta,
    estadoSunat: "ACEPTADO",
    sunatCode: "0",
    sunatDescription: ublResult.descripcionSunat,
    hashSunat: ublResult.hash,
    qrString: ublResult.qrString,
    xmlBase64: ublResult.xmlBase64,
    cdrBase64: ublResult.cdrBase64,
  });

  // Generar PDF (A4 o Ticket)
  const formatoPdf = (body.formatoPdf || c.req.query("pdf") || "a4") as "a4" | "ticket" | "ticket58";
  const pdfBuffer = await generateInvoicePdf(
    {
      tipoComprobante: body.tipoComprobante,
      serie: body.serie,
      numero: body.numero,
      fechaEmision,
      horaEmision,
      moneda: body.moneda,
      emisor,
      cliente: body.cliente,
      items: body.items.map((i) => ({
        cantidad: i.cantidad,
        unidadMedida: i.unidadMedida,
        descripcion: i.descripcion,
        precioUnitario: i.precioUnitario,
        total: +(i.cantidad * i.precioUnitario).toFixed(2),
      })),
      totales: {
        gravadas: docData.totalGravadas,
        exoneradas: docData.totalExoneradas,
        inafectas: docData.totalInafectas,
        igv: docData.totalIgv,
        total: docData.totalVenta,
      },
      medioPago: body.medioPago,
      hashSunat: ublResult.hash,
      qrString: ublResult.qrString,
    },
    formatoPdf
  );
  const pdfBase64 = pdfBuffer.toString("base64");

  return c.json({
    success: true,
    comprobante: `${body.serie}-${body.numero}`,
    tipoComprobante: body.tipoComprobante,
    hashSunat: ublResult.hash,
    qrString: ublResult.qrString,
    xmlBase64: ublResult.xmlBase64,
    cdrBase64: ublResult.cdrBase64,
    pdfBase64,
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

/**
 * GET /api/v1/cpe/:id/pdf - Descarga o previsualiza el PDF oficial (A4 o Ticket 80mm/58mm)
 * Parámetros query: format=a4 (por defecto) | format=ticket | format=ticket58
 */
cpeRouter.get("/:id/pdf", async (c) => {
  const id = c.req.param("id");
  const format = (c.req.query("format") || "a4").toLowerCase() as "a4" | "ticket" | "ticket58";

  const comp = await obtenerComprobantePorId(id);
  if (!comp) {
    return c.json({ success: false, error: "Comprobante no encontrado." }, 404);
  }

  let pdfData;
  if (comp.xml_base64) {
    const xmlContent = Buffer.from(comp.xml_base64, "base64").toString("utf-8");
    pdfData = parseUblXmlToPdfData(xmlContent, {
      tipoComprobante: comp.tipo_comprobante,
      serie: comp.serie,
      numero: comp.numero,
      fechaEmision: comp.fecha_emision,
      horaEmision: comp.hora_emision,
      moneda: comp.moneda,
      emisor: { ruc: comp.empresa_ruc, razonSocial: "EMPRESA FISCAL S.A.C." },
      cliente: { numDoc: comp.cliente_num_doc, nombre: comp.cliente_nombre },
      totales: { gravadas: comp.total_gravadas, igv: comp.total_igv, total: comp.total },
      hashSunat: comp.hash_sunat,
      qrString: comp.qr_string,
    });
  } else {
    pdfData = {
      tipoComprobante: comp.tipo_comprobante,
      serie: comp.serie,
      numero: comp.numero,
      fechaEmision: comp.fecha_emision,
      horaEmision: comp.hora_emision || "00:00:00",
      moneda: comp.moneda || "PEN",
      emisor: { ruc: comp.empresa_ruc, razonSocial: "EMPRESA FISCAL S.A.C." },
      cliente: { numDoc: comp.cliente_num_doc || "00000000", nombre: comp.cliente_nombre || "CLIENTES VARIOS" },
      items: [],
      totales: {
        gravadas: comp.total_gravadas || 0,
        igv: comp.total_igv || 0,
        total: comp.total,
      },
      hashSunat: comp.hash_sunat,
      qrString: comp.qr_string,
    };
  }

  const pdfBuffer = await generateInvoicePdf(pdfData, format);
  const numPadded = String(comp.numero).padStart(8, "0");
  const fileName = `${comp.serie}-${numPadded}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
});
