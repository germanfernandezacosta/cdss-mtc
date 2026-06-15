// src/lib/ehr/store.ts
// Capa de persistencia — CDSS MTC Premium v3.0
// CRUD patients, consultations, documents
// better-sqlite3 síncrono = máxima velocidad

import { db } from './db';
import { patients, consultations, documents, type NewPatient, type NewConsultation, type NewDocument } from './schema';
import { eq, like, and, or, desc, sql } from 'drizzle-orm';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function generateEhrId(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `EHR-${year}-${random}`;
}

// ═══════════════════════════════════════════════════════════════
// PATIENTS CRUD
// ═══════════════════════════════════════════════════════════════

export function createPatient(data: Omit<NewPatient, 'ehrId' | 'createdAt' | 'updatedAt'>): string {
  const ehrId = generateEhrId();
  const now = sql`(datetime('now'))`;

  db.insert(patients).values({
    ...data,
    ehrId,
    createdAt: now,
    updatedAt: now,
  }).run();

  return ehrId;
}

export function getPatientByEhrId(ehrId: string) {
  return db.select().from(patients).where(eq(patients.ehrId, ehrId)).get();
}

export function getPatientByPatientId(patientId: string) {
  return db.select().from(patients).where(eq(patients.patientId, patientId)).get();
}

export function searchPatients(query: string) {
  const searchTerm = `%${query}%`;
  return db.select()
    .from(patients)
    .where(
      or(
        like(patients.name, searchTerm),
        like(patients.ehrId, searchTerm),
        like(patients.patientId, searchTerm),
        like(patients.email, searchTerm)
      )
    )
    .limit(20)
    .all();
}

export function updatePatient(ehrId: string, data: Partial<Omit<NewPatient, 'ehrId' | 'id' | 'createdAt'>>) {
  const patient = getPatientByEhrId(ehrId);
  if (!patient) return null;

  db.update(patients)
    .set({ ...data, updatedAt: sql`(datetime('now'))` })
    .where(eq(patients.ehrId, ehrId))
    .run();

  return getPatientByEhrId(ehrId);
}

export function updatePatientHash(ehrId: string, newHash: string) {
  // Cuando se añade patientId, recalculamos hash y actualizamos todas las consultas
  const patient = getPatientByEhrId(ehrId);
  if (!patient) return null;

  db.update(consultations)
    .set({ patientHash: newHash })
    .where(eq(consultations.ehrId, ehrId))
    .run();

  return patient;
}

// ═══════════════════════════════════════════════════════════════
// CONSULTATIONS CRUD
// ═══════════════════════════════════════════════════════════════

export function saveConsultation(data: NewConsultation): number {
  const result = db.insert(consultations).values(data).run();
  return Number(result.lastInsertRowid);
}

export function getConsultationById(id: number) {
  return db.select().from(consultations).where(eq(consultations.id, id)).get();
}

export function getLastConsultationByHash(patientHash: string) {
  return db.select()
    .from(consultations)
    .where(eq(consultations.patientHash, patientHash))
    .orderBy(desc(consultations.consultationDate))
    .limit(1)
    .get();
}

export function getConsultationsByEhrId(ehrId: string, limit = 50) {
  return db.select()
    .from(consultations)
    .where(eq(consultations.ehrId, ehrId))
    .orderBy(desc(consultations.consultationDate))
    .limit(limit)
    .all();
}

export function getConsultationsByPatientHash(patientHash: string, limit = 50) {
  return db.select()
    .from(consultations)
    .where(eq(consultations.patientHash, patientHash))
    .orderBy(desc(consultations.consultationDate))
    .limit(limit)
    .all();
}

export function getConsultationHistory(ehrId: string) {
  // Alias para compatibilidad con código existente
  return getConsultationsByEhrId(ehrId);
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENTS CRUD (PDFs como BLOB)
// ═══════════════════════════════════════════════════════════════

export function saveDocument(data: NewDocument): number {
  const result = db.insert(documents).values(data).run();
  return Number(result.lastInsertRowid);
}

export function getDocumentsByEhrId(ehrId: string) {
  return db.select()
    .from(documents)
    .where(eq(documents.ehrId, ehrId))
    .orderBy(desc(documents.createdAt))
    .all();
}

export function getDocumentById(id: number) {
  return db.select().from(documents).where(eq(documents.id, id)).get();
}

export function getDocumentBinary(id: number): Buffer | null {
  const doc = getDocumentById(id);
  return doc ? doc.fileData as Buffer : null;
}

// ═══════════════════════════════════════════════════════════════
// COMPATIBILIDAD v2.2 (alias para no romper código existente)
// ═══════════════════════════════════════════════════════════════

export function saveConsultationHistory(data: any) {
  // v2.2 tenía tabla consultationHistory separada
  // v3.0: guardamos directamente en consultations
  // Este alias mantiene compatibilidad temporal
  console.log('[v3.0] saveConsultationHistory es alias de saveConsultation');
  return saveConsultation(data);
}

export function getLastConsultationByHashCompat(patientHash: string) {
  return getLastConsultationByHash(patientHash);
}

export function saveFoucaultPDFs(ehrId: string, forensicPath: string, empathicPath: string) {
  // Legacy: actualiza rutas en consultations (para PDFs en disco)
  // v3.0: usa saveDocument para BLOBs
  console.log('[v3.0] saveFoucaultPDFs legacy — considera migrar a saveDocument');
  // No-op por ahora, los PDFs legacy se quedan en disco
}

// ═══════════════════════════════════════════════════════════════
// COMPATIBILIDAD v2.2 (para no romper código antiguo)
// ═══════════════════════════════════════════════════════════════

export function getConsultationsByPatient(patientHash: string) {
  return getConsultationsByEhrId(patientHash); // Fallback
}

export function getPatientStats(patientHash: string) {
  // ✅ FIX: buscar por patientHash, no por ehrId
  const allConsultations = db.select()
    .from(consultations)
    .where(eq(consultations.patientHash, patientHash))
    .orderBy(desc(consultations.consultationDate))
    .all();
  
  const last = allConsultations.length > 0 ? allConsultations[0] : null;
  const avgScore = allConsultations.length > 0
    ? allConsultations.reduce((sum, c) => sum + (c.kantScore || 0), 0) / allConsultations.length
    : 0;

  return {
    totalConsultations: allConsultations.length,
    lastConsultation: last,
    lastConsultationDate: last?.consultationDate || null,
    averageKantScore: avgScore,
    kantStatusDistribution: {
      green: allConsultations.filter(c => c.kantStatus === 'green').length,
      yellow: allConsultations.filter(c => c.kantStatus === 'yellow').length,
      red: allConsultations.filter(c => c.kantStatus === 'red').length,
    },
  };
}

export function deleteConsultation(id: number) {
  db.delete(consultations).where(eq(consultations.id, id)).run();
  return true;
}

export function generatePdfPath(ehrId: string, type: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `./data/ehr/pdfs/${ehrId}_${timestamp}_${type}.pdf`;
}

export type EHRQuery = {
  patientHash?: string;
  ehrId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
};