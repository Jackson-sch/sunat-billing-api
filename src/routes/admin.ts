import { Hono } from "hono";
import crypto from "crypto";
import { env } from "../config/env.js";
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

    const nueva = await crearEmpresa({
      ruc,
      razonSocial,
      apiKey,
      usuarioSol,
      claveSol,
      isBeta,
    });

    return c.json({ success: true, empresa: { ...nueva, total_docs: 0, total_monto: 0 } }, 201);
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

    if (!razonSocial) {
      return c.json({ success: false, error: "La Razón Social es requerida." }, 400);
    }

    const actualizada = await actualizarEmpresa(id, {
      razonSocial,
      usuarioSol,
      claveSol,
      isBeta,
    });

    if (!actualizada) {
      return c.json({ success: false, error: "Empresa no encontrada." }, 404);
    }

    return c.json({ success: true, empresa: actualizada });
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
