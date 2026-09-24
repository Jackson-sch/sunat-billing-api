import { SQL } from "bun";
import { env } from "./env.js";

let sqlInstance: SQL | null = null;
let initialized = false;

export function getDb(): SQL | null {
  if (!sqlInstance && env.POSTGRES_URL) {
    try {
      sqlInstance = new SQL(env.POSTGRES_URL);
    } catch (e) {
      console.error("Error al inicializar cliente SQL de Bun:", e);
    }
  }
  return sqlInstance;
}

/**
 * Asegura la creación automática de tablas e índices en Supabase
 */
export async function initDb(): Promise<void> {
  if (initialized) return;
  const sql = getDb();
  if (!sql) return;

  try {
    // 1. Tabla empresas
    await sql`
      CREATE TABLE IF NOT EXISTS empresas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ruc VARCHAR(11) UNIQUE NOT NULL,
        razon_social VARCHAR(255) NOT NULL,
        api_key VARCHAR(64) UNIQUE NOT NULL,
        usuario_sol VARCHAR(50),
        clave_sol VARCHAR(100),
        is_beta BOOLEAN DEFAULT true,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `;

    // 2. Tabla comprobantes para métricas, auditoría e historial fiscal
    await sql`
      CREATE TABLE IF NOT EXISTS comprobantes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
        empresa_ruc VARCHAR(11) NOT NULL,
        tipo_comprobante VARCHAR(2) NOT NULL,
        serie VARCHAR(4) NOT NULL,
        numero INT NOT NULL,
        fecha_emision DATE NOT NULL,
        hora_emision VARCHAR(10),
        moneda VARCHAR(3) DEFAULT 'PEN',
        cliente_tipo_doc VARCHAR(1),
        cliente_num_doc VARCHAR(15),
        cliente_nombre VARCHAR(255),
        total_gravadas NUMERIC(12, 2) DEFAULT 0,
        total_igv NUMERIC(12, 2) DEFAULT 0,
        total NUMERIC(12, 2) NOT NULL,
        estado_sunat VARCHAR(20) DEFAULT 'ACEPTADO',
        sunat_code VARCHAR(10),
        sunat_description TEXT,
        hash_sunat VARCHAR(64),
        qr_string TEXT,
        xml_base64 TEXT,
        cdr_base64 TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_comprobantes_empresa_ruc ON comprobantes(empresa_ruc);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_comprobantes_created_at ON comprobantes(created_at);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_empresas_api_key ON empresas(api_key);`;

    initialized = true;
  } catch (err: any) {
    console.error("Error al inicializar tablas en Supabase:", err.message || err);
  }
}

export interface ComprobanteLogData {
  empresaId?: string | null;
  empresaRuc: string;
  tipoComprobante: string;
  serie: string;
  numero: number;
  fechaEmision: string;
  horaEmision?: string;
  moneda?: string;
  clienteTipoDoc?: string;
  clienteNumDoc?: string;
  clienteNombre?: string;
  totalGravadas?: number;
  totalIgv?: number;
  total: number;
  estadoSunat?: string;
  sunatCode?: string;
  sunatDescription?: string;
  hashSunat?: string;
  qrString?: string;
  xmlBase64?: string;
  cdrBase64?: string;
}

export async function registrarComprobante(data: ComprobanteLogData) {
  const sql = getDb();
  if (!sql) return;

  try {
    await initDb();
    await sql`
      INSERT INTO comprobantes (
        empresa_id, empresa_ruc, tipo_comprobante, serie, numero,
        fecha_emision, hora_emision, moneda,
        cliente_tipo_doc, cliente_num_doc, cliente_nombre,
        total_gravadas, total_igv, total,
        estado_sunat, sunat_code, sunat_description,
        hash_sunat, qr_string, xml_base64, cdr_base64
      ) VALUES (
        ${data.empresaId || null}, ${data.empresaRuc}, ${data.tipoComprobante}, ${data.serie}, ${data.numero},
        ${data.fechaEmision}, ${data.horaEmision || '00:00:00'}, ${data.moneda || 'PEN'},
        ${data.clienteTipoDoc || null}, ${data.clienteNumDoc || null}, ${data.clienteNombre || null},
        ${data.totalGravadas || 0}, ${data.totalIgv || 0}, ${data.total},
        ${data.estadoSunat || 'ACEPTADO'}, ${data.sunatCode || '0'}, ${data.sunatDescription || ''},
        ${data.hashSunat || null}, ${data.qrString || null}, ${data.xmlBase64 || null}, ${data.cdrBase64 || null}
      )
    `;
  } catch (err: any) {
    console.error("Error al registrar comprobante en BD:", err.message || err);
  }
}
