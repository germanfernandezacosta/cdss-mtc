/**
 * EHR Database Client — Drizzle ORM + better-sqlite3
 * CDSS MTC Premium v2.1
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import * as fs from "fs";
import * as path from "path";

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

const EHR_DB_DIR = path.resolve(process.cwd(), "data/ehr");
const EHR_DB_PATH = path.join(EHR_DB_DIR, "ehr-production.db");
const PDF_DIR = path.join(EHR_DB_DIR, "pdfs");

// Asegurar directorios existen
if (!fs.existsSync(EHR_DB_DIR)) {
  fs.mkdirSync(EHR_DB_DIR, { recursive: true });
}
if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════
// CLIENTE SQLITE + DRIZZLE ORM
// ═══════════════════════════════════════════════════════════════

const sqlite = new Database(EHR_DB_PATH);

// Activar integridad referencial estricta (SQLite la desactiva por defecto)
sqlite.exec("PRAGMA foreign_keys = ON;");
sqlite.exec("PRAGMA journal_mode = WAL;");           // Write-Ahead Logging
sqlite.exec("PRAGMA synchronous = NORMAL;");          // Balance rendimiento/durabilidad
sqlite.exec("PRAGMA temp_store = MEMORY;");            // Temp tables en RAM

// Cliente Drizzle con schema tipado
export const db = drizzle(sqlite, { schema });

// Exportar raw connection para casos edge-case
export { sqlite as rawDb };

// Exportar path útil para otros módulos
export { EHR_DB_PATH, PDF_DIR };