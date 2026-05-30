/**
 * KANT v2.0 — Tipos del motor de seguridad clínica determinístico
 */

export type SafetySeverity = "low" | "moderate" | "high" | "absolute";
export type KantStatus = "green" | "yellow" | "red";

export interface PatientSafetyProfile {
  pregnancy?: boolean;
  pregnancyTrimester?: 1 | 2 | 3;
  pacemaker?: boolean;
  anticoagulants?: string[];        // ej. ["warfarina", "apixaban"]
  antiplatelets?: string[];         // ej. ["aspirina", "clopidogrel"]
  epilepsy?: boolean;
  epilepsyControlled?: boolean;
  chemotherapyActive?: boolean;
  chemotherapyDrugs?: string[];
  radiationActive?: boolean;
  lymphedema?: boolean;
  cochlearImplant?: boolean;
  insulinPump?: boolean;
  deepBrainStimulator?: boolean;
  spinalCordStimulator?: boolean;
  intracranialMetal?: boolean;
  age?: number;
  knownAllergies?: string[];
  currentPharmaceuticals?: string[];  // Todos los fármacos activos
  currentHerbs?: string[];          // Hierbas que ya está tomando
}

export interface SafetyAlert {
  code: string;                     // ej. "KANT-PREG-001"
  category: string;                 // ej. "pregnancy", "herbDrug", "device"
  severity: SafetySeverity;
  message: string;                  // Texto legible para el clínico
  sourceRule: string;                 // Referencia a safety-rules.json
  recommendation: string;           // Qué hacer
  affectedItems?: string[];         // Puntos, hierbas o fármacos implicados
}

export interface SafetyContraindication {
  item: string;                     // ej. "SP6", "Fu Zi", "Electroacupuntura"
  type: "point" | "herb" | "technique" | "drug" | "device";
  reason: string;
  severity: SafetySeverity;
  alternative?: string;               // Sugerencia de alternativa segura
}

export interface KantResult {
  engineVersion: any;
  evaluatedAt: string | number | Date;
  totalRulesChecked: any;
  originalProposalHash: any;
  violations: any;
  verdict: any;
  status: KantStatus;
  score: number;                    // 0-100, donde 100 = máximo riesgo
  alerts: SafetyAlert[];
  contraindications: SafetyContraindication[];
  clearedForTreatment: boolean;       // true solo si status === "green"
  requiresSupervision: boolean;     // true si status === "yellow"
  requiresPhysicianClearance: boolean; // true si status === "red"
  auditTrail: string[];             // Log de reglas evaluadas (trazabilidad)
}

export interface ProposedTreatment {
  points?: string[];                // ej. ["LI4", "ST36"]
  herbs?: string[];                 // ej. ["Dang Gui", "Bai Shao"]
  techniques?: string[];            // ej. ["electroacupuntura", "moxibustión"]
}
// ─── FORMATO LEGACY (para compatibilidad con FukuokaProposal viejo) ────────

export interface FukuokaProposal {
  syndrome_analysis: Array<{
    syndrome_name: string;
    confidence: number;
    supporting_evidence: string[];
  }>;
  treatment_proposal: {
    acupuncture_points: string[];
    herbal_formula: string | null;
    rationale: string;
  };
}

export interface PatientContext {
  age?: number;
  isPregnant?: boolean;
  trimester?: number;
  weeks?: number;
  medications?: string[];
  knownAllergies?: string[];
  sex?: string;
  id?: string;
  pacemaker?: boolean;
  epilepsy?: boolean;
  epilepsyControlled?: boolean;
  lymphedema?: boolean;
  anticoagulants?: string[];
  antiplatelets?: string[];
}

export type Verdict = "VERDE" | "AMARILLO" | "ROJO";

export interface Violation {
  ruleId: string;
  severity: "ROJO" | "AMARILLO";
  category: "ACUPUNCTURE" | "HERBAL" | "GENERAL";
  message: string;
}
