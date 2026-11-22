import { Hono } from "hono";
import { validatePfxCertificate } from "../core/index.js";
import { actualizarCertificadoEmpresa, actualizarCredencialesEmpresa } from "../config/db.js";
import { invalidateApiKeyCache } from "../middlewares/auth.js";

export const empresaRouter = new Hono();

/**
 * GET /api/v1/empresa/me - Consulta los datos y estado del certificado de la empresa autenticada
 */
empresaRouter.get("/me", (c) => {
  const empresa = (c as any).get("empresa");
  if (!empresa) {
    return c.json({ success: false, error: "Empresa no autenticada." }, 401);
  }

  return c.json({
    success: true,
    empresa: {
      id: empresa.id,
      ruc: empresa.ruc,
      razonSocial: empresa.razon_social,
      usuarioSol: empresa.usuario_sol || "MODDATOS",
      isBeta: Boolean(empresa.is_beta),
      activo: Boolean(empresa.activo),
      tieneCertificado: Boolean(empresa.certificado_pfx),
    },
  });
});

/**
 * PUT /api/v1/empresa/certificado - Permite al propio cliente subir o renovar su CDT (.pfx/.p12)
 */
empresaRouter.put("/certificado", async (c) => {
  const empresa = (c as any).get("empresa");
  if (!empresa) {
    return c.json({ success: false, error: "Empresa no autenticada." }, 401);
  }
  if (empresa.id === "env-default") {
    return c.json(
      {
        success: false,
        error: "La empresa por defecto (.env) se configura mediante variables de entorno del servidor.",
      },
      400
    );
  }

  const body = await c.req.json().catch(() => ({}));
  const rawCertPfx =
    typeof body.certificadoPfx === "string"
      ? body.certificadoPfx.replace(/^data:[^;]+;base64,/, "").trim()
      : "";
  const certificadoPassword = typeof body.certificadoPassword === "string" ? body.certificadoPassword : "";

  if (!rawCertPfx) {
    return c.json(
      { success: false, error: "Debe enviar el campo 'certificadoPfx' en Base64." },
      400
    );
  }

  const check = validatePfxCertificate(rawCertPfx, certificadoPassword);
  if (!check.valid) {
    return c.json({ success: false, error: check.error }, 400);
  }

  await actualizarCertificadoEmpresa(empresa.id, rawCertPfx, certificadoPassword);
  invalidateApiKeyCache();

  return c.json({
    success: true,
    message: "Certificado Digital Tributario actualizado correctamente.",
    certSubject: check.subject,
    tieneCertificado: true,
  });
});

/**
 * DELETE /api/v1/empresa/certificado - Elimina el certificado guardado de la empresa autenticada
 */
empresaRouter.delete("/certificado", async (c) => {
  const empresa = (c as any).get("empresa");
  if (!empresa) {
    return c.json({ success: false, error: "Empresa no autenticada." }, 401);
  }
  if (empresa.id === "env-default") {
    return c.json(
      {
        success: false,
        error: "La empresa por defecto (.env) se configura mediante variables de entorno del servidor.",
      },
      400
    );
  }

  await actualizarCertificadoEmpresa(empresa.id, null, null);
  invalidateApiKeyCache();

  return c.json({
    success: true,
    message: "Certificado eliminado correctamente.",
    tieneCertificado: false,
  });
});

/**
 * PUT /api/v1/empresa/credenciales - Permite al cliente actualizar su Usuario/Clave SOL y ambiente (Beta/Producción)
 */
empresaRouter.put("/credenciales", async (c) => {
  const empresa = (c as any).get("empresa");
  if (!empresa) {
    return c.json({ success: false, error: "Empresa no autenticada." }, 401);
  }
  if (empresa.id === "env-default") {
    return c.json(
      {
        success: false,
        error: "La empresa por defecto (.env) se configura mediante variables de entorno del servidor.",
      },
      400
    );
  }

  const body = await c.req.json().catch(() => ({}));
  const usuarioSol = typeof body.usuarioSol === "string" && body.usuarioSol.trim()
    ? body.usuarioSol.trim()
    : empresa.usuario_sol || "MODDATOS";
  const claveSol = typeof body.claveSol === "string" && body.claveSol.trim()
    ? body.claveSol.trim()
    : empresa.clave_sol || "MODDATOS";
  const isBeta = typeof body.isBeta === "boolean" ? body.isBeta : Boolean(empresa.is_beta);

  await actualizarCredencialesEmpresa(empresa.id, { usuarioSol, claveSol, isBeta });
  invalidateApiKeyCache();

  return c.json({
    success: true,
    message: "Credenciales SOL actualizadas correctamente.",
    empresa: {
      id: empresa.id,
      ruc: empresa.ruc,
      razonSocial: empresa.razon_social,
      usuarioSol,
      isBeta,
    },
  });
});
