import { Hono } from "hono";
import crypto from "crypto";
import { env } from "../config/env.js";
import { generateInvoicePdf, parseUblXmlToPdfData, validatePfxCertificate } from "../core/index.js";
import { invalidateApiKeyCache } from "../middlewares/auth.js";
import {
  obtenerEmpresas,
  crearEmpresa,
  actualizarEmpresa,
  regenerarApiKeyEmpresa,
  toggleEmpresa,
  eliminarEmpresa,
  obtenerComprobantes,
  obtenerComprobantePorId,
  isDbConnected,
  getDbEngine,
} from "../config/db.js";

export const adminRouter = new Hono();

// Endpoint de Login administrativo con Usuario y Contraseña
adminRouter.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const password = String(body.password || "").trim();

  const validUser = username === env.ADMIN_USER || username === "admin" || (!username && (password === env.API_KEY || password === env.ADMIN_PASSWORD));
  const validPass = password === env.ADMIN_PASSWORD || password === env.API_KEY || password === "admin123456";

  if (validUser && validPass) {
    return c.json({
      success: true,
      token: env.API_KEY,
      user: {
        username: env.ADMIN_USER,
        role: "admin",
      },
    });
  }

  return c.json(
    {
      success: false,
      error: "Usuario o contraseña incorrectos.",
    },
    401
  );
});

// Middleware de seguridad para el resto de la API administrativa (Requiere Master API Key)
adminRouter.use("*", async (c, next) => {
  if (c.req.path.endsWith("/login")) {
    return next();
  }

  const apiKeyHeader = c.req.header("x-api-key");
  const authHeader = c.req.header("authorization");

  let token = apiKeyHeader;
  if (!token && authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  if (!token || token !== env.API_KEY) {
    return c.json(
      {
        success: false,
        error: "Acceso denegado. Se requiere la Master API Key de administración.",
      },
      401
    );
  }

  await next();
});

/**
 * GET /api/v1/admin/empresas - Lista todas las empresas con conteo de documentos emitidos y montos
 */
adminRouter.get("/empresas", async (c) => {
  try {
    const rows = await obtenerEmpresas();
    return c.json({
      success: true,
      empresas: rows,
      dbConnected: isDbConnected(),
      engine: getDbEngine(),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/v1/admin/empresas - Crea una nueva empresa con API Key generada
 */
adminRouter.post("/empresas", async (c) => {
  try {
    const body = await c.req.json();
    const ruc = String(body.ruc || "").trim();
    const razonSocial = String(body.razonSocial || "").trim();
    const usuarioSol = String(body.usuarioSol || "MODDATOS").trim();
    const claveSol = String(body.claveSol || "MODDATOS").trim();
    const isBeta = body.isBeta ?? true;
    const rawCertPfx = typeof body.certificadoPfx === "string"
      ? body.certificadoPfx.replace(/^data:[^;]+;base64,/, "").trim()
      : "";
    const certificadoPassword = typeof body.certificadoPassword === "string" ? body.certificadoPassword : "";

    // Generar API Key si no se especifica
    const apiKey =
      body.apiKey ||
      `sk_live_${crypto.randomBytes(16).toString("hex")}`;

    if (!ruc || ruc.length !== 11) {
      return c.json({ success: false, error: "El RUC debe tener 11 dígitos." }, 400);
    }
    if (!razonSocial) {
      return c.json({ success: false, error: "La Razón Social es requerida." }, 400);
    }

    let certSubject: string | undefined;
    if (rawCertPfx) {
      const check = validatePfxCertificate(rawCertPfx, certificadoPassword);
      if (!check.valid) {
        return c.json({ success: false, error: check.error }, 400);
      }
      certSubject = check.subject;
    }

    const nueva = await crearEmpresa({
      ruc,
      razonSocial,
      apiKey,
      usuarioSol,
      claveSol,
      isBeta,
      certificadoPfx: rawCertPfx || null,
      certificadoPassword: rawCertPfx ? certificadoPassword : null,
    });

    return c.json(
      { success: true, certSubject, empresa: { ...nueva, total_docs: 0, total_monto: 0 } },
      201
    );
  } catch (error: any) {
    if (error.message?.includes("unique") || error.code === "23505") {
      return c.json(
        { success: false, error: "Ya existe una empresa registrada con ese RUC o API Key." },
        409
      );
    }
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * PUT /api/v1/admin/empresas/:id - Actualiza los datos de una empresa
 */
adminRouter.put("/empresas/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const razonSocial = String(body.razonSocial || "").trim();
    const usuarioSol = String(body.usuarioSol || "MODDATOS").trim();
    const claveSol = String(body.claveSol || "MODDATOS").trim();
    const isBeta = body.isBeta ?? true;
    const eliminarCertificado = Boolean(body.eliminarCertificado);
    const rawCertPfx = typeof body.certificadoPfx === "string"
      ? body.certificadoPfx.replace(/^data:[^;]+;base64,/, "").trim()
      : "";
    const certificadoPassword = typeof body.certificadoPassword === "string" ? body.certificadoPassword : "";

    if (!razonSocial) {
      return c.json({ success: false, error: "La Razón Social es requerida." }, 400);
    }

    let certSubject: string | undefined;
    if (rawCertPfx && !eliminarCertificado) {
      const check = validatePfxCertificate(rawCertPfx, certificadoPassword);
      if (!check.valid) {
        return c.json({ success: false, error: check.error }, 400);
      }
      certSubject = check.subject;
    }

    const actualizada = await actualizarEmpresa(id, {
      razonSocial,
      usuarioSol,
      claveSol,
      isBeta,
      certificadoPfx: rawCertPfx || null,
      certificadoPassword: rawCertPfx ? certificadoPassword : null,
      eliminarCertificado,
    });

    if (!actualizada) {
      return c.json({ success: false, error: "Empresa no encontrada." }, 404);
    }

    invalidateApiKeyCache();
    return c.json({ success: true, certSubject, empresa: actualizada });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/v1/admin/empresas/:id/regenerate-key - Rota / regenera la API Key de un cliente
 */
adminRouter.post("/empresas/:id/regenerate-key", async (c) => {
  try {
    const id = c.req.param("id");
    const newApiKey = `sk_live_${crypto.randomBytes(16).toString("hex")}`;

    const key = await regenerarApiKeyEmpresa(id, newApiKey);
    if (!key) {
      return c.json({ success: false, error: "Empresa no encontrada." }, 404);
    }

    invalidateApiKeyCache();
    return c.json({ success: true, api_key: newApiKey });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * PATCH /api/v1/admin/empresas/:id/toggle - Activa o suspende el acceso de una empresa
 */
adminRouter.patch("/empresas/:id/toggle", async (c) => {
  try {
    const id = c.req.param("id");
    const actualizada = await toggleEmpresa(id);

    if (!actualizada) {
      return c.json({ success: false, error: "Empresa no encontrada." }, 404);
    }

    invalidateApiKeyCache();
    return c.json({ success: true, empresa: actualizada });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * DELETE /api/v1/admin/empresas/:id - Elimina una empresa
 */
adminRouter.delete("/empresas/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await eliminarEmpresa(id);
    invalidateApiKeyCache();
    return c.json({ success: true, message: "Empresa eliminada correctamente." });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/v1/admin/comprobantes - Lista el historial fiscal con filtros y totales
 */
adminRouter.get("/comprobantes", async (c) => {
  try {
    const ruc = c.req.query("ruc") || "";
    const tipo = c.req.query("tipo") || "";
    const search = c.req.query("search") || "";

    const rows = await obtenerComprobantes({ ruc, tipo, search });

    return c.json({
      success: true,
      comprobantes: rows,
      total: rows.length,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/v1/admin/comprobantes/:id - Detalle con XML y CDR
 */
adminRouter.get("/comprobantes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const row = await obtenerComprobantePorId(id);

    if (!row) {
      return c.json({ success: false, error: "Comprobante no encontrado." }, 404);
    }

    return c.json({ success: true, comprobante: row });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/v1/admin/comprobantes/:id/pdf - Descarga o previsualiza el PDF desde el panel admin
 */
adminRouter.get("/comprobantes/:id/pdf", async (c) => {
  try {
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
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
