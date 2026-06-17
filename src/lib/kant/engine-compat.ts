/**
 * KANT ENGINE COMPAT v1.0.1 — Wrapper de compatibilidad API v2.x → v3.0
 * 
 * Mantiene la API pública estable mientras el motor interno evoluciona.
 * 
 * API LEGACY SOPORTADA:
 *   KantEngine.evaluate(patient, treatment?, contextString?) → KantResult
 *   evaluateSafety(patient, treatment?, contextString?) → KantResult
 * 
 * El tercer argumento (contextString) es opcional y se ignora en el motor nuevo,
 * pero se mantiene para compatibilidad con código existente.
 */

import { evaluate } from './engine';
import { loadRulesFromJSON } from './rules-loader';
import { KantRule, KantVerdict } from './types';
import {
  PatientSafetyProfile,
  ProposedTreatment,
  KantResult,
  mapPatientProfile,
  mapProposedTreatment,
  mapToKantResult,
} from './types-compat';

// ─────────────────────────────────────────────────────────────────────────────
// CACHE DE REGLAS
// ─────────────────────────────────────────────────────────────────────────────

let cachedRules: KantRule[] | null = null;

function loadRules(): KantRule[] {
  if (cachedRules) return cachedRules;
  cachedRules = getEmbeddedRules();
  return cachedRules;
}

function getEmbeddedRules(): KantRule[] {
  const rulesJson = `{
    "version": "1.0.0",
    "jurisdiction": "AU",
    "domain": "contraindication_absolute",
    "description": "Reglas embebidas para compatibilidad v2.x",
    "validatedBy": "CEMETC",
    "validationDate": "2026-06-16",
    "rules": [
      {
        "id": "AU-SAFETY-001",
        "domain": "contraindication_absolute",
        "jurisdiction": "AU",
        "severity": "BLOCK",
        "condition": {
          "type": "forbidden_point",
          "point": "SP6",
          "name": "Sanyinjiao",
          "reason": "Punto abortivo prohibido en embarazo",
          "source": "CEMETC",
          "applies_to": ["pregnancy"]
        },
        "message": "SP6 está contraindicado en embarazo — riesgo de aborto.",
        "remediation": "No usar SP6 en pacientes embarazadas. Considerar puntos alternativos.",
        "source": "CEMETC",
        "version": "1.0.0"
      },
      {
        "id": "AU-SAFETY-002",
        "domain": "contraindication_absolute",
        "jurisdiction": "AU",
        "severity": "BLOCK",
        "condition": {
          "type": "medication_interaction",
          "medication": "warfarina",
          "forbidden_herbs": ["Dang Gui"],
          "interaction_mechanism": "Potenciación anticoagulante",
          "reason": "Interacción hierba-droga grave"
        },
        "message": "Dang Gui interactúa con warfarina — riesgo de hemorragia.",
        "remediation": "No combinar Dang Gui con warfarina. Consultar médico.",
        "source": "CEMETC",
        "version": "1.0.0"
      },
      {
        "id": "AU-SAFETY-003",
        "domain": "pathology_restriction",
        "jurisdiction": "AU",
        "severity": "BLOCK",
        "condition": {
          "type": "pathology_restriction",
          "pathology": "pacemaker",
          "restricted_action": "electroacupuntura",
          "reason": "Riesgo de interferencia con marcapasos"
        },
        "message": "Electroacupuntura contraindicada con marcapasos.",
        "remediation": "Usar acupuntura manual. No aplicar electroacupuntura.",
        "source": "CEMETC",
        "version": "1.0.0"
      },
      {
        "id": "AU-SAFETY-004",
        "domain": "pathology_restriction",
        "jurisdiction": "AU",
        "severity": "BLOCK",
        "condition": {
          "type": "pathology_restriction",
          "pathology": "epilepsy",
          "restricted_action": "electroacupuntura 120Hz",
          "reason": "Riesgo de desencadenar crisis epiléptica"
        },
        "message": "Electroacupuntura de alta frecuencia contraindicada en epilepsia.",
        "remediation": "Usar acupuntura manual o baja frecuencia (<50Hz).",
        "source": "CEMETC",
        "version": "1.0.0"
      },
      {
        "id": "AU-SAFETY-005",
        "domain": "pathology_restriction",
        "jurisdiction": "AU",
        "severity": "BLOCK",
        "condition": {
          "type": "pathology_restriction",
          "pathology": "lymphedema",
          "restricted_action": "ventosas",
          "reason": "Riesgo de agravar linfedema"
        },
        "message": "Ventosas contraindicadas en linfedema.",
        "remediation": "No aplicar ventosas en zona afectada. Considerar drenaje linfático.",
        "source": "CEMETC",
        "version": "1.0.0"
      },
      {
        "id": "AU-SAFETY-006",
        "domain": "contraindication_absolute",
        "jurisdiction": "AU",
        "severity": "BLOCK",
        "condition": {
          "type": "forbidden_point",
          "point": "Fu Zi",
          "name": "Aconito",
          "reason": "Hierba tóxica prohibida en embarazo",
          "source": "CEMETC",
          "applies_to": ["pregnancy"]
        },
        "message": "Fu Zi (aconito) está contraindicado en embarazo — tóxico para el feto.",
        "remediation": "No prescribir Fu Zi en embarazo. Usar alternativas seguras.",
        "source": "CEMETC",
        "version": "1.0.0"
      },
      {
        "id": "AU-SAFETY-007",
        "domain": "contraindication_absolute",
        "jurisdiction": "AU",
        "severity": "WARN",
        "condition": {
          "type": "forbidden_point_age",
          "point": "ST36",
          "name": "Zusanli",
          "reason": "Precaución en pediatría",
          "source": "CEMETC",
          "applies_to": ["pediatric"],
          "age_constraint": {
            "operator": "<",
            "value": 7,
            "unit": "years"
          }
        },
        "message": "Precaución en pacientes pediátricos menores de 7 años.",
        "remediation": "Reducir profundidad y tiempo de retención. Supervisión continua.",
        "source": "CEMETC",
        "version": "1.0.0"
      }
    ]
  }`;

  return loadRulesFromJSON(rulesJson);
}

// ─────────────────────────────────────────────────────────────────────────────
// API PÚBLICA LEGACY (v2.x)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clase KantEngine — API legacy v2.x
 * 
 * evaluate(patient, treatment?, contextString?) → KantResult
 * 
 * @param patient - Perfil de seguridad del paciente
 * @param treatment - Tratamiento propuesto (opcional)
 * @param contextString - Contexto adicional (opcional, se ignora en motor nuevo)
 */
export class KantEngine {
  private rules: KantRule[];

  constructor() {
    this.rules = loadRules();
  }

  evaluate(
    patient: PatientSafetyProfile,
    treatment?: ProposedTreatment,
    _contextString?: string
  ): KantResult {
    return evaluateSafety(patient, treatment, _contextString);
  }
}

/**
 * Evalúa seguridad de un tratamiento — API legacy v2.x
 * 
 * @param patient - Perfil de seguridad del paciente
 * @param treatment - Tratamiento propuesto (opcional)
 * @param _contextString - Contexto adicional (opcional, se ignora)
 */
export function evaluateSafety(
  patient: PatientSafetyProfile,
  treatment?: ProposedTreatment,
  _contextString?: string
): KantResult {
  const rules = loadRules();
  const patientContext = mapPatientProfile(patient);

  const treatmentProposal = treatment 
    ? mapProposedTreatment(treatment) 
    : {
        id: 'empty',
        patientId: 'legacy-patient',
        generatedBy: 'human' as const,
        generatedAt: new Date().toISOString(),
        points: []
      };

  const verdict = evaluate(treatmentProposal, patientContext, rules);

  return mapToKantResult(verdict);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS ADICIONALES
// ─────────────────────────────────────────────────────────────────────────────

export type { PatientSafetyProfile, ProposedTreatment, KantResult } from './types-compat';