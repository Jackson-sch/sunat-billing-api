import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { apiReference } from "@scalar/hono-api-reference";
import { env } from "@/config/env";
import { apiKeyAuth } from "@/middlewares/auth";
import { errorHandler } from "@/middlewares/error-handler";
import { healthRouter } from "@/routes/health";
import { cpeRouter } from "@/routes/cpe";
import { greRouter } from "@/routes/gre";
import { resumenesRouter } from "@/routes/resumenes";
import { consultasRouter } from "@/routes/consultas";
import { sireRouter } from "@/routes/sire";

const app = new Hono();

// Global Middlewares
app.use("*", logger());
app.use("*", cors());
app.use("*", prettyJSON());
app.use("*", apiKeyAuth);
app.onError(errorHandler);

// OpenAPI Specification Route
app.get("/openapi.json", (c) => {
  return c.json({
    openapi: "3.1.0",
    info: {
      title: "SUNAT Electronic Billing API (Perú)",
      version: "1.0.0",
      description:
        "Microservicio y API REST de alto rendimiento en Bun para emisión de comprobantes electrónicos (UBL 2.1), guías de remisión (GRE), resúmenes diarios (RC), bajas (RA), libros SIRE y consultas de RUC/DNI ante SUNAT.",
      contact: {
        name: "Soporte Técnico de Facturación",
        email: "facturacion@novamarket.pe",
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: "Servidor Local de Desarrollo (Bun)",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "Clave de acceso a la API",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
        },
      },
    },
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    paths: {
      "/api/v1/health": {
        get: {
          summary: "Estado y telemetría de SUNAT",
          description: "Verifica el estado del servicio y la latencia con los servidores SOAP de SUNAT.",
          responses: { "200": { description: "Servicio saludable" } },
        },
      },
      "/api/v1/cpe/emitir": {
        post: {
          summary: "Emisión de Factura, Boleta o Nota de Crédito (UBL 2.1)",
          description: "Genera el XML firmado con XMLDSig, genera código QR canónico y opcionalmente envía el comprobante a SUNAT vía SOAP/OSE.",
          responses: { "200": { description: "Comprobante emitido con éxito" } },
        },
      },
      "/api/v1/gre/emitir": {
        post: {
          summary: "Emisión de Guía de Remisión Electrónica (GRE 09)",
          description: "Genera y firma la Guía de Remisión Remitente UBL 2.1 con datos de chofer, vehículo o transportista.",
          responses: { "200": { description: "Guía de remisión emitida" } },
        },
      },
      "/api/v1/resumenes/rc": {
        post: {
          summary: "Envío de Resumen Diario de Boletas (RC)",
          description: "Genera el paquete XML de boletas y retorna el número de Ticket de SUNAT.",
          responses: { "200": { description: "Ticket generado" } },
        },
      },
      "/api/v1/resumenes/ra": {
        post: {
          summary: "Comunicación de Bajas (RA)",
          description: "Anula formalmente facturas o notas de crédito electrónicas.",
          responses: { "200": { description: "Baja generada" } },
        },
      },
      "/api/v1/resumenes/status/{ticket}": {
        get: {
          summary: "Consulta de estado de ticket RC/RA",
          description: "Consulta el estado de procesamiento del ticket en SUNAT y obtiene el CDR.",
          responses: { "200": { description: "Estado de procesamiento" } },
        },
      },
      "/api/v1/consultas/ruc": {
        post: {
          summary: "Consulta de RUC en SUNAT",
          description: "Valida algoritmo Módulo 11 y retorna razón social, estado y condición fiscal.",
          responses: { "200": { description: "Datos del contribuyente" } },
        },
      },
      "/api/v1/consultas/dni": {
        post: {
          summary: "Consulta de DNI (Padrón / RENIEC)",
          description: "Retorna nombres y apellidos completos asociados al DNI.",
          responses: { "200": { description: "Datos de la persona" } },
        },
      },
      "/api/v1/sire/ventas": {
        post: {
          summary: "Generación de archivo plano SIRE 14.1 (RVIE)",
          description: "Genera el archivo TXT estructurado con la nomenclatura oficial de SUNAT.",
          responses: { "200": { description: "TXT generado en Base64" } },
        },
      },
      "/api/v1/sire/compras": {
        post: {
          summary: "Generación de archivo plano SIRE 8.1 (RCE)",
          description: "Genera el archivo TXT oficial de compras para el SIRE.",
          responses: { "200": { description: "TXT generado en Base64" } },
        },
      },
    },
  });
});

// Interactive API Documentation via Scalar UI
app.get(
  "/docs",
  apiReference({
    spec: {
      url: "/openapi.json",
    },
    theme: "purple",
    pageTitle: "SUNAT Billing API Docs",
  })
);

// Landing / Welcome route
app.get("/", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>SUNAT Billing API</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 40px; text-align: center; }
          .card { max-width: 600px; margin: 40px auto; background: #1e293b; border: 1px solid #334155; padding: 30px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          h1 { color: #38bdf8; margin-top: 0; }
          a { display: inline-block; margin-top: 20px; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; }
          a:hover { background: #2563eb; }
          code { background: #0f172a; padding: 4px 8px; border-radius: 6px; color: #a5b4fc; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>⚡ SUNAT Billing API (Bun + Hono)</h1>
          <p>Microservicio de Facturación Electrónica UBL 2.1, GRE, SIRE y Consultas RUC/DNI en tiempo real.</p>
          <p>API Key por defecto: <code>${env.API_KEY}</code></p>
          <a href="/docs">📖 Explorar Documentación Swagger / OpenAPI</a>
        </div>
      </body>
    </html>
  `);
});

// Mount Routes
app.route("/api/v1/health", healthRouter);
app.route("/api/v1/cpe", cpeRouter);
app.route("/api/v1/gre", greRouter);
app.route("/api/v1/resumenes", resumenesRouter);
app.route("/api/v1/consultas", consultasRouter);
app.route("/api/v1/sire", sireRouter);

console.log(`🚀 SUNAT Billing API escuchando en http://localhost:${env.PORT}`);
console.log(`📖 Documentación Swagger OpenAPI disponible en http://localhost:${env.PORT}/docs`);

export default {
  port: env.PORT,
  fetch: app.fetch,
};
