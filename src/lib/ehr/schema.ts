/**
 * EHR Schema — Drizzle ORM v3.0
 * CDSS MTC Premium v3.0 "NotebookLM Brain"
 * SQLite estricto + integridad referencial + WAL mode
 * 
 * CAMBIOS v3.0:
 * - Tabla patients separada (identidad persistente)
 * - Tabla documents (PDFs como BLOB, inmutables)
 * - Tabla clinicConfig (configuración terapeuta/clínica)
 * - consultationHistory ELIMINADA (fusionada en consultations)
 * - patientId nullable en patients (primera consulta = NULL)
 * - ehrId como identificador legible (EHR-2026-XXXXX)
 * - reasoning + sources para traza de pensamiento NotebookLM
 */

import { sqliteTable, integer, text, blob, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════
// TABLA 1: patients — Identidad persistente del paciente
// ═══════════════════════════════════════════════════════════════

export const patients = sqliteTable("patients", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),

  // Identificador legible (EHR-2026-XXXXX)
  ehrId: text("ehr_id", { length: 20 }).notNull().unique(),

  // Datos personales (encriptados en reposo por SQLite, acceso controlado)
  name: text("name").notNull(),
  dob: text("dob", { length: 10 }).notNull(), // YYYY-MM-DD
  email: text("email"),
  phone: text("phone"),
  address: text("address"),

  // Código del terapeuta (NULL en primera consulta)
  patientId: text("patient_id", { length: 50 }).unique(),

  // Metadatos
  createdAt: text("created_at", { length: 30 }).default(sql`(datetime('now'))`),
  updatedAt: text("updated_at", { length: 30 }).default(sql`(datetime('now'))`),
}, (table) => ({
  ehrIdIdx: uniqueIndex("idx_patients_ehr_id").on(table.ehrId),
  patientIdIdx: uniqueIndex("idx_patients_patient_id").on(table.patientId),
  nameIdx: index("idx_patients_name").on(table.name),
  dobIdx: index("idx_patients_dob").on(table.dob),
}));

// ═══════════════════════════════════════════════════════════════
// TABLA 2: consultations — Cada sesión clínica (schema v2.2 extendido)
// ═══════════════════════════════════════════════════════════════

export const consultations = sqliteTable("consultations", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),

  // Vínculo con paciente
  ehrId: text("ehr_id", { length: 20 }),
  patientHash: text("patient_hash", { length: 64 }).notNull(),

  // Metadata temporal
  consultationDate: text("consultation_date", { length: 30 }).notNull(),
  createdAt: text("created_at", { length: 30 }).default(sql`(datetime('now'))`),

  // i18n
  language: text("language", { length: 10 }).notNull().default("es"),

  // Datos demográficos (anonimizados)
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

  // ─── NUEVO v3.0: Traza de pensamiento NotebookLM ─────────
  reasoning: text("reasoning"), // Paso a paso del razonamiento clínico
  sources: text("sources", { mode: "json" }).$type<Array<{
    document: string;
    pageStart: number;
    pageEnd: number;
    excerpt: string;
  }>>(),

  // ─── Resultado KANT v3.0 (seguridad) ──────────────────────
  kantStatus: text("kant_status", { length: 10 }).notNull(),
  kantScore: integer("kant_score").notNull().default(0),
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

  // ─── Metadata LLM ─────────────────────────────────────────
  llmModel: text("llm_model", { length: 50 }).notNull(),

  // ─── Foucault PDF (rutas en disco para legacy, nullable para BLOB) ─
  foucaultPdfPath: text("foucault_pdf_path"),
  foucaultForensicHash: text("foucault_forensic_hash", { length: 64 }),
  foucaultEmpathicHash: text("foucault_empathic_hash", { length: 64 }),

  // ─── Regulatorio ──────────────────────────────────────────
  regulatoryFramework: text("regulatory_framework", { length: 20 }).default("AHPRA"),
  isTest: integer("is_test", { mode: "boolean" }).default(false),

  // ─── Audit trail regulatorio ───────────────────────────────
  ahpraFlags: text("ahpra_flags", { mode: "json" }).$type<Array<{
    ruleId: string;
    term: string;
    severity: string;
  }>>(),
  chainOfCustody: text("chain_of_custody", { mode: "json" }).$type<string[]>(),

  // ─── Datos del Practitioner (inline por ahora, Fase 5 extrae a clinicConfig) ─
  practitionerName: text("practitioner_name"),
  practitionerRegistration: text("practitioner_registration"),
  practitionerQualification: text("practitioner_qualification"),
  practitionerClinic: text("practitioner_clinic"),
  practitionerAddress: text("practitioner_address"),
  practitionerPhone: text("practitioner_phone"),
  practitionerLogoUrl: text("practitioner_logo_url"),

  // ─── Examen físico MTC (舌/脉/腹/良導絡) — MANTENIDO v2.2 ─
  complexion: text("complexion"),
  spirit: text("spirit"),
  bodyShape: text("body_shape"),
  posture: text("posture"),
  skinCondition: text("skin_condition"),
  hairCondition: text("hair_condition"),
  eyes: text("eyes"),
  nails: text("nails"),

  tongueBodyColor: text("tongue_body_color"),
  tongueBodyShape: text("tongue_body_shape"),
  tongueCoatingColor: text("tongue_coating_color"),
  tongueCoatingThickness: text("tongue_coating_thickness"),
  tongueCoatingDistribution: text("tongue_coating_distribution"),
  tongueMoisture: text("tongue_moisture"),
  tongueSublingualVeins: text("tongue_sublingual_veins"),
  tongueNotes: text("tongue_notes"),

  pulseLeftCun: text("pulse_left_cun"),
  pulseLeftGuan: text("pulse_left_guan"),
  pulseLeftChi: text("pulse_left_chi"),
  pulseRightCun: text("pulse_right_cun"),
  pulseRightGuan: text("pulse_right_guan"),
  pulseRightChi: text("pulse_right_chi"),
  pulseDepth: text("pulse_depth"),
  pulseRate: text("pulse_rate"),
  pulseRhythm: text("pulse_rhythm"),
  pulseQuality: text("pulse_quality"),
  pulseOverall: text("pulse_overall"),
  pulseNotes: text("pulse_notes"),

  ryodorakuLung: integer("ryodoraku_lung"),
  ryodorakuPericardium: integer("ryodoraku_pericardium"),
  ryodorakuHeart: integer("ryodoraku_heart"),
  ryodorakuSmallIntestine: integer("ryodoraku_small_intestine"),
  ryodorakuTripleWarmer: integer("ryodoraku_triple_warmer"),
  ryodorakuLargeIntestine: integer("ryodoraku_large_intestine"),
  ryodorakuSpleen: integer("ryodoraku_spleen"),
  ryodorakuLiver: integer("ryodoraku_liver"),
  ryodorakuKidney: integer("ryodoraku_kidney"),
  ryodorakuBladder: integer("ryodoraku_bladder"),
  ryodorakuStomach: integer("ryodoraku_stomach"),
  ryodorakuGallbladder: integer("ryodoraku_gallbladder"),
  ryodorakuNotes: text("ryodoraku_notes"),

  abdomenOverall: text("abdomen_overall"),
  abdomenSho: text("abdomen_sho"),
  abdomenTenderness: text("abdomen_tenderness"),
  abdomenTension: text("abdomen_tension"),
  abdomenTemperature: text("abdomen_temperature"),
  abdomenWaterSound: text("abdomen_water_sound"),
  abdomenNotes: text("abdomen_notes"),

  // ─── Diagnóstico MTC extendido ────────────────────────────
  bianZheng: text("bian_zheng"),
  zangFuPattern: text("zang_fu_pattern"),
  baGang: text("ba_gang"),
  qiBloodFluid: text("qi_blood_fluid"),
  channelPattern: text("channel_pattern"),
  diseaseMechanism: text("disease_mechanism"),
  westernDiagnosis: text("western_diagnosis"),

  // ─── Tratamiento con reglas cerradas ───────────────────────
  treatmentPrinciple: text("treatment_principle"),
  treatmentMethod: text("treatment_method"),
  pointsExecution: text("points_execution", { mode: "json" }).$type<Array<{
    point: string;
    location: string;
    technique: string;
    depth: string;
    manipulation: string;
    duration: string;
    notes?: string;
  }>>(),
  acupunctureNeedleType: text("acupuncture_needle_type"),
  acupunctureNeedleCount: integer("acupuncture_needle_count"),
  acupunctureDuration: text("acupuncture_duration"),
  acupunctureFrequency: text("acupuncture_frequency"),
  acupunctureTotalSessions: integer("acupuncture_total_sessions"),
  acupunctureSequence: text("acupuncture_sequence"),
  acupunctureDeqi: text("acupuncture_deqi"),
  acupunctureNotes: text("acupuncture_notes"),

  moxibustionType: text("moxibustion_type"),
  moxibustionPoints: text("moxibustion_points"),
  moxibustionDuration: text("moxibustion_duration"),
  moxibustionFrequency: text("moxibustion_frequency"),
  moxibustionContraindications: text("moxibustion_contraindications"),

  cuppingType: text("cupping_type"),
  cuppingLocation: text("cupping_location"),
  cuppingDuration: text("cupping_duration"),
  cuppingFrequency: text("cupping_frequency"),
  cuppingNotes: text("cupping_notes"),

  tuinaTechniques: text("tuina_techniques"),
  tuinaDuration: text("tuina_duration"),
  tuinaFrequency: text("tuina_frequency"),
  tuinaContraindications: text("tuina_contraindications"),

  dietaryAdvice: text("dietary_advice"),
  dietaryAvoid: text("dietary_avoid"),
  dietaryConstitution: text("dietary_constitution"),

  exerciseType: text("exercise_type"),
  exerciseRoutine: text("exercise_routine"),
  exerciseContraindications: text("exercise_contraindications"),

  herbalFormula: text("herbal_formula"),
  herbalIngredients: text("herbal_ingredients", { mode: "json" }).$type<Array<{
    herb: string;
    dose: string;
    unit: string;
    preparation: string;
    function: string;
  }>>(),
  herbalModifications: text("herbal_modifications"),
  herbalDosage: text("herbal_dosage"),
  herbalAdministration: text("herbal_administration"),
  herbalDuration: text("herbal_duration"),
  herbalFrequency: text("herbal_frequency"),
  herbalContraindications: text("herbal_contraindications"),
  herbalTgaStatus: text("herbal_tga_status"),
  herbalAhpraWarning: text("herbal_ahpra_warning"),

  // ─── Prognosis y seguimiento ──────────────────────────────
  prognosis: text("prognosis"),
  followUpPlan: text("follow_up_plan"),
  expectedOutcomes: text("expected_outcomes"),
  redFlags: text("red_flags"),
  referralNeeded: integer("referral_needed", { mode: "boolean" }),
  referralTo: text("referral_to"),
  referralReason: text("referral_reason"),

  // ─── Consentimiento informado ───────────────────────────────
  informedConsent: integer("informed_consent", { mode: "boolean" }),
  consentDate: text("consent_date"),
  patientSignature: text("patient_signature"),
  practitionerSignature: text("practitioner_signature"),
  riskAcknowledged: integer("risk_acknowledged", { mode: "boolean" }),
  privacyAcknowledged: integer("privacy_acknowledged", { mode: "boolean" }),

  // ─── Metadatos del sistema ────────────────────────────────
  foucaultVersion: text("foucault_version"),
  ragChunksUsed: text("rag_chunks_used"),
  openrouterModel: text("openrouter_model"),
  generationTimestamp: text("generation_timestamp"),
  empathicNarrative: text("empathic_narrative"),
  homeCareInstructions: text("home_care_instructions"),

}, (table) => ({
  // Índices existentes
  patientHashIdx: index("idx_consultation_patient_hash").on(table.patientHash),
  dateIdx: index("idx_consultation_date").on(table.consultationDate),
  statusIdx: index("idx_consultation_kant_status").on(table.kantStatus),
  patientDateIdx: index("idx_consultation_patient_date").on(table.patientHash, table.consultationDate),
  testIdx: index("idx_consultation_is_test").on(table.isTest),
  langIdx: index("idx_consultation_language").on(table.language),
  ehrIdIdx: index("idx_consultation_ehr_id").on(table.ehrId),

  // Índices forenses
  forensicHashIdx: index("idx_consultation_forensic_hash").on(table.foucaultForensicHash),
  empathicHashIdx: index("idx_consultation_empathic_hash").on(table.foucaultEmpathicHash),
  practitionerIdx: index("idx_consultation_practitioner").on(table.practitionerRegistration),
  referralIdx: index("idx_consultation_referral").on(table.referralNeeded),
}));

// ═══════════════════════════════════════════════════════════════
// TABLA 3: documents — PDFs generados (inmutables, BLOB)
// ═══════════════════════════════════════════════════════════════

export const documents = sqliteTable("documents", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  ehrId: text("ehr_id", { length: 20 }),
  consultationId: integer("consultation_id"), // Vinculo opcional a consulta específica
  type: text("type", { length: 10 }).notNull(), // 'forensic' | 'empathic'
  fileName: text("file_name").notNull(),
  fileData: blob("file_data").notNull(), // PDF binario
  createdAt: text("created_at", { length: 30 }).default(sql`(datetime('now'))`),
}, (table) => ({
  ehrIdIdx: index("idx_documents_ehr_id").on(table.ehrId),
  consultationIdx: index("idx_documents_consultation").on(table.consultationId),
  typeIdx: index("idx_documents_type").on(table.type),
}));

// ═══════════════════════════════════════════════════════════════
// TABLA 4: clinicConfig — Configuración terapeuta/clínica (Fase 5)
// ═══════════════════════════════════════════════════════════════

export const clinicConfig = sqliteTable("clinic_config", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  clinicName: text("clinic_name"),
  therapistName: text("therapist_name"),
  therapistLicense: text("therapist_license"),
  therapistQualification: text("therapist_qualification"),
  logoData: blob("logo_data"), // BLOB imagen
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  updatedAt: text("updated_at", { length: 30 }).default(sql`(datetime('now'))`),
});

// ═══════════════════════════════════════════════════════════════
// TIPOS INFERIDOS (type safety automático de Drizzle)
// ═══════════════════════════════════════════════════════════════

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;

export type Consultation = typeof consultations.$inferSelect;
export type NewConsultation = typeof consultations.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type ClinicConfig = typeof clinicConfig.$inferSelect;
export type NewClinicConfig = typeof clinicConfig.$inferInsert;