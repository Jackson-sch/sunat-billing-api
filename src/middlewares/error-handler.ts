import { ErrorHandler } from "hono";
import { ZodError } from "zod";

export const errorHandler: ErrorHandler = (err, c) => {
  console.error("❌ Error no controlado en la API:", err);

  if (err instanceof ZodError) {
    const issues = err.issues || (err as any).errors || [];
    return c.json(
      {
        success: false,
        error: "Error de validación de datos tributarios.",
        detalles: issues.map((e: any) => ({
          campo: Array.isArray(e.path) ? e.path.join(".") : String(e.path),
          mensaje: e.message,
        })),
        statusCode: 400,
      },
      400
    );
  }

  return c.json(
    {
      success: false,
      error: err instanceof Error ? err.message : "Error interno del servidor de facturación.",
      statusCode: 500,
    },
    500
  );
};
