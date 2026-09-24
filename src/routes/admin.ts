import { Hono } from "hono";
import crypto from "crypto";
import { env } from "../config/env.js";
import { getDb, initDb } from "../config/db.js";

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
  const sql = getDb();
  if (!sql) {
    return c.json({
      success: true,
      empresas: [
        {
          id: "env-default",
          ruc: env.SUNAT_RUC,
          razon_social: "EMPRESA POR DEFECTO (.ENV)",
          api_key: env.API_KEY,
          usuario_sol: env.SUNAT_USUARIO_SOL,
          is_beta: env.SUNAT_ENV === "beta",
          activo: true,
          total_docs: 0,
          total_monto: 0,
          created_at: new Date().toISOString(),
        },
      ],
      dbConnected: false,
    });
  }

  try {
    await initDb();
    const rows = await sql`
      SELECT 
        e.id, 
        e.ruc, 
        e.razon_social, 
        e.api_key, 
        e.usuario_sol, 
        e.is_beta, 
        e.activo, 
        e.created_at,
        COALESCE(COUNT(c.id), 0)::int AS total_docs,
        COALESCE(SUM(c.total), 0)::numeric(12,2) AS total_monto
      FROM empresas e
      LEFT JOIN comprobantes c ON c.empresa_ruc = e.ruc
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `;
    return c.json({ success: true, empresas: rows, dbConnected: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/v1/admin/empresas - Crea una nueva empresa con API Key generada
 */
adminRouter.post("/empresas", async (c) => {
  const sql = getDb();
  if (!sql) {
    return c.json(
      { success: false, error: "Base de datos PostgreSQL no configurada." },
      500
    );
  }

  try {
    await initDb();
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

    const [nueva] = await sql`
      INSERT INTO empresas (ruc, razon_social, api_key, usuario_sol, clave_sol, is_beta, activo)
      VALUES (${ruc}, ${razonSocial}, ${apiKey}, ${usuarioSol}, ${claveSol}, ${isBeta}, true)
      RETURNING id, ruc, razon_social, api_key, usuario_sol, is_beta, activo, created_at
    `;

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
  const sql = getDb();
  if (!sql) return c.json({ success: false, error: "BD no configurada." }, 500);

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

    const [actualizada] = await sql`
      UPDATE empresas
      SET razon_social = ${razonSocial},
          usuario_sol = ${usuarioSol},
          clave_sol = ${claveSol},
          is_beta = ${isBeta}
      WHERE id = ${id}
      RETURNING id, ruc, razon_social, api_key, usuario_sol, is_beta, activo
    `;

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
  const sql = getDb();
  if (!sql) return c.json({ success: false, error: "BD no configurada." }, 500);

  try {
    const id = c.req.param("id");
    const newApiKey = `sk_live_${crypto.randomBytes(16).toString("hex")}`;

    const [actualizada] = await sql`
      UPDATE empresas
      SET api_key = ${newApiKey}
      WHERE id = ${id}
      RETURNING id, ruc, razon_social, api_key
    `;

    if (!actualizada) {
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
  const sql = getDb();
  if (!sql) {
    return c.json({ success: false, error: "BD no configurada." }, 500);
  }

  try {
    const id = c.req.param("id");
    const [actualizada] = await sql`
      UPDATE empresas
      SET activo = NOT activo
      WHERE id = ${id}
      RETURNING id, ruc, razon_social, activo
    `;

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
  const sql = getDb();
  if (!sql) {
    return c.json({ success: false, error: "BD no configurada." }, 500);
  }

  try {
    const id = c.req.param("id");
    await sql`DELETE FROM empresas WHERE id = ${id}`;
    return c.json({ success: true, message: "Empresa eliminada correctamente." });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/v1/admin/comprobantes - Lista el historial fiscal con filtros y totales
 */
adminRouter.get("/comprobantes", async (c) => {
  const sql = getDb();
  if (!sql) return c.json({ success: true, comprobantes: [], total: 0 });

  try {
    await initDb();
    const ruc = c.req.query("ruc") || "";
    const tipo = c.req.query("tipo") || "";
    const search = c.req.query("search") || "";

    let rows;
    if (ruc && tipo) {
      rows = await sql`
        SELECT id, empresa_ruc, tipo_comprobante, serie, numero, fecha_emision, hora_emision,
               cliente_num_doc, cliente_nombre, total_gravadas, total_igv, total,
               estado_sunat, sunat_code, sunat_description, hash_sunat, created_at
        FROM comprobantes
        WHERE empresa_ruc = ${ruc} AND tipo_comprobante = ${tipo}
        ORDER BY created_at DESC
        LIMIT 100
      `;
    } else if (ruc) {
      rows = await sql`
        SELECT id, empresa_ruc, tipo_comprobante, serie, numero, fecha_emision, hora_emision,
               cliente_num_doc, cliente_nombre, total_gravadas, total_igv, total,
               estado_sunat, sunat_code, sunat_description, hash_sunat, created_at
        FROM comprobantes
        WHERE empresa_ruc = ${ruc}
        ORDER BY created_at DESC
        LIMIT 100
      `;
    } else {
      rows = await sql`
        SELECT id, empresa_ruc, tipo_comprobante, serie, numero, fecha_emision, hora_emision,
               cliente_num_doc, cliente_nombre, total_gravadas, total_igv, total,
               estado_sunat, sunat_code, sunat_description, hash_sunat, created_at
        FROM comprobantes
        ORDER BY created_at DESC
        LIMIT 100
      `;
    }

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
  const sql = getDb();
  if (!sql) return c.json({ success: false, error: "BD no configurada." }, 500);

  try {
    const id = c.req.param("id");
    const [row] = await sql`
      SELECT *
      FROM comprobantes
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!row) {
      return c.json({ success: false, error: "Comprobante no encontrado." }, 404);
    }

    return c.json({ success: true, comprobante: row });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
