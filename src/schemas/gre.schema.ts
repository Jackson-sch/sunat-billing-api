import { z } from "zod";
import { EmisorSchema, ClienteSchema } from "./cpe.schema";

export const GreItemSchema = z.object({
  id: z.string().optional(),
  sku: z.string().default("ITEM-001"),
  descripcion: z.string().min(1, "La descripción del bien es requerida"),
  cantidad: z.number().positive(),
  unidadMedida: z.string().default("NIU"),
  pesoKgm: z.number().optional(),
});

export const EmitGreSchema = z.object({
  serie: z.string().min(4).max(4).default("T001"),
  numero: z.number().int().positive(),
  fechaEmision: z.string().optional(),
  horaEmision: z.string().optional(),
  fechaInicioTraslado: z.string(),
  motivoTraslado: z.enum(["04", "01", "02", "13"]).default("04"), // 04: Traslado entre establecimientos
  motivoDescripcion: z.string().default("Traslado interno entre sucursales"),
  modalidadTransporte: z.enum(["01", "02"]).default("02"), // 01: Público, 02: Privado
  pesoBrutoTotal: z.number().positive(),
  unidadPeso: z.literal("KGM").default("KGM"),
  totalBultos: z.number().int().positive().default(1),
  partida: z.object({
    ubigeo: z.string().length(6),
    direccion: z.string().min(3),
  }),
  llegada: z.object({
    ubigeo: z.string().length(6),
    direccion: z.string().min(3),
  }),
  remitente: EmisorSchema.optional(),
  destinatario: ClienteSchema,
  transportista: z
    .object({
      ruc: z.string().length(11),
      razonSocial: z.string(),
      numeroRegistroMtc: z.string().optional(),
    })
    .optional(),
  conductor: z
    .object({
      tipoDoc: z.enum(["1", "4", "7"]).default("1"),
      numDoc: z.string().min(8),
      nombres: z.string(),
      apellidos: z.string(),
      licenciaConducir: z.string(),
    })
    .optional(),
  vehiculo: z
    .object({
      placa: z.string().min(6),
      marca: z.string().optional(),
    })
    .optional(),
  items: z.array(GreItemSchema).min(1),
  enviarASunat: z.boolean().default(false),
});

export type EmitGreInput = z.infer<typeof EmitGreSchema>;
