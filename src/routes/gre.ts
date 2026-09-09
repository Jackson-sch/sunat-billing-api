import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { EmitGreSchema } from "@/schemas/gre.schema";
import { env } from "@/config/env";
import { buildGreXml, GreDocumentData, GreItem } from "@/core";

export const greRouter = new Hono();

greRouter.post("/emitir", zValidator("json", EmitGreSchema), async (c) => {
  const body = c.req.valid("json");

  const now = new Date();
  const fechaEmision = body.fechaEmision || now.toISOString().split("T")[0]!;
  const horaEmision = body.horaEmision || now.toTimeString().split(" ")[0]!;

  const remitente = {
    ruc: body.remitente?.ruc || env.SUNAT_RUC,
    razonSocial: body.remitente?.razonSocial || "NOVAMARKET SUPERMERCADOS S.A.C.",
    nombreComercial: body.remitente?.nombreComercial || "NovaMarket",
    direccion: body.remitente?.direccion || "Av. Principal 123 - Surco, Lima",
    ubigeo: body.remitente?.ubigeo || "150101",
    departamento: body.remitente?.departamento || "LIMA",
    provincia: body.remitente?.provincia || "LIMA",
    distrito: body.remitente?.distrito || "LIMA",
  };

  const items: GreItem[] = body.items.map((it, idx) => ({
    id: it.id || `item-${idx + 1}`,
    sku: it.sku,
    descripcion: it.descripcion,
    cantidad: it.cantidad,
    unidadMedida: it.unidadMedida,
    pesoKgm: it.pesoKgm,
  }));

  const greData: GreDocumentData = {
    tipoComprobante: "09",
    serie: body.serie,
    numero: body.numero,
    fechaEmision,
    horaEmision,
    fechaInicioTraslado: body.fechaInicioTraslado,
    motivoTraslado: body.motivoTraslado,
    motivoDescripcion: body.motivoDescripcion,
    modalidadTransporte: body.modalidadTransporte,
    pesoBrutoTotal: body.pesoBrutoTotal,
    unidadPeso: "KGM",
    totalBultos: body.totalBultos,
    partida: body.partida,
    llegada: body.llegada,
    remitente,
    destinatario: body.destinatario,
    transportista: body.transportista,
    conductor: body.conductor,
    vehiculo: body.vehiculo,
    items,
  };

  const greResult = buildGreXml(greData);

  return c.json({
    success: true,
    comprobante: `${body.serie}-${String(body.numero).padStart(8, "0")}`,
    tipoComprobante: "09",
    hashSunat: greResult.hash,
    qrString: greResult.qrString,
    xmlBase64: greResult.xmlBase64,
    cdrBase64: greResult.cdrBase64,
    sunatResponse: {
      code: "0",
      message: greResult.descripcionSunat,
      estado: "ACEPTADO",
    },
  });
});
