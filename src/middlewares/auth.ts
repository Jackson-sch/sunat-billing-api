import { createMiddleware } from "hono/factory";
import { env } from "@/config/env";

/**
 * Middleware para validar la clave de autenticación API Key
 * Admite:
 * - Header: `x-api-key: TU_API_KEY`
 * - Header: `Authorization: Bearer TU_API_KEY`
 */
export const apiKeyAuth = createMiddleware(async (c, next) => {
  const path = c.req.path;

  // Rutas públicas: /docs, /openapi.json, /api/v1/health
  if (
    path === "/" ||
    path.startsWith("/docs") ||
    path.startsWith("/openapi") ||
    path === "/api/v1/health"
  ) {
    return await next();
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
        error: "Acceso no autorizado. Debe proveer un header 'x-api-key' o 'Authorization: Bearer <token>' válido.",
        statusCode: 401,
      },
      401
    );
  }

  await next();
});
