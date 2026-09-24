import { SQL } from "bun";
import { env } from "./env.js";

let sqlInstance: SQL | null = null;

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
