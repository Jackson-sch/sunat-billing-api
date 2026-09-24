import { createMiddleware } from "hono/factory";
import { env } from "../config/env.js";
import { getDb } from "../config/db.js";

// Cache en memoria para no saturar la base de datos (Token -> { empresa, expiresAt })
const API_KEY_CACHE = new Map<string, { empresa: any; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de cache

/**
 * Middleware para validar la clave de autenticación API Key
 * Admite:
 * 1. API Key Maestra (.env / Vercel API_KEY)
 * 2. API Keys por Empresa (Almacenadas en Supabase PostgreSQL tabla `empresas`)
 */
export const apiKeyAuth = createMiddleware(async (c, next) => {
  const path = c.req.path;

  // Rutas públicas: /, /docs, /openapi.json, /api/v1/health, /admin
  if (
    path === "/" ||
    path.startsWith("/docs") ||
    path.startsWith("/openapi") ||
    path === "/api/v1/health" ||
    path.startsWith("/admin")
  ) {
    return await next();
  }

  const apiKeyHeader = c.req.header("x-api-key");
  const authHeader = c.req.header("authorization");

  let token = apiKeyHeader;
  if (!token && authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    return c.json(
      {
        success: false,
        error: "Acceso no autorizado. Debe proveer un header 'x-api-key' o 'Authorization: Bearer <token>' válido.",
        statusCode: 401,
      },
      401
    );
  }

  // 1. Validar si coincide con la API Key Maestra del entorno
  if (token === env.API_KEY) {
    return await next();
  }

  // 2. Verificar cache en memoria
  const cached = API_KEY_CACHE.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    c.set("empresa", cached.empresa);
    return await next();
  }

  // 3. Consultar en Supabase PostgreSQL tabla empresas
  const sql = getDb();
  if (sql) {
    try {
      const rows = await sql`
        SELECT id, ruc, razon_social, usuario_sol, clave_sol, is_beta, activo
        FROM empresas
        WHERE api_key = ${token} AND activo = true
        LIMIT 1
      `;

      if (rows && rows.length > 0) {
        const empresa = rows[0];
        API_KEY_CACHE.set(token, {
          empresa,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        c.set("empresa", empresa);
        return await next();
      }
    } catch (err: any) {
      console.error("Error al validar API key en Supabase:", err.message || err);
    }
  }

  return c.json(
    {
      success: false,
      error: "Acceso no autorizado. La API Key no es válida o la empresa está inactiva.",
      statusCode: 401,
    },
    401
  );
});
