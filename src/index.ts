import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { apiReference } from "@scalar/hono-api-reference";
import { env } from "./config/env.js";
import { apiKeyAuth } from "./middlewares/auth.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { healthRouter } from "./routes/health.js";
import { cpeRouter } from "./routes/cpe.js";
import { greRouter } from "./routes/gre.js";
import { resumenesRouter } from "./routes/resumenes.js";
import { consultasRouter } from "./routes/consultas.js";
import { sireRouter } from "./routes/sire.js";
import { adminRouter } from "./routes/admin.js";
import { adminUiRouter } from "./routes/admin-ui.js";

const app = new Hono();

// Global Middlewares
app.use("*", logger());
app.use("*", cors());
app.use("*", prettyJSON());
app.use("*", apiKeyAuth);
app.onError(errorHandler);

// OpenAPI Specification Route
app.get("/openapi.json", (c) => {
  const origin = new URL(c.req.url).origin;

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
        url: origin,
        description: "Servidor Activo",
      },
      {
        url: "https://sunat-billing-api.vercel.app",
        description: "Producción (Vercel)",
      },
      {
        url: `http://localhost:${env.PORT}`,
        description: "Desarrollo Local (Bun)",
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
    <html lang="es" class="dark">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SUNAT Billing API | Facturación Electrónica UBL 2.1</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
        <script>
          tailwind.config = {
            darkMode: 'class',
            theme: {
              extend: {
                fontFamily: {
                  sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                  mono: ['"JetBrains Mono"', 'monospace'],
                }
              }
            }
          }
        </script>
        <style>
          body {
            background-color: #030712;
            color: #f3f4f6;
            background-image: 
              radial-gradient(at 15% 15%, rgba(13, 148, 136, 0.12) 0px, transparent 40%),
              radial-gradient(at 85% 20%, rgba(99, 102, 241, 0.12) 0px, transparent 40%),
              radial-gradient(at 50% 80%, rgba(16, 185, 129, 0.08) 0px, transparent 40%);
            background-attachment: fixed;
          }
          .glass-panel {
            background: rgba(17, 24, 39, 0.65);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }
          .glass-panel:hover {
            border-color: rgba(45, 212, 191, 0.25);
          }
        </style>
      </head>
      <body class="min-h-screen flex flex-col font-sans selection:bg-teal-500/20 selection:text-teal-300">
        <!-- NAVBAR -->
        <header class="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <i data-lucide="zap" class="w-5 h-5 text-white"></i>
              </div>
              <div>
                <span class="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  SUNAT Billing API
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">v1.0</span>
                </span>
                <span class="text-[11px] text-slate-400 block -mt-0.5">Bun + Hono Microservice</span>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <a href="/docs" class="text-xs text-slate-300 hover:text-white px-3.5 py-2 rounded-xl hover:bg-slate-800/60 flex items-center gap-1.5 transition">
                <i data-lucide="book-open" class="w-4 h-4"></i>
                <span class="hidden sm:inline">Documentación API</span>
              </a>
              <a href="/admin" class="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-lg shadow-teal-500/20 flex items-center gap-1.5 transition">
                <i data-lucide="shield-check" class="w-4 h-4"></i>
                <span>Panel Admin</span>
              </a>
            </div>
          </div>
        </header>

        <!-- HERO SECTION -->
        <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col items-center text-center">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300 mb-6 shadow-sm">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>UBL 2.1 &bull; SEE Contribuyente &bull; Multi-Tenant</span>
          </div>

          <h1 class="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight max-w-3xl leading-[1.15]">
            Facturación Electrónica <span class="bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-400 bg-clip-text text-transparent">SUNAT</span> de Alto Rendimiento
          </h1>

          <p class="mt-5 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
            Microservicio moderno para emisión de Facturas, Boletas, Guías de Remisión (GRE), SIRE y consultas RUC/DNI en tiempo real con arquitectura multi-empresa sobre Supabase.
          </p>

          <!-- CTA BUTTONS -->
          <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="/admin" class="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-xl shadow-teal-500/20 flex items-center gap-2 transition hover:-translate-y-0.5">
              <i data-lucide="layout-dashboard" class="w-4 h-4"></i>
              <span>Acceder al Dashboard</span>
            </a>
            <a href="/docs" class="bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm px-6 py-3 rounded-xl flex items-center gap-2 transition hover:-translate-y-0.5">
              <i data-lucide="code-2" class="w-4 h-4 text-teal-400"></i>
              <span>Explorar Swagger API</span>
            </a>
          </div>

          <!-- FEATURES GRID -->
          <div class="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-left w-full">
            
            <div class="glass-panel p-6 rounded-2xl transition hover:-translate-y-1">
              <div class="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
                <i data-lucide="file-check-2" class="w-5 h-5"></i>
              </div>
              <h3 class="font-bold text-white text-base mb-1.5">Comprobantes UBL 2.1</h3>
              <p class="text-xs text-slate-400 leading-relaxed">
                Emisión de Facturas (01), Boletas (03), Notas de Crédito (07) y Débito (08) firmadas digitalmente con XMLDSig y CDR de respuesta.
              </p>
            </div>

            <div class="glass-panel p-6 rounded-2xl transition hover:-translate-y-1">
              <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <i data-lucide="truck" class="w-5 h-5"></i>
              </div>
              <h3 class="font-bold text-white text-base mb-1.5">Guías de Remisión (GRE)</h3>
              <p class="text-xs text-slate-400 leading-relaxed">
                Generación y validación de Guías Remitente y Transportista (tipo 09) adaptadas a la normativa electrónica obligatoria de SUNAT.
              </p>
            </div>

            <div class="glass-panel p-6 rounded-2xl transition hover:-translate-y-1">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <i data-lucide="search" class="w-5 h-5"></i>
              </div>
              <h3 class="font-bold text-white text-base mb-1.5">Padrón RUC y DNI</h3>
              <p class="text-xs text-slate-400 leading-relaxed">
                Consultas instantáneas para autocompletar razón social, dirección fiscal, estado activo y condición de habido ante SUNAT y RENIEC.
              </p>
            </div>

            <div class="glass-panel p-6 rounded-2xl transition hover:-translate-y-1">
              <div class="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                <i data-lucide="layers" class="w-5 h-5"></i>
              </div>
              <h3 class="font-bold text-white text-base mb-1.5">Multi-Tenant con Supabase</h3>
              <p class="text-xs text-slate-400 leading-relaxed">
                Soporte para múltiples empresas con API Keys aisladas (<code class="text-purple-300 font-mono">sk_live_...</code>), credenciales SOL encriptadas y control de cuotas.
              </p>
            </div>

            <div class="glass-panel p-6 rounded-2xl transition hover:-translate-y-1">
              <div class="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4">
                <i data-lucide="printer" class="w-5 h-5"></i>
              </div>
              <h3 class="font-bold text-white text-base mb-1.5">Tickets Térmicos 80mm</h3>
              <p class="text-xs text-slate-400 leading-relaxed">
                Vista previa e impresión directa de tickets con código QR canónico oficial de SUNAT para cajas y puntos de venta físicos (POS).
              </p>
            </div>

            <div class="glass-panel p-6 rounded-2xl transition hover:-translate-y-1">
              <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <i data-lucide="book-check" class="w-5 h-5"></i>
              </div>
              <h3 class="font-bold text-white text-base mb-1.5">Libros Electrónicos SIRE</h3>
              <p class="text-xs text-slate-400 leading-relaxed">
                Generador de archivos planos estructurados para Registro de Ventas e Ingresos (RVIE 14.1) y Compras (RCE 8.1).
              </p>
            </div>

          </div>

          <!-- INTEGRATION PREVIEW -->
          <div class="mt-16 w-full max-w-3xl glass-panel p-6 rounded-2xl text-left border border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i data-lucide="terminal" class="w-4 h-4 text-teal-400"></i>
                <span class="text-xs font-bold text-slate-200">Consumo Rápido de la API</span>
              </div>
              <span class="text-[11px] font-mono text-slate-400">POST /api/v1/cpe/emitir</span>
            </div>
            <pre class="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed"><code>curl -X POST https://sunat-billing-api.vercel.app/api/v1/cpe/emitir \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_TU_EMPRESA_KEY" \
  -d '{"tipoComprobante":"03","serie":"B001","numero":1,"moneda":"PEN","total":1.00}'</code></pre>
          </div>
        </main>

        <!-- FOOTER -->
        <footer class="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
          <div class="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>SUNAT Billing API &copy; 2026 &bull; Conexión Segura TLS / WS-Security</span>
            <div class="flex items-center gap-4 text-slate-400">
              <a href="/api/v1/health" target="_blank" class="hover:text-teal-400 transition">Telemetría / Health</a>
              <a href="/docs" class="hover:text-teal-400 transition">Documentación</a>
              <a href="/admin" class="hover:text-teal-400 transition">Panel Administrativo</a>
            </div>
          </div>
        </footer>

        <script>
          lucide.createIcons();
        </script>
      </body>
    </html>
  `);
});

// Mount Routes
app.route("/admin", adminUiRouter);
app.route("/api/v1/admin", adminRouter);
app.route("/api/v1/health", healthRouter);
app.route("/api/v1/cpe", cpeRouter);
app.route("/api/v1/gre", greRouter);
app.route("/api/v1/resumenes", resumenesRouter);
app.route("/api/v1/consultas", consultasRouter);
app.route("/api/v1/sire", sireRouter);

console.log(`🚀 SUNAT Billing API escuchando en http://localhost:${env.PORT}`);
console.log(`🛡️ Panel Administrativo UI disponible en http://localhost:${env.PORT}/admin`);
console.log(`📖 Documentación Swagger OpenAPI disponible en http://localhost:${env.PORT}/docs`);

export default app;
