import os from "os";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import postgres from "postgres";
import { env } from "./env.js";

let sqlInstance: any = null;
let sqliteInstance: any = null;
let initialized = false;

function loadBunSqliteClass(): any {
  if (typeof (globalThis as any).Bun !== "undefined") {
    try {
      const req = (globalThis as any).require || (typeof require !== "undefined" ? require : null);
      if (req) {
        return req("bun:sqlite").Database;
      }
    } catch (e) {
      console.warn("No se pudo cargar bun:sqlite:", e);
    }
  }
  return null;
}

class MemoryDbFallback {
  private empresas: Map<string, any> = new Map();
  private comprobantes: any[] = [];

  constructor() {
    this.empresas.set(env.SUNAT_RUC, {
      id: "env-default",
      ruc: env.SUNAT_RUC,
      razon_social: "EMPRESA POR DEFECTO (.ENV)",
      api_key: env.API_KEY,
      usuario_sol: env.SUNAT_USUARIO_SOL,
      clave_sol: env.SUNAT_CLAVE_SOL,
      is_beta: 1,
      activo: 1,
      created_at: new Date().toISOString(),
    });
  }

  run(query: string, params: any[] = []) {
    const q = query.trim().toUpperCase();
    if (q.startsWith("INSERT INTO EMPRESAS") || q.startsWith("INSERT OR IGNORE INTO EMPRESAS")) {
      if (params.length === 6) {
        const [id, ruc, razon_social, api_key, usuario_sol, clave_sol] = params;
        if (!this.empresas.has(ruc)) {
          this.empresas.set(ruc, {
            id,
            ruc,
            razon_social,
            api_key,
            usuario_sol,
            clave_sol,
            is_beta: 1,
            activo: 1,
            created_at: new Date().toISOString(),
          });
        }
      } else {
        const [id, ruc, razon_social, api_key, usuario_sol, clave_sol, is_beta, created_at] = params;
        this.empresas.set(ruc, {
          id,
          ruc,
          razon_social,
          api_key,
          usuario_sol,
          clave_sol,
          is_beta,
          activo: 1,
          created_at: created_at || new Date().toISOString(),
        });
      }
    } else if (q.startsWith("INSERT INTO COMPROBANTES")) {
      const [
        id, empresa_id, empresa_ruc, tipo_comprobante, serie, numero, fecha_emision, hora_emision,
        moneda, cliente_tipo_doc, cliente_num_doc, cliente_nombre, total_gravadas, total_igv, total,
        estado_sunat, sunat_code, sunat_description, hash_sunat, qr_string, xml_base64, cdr_base64
      ] = params;
      this.comprobantes.unshift({
        id,
        empresa_id,
        empresa_ruc,
        tipo_comprobante,
        serie,
        numero,
        fecha_emision,
        hora_emision,
        moneda,
        cliente_tipo_doc,
        cliente_num_doc,
        cliente_nombre,
        total_gravadas,
        total_igv,
        total,
        estado_sunat,
        sunat_code,
        sunat_description,
        hash_sunat,
        qr_string,
        xml_base64,
        cdr_base64,
        created_at: new Date().toISOString(),
      });
    } else if (q.startsWith("UPDATE EMPRESAS")) {
      if (params.length === 5) {
        const [razon_social, usuario_sol, clave_sol, is_beta, id] = params;
        for (const emp of this.empresas.values()) {
          if (emp.id === id) {
            emp.razon_social = razon_social;
            emp.usuario_sol = usuario_sol;
            emp.clave_sol = clave_sol;
            emp.is_beta = is_beta;
          }
        }
      } else if (params.length === 2) {
        const [val, id] = params;
        for (const emp of this.empresas.values()) {
          if (emp.id === id) {
            if (typeof val === "string") emp.api_key = val;
            else emp.activo = val;
          }
        }
      }
    } else if (q.startsWith("DELETE FROM EMPRESAS")) {
      const [id] = params;
      for (const [k, emp] of this.empresas.entries()) {
        if (emp.id === id) this.empresas.delete(k);
      }
    }
  }

  query(query: string) {
    const q = query.trim().toUpperCase();
    const self = this;
    return {
      get(...params: any[]) {
        if (q.includes("COUNT(*)")) {
          return { c: self.empresas.size };
        }
        if (q.includes("FROM EMPRESAS WHERE ID = ?")) {
          for (const emp of self.empresas.values()) {
            if (emp.id === params[0]) return emp;
          }
          return null;
        }
        if (q.includes("FROM EMPRESAS WHERE API_KEY = ?")) {
          for (const emp of self.empresas.values()) {
            if (emp.api_key === params[0] && emp.activo) return emp;
          }
          return null;
        }
        if (q.includes("FROM COMPROBANTES")) {
          if (params.length === 3) {
            const [id, serie, numero] = params;
            return self.comprobantes.find((c) => c.id === id || (c.serie === serie && c.numero === numero)) || null;
          }
          return self.comprobantes.find((c) => c.id === params[0]) || null;
        }
        return null;
      },
      all(...params: any[]) {
        if (q.includes("FROM EMPRESAS")) {
          return Array.from(self.empresas.values()).map((emp) => {
            const docs = self.comprobantes.filter((c) => c.empresa_ruc === emp.ruc);
            const totalMonto = docs.reduce((acc, d) => acc + Number(d.total || 0), 0);
            return {
              ...emp,
              total_docs: docs.length,
              total_monto: Number(totalMonto.toFixed(2)),
            };
          });
        }
        if (q.includes("FROM COMPROBANTES")) {
          let list = [...self.comprobantes];
          if (params.length === 2) {
            list = list.filter((c) => c.empresa_ruc === params[0] && c.tipo_comprobante === params[1]);
          } else if (params.length === 1) {
            list = list.filter((c) => c.empresa_ruc === params[0]);
          }
          return list.slice(0, 100);
        }
        return [];
      },
    };
  }
}

export function getDb(): any {
  if (!sqlInstance && env.POSTGRES_URL) {
    try {
      sqlInstance = postgres(env.POSTGRES_URL, {
        max: 5,
        idle_timeout: 20,
        connect_timeout: 10,
        ssl: env.POSTGRES_URL.includes("localhost") ? false : "require",
      });
    } catch (e) {
      console.error("Error al inicializar cliente PostgreSQL:", e);
    }
  }
  return sqlInstance;
}

export function getSqlite(): any {
  if (!sqliteInstance) {
    const BunDbClass = loadBunSqliteClass();
    if (BunDbClass) {
      try {
        const isServerless = !!(
          process.env.VERCEL ||
          process.env.AWS_LAMBDA_FUNCTION_NAME ||
          process.env.LAMBDA_TASK_ROOT
        );
        const dataDir = isServerless ? os.tmpdir() : path.resolve(process.cwd(), "data");
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        const dbPath = path.join(dataDir, "billing.sqlite");
        sqliteInstance = new BunDbClass(dbPath, { create: true });
        sqliteInstance.run("PRAGMA journal_mode = WAL;");
      } catch (err) {
        console.warn("No se pudo abrir SQLite en disco, intentando SQLite en memoria (:memory:):", err);
        try {
          sqliteInstance = new BunDbClass(":memory:");
        } catch {
          sqliteInstance = new MemoryDbFallback();
        }
      }
    } else {
      sqliteInstance = new MemoryDbFallback();
    }
  }
  return sqliteInstance;
}

export function isDbConnected(): boolean {
  return !!getDb() || true;
}

export function getDbEngine(): string {
  if (getDb()) return "PostgreSQL (Supabase)";
  if (sqliteInstance instanceof MemoryDbFallback) return "In-Memory Fallback (Serverless)";
  return "SQLite Local (data/billing.sqlite)";
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
  if (apiKey === env.API_KEY) {
    return {
      id: "env-default",
      ruc: env.SUNAT_RUC,
      razon_social: "EMPRESA POR DEFECTO (.ENV)",
      usuario_sol: env.SUNAT_USUARIO_SOL,
      clave_sol: env.SUNAT_CLAVE_SOL,
      is_beta: env.SUNAT_ENV === "beta",
      activo: 1,
    };
  }

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
