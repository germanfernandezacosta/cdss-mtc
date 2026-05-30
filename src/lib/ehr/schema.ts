/**
 * EHR Schema — Drizzle ORM
 * CDSS MTC Premium v2.1
 * SQLite estricto con integridad referencial + transacciones ACID
 * NUEVO: Campos regulatorios (TGA, AHPRA) e i18n
 */

import { sqliteTable, integer, text, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════
// TABLA PRINCIPAL: consultations
// ═══════════════════════════════════════════════════════════════

export const consultations = sqliteTable("consultations", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),

  // ─── Identificación anónima ─────────────────────────────────
  patientHash: text("patient_hash", { length: 64 }).notNull(),

  // ─── Metadata temporal ──────────────────────────────────────
  consultationDate: text("consultation_date", { length: 30 }).notNull(),
  createdAt: text("created_at", { length: 30 }).default(sql`(datetime('now'))`),

  // ─── i18n ───────────────────────────────────────────────────
  language: text("language", { length: 10 }).notNull().default("es"),
  // es | en-AU

  // ─── Datos demográficos (anonimizados) ─────────────────────
  patientAge: integer("patient_age"),
  patientGender: text("patient_gender", { length: 10 }),

  // ─── Entrada clínica ──────────────────────────────────────
  symptoms: text("symptoms").notNull(),
  diagnosis: text("diagnosis"),

  // ─── Resultado Fukuoka-H (diagnóstico MTC) ────────────────
  syndrome: text("syndrome").notNull(),
  points: text("points", { mode: "json" }).$type<Array<{
    name: string;
    location: string;
    indication: string;
  }>>(),
  herbs: text("herbs", { mode: "json" }).$type<Array<{
    name: string;
    dose: string;
    preparation: string;
  }>>(),
  rationale: text("rationale"),

  // ─── Resultado KANT v2.1 (seguridad) ──────────────────────
  kantStatus: text("kant_status", { length: 10 }).notNull(), // green | yellow | red
  kantScore: integer("kant_score").notNull().default(0),       // 0-100
  kantAlerts: text("kant_alerts", { mode: "json" }).$type<Array<{
    code: string;
    category: string;
    severity: "low" | "moderate" | "high" | "absolute";
    message: string;
    sourceRule: string;
    recommendation: string;
    affectedItems?: string[];
  }>>(),
  kantContraindications: text("kant_contraindications", { mode: "json" }).$type<Array<{
    item: string;
    type: "point" | "herb" | "technique" | "drug" | "device";
    reason: string;
    severity: "low" | "moderate" | "high" | "absolute";
    alternative?: string;
  }>>(),
  kantAuditTrail: text("kant_audit_trail", { mode: "json" }).$type<string[]>(),

  // ─── Citaciones RAG ───────────────────────────────────────
  ragCitations: text("rag_citations", { mode: "json" }).$type<Array<{
    document: string;
    documentId: string;
    pageStart: number;
    pageEnd: number;
    excerpt: string;
  }>>(),

  // ─── Metadata LLM ───────────────────────────────────────────
  llmModel: text("llm_model", { length: 50 }).notNull(),

  // ─── Foucault PDF (rutas en disco) ─────────────────────────
  foucaultPdfPath: text("foucault_pdf_path"),
  foucaultForensicHash: text("foucault_forensic_hash", { length: 64 }),
  foucaultEmpathicHash: text("foucault_empathic_hash", { length: 64 }),

  // ─── Regulatorio ────────────────────────────────────────────
  regulatoryFramework: text("regulatory_framework", { length: 20 }).default("AHPRA"),
  // AHPRA | TGA | RGPD
  isTest: integer("is_test", { mode: "boolean" }).default(false),
  // true = datos de prueba (borrables)

  // ─── Audit trail regulatorio ────────────────────────────────
  ahpraFlags: text("ahpra_flags", { mode: "json" }).$type<Array<{
    ruleId: string;
    term: string;
    severity: string;
  }>>(),
  chainOfCustody: text("chain_of_custody", { mode: "json" }).$type<string[]>(),

}, (table) => ({
  // Índices para búsquedas rápidas y constraints
  patientHashIdx: index("idx_patient_hash").on(table.patientHash),
  dateIdx: index("idx_consultation_date").on(table.consultationDate),
  statusIdx: index("idx_kant_status").on(table.kantStatus),
  patientDateIdx: index("idx_patient_date").on(table.patientHash, table.consultationDate),
  testIdx: index("idx_is_test").on(table.isTest),
  langIdx: index("idx_language").on(table.language),
}));

// ═══════════════════════════════════════════════════════════════
// TIPO INFERIDO (type safety automático de Drizzle)
// ═══════════════════════════════════════════════════════════════

export type Consultation = typeof consultations.$inferSelect;
export type NewConsultation = typeof consultations.$inferInsert;