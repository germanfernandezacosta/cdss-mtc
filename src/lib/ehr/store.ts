/**
 * EHR Store — Operaciones CRUD con Drizzle ORM
 * Transacciones ACID explícitas para integridad clínica
 * CDSS MTC Premium v2.1
 */

import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import { db, PDF_DIR } from "./db";
import { consultations, type Consultation, type NewConsultation } from "./schema";
import * as path from "path";
import * as fs from "fs";

// ═══════════════════════════════════════════════════════════════
// TIPOS DE QUERY
// ═══════════════════════════════════════════════════════════════

export interface EHRQuery {
  patientHash: string;
  fromDate?: string;      // ISO 8601
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface EHRStats {
  totalConsultations: number;
  lastConsultationDate?: string;
  kantStatusDistribution: {
    green: number;
    yellow: number;
    red: number;
  };
}

export interface PdfSaveResult {
  forensicPath: string;
  empathicPath: string;
  forensicHash: string;
  empathicHash: string;
}

// ═══════════════════════════════════════════════════════════════
// CREATE — Guardar consulta (con transacción ACID)
// ═══════════════════════════════════════════════════════════════

export function saveConsultation(data: NewConsultation): number {
  // Transacción explícita: si falla algo, rollback completo
  const result = db.transaction((tx) => {
    const inserted = tx.insert(consultations).values(data).returning({ id: consultations.id }).get();
    return inserted.id;
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════
// READ — Recuperar historial por paciente (con filtros)
// ═══════════════════════════════════════════════════════════════

export function getConsultationsByPatient(query: EHRQuery): Consultation[] {
  const conditions = [eq(consultations.patientHash, query.patientHash)];

  if (query.fromDate) {
    conditions.push(gte(consultations.consultationDate, query.fromDate));
  }
  if (query.toDate) {
    conditions.push(lte(consultations.consultationDate, query.toDate));
  }

  const results = db
    .select()
    .from(consultations)
    .where(and(...conditions))
    .orderBy(desc(consultations.consultationDate))
    .limit(query.limit ?? 100)
    .offset(query.offset ?? 0)
    .all();

  return results;
}

export function getConsultationById(id: number): Consultation | null {
  const result = db
    .select()
    .from(consultations)
    .where(eq(consultations.id, id))
    .get();

  return result ?? null;
}

// ═══════════════════════════════════════════════════════════════
// STATS — Estadísticas del paciente (agregaciones SQL)
// ═══════════════════════════════════════════════════════════════

export function getPatientStats(patientHash: string): EHRStats {
  // Total de consultas
  const totalResult = db
    .select({ count: count() })
    .from(consultations)
    .where(eq(consultations.patientHash, patientHash))
    .get();

  // Última consulta
  const lastResult = db
    .select({ date: consultations.consultationDate })
    .from(consultations)
    .where(eq(consultations.patientHash, patientHash))
    .orderBy(desc(consultations.consultationDate))
    .limit(1)
    .get();

  // Distribución por status KANT
  const statusResults = db
    .select({
      status: consultations.kantStatus,
      count: count(),
    })
    .from(consultations)
    .where(eq(consultations.patientHash, patientHash))
    .groupBy(consultations.kantStatus)
    .all();

  const distribution = { green: 0, yellow: 0, red: 0 };
  for (const row of statusResults) {
    if (row.status === "green") distribution.green = row.count;
    if (row.status === "yellow") distribution.yellow = row.count;
    if (row.status === "red") distribution.red = row.count;
  }

  return {
    totalConsultations: totalResult?.count ?? 0,
    lastConsultationDate: lastResult?.date ?? undefined,
    kantStatusDistribution: distribution,
  };
}

// ═══════════════════════════════════════════════════════════════
// DELETE — Eliminar consulta (soft-delete NO implementado, es hard-delete)
// ⚠️ En producción médica se recomienda soft-delete o archivado
// ═══════════════════════════════════════════════════════════════

export function deleteConsultation(id: number): boolean {
  const result = db.transaction((tx) => {
    const deleted = tx
      .delete(consultations)
      .where(eq(consultations.id, id))
      .returning({ id: consultations.id })
      .get();
    return !!deleted;
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════
// PDF UTILITIES — Guardar PDFs de Foucault en disco
// ═══════════════════════════════════════════════════════════════

export function generatePdfPath(
  patientHash: string,
  type: "forensic" | "empathic",
  timestamp: string
): string {
  const safeTs = timestamp.replace(/[:.]/g, "-");
  const filename = `${patientHash}_${safeTs}_${type}.pdf`;
  return path.join(PDF_DIR, filename);
}

export function saveFoucaultPDFs(
  patientHash: string,
  timestamp: string,
  forensicBase64: string,
  empathicBase64: string,
  forensicHash: string,
  empathicHash: string
): PdfSaveResult {
  const forensicPath = generatePdfPath(patientHash, "forensic", timestamp);
  const empathicPath = generatePdfPath(patientHash, "empathic", timestamp);

  fs.writeFileSync(forensicPath, Buffer.from(forensicBase64, "base64"));
  fs.writeFileSync(empathicPath, Buffer.from(empathicBase64, "base64"));

  return {
    forensicPath,
    empathicPath,
    forensicHash,
    empathicHash,
  };
}

export function readFoucaultPDF(pdfPath: string): string {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF no encontrado: ${pdfPath}`);
  }
  return fs.readFileSync(pdfPath).toString("base64");
}