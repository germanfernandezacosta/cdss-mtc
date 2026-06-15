/**
 * Tipos compartidos para generadores de PDF
 * CDSS MTC Premium v2.2
 */

// ═══════════════════════════════════════════════════════════════
// FORENSE
// ═══════════════════════════════════════════════════════════════

export interface ForensicPatient {
  hash: string;
  name?: string;
  age?: number;
  gender?: string;
}

export interface ForensicSession {
  id: number;
  date: string;
  createdAt: string;
}

export interface ForensicPractitioner {
  name?: string;
  registration?: string;
  qualification?: string;
  clinic?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;   // ← NUEVO: URL del logo para el header del PDF
}

export interface ForensicClinical {
  symptoms?: string;
  diagnosis?: string;
  syndrome?: string;
  rationale?: string;
  complexion?: string;
  spirit?: string;
  bodyShape?: string;
  posture?: string;
  skinCondition?: string;
  hairCondition?: string;
  eyes?: string;
  nails?: string;
  tongueBodyColor?: string;
  tongueBodyShape?: string;
  tongueCoatingColor?: string;
  tongueCoatingThickness?: string;
  tongueCoatingDistribution?: string;
  tongueMoisture?: string;
  tongueSublingualVeins?: string;
  tongueNotes?: string;
  pulseLeftCun?: string;
  pulseLeftGuan?: string;
  pulseLeftChi?: string;
  pulseRightCun?: string;
  pulseRightGuan?: string;
  pulseRightChi?: string;
  pulseDepth?: string;
  pulseRate?: string;
  pulseRhythm?: string;
  pulseQuality?: string;
  pulseOverall?: string;
  pulseNotes?: string;
  ryodorakuLung?: number;
  ryodorakuPericardium?: number;
  ryodorakuHeart?: number;
  ryodorakuSmallIntestine?: number;
  ryodorakuTripleWarmer?: number;
  ryodorakuLargeIntestine?: number;
  ryodorakuSpleen?: number;
  ryodorakuLiver?: number;
  ryodorakuKidney?: number;
  ryodorakuBladder?: number;
  ryodorakuStomach?: number;
  ryodorakuGallbladder?: number;
  ryodorakuNotes?: string;
  abdomenOverall?: string;
  abdomenSho?: string;
  abdomenTenderness?: string;
  abdomenTension?: string;
  abdomenTemperature?: string;
  abdomenWaterSound?: string;
  abdomenNotes?: string;
  bianZheng?: string;
  zangFuPattern?: string;
  baGang?: string;
  qiBloodFluid?: string;
  channelPattern?: string;
  diseaseMechanism?: string;
  westernDiagnosis?: string;
  treatmentPrinciple?: string;
  treatmentMethod?: string;
  pointsExecution?: string;
  acupunctureNeedleType?: string;
  acupunctureNeedleCount?: number;
  acupunctureDuration?: string;
  acupunctureFrequency?: string;
  acupunctureTotalSessions?: number;
  acupunctureSequence?: string;
  acupunctureDeqi?: string;
  acupunctureNotes?: string;
  moxibustionType?: string;
  moxibustionPoints?: string;
  moxibustionDuration?: string;
  moxibustionFrequency?: string;
  moxibustionContraindications?: string;
  cuppingType?: string;
  cuppingLocation?: string;
  cuppingDuration?: string;
  cuppingFrequency?: string;
  cuppingNotes?: string;
  tuinaTechniques?: string;
  tuinaDuration?: string;
  tuinaFrequency?: string;
  tuinaContraindications?: string;
  dietaryAdvice?: string;
  dietaryAvoid?: string;
  dietaryConstitution?: string;
  exerciseType?: string;
  exerciseRoutine?: string;
  exerciseContraindications?: string;
  herbalFormula?: string;
  herbalIngredients?: string;
  herbalModifications?: string;
  herbalDosage?: string;
  herbalAdministration?: string;
  herbalDuration?: string;
  herbalFrequency?: string;
  herbalContraindications?: string;
  herbalTgaStatus?: string;
  herbalAhpraWarning?: string;
  prognosis?: string;
  followUpPlan?: string;
  expectedOutcomes?: string;
  redFlags?: string;
  referralNeeded?: boolean;
  referralTo?: string;
  referralReason?: string;
  informedConsent?: boolean;
  consentDate?: string;
  patientSignature?: string;
  practitionerSignature?: string;
  riskAcknowledged?: boolean;
  privacyAcknowledged?: boolean;
  empathicNarrative?: string;
  homeCareInstructions?: string;
}

export interface ForensicKant {
  status: string;
  score: number;
  alerts?: string;
  contraindications?: string;
  auditTrail?: string;
}

export interface ForensicRag {
  citations?: string;
}

export interface ForensicSystem {
  foucaultVersion?: string;
  ragChunksUsed?: string;
  openrouterModel?: string;
  generationTimestamp?: string;
  forensicHash?: string;
}

export interface ForensicPdfData {
  patient: ForensicPatient;
  session: ForensicSession;
  practitioner: ForensicPractitioner;
  clinical: ForensicClinical;
  kant: ForensicKant;
  rag: ForensicRag;
  system: ForensicSystem;
}

// ═══════════════════════════════════════════════════════════════
// EMPÁTICO
// ═══════════════════════════════════════════════════════════════

export interface EmpathicPatient {
  hash: string;
  preferredName?: string;
  age?: number;
  gender?: string;
}

export interface EmpathicSession {
  date: string;
}

export interface EmpathicPractitioner {
  name?: string;
  qualification?: string;
  clinic?: string;
  phone?: string;
}

export interface EmpathicClinical {
  symptoms?: string;
  syndrome?: string;
  acupunctureFrequency?: string;
  acupunctureTotalSessions?: number;
  acupunctureDuration?: string;
  moxibustionType?: string;
  cuppingType?: string;
  tuinaTechniques?: string;
  dietaryConstitution?: string;
  dietaryAvoid?: string;
  exerciseType?: string;
  empathicNarrative?: string;
  homeCareInstructions?: string;
  followUpPlan?: string;
  redFlags?: string;
  prognosis?: string;
}

export interface EmpathicPdfData {
  patient: EmpathicPatient;
  session: EmpathicSession;
  practitioner: EmpathicPractitioner;
  clinical: EmpathicClinical;
}