import { SQL } from "bun";
import { Database } from "bun:sqlite";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { env } from "./env.js";

let sqlInstance: SQL | null = null;
let sqliteInstance: Database | null = null;
let initialized = false;

export function getDb(): SQL | null {
  if (!sqlInstance && env.POSTGRES_URL) {
    try {
      sqlInstance = new SQL(env.POSTGRES_URL);
    } catch (e) {
      console.error("Error al inicializar cliente SQL de Bun (PostgreSQL):", e);
    }
  }
  return sqlInstance;
}

export function getSqlite(): Database {
  if (!sqliteInstance) {
    const dataDir = path.resolve(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, "billing.sqlite");
    sqliteInstance = new Database(dbPath, { create: true });
    sqliteInstance.run("PRAGMA journal_mode = WAL;");
  }
  return sqliteInstance;
}

export function isDbConnected(): boolean {
  return !!getDb() || true; // SQLite siempre disponible localmente
}

export function getDbEngine(): string {
  return getDb() ? "PostgreSQL (Supabase)" : "SQLite Local (data/billing.sqlite)";
}

/**
 * Asegura la creación automática de tablas e índices en PostgreSQL o SQLite
 */
export async function initDb(): Promise<void> {
  if (initialized) return;

  const sql = getDb();
  if (sql) {
    try {
      // 1. Tabla empresas en PostgreSQL
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

      // 2. Tabla comprobantes en PostgreSQL
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
      return;
    } catch (err: any) {
      console.error("Error al inicializar tablas en Supabase PostgreSQL, usando SQLite fallback:", err.message || err);
    }
  }

  // Fallback SQLite nativo
  try {
    const sqlite = getSqlite();
    sqlite.run(`
      CREATE TABLE IF NOT EXISTS empresas (
        id TEXT PRIMARY KEY,
        ruc TEXT UNIQUE NOT NULL,
        razon_social TEXT NOT NULL,
        api_key TEXT UNIQUE NOT NULL,
        usuario_sol TEXT,
        clave_sol TEXT,
        is_beta INTEGER DEFAULT 1,
        activo INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    sqlite.run(`
      CREATE TABLE IF NOT EXISTS comprobantes (
        id TEXT PRIMARY KEY,
        empresa_id TEXT,
        empresa_ruc TEXT NOT NULL,
        tipo_comprobante TEXT NOT NULL,
        serie TEXT NOT NULL,
        numero INTEGER NOT NULL,
        fecha_emision TEXT NOT NULL,
        hora_emision TEXT,
        moneda TEXT DEFAULT 'PEN',
        cliente_tipo_doc TEXT,
        cliente_num_doc TEXT,
        cliente_nombre TEXT,
        total_gravadas REAL DEFAULT 0,
        total_igv REAL DEFAULT 0,
        total REAL NOT NULL,
        estado_sunat TEXT DEFAULT 'ACEPTADO',
        sunat_code TEXT,
        sunat_description TEXT,
        hash_sunat TEXT,
        qr_string TEXT,
        xml_base64 TEXT,
        cdr_base64 TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    sqlite.run(`CREATE INDEX IF NOT EXISTS idx_comprobantes_empresa_ruc ON comprobantes(empresa_ruc);`);
    sqlite.run(`CREATE INDEX IF NOT EXISTS idx_comprobantes_created_at ON comprobantes(created_at);`);
    sqlite.run(`CREATE INDEX IF NOT EXISTS idx_empresas_api_key ON empresas(api_key);`);

    // Sembrar empresa por defecto si está vacía
    const countResult = sqlite.query("SELECT COUNT(*) as c FROM empresas").get() as { c: number };
    if (!countResult || countResult.c === 0) {
      sqlite.run(
        `INSERT OR IGNORE INTO empresas (id, ruc, razon_social, api_key, usuario_sol, clave_sol, is_beta, activo)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
        [
          "env-default",
          env.SUNAT_RUC,
          "EMPRESA POR DEFECTO (.ENV)",
          env.API_KEY,
          env.SUNAT_USUARIO_SOL,
          env.SUNAT_CLAVE_SOL,
        ]
      );
    }

    initialized = true;
  } catch (err: any) {
    console.error("Error al inicializar SQLite local:", err.message || err);
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

export async function registrarComprobante(data: ComprobanteLogData): Promise<void> {
  await initDb();
  const sql = getDb();

  if (sql) {
    try {
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
      return;
    } catch (err: any) {
      console.warn("Fallo al guardar en Postgres, intentando SQLite local:", err.message || err);
    }
  }

  // Fallback SQLite local
  try {
    const sqlite = getSqlite();
    const id = crypto.randomUUID();
    sqlite.run(
      `INSERT INTO comprobantes (
        id, empresa_id, empresa_ruc, tipo_comprobante, serie, numero,
        fecha_emision, hora_emision, moneda,
        cliente_tipo_doc, cliente_num_doc, cliente_nombre,
        total_gravadas, total_igv, total,
        estado_sunat, sunat_code, sunat_description,
        hash_sunat, qr_string, xml_base64, cdr_base64
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.empresaId || null,
        data.empresaRuc,
        data.tipoComprobante,
        data.serie,
        data.numero,
        data.fechaEmision,
        data.horaEmision || "00:00:00",
        data.moneda || "PEN",
        data.clienteTipoDoc || null,
        data.clienteNumDoc || null,
        data.clienteNombre || null,
        data.totalGravadas || 0,
        data.totalIgv || 0,
        data.total,
        data.estadoSunat || "ACEPTADO",
        data.sunatCode || "0",
        data.sunatDescription || "",
        data.hashSunat || null,
        data.qrString || null,
        data.xmlBase64 || null,
        data.cdrBase64 || null,
      ]
    );
  } catch (err: any) {
    console.error("Error al registrar comprobante en SQLite:", err.message || err);
  }
}

export async function obtenerComprobantes(filters: { ruc?: string; tipo?: string; search?: string }): Promise<any[]> {
  await initDb();
  const sql = getDb();

  if (sql) {
    try {
      if (filters.ruc && filters.tipo) {
        return await sql`
          SELECT id, empresa_ruc, tipo_comprobante, serie, numero, fecha_emision, hora_emision,
                 cliente_num_doc, cliente_nombre, total_gravadas, total_igv, total,
                 estado_sunat, sunat_code, sunat_description, hash_sunat, created_at
          FROM comprobantes
          WHERE empresa_ruc = ${filters.ruc} AND tipo_comprobante = ${filters.tipo}
          ORDER BY created_at DESC
          LIMIT 100
        `;
      } else if (filters.ruc) {
        return await sql`
          SELECT id, empresa_ruc, tipo_comprobante, serie, numero, fecha_emision, hora_emision,
                 cliente_num_doc, cliente_nombre, total_gravadas, total_igv, total,
                 estado_sunat, sunat_code, sunat_description, hash_sunat, created_at
          FROM comprobantes
          WHERE empresa_ruc = ${filters.ruc}
          ORDER BY created_at DESC
          LIMIT 100
        `;
      } else {
        return await sql`
          SELECT id, empresa_ruc, tipo_comprobante, serie, numero, fecha_emision, hora_emision,
                 cliente_num_doc, cliente_nombre, total_gravadas, total_igv, total,
                 estado_sunat, sunat_code, sunat_description, hash_sunat, created_at
          FROM comprobantes
          ORDER BY created_at DESC
          LIMIT 100
        `;
      }
    } catch (err: any) {
      console.warn("Error al consultar comprobantes en Postgres, intentando SQLite:", err.message || err);
    }
  }

  // SQLite query
  try {
    const sqlite = getSqlite();
    let query = `
      SELECT id, empresa_ruc, tipo_comprobante, serie, numero, fecha_emision, hora_emision,
             cliente_num_doc, cliente_nombre, total_gravadas, total_igv, total,
             estado_sunat, sunat_code, sunat_description, hash_sunat, created_at
      FROM comprobantes
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.ruc) {
      conditions.push("empresa_ruc = ?");
      params.push(filters.ruc);
    }
    if (filters.tipo) {
      conditions.push("tipo_comprobante = ?");
      params.push(filters.tipo);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY created_at DESC LIMIT 100";

    return sqlite.query(query).all(...params);
  } catch (err: any) {
    console.error("Error al consultar comprobantes en SQLite:", err.message || err);
    return [];
  }
}

export async function obtenerComprobantePorId(id: string): Promise<any | null> {
  await initDb();
  const sql = getDb();

  let serie = "";
  let numero = -1;
  if (id.includes("-") && id.length < 20) {
    const parts = id.split("-");
    serie = parts[0] || "";
    numero = parseInt(parts[1] || "", 10) || -1;
  }

  if (sql) {
    try {
      if (serie && numero !== -1) {
        const [row] = await sql`
          SELECT * FROM comprobantes 
          WHERE id::text = ${id} OR (serie = ${serie} AND numero = ${numero})
          LIMIT 1
        `;
        if (row) return row;
      } else {
        const [row] = await sql`SELECT * FROM comprobantes WHERE id::text = ${id} LIMIT 1`;
        if (row) return row;
      }
    } catch (err: any) {
      console.warn("Error al obtener comprobante en Postgres:", err.message || err);
    }
  }

  try {
    const sqlite = getSqlite();
    if (serie && numero !== -1) {
      return (
        sqlite.query("SELECT * FROM comprobantes WHERE id = ? OR (serie = ? AND numero = ?) LIMIT 1").get(id, serie, numero) || null
      );
    }
    return sqlite.query("SELECT * FROM comprobantes WHERE id = ? LIMIT 1").get(id) || null;
  } catch (err: any) {
    console.error("Error al obtener comprobante en SQLite:", err.message || err);
    return null;
  }
}

export async function obtenerEmpresas(): Promise<any[]> {
  await initDb();
  const sql = getDb();

  if (sql) {
    try {
      const rows = await sql`
        SELECT 
          e.id, 
          e.ruc, 
          e.razon_social, 
          e.api_key, 
          e.usuario_sol, 
          e.is_beta, 
          e.activo, 
          e.created_at,
          COALESCE(COUNT(c.id), 0)::int AS total_docs,
          COALESCE(SUM(c.total), 0)::numeric(12,2) AS total_monto
        FROM empresas e
        LEFT JOIN comprobantes c ON c.empresa_ruc = e.ruc
        GROUP BY e.id
        ORDER BY e.created_at DESC
      `;
      return rows;
    } catch (err: any) {
      console.warn("Error al obtener empresas en Postgres:", err.message || err);
    }
  }

  try {
    const sqlite = getSqlite();
    const rows = sqlite.query(`
      SELECT 
        e.id, 
        e.ruc, 
        e.razon_social, 
        e.api_key, 
        e.usuario_sol, 
        e.is_beta, 
        e.activo, 
        e.created_at,
        COALESCE(COUNT(c.id), 0) AS total_docs,
        ROUND(COALESCE(SUM(c.total), 0), 2) AS total_monto
      FROM empresas e
      LEFT JOIN comprobantes c ON c.empresa_ruc = e.ruc
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `).all();
    return rows;
  } catch (err: any) {
    console.error("Error al obtener empresas en SQLite:", err.message || err);
    return [
      {
        id: "env-default",
        ruc: env.SUNAT_RUC,
        razon_social: "EMPRESA POR DEFECTO (.ENV)",
        api_key: env.API_KEY,
        usuario_sol: env.SUNAT_USUARIO_SOL,
        is_beta: env.SUNAT_ENV === "beta",
        activo: 1,
        total_docs: 0,
        total_monto: 0,
        created_at: new Date().toISOString(),
      },
    ];
  }
}

export async function crearEmpresa(data: {
  ruc: string;
  razonSocial: string;
  apiKey: string;
  usuarioSol?: string;
  claveSol?: string;
  isBeta?: boolean;
}): Promise<any> {
  await initDb();
  const sql = getDb();

  if (sql) {
    try {
      const [nueva] = await sql`
        INSERT INTO empresas (ruc, razon_social, api_key, usuario_sol, clave_sol, is_beta, activo)
        VALUES (${data.ruc}, ${data.razonSocial}, ${data.apiKey}, ${data.usuarioSol || "MODDATOS"}, ${data.claveSol || "MODDATOS"}, ${data.isBeta ?? true}, true)
        RETURNING id, ruc, razon_social, api_key, usuario_sol, is_beta, activo, created_at
      `;
      return nueva;
    } catch (err: any) {
      console.warn("Error creando empresa en Postgres, usando SQLite:", err.message || err);
    }
  }

  const sqlite = getSqlite();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  sqlite.run(
    `INSERT INTO empresas (id, ruc, razon_social, api_key, usuario_sol, clave_sol, is_beta, activo, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      id,
      data.ruc,
      data.razonSocial,
      data.apiKey,
      data.usuarioSol || "MODDATOS",
      data.claveSol || "MODDATOS",
      data.isBeta ?? true ? 1 : 0,
      now,
    ]
  );

  return {
    id,
    ruc: data.ruc,
    razon_social: data.razonSocial,
    api_key: data.apiKey,
    usuario_sol: data.usuarioSol || "MODDATOS",
    is_beta: data.isBeta ?? true,
    activo: 1,
    created_at: now,
  };
}

export async function actualizarEmpresa(
  id: string,
  data: { razonSocial: string; usuarioSol?: string; claveSol?: string; isBeta?: boolean }
): Promise<any | null> {
  await initDb();
  const sql = getDb();

  if (sql) {
    try {
      const [actualizada] = await sql`
        UPDATE empresas
        SET razon_social = ${data.razonSocial},
            usuario_sol = ${data.usuarioSol || "MODDATOS"},
            clave_sol = ${data.claveSol || "MODDATOS"},
            is_beta = ${data.isBeta ?? true}
        WHERE id = ${id}
        RETURNING id, ruc, razon_social, api_key, usuario_sol, is_beta, activo
      `;
      if (actualizada) return actualizada;
    } catch (err: any) {
      console.warn("Error actualizando en Postgres:", err.message || err);
    }
  }

  const sqlite = getSqlite();
  sqlite.run(
    `UPDATE empresas
     SET razon_social = ?, usuario_sol = ?, clave_sol = ?, is_beta = ?
     WHERE id = ?`,
    [data.razonSocial, data.usuarioSol || "MODDATOS", data.claveSol || "MODDATOS", data.isBeta ? 1 : 0, id]
  );
  return sqlite.query("SELECT id, ruc, razon_social, api_key, usuario_sol, is_beta, activo FROM empresas WHERE id = ?").get(id);
}

export async function regenerarApiKeyEmpresa(id: string, newApiKey: string): Promise<string | null> {
  await initDb();
  const sql = getDb();

  if (sql) {
    try {
      const [actualizada] = await sql`
        UPDATE empresas
        SET api_key = ${newApiKey}
        WHERE id = ${id}
        RETURNING id, ruc, razon_social, api_key
      `;
      if (actualizada) return newApiKey;
    } catch (err: any) {
      console.warn("Error regenerando api_key en Postgres:", err.message || err);
    }
  }

  const sqlite = getSqlite();
  sqlite.run("UPDATE empresas SET api_key = ? WHERE id = ?", [newApiKey, id]);
  return newApiKey;
}

export async function toggleEmpresa(id: string): Promise<any | null> {
  await initDb();
  const sql = getDb();

  if (sql) {
    try {
      const [actualizada] = await sql`
        UPDATE empresas
        SET activo = NOT activo
        WHERE id = ${id}
        RETURNING id, ruc, razon_social, activo
      `;
      if (actualizada) return actualizada;
    } catch (err: any) {
      console.warn("Error en toggle empresa en Postgres:", err.message || err);
    }
  }

  const sqlite = getSqlite();
  const actual = sqlite.query("SELECT activo FROM empresas WHERE id = ?").get(id) as { activo: number } | null;
  if (!actual) return null;
  const nuevoActivo = actual.activo ? 0 : 1;
  sqlite.run("UPDATE empresas SET activo = ? WHERE id = ?", [nuevoActivo, id]);
  return sqlite.query("SELECT id, ruc, razon_social, activo FROM empresas WHERE id = ?").get(id);
}

export async function eliminarEmpresa(id: string): Promise<boolean> {
  await initDb();
  const sql = getDb();

  if (sql) {
    try {
      await sql`DELETE FROM empresas WHERE id = ${id}`;
      return true;
    } catch (err: any) {
      console.warn("Error eliminando en Postgres:", err.message || err);
    }
  }

  const sqlite = getSqlite();
  sqlite.run("DELETE FROM empresas WHERE id = ?", [id]);
  return true;
}

export async function buscarEmpresaPorApiKey(apiKey: string): Promise<any | null> {
  await initDb();
  const sql = getDb();

  if (sql) {
    try {
      const rows = await sql`
        SELECT id, ruc, razon_social, usuario_sol, clave_sol, is_beta, activo
        FROM empresas
        WHERE api_key = ${apiKey} AND activo = true
        LIMIT 1
      `;
      if (rows && rows.length > 0) return rows[0];
    } catch (err: any) {
      console.warn("Error buscando api_key en Postgres:", err.message || err);
    }
  }

  try {
    const sqlite = getSqlite();
    return sqlite.query("SELECT id, ruc, razon_social, usuario_sol, clave_sol, is_beta, activo FROM empresas WHERE api_key = ? AND activo = 1 LIMIT 1").get(apiKey) || null;
  } catch (err: any) {
    console.error("Error buscando api_key en SQLite:", err.message || err);
    return null;
  }
}
