/**
 * KANT TYPES COMPAT v1.0.3 — Compatibilidad API v2.x → v3.0
 * 
 * severity usa los valores que route.ts espera:
 *   "low" | "moderate" | "high" | "absolute"
 * 
 * MAPEO interno:
 *   BLOCK (interno) → "absolute" (legacy para contraindicaciones)
 *   WARN (interno) → "moderate" (legacy)
 *   INFO (interno) → "low" (legacy)
 */

import { PatientContext, TreatmentProposal, KantVerdict, KantViolation } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS LEGACY (API pública estable)
// ─────────────────────────────────────────────────────────────────────────────

export interface PatientSafetyProfile {
  age: number;
  pregnancy?: boolean;
  pregnancyTrimester?: number;
  currentPharmaceuticals?: string[];
  anticoagulants?: string[];
  antiplatelets?: string[];
  pacemaker?: boolean;
  epilepsy?: boolean;
  epilepsyControlled?: boolean;
  lymphedema?: boolean;
  allergies?: string[];
  knownAllergies?: string[];
  medicalHistory?: string[];
  [key: string]: unknown;
}

export interface ProposedTreatment {
  points: string[];
  herbs?: string[];
  techniques?: string[];
}

/**
 * severity: "low" | "moderate" | "high" | "absolute"
 * (los valores que route.ts espera)
 */
export interface KantResultAlert {
  severity: 'low' | 'moderate' | 'high' | 'absolute';
  code: string;
  message: string;
  category: string;
  sourceRule: string;
  recommendation: string;
  affectedItems?: string[];
}

export interface KantResultContraindication {
  severity: 'low' | 'moderate' | 'high' | 'absolute';
  type: 'point' | 'herb' | 'technique' | 'drug' | 'device';
  alternative?: string;
  item: string;
  reason: string;
}

export interface KantResult {
  originalProposalHash: string | undefined;
  verdict: string;
  violations: any;
  status: 'green' | 'yellow' | 'red';
  score: number;
  alerts: KantResultAlert[];
  contraindications: KantResultContraindication[];
  clearedForTreatment: boolean;
  requiresSupervision: boolean;
  requiresPhysicianClearance: boolean;
  auditTrail?: string[];
  _internalVerdict?: KantVerdict;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE MAPEO
// ─────────────────────────────────────────────────────────────────────────────

export function mapPatientProfile(profile: PatientSafetyProfile): PatientContext {
  const pathologies: string[] = [];
  const medications: string[] = [];

  if (profile.pacemaker) pathologies.push('pacemaker');
  if (profile.epilepsy) pathologies.push('epilepsy');
  if (profile.lymphedema) pathologies.push('lymphedema');

  if (profile.currentPharmaceuticals) medications.push(...profile.currentPharmaceuticals);
  if (profile.anticoagulants) medications.push(...profile.anticoagulants);
  if (profile.antiplatelets) medications.push(...profile.antiplatelets);

  return {
    id: 'legacy-patient',
    age: profile.age,
    pathologies: pathologies.length > 0 ? pathologies : undefined,
    medications: medications.length > 0 ? medications : undefined,
    allergies: profile.allergies || profile.knownAllergies,
    pregnancy: profile.pregnancy ? {
      isPregnant: true,
      trimester: profile.pregnancyTrimester as 1 | 2 | 3 | undefined,
    } : undefined,
  };
}

export function mapProposedTreatment(treatment: ProposedTreatment): TreatmentProposal {
  return {
    id: 'legacy-treatment',
    patientId: 'legacy-patient',
    generatedBy: 'human',
    generatedAt: new Date().toISOString(),
    points: treatment.points.map(p => ({ point: p })),
    herbs: treatment.herbs?.map(h => ({ name: h })),
    techniques: treatment.techniques,
  };
}

/**
 * Mapea severity interna a severity legacy:
 *   BLOCK violations → "absolute"
 *   WARN warnings → "moderate" o "high" según contexto
 */
function mapSeverity(internalSeverity: string, isViolation: boolean): 'low' | 'moderate' | 'high' | 'absolute' {
  if (isViolation) return 'absolute';
  switch (internalSeverity) {
    case 'BLOCK': return 'absolute';
    case 'WARN': return 'moderate';
    case 'INFO': return 'low';
    default: return 'low';
  }
}

export function mapToKantResult(verdict: KantVerdict): KantResult {
  const hasBlocks = verdict.violations.length > 0;
  const hasWarnings = verdict.warnings.length > 0;

  let status: 'green' | 'yellow' | 'red';
  if (hasBlocks) status = 'red';
  else if (hasWarnings) status = 'yellow';
  else status = 'green';

  const score = status === 'green' ? 100 : status === 'yellow' ? 50 : 0;

  const contraindications: KantResultContraindication[] = verdict.violations.map(v => ({
    severity: 'absolute' as const,
    item: v.ruleId,
    type: 'point' as const,
    reason: v.message,
  }));

  // Mapear violations → alerts con severity "absolute"
  const violationAlerts: KantResultAlert[] = verdict.violations.map(v => ({
    severity: 'absolute',
    code: v.ruleId,
    message: v.message,
    category: v.domain,
    sourceRule: v.ruleId,
    recommendation: v.remediation,
    affectedItems: v.context?.forbiddenPoint ? [v.context.forbiddenPoint as string] : undefined,
  }));

  // Mapear warnings → alerts con severity "moderate"
  const warningAlerts: KantResultAlert[] = verdict.warnings.map(w => ({
    severity: 'moderate',
    code: w.ruleId,
    message: w.message,
    category: w.domain,
    sourceRule: w.ruleId,
    recommendation: w.remediation,
    affectedItems: w.context?.forbiddenPoint ? [w.context.forbiddenPoint as string] : undefined,
  }));

  const alerts = [...violationAlerts, ...warningAlerts];

  const auditTrail = [
    `[${verdict.timestamp}] EVALUATION_COMPLETE: Engine v${verdict.engineVersion}, Rules v${verdict.ruleSetVersion}, Jurisdiction: ${verdict.jurisdiction}`
  ];
  return {
    originalProposalHash: undefined,
    verdict: (verdict as any).verdict || '',
    violations: verdict.violations,
    status,
    score,
    alerts,
    contraindications,
    clearedForTreatment: !hasBlocks,
    requiresSupervision: hasWarnings || hasBlocks,
    requiresPhysicianClearance: hasBlocks,
    auditTrail,
    _internalVerdict: verdict,
  };
}