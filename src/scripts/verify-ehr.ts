/**
 * Script de verificación del EHR Persistente — Drizzle ORM
 * Uso: npx tsx src/scripts/verify-ehr.ts
 * CDSS MTC Premium v2.1
 */

import { db, rawDb } from "@/lib/ehr/db";
import { consultations } from "@/lib/ehr/schema";
import { saveConsultation, getConsultationsByPatient, getPatientStats, getConsultationById } from "@/lib/ehr/store";
import { type NewConsultation } from "@/lib/ehr/schema";
import { eq, count } from "drizzle-orm";

function log(step: string, msg: string) {
  console.log(`[${step}] ${msg}`);
}

async function main() {
  console.log("══════════════════════════════════════════════════");
  console.log("  VERIFICACIÓN EHR PERSISTENTE v2.1 — Drizzle ORM");
  console.log("══════════════════════════════════════════════════\n");

  // 1. Verificar conexión a DB y schema
  log("1/7", "Conectando a base de datos ehr-production.db...");
  const tables = rawDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const hasConsultations = tables.some((t: any) => t.name === "consultations");
  log("1/7", hasConsultations ? "✅ Tabla 'consultations' existe" : "⚠️  Tabla 'consultations' NO existe (ejecuta 'npx drizzle-kit push' primero)");

  // 2. Verificar PRAGMAs de integridad
  log("2/7", "Verificando PRAGMAs de integridad...");
  const fk = rawDb.prepare("PRAGMA foreign_keys").get() as any;
  const journal = rawDb.prepare("PRAGMA journal_mode").get() as any;
  log("2/7", `   → foreign_keys: ${fk?.foreign_keys === 1 ? '✅ ON' : '❌ OFF'}`);
  log("2/7", `   → journal_mode: ${journal?.journal_mode === 'wal' ? '✅ WAL' : journal?.journal_mode}`);

  // 3. Insertar consulta de prueba (transacción ACID)
  log("3/7", "Insertando consulta de prueba (transacción ACID)...");
  const testConsultation: NewConsultation = {
    patientHash: "test_sha256_abc123def4567890",
    consultationDate: new Date().toISOString(),
    patientAge: 45,
    patientGender: "F",
    symptoms: "Dolor de cabeza tensional, insomnio",
    diagnosis: "Cefalea tensional",
    syndrome: "Estancamiento de Qi del Hígado con subida de Yang",
    points: [
      { name: "LI4", location: "Dorsum de la mano, entre 1° y 2° metacarpiano", indication: "Cefalea, insomnio" },
      { name: "LR3", location: "Dorsum del pie, entre 1° y 2° metatarsiano", indication: "Estancamiento de Qi hepático" },
    ],
    herbs: [
      { name: "Chai Hu", dose: "6g", preparation: "Decocción" },
      { name: "Bai Shao", dose: "12g", preparation: "Decocción" },
    ],
    rationale: "Regula el Qi del Hígado y ancla el Yang ascendente",
    kantStatus: "green",
    kantScore: 5,
    kantAlerts: [],
    kantContraindications: [],
    kantAuditTrail: ["RULE:pregnancy:evaluated", "RULE:herbDrugInteractions:evaluated"],
    ragCitations: [
      { document: "CEMeTC — Dolor y Cefalea", documentId: "mtc-core_Dolor y Cefalea", pageStart: 12, pageEnd: 15, excerpt: "LI4 indicado para cefalea frontal" },
    ],
    llmModel: "openai/gpt-3.5-turbo",
    ahpraFlags: [],
    chainOfCustody: [
      `[${new Date().toISOString()}] Treatment API processed`,
      `[${new Date().toISOString()}] KANT evaluated: green`,
    ],
  };

  const id = saveConsultation(testConsultation);
  log("3/7", `✅ Consulta guardada con ID: ${id} (transacción completada)`);

  // 4. Recuperar por ID
  log("4/7", `Recuperando consulta ID ${id}...`);
  const retrieved = getConsultationById(id);
  if (retrieved && retrieved.syndrome === testConsultation.syndrome) {
    log("4/7", "✅ Recuperación por ID correcta");
    log("4/7", `   → Síndrome: ${retrieved.syndrome}`);
    log("4/7", `   → Puntos: ${(retrieved.points as any[]).map((p: any) => p.name).join(", ")}`);
    log("4/7", `   → Hierbas: ${(retrieved.herbs as any[]).map((h: any) => h.name).join(", ")}`);
  } else {
    log("4/7", "❌ Error en recuperación por ID");
  }

  // 5. Recuperar por patientHash
  log("5/7", "Recuperando historial por patientHash...");
  const history = getConsultationsByPatient({ patientHash: testConsultation.patientHash });
  log("5/7", `✅ ${history.length} consulta(s) encontrada(s)`);

  // 6. Estadísticas con agregaciones SQL
  log("6/7", "Calculando estadísticas del paciente (agregaciones SQL)...");
  const stats = getPatientStats(testConsultation.patientHash);
  log("6/7", `✅ Total consultas: ${stats.totalConsultations}`);
  log("6/7", `   → Green: ${stats.kantStatusDistribution.green}`);
  log("6/7", `   → Yellow: ${stats.kantStatusDistribution.yellow}`);
  log("6/7", `   → Red: ${stats.kantStatusDistribution.red}`);
  log("6/7", `   → Última consulta: ${stats.lastConsultationDate}`);

  // 7. Verificar columnas del schema
  log("7/7", "Verificando schema de Drizzle ORM...");
  const columns = rawDb.prepare("PRAGMA table_info(consultations)").all();
  const requiredColumns = [
    "patient_hash", "consultation_date", "syndrome", "points",
    "herbs", "kant_status", "kant_score", "rag_citations",
    "foucault_pdf_path", "chain_of_custody", "created_at"
  ];
  const missing = requiredColumns.filter(col => !columns.some((c: any) => c.name === col));
  if (missing.length === 0) {
    log("7/7", `✅ Todas las ${requiredColumns.length} columnas requeridas presentes`);
  } else {
    log("7/7", `❌ Columnas faltantes: ${missing.join(", ")}`);
  }

  // Bonus: Verificar índices
  const indexes = rawDb.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='consultations'").all();
  log("7/7", `   → Índices encontrados: ${indexes.map((i: any) => i.name).join(", ")}`);

  console.log("\n══════════════════════════════════════════════════");
  console.log("  VERIFICACIÓN COMPLETADA — Drizzle ORM");
  console.log("══════════════════════════════════════════════════");
  console.log("\nPróximo paso: Probar el endpoint /api/treatment");
  console.log("curl -X POST http://localhost:3000/api/treatment \\");
  console.log("  -H \"Content-Type: application/json\" \\");
  console.log("  -d '{\"patient\":{\"name\":\"Test\",\"dob\":\"1990-01-01\",\"gender\":\"F\",\"symptoms\":\"dolor de cabeza\"},\"consultation\":{\"goal\":\"acupuntura\"}}'");
}

main().catch(console.error);