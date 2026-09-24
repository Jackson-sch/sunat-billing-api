import { Hono } from "hono";
import { env } from "../config/env";
import { SUNAT_ENDPOINTS } from "../core/soap-client";

export const healthRouter = new Hono();

healthRouter.get("/", async (c) => {
  const startTime = Date.now();
  let sunatPingMs = -1;
  let sunatStatus = "desconocido";

  try {
    const pingStart = Date.now();
    const endpoint = env.SUNAT_ENV === "production" ? SUNAT_ENDPOINTS.PROD_BILL_SERVICE : SUNAT_ENDPOINTS.BETA_BILL_SERVICE;
    const res = await fetch(endpoint, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);

    sunatPingMs = Date.now() - pingStart;
    sunatStatus = res !== null ? "operativo" : "degradado";
  } catch {
    sunatStatus = "caido";
  }

  return c.json({
    success: true,
    service: "sunat-billing-api",
    version: "1.0.0",
    runtime: "Bun",
    environment: env.NODE_ENV,
    sunat: {
      mode: env.SUNAT_ENV,
      status: sunatStatus,
      latencyMs: sunatPingMs,
      rucEmisorDefault: env.SUNAT_RUC,
    },
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
