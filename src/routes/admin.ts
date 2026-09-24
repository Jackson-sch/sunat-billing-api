import { Hono } from "hono";
import crypto from "crypto";
import { env } from "../config/env.js";
import { getDb } from "../config/db.js";

export const adminRouter = new Hono();

// Middleware de seguridad para la API administrativa (Requiere Master API Key)
adminRouter.use("*", async (c, next) => {
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
 * GET /api/v1/admin/empresas - Lista todas las empresas registradas
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
          created_at: new Date().toISOString(),
        },
      ],
      dbConnected: false,
    });
  }

  try {
    const rows = await sql`
      SELECT id, ruc, razon_social, api_key, usuario_sol, is_beta, activo, created_at
      FROM empresas
      ORDER BY created_at DESC
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

    return c.json({ success: true, empresa: nueva }, 201);
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
