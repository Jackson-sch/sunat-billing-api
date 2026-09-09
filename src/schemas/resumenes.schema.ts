import { z } from "zod";
import { EmisorSchema } from "./cpe.schema";

export const ResumenBoletaItemSchema = z.object({
  linea: z.number().int().positive(),
  tipoDocumento: z.enum(["03", "07", "08"]),
  serie: z.string().length(4),
  numeroInicio: z.number().int().positive(),
  numeroFin: z.number().int().positive(),
  estadoOperacion: z.enum(["1", "2", "3"]).default("1"), // 1: Adición, 2: Modificación, 3: Anulado
  moneda: z.enum(["PEN", "USD"]).default("PEN"),
  totalGravado: z.number().nonnegative(),
  totalExonerado: z.number().nonnegative().default(0),
  totalInafecto: z.number().nonnegative().default(0),
  totalOtrosCargos: z.number().nonnegative().default(0),
  totalIgv: z.number().nonnegative(),
  totalVenta: z.number().nonnegative(),
  docModificadoTipo: z.string().optional(),
  docModificadoSerieNumero: z.string().optional(),
});

export const ResumenDiarioSchema = z.object({
  emisor: EmisorSchema.optional(),
  correlativo: z.number().int().positive().default(1),
  fechaEmisionComprobantes: z.string(), // YYYY-MM-DD
  fechaGeneracionResumen: z.string().optional(), // YYYY-MM-DD
  items: z.array(ResumenBoletaItemSchema).min(1),
  enviarASunat: z.boolean().default(false),
});

export const ComunicacionBajaSchema = z.object({
  emisor: EmisorSchema.optional(),
  correlativo: z.number().int().positive().default(1),
  fechaEmisionDocumentos: z.string(), // YYYY-MM-DD
  fechaGeneracionBaja: z.string().optional(), // YYYY-MM-DD
  items: z.array(
    z.object({
      linea: z.number().int().positive(),
      tipoDocumento: z.enum(["01", "07", "08"]),
      serie: z.string().length(4),
      numero: z.number().int().positive(),
      motivoBaja: z.string().min(3),
    })
  ).min(1),
  enviarASunat: z.boolean().default(false),
});

export type ResumenDiarioInput = z.infer<typeof ResumenDiarioSchema>;
export type ComunicacionBajaInput = z.infer<typeof ComunicacionBajaSchema>;
