import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  ResumenDiarioSchema,
  ComunicacionBajaSchema,
} from "../schemas/resumenes.schema";
import { env } from "../config/env";
import {
  buildResumenDiarioXml,
  buildComunicacionBajasXml,
  SunatSoapClient,
  createSunatZip,
} from "../core";

export const resumenesRouter = new Hono();

/**
 * POST /api/v1/resumenes/rc - Envío de Resumen Diario de Boletas
 */
resumenesRouter.post("/rc", zValidator("json", ResumenDiarioSchema), async (c) => {
  const body = c.req.valid("json");
  const now = new Date();
  const fechaGeneracion = body.fechaGeneracionResumen || now.toISOString().split("T")[0]!;
  const fechaDocCompact = body.fechaEmisionComprobantes.replace(/-/g, "");
  const resumenId = `RC-${fechaDocCompact}-${String(body.correlativo).padStart(3, "0")}`;

  const emisor = {
    emisorRuc: body.emisor?.ruc || env.SUNAT_RUC,
    emisorRazonSocial: body.emisor?.razonSocial || "NOVAMARKET SUPERMERCADOS S.A.C.",
    emisorNombreComercial: body.emisor?.nombreComercial || "NovaMarket",
    resumenId,
    fechaEmisionComprobantes: body.fechaEmisionComprobantes,
    fechaGeneracionResumen: fechaGeneracion,
    items: body.items,
  };

  const { xml, hashSunat } = buildResumenDiarioXml(emisor);

  if (body.enviarASunat) {
    const credentials = {
      ruc: emisor.emisorRuc,
      usuarioSol: body.emisor?.usuarioSol || env.SUNAT_USUARIO_SOL,
      claveSol: body.emisor?.claveSol || env.SUNAT_CLAVE_SOL,
      isBeta: body.emisor?.isBeta ?? (env.SUNAT_ENV === "beta"),
    };

    const soapClient = new SunatSoapClient(credentials);
    const fileName = `${emisor.emisorRuc}-${resumenId}`;
    const zipBuffer = await createSunatZip(fileName, xml);

    const sendRes = await soapClient.sendSummary(fileName, zipBuffer);

    return c.json({
      success: sendRes.success,
      resumenId,
      ticket: sendRes.ticket || `MOCK-${Date.now()}`,
      hashSunat,
      xmlBase64: Buffer.from(xml, "utf-8").toString("base64"),
      sunatResponse: {
        message: sendRes.success ? "Resumen diario recibido y en proceso por SUNAT." : sendRes.error,
        estado: sendRes.success ? "EN_COLA" : "RECHAZADO",
      },
    });
  }

  return c.json({
    success: true,
    resumenId,
    ticket: `TICKET-LOCAL-${Date.now()}`,
    hashSunat,
    xmlBase64: Buffer.from(xml, "utf-8").toString("base64"),
    sunatResponse: {
      message: "Resumen diario generado exitosamente.",
      estado: "GENERADO",
    },
  });
});

/**
 * POST /api/v1/resumenes/ra - Envío de Comunicación de Bajas
 */
resumenesRouter.post("/ra", zValidator("json", ComunicacionBajaSchema), async (c) => {
  const body = c.req.valid("json");
  const now = new Date();
  const fechaGeneracion = body.fechaGeneracionBaja || now.toISOString().split("T")[0]!;
  const fechaDocCompact = body.fechaEmisionDocumentos.replace(/-/g, "");
  const bajaId = `RA-${fechaDocCompact}-${String(body.correlativo).padStart(3, "0")}`;

  const emisor = {
    emisorRuc: body.emisor?.ruc || env.SUNAT_RUC,
    emisorRazonSocial: body.emisor?.razonSocial || "NOVAMARKET SUPERMERCADOS S.A.C.",
    bajaId,
    fechaEmisionDocumentos: body.fechaEmisionDocumentos,
    fechaGeneracionBaja: fechaGeneracion,
    items: body.items,
  };

  const { xml, hashSunat } = buildComunicacionBajasXml(emisor);

  if (body.enviarASunat) {
    const credentials = {
      ruc: emisor.emisorRuc,
      usuarioSol: body.emisor?.usuarioSol || env.SUNAT_USUARIO_SOL,
      claveSol: body.emisor?.claveSol || env.SUNAT_CLAVE_SOL,
      isBeta: body.emisor?.isBeta ?? (env.SUNAT_ENV === "beta"),
    };

    const soapClient = new SunatSoapClient(credentials);
    const fileName = `${emisor.emisorRuc}-${bajaId}`;
    const zipBuffer = await createSunatZip(fileName, xml);

    const sendRes = await soapClient.sendSummary(fileName, zipBuffer);

    return c.json({
      success: sendRes.success,
      bajaId,
      ticket: sendRes.ticket || `MOCK-${Date.now()}`,
      hashSunat,
      xmlBase64: Buffer.from(xml, "utf-8").toString("base64"),
      sunatResponse: {
        message: sendRes.success ? "Comunicación de baja recibida y en proceso por SUNAT." : sendRes.error,
        estado: sendRes.success ? "EN_COLA" : "RECHAZADO",
      },
    });
  }

  return c.json({
    success: true,
    bajaId,
    ticket: `TICKET-LOCAL-${Date.now()}`,
    hashSunat,
    xmlBase64: Buffer.from(xml, "utf-8").toString("base64"),
    sunatResponse: {
      message: "Comunicación de baja generada exitosamente.",
      estado: "GENERADO",
    },
  });
});

/**
 * GET /api/v1/resumenes/status/:ticket - Consulta de Ticket RC/RA
 */
resumenesRouter.get("/status/:ticket", async (c) => {
  const ticket = c.req.param("ticket");
  const ruc = c.req.query("ruc") || env.SUNAT_RUC;
  const usuarioSol = c.req.query("usuarioSol") || env.SUNAT_USUARIO_SOL;
  const claveSol = c.req.query("claveSol") || env.SUNAT_CLAVE_SOL;
  const isBeta = c.req.query("isBeta") ? c.req.query("isBeta") === "true" : (env.SUNAT_ENV === "beta");

  const soapClient = new SunatSoapClient({ ruc, usuarioSol, claveSol, isBeta });
  const result = await soapClient.getStatus(ticket);

  return c.json({
    success: result.success,
    ticket,
    statusCode: result.statusCode,
    responseCode: result.responseCode,
    description: result.description,
    cdrZipBase64: result.cdrZipBase64,
    estado: result.statusCode === 0 ? "ACEPTADO" : result.statusCode === 98 ? "EN_PROCESO" : "RECHAZADO",
  });
});
