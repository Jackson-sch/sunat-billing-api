import { z } from "zod";

export const EmisorSchema = z.object({
  ruc: z.string().length(11, "El RUC del emisor debe tener 11 dígitos"),
  razonSocial: z.string().min(3, "La razón social es requerida"),
  nombreComercial: z.string().optional().default(""),
  direccion: z.string().optional().default(""),
  ubigeo: z.string().optional().default("150101"),
  departamento: z.string().optional().default("LIMA"),
  provincia: z.string().optional().default("LIMA"),
  distrito: z.string().optional().default("LIMA"),
  usuarioSol: z.string().optional(),
  claveSol: z.string().optional(),
  isBeta: z.boolean().optional().default(true),
});

export const ClienteSchema = z.object({
  tipoDoc: z.enum(["1", "6", "4", "7", "0", "dni", "ruc", "ce", "pasaporte"]).default("0"),
  numDoc: z.string().default("00000000"),
  nombre: z.string().min(1, "El nombre/razón social del cliente es requerido"),
  direccion: z.string().optional(),
  email: z.string().email().optional(),
});

export const CpeItemSchema = z.object({
  id: z.string().optional(),
  sku: z.string().default("ITEM-001"),
  descripcion: z.string().min(1, "La descripción del producto es requerida"),
  unidadMedida: z.string().default("NIU"), // NIU o KGM
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  precioUnitario: z.number().nonnegative("El precio unitario no puede ser negativo"), // Con IGV
  valorUnitario: z.number().optional(), // Sin IGV (opcional, calculado automáticamente)
  tipoAfectacionIgv: z.enum(["10", "20", "30"]).default("10"), // 10: Gravado, 20: Exonerado, 30: Inafecto
  igv: z.number().optional(),
  total: z.number().optional(),
});

export const EmitCpeSchema = z.object({
  tipoComprobante: z.enum(["01", "03", "07", "08"]),
  serie: z.string().min(4).max(4, "La serie debe tener exactamente 4 caracteres (ej: F001, B001, FC01, BC01)"),
  numero: z.number().int().positive("El correlativo del comprobante debe ser un entero positivo"),
  fechaEmision: z.string().optional(), // YYYY-MM-DD
  horaEmision: z.string().optional(), // HH:mm:ss
  moneda: z.enum(["PEN", "USD"]).default("PEN"),
  emisor: EmisorSchema.optional(), // Si no viene, se usan las variables de entorno
  cliente: ClienteSchema,
  items: z.array(CpeItemSchema).min(1, "Debe incluir al menos un ítem"),
  medioPago: z.enum(["efectivo", "tarjeta", "yape", "plin", "transferencia", "credito", "mixto"]).default("efectivo"),
  documentoModificado: z
    .object({
      tipoDoc: z.enum(["01", "03"]),
      serieNumero: z.string(),
      motivoCodigo: z.enum(["01", "02", "06", "07", "04"]),
      motivoDescripcion: z.string(),
    })
    .optional(),
  enviarASunat: z.boolean().default(false), // true = Envía vía SOAP a SUNAT/OSE, false = Solo firma y retorna XML
});

export type EmitCpeInput = z.infer<typeof EmitCpeSchema>;
