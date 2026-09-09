import { z } from "zod";

export const ConsultaRucSchema = z.object({
  ruc: z.string().length(11, "El RUC debe tener exactamente 11 dígitos numéricos"),
});

export const ConsultaDniSchema = z.object({
  dni: z.string().length(8, "El DNI debe tener exactamente 8 dígitos numéricos"),
});

export type ConsultaRucInput = z.infer<typeof ConsultaRucSchema>;
export type ConsultaDniInput = z.infer<typeof ConsultaDniSchema>;
