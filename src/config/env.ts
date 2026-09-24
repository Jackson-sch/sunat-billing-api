export const env = {
  PORT: Number(process.env.PORT || 3001),
  NODE_ENV: process.env.NODE_ENV || "development",
  API_KEY: process.env.API_KEY || "novamarket_secret_api_key_2026",
  
  // Default SUNAT Config (fallback if not supplied in request)
  SUNAT_ENV: (process.env.SUNAT_ENV || "beta") as "beta" | "production",
  SUNAT_RUC: process.env.SUNAT_RUC || "20000000001",
  SUNAT_USUARIO_SOL: process.env.SUNAT_USUARIO_SOL || "MODDATOS",
  SUNAT_CLAVE_SOL: process.env.SUNAT_CLAVE_SOL || "MODDATOS",
  SUNAT_CERT_PATH: process.env.SUNAT_CERT_PATH || "./certs/certificate.pfx",
  SUNAT_CERT_PASSWORD: process.env.SUNAT_CERT_PASSWORD || "",

  // Supabase Database Connection
  POSTGRES_URL:
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    "",
};
