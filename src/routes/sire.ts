import { Hono } from "hono";
import {
  generateSireVentasTxt,
  generateSireComprasTxt,
  buildSireVentasFilename,
  buildSireComprasFilename,
  SireVentaRecord,
  SireCompraRecord,
} from "@/core";

export const sireRouter = new Hono();

/**
 * POST /api/v1/sire/ventas - Genera archivo plano RVIE 14.1
 */
sireRouter.post("/ventas", async (c) => {
  const body = await c.req.json<{
    ruc: string;
    año: string;
    mes: string;
    registros: SireVentaRecord[];
  }>();

  if (!body.ruc || !body.año || !body.mes || !Array.isArray(body.registros)) {
    return c.json({ success: false, error: "Parámetros inválidos (ruc, año, mes, registros)" }, 400);
  }

  const filename = buildSireVentasFilename(body.ruc, body.año, body.mes);
  const txtContent = generateSireVentasTxt(body.registros);

  return c.json({
    success: true,
    formato: "14.1 - RVIE (Ventas)",
    filename,
    totalRegistros: body.registros.length,
    txtBase64: Buffer.from(txtContent, "utf-8").toString("base64"),
    preview: txtContent.split("\r\n").slice(0, 5),
  });
});

/**
 * POST /api/v1/sire/compras - Genera archivo plano RCE 8.1
 */
sireRouter.post("/compras", async (c) => {
  const body = await c.req.json<{
    ruc: string;
    año: string;
    mes: string;
    registros: SireCompraRecord[];
  }>();

  if (!body.ruc || !body.año || !body.mes || !Array.isArray(body.registros)) {
    return c.json({ success: false, error: "Parámetros inválidos (ruc, año, mes, registros)" }, 400);
  }

  const filename = buildSireComprasFilename(body.ruc, body.año, body.mes);
  const txtContent = generateSireComprasTxt(body.registros);

  return c.json({
    success: true,
    formato: "8.1 - RCE (Compras)",
    filename,
    totalRegistros: body.registros.length,
    txtBase64: Buffer.from(txtContent, "utf-8").toString("base64"),
    preview: txtContent.split("\r\n").slice(0, 5),
  });
});
