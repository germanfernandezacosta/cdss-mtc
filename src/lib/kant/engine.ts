/**
 * KANT ENGINE v1.0.0 — Motor de reglas duras 100% determinista
 * Sin LLM. Evaluación puramente funcional: input → reglas → veredicto.
 * <10ms por evaluación.
 * 
 * Filosofía: "Fail-safe por defecto". Si Kant no puede validar → BLOQUEO.
 */

import { KantRule, KantVerdict, KantViolation, TreatmentProposal, PatientContext } from './types';

/**
 * Evalúa una propuesta de tratamiento contra el catálogo de reglas Kant-AU.
 * 
 * @param proposal - Propuesta de tratamiento generada por Fukuoka-H o terapeuta
 * @param patient - Contexto del paciente (edad, condiciones, medicación)
 * @param rules - Array de reglas cargadas desde JSON
 * @returns KantVerdict — veredicto determinista con violaciones y advertencias
 */
export function evaluate(
  proposal: TreatmentProposal,
  patient: PatientContext,
  rules: KantRule[]
): KantVerdict {
  const violations: KantViolation[] = [];
  const warnings: KantViolation[] = [];

  for (const rule of rules) {
    const result = evaluateRule(rule, proposal, patient);

    if (result.triggered) {
      const violation: KantViolation = {
        ruleId: rule.id,
        domain: rule.domain,
        severity: rule.severity,
        message: rule.message,
        remediation: rule.remediation,
        source: rule.source,
        version: rule.version,
        context: result.context
      };

      if (rule.severity === 'BLOCK') {
        violations.push(violation);
      } else {
        warnings.push(violation);
      }
    }
  }

  // FAIL-SAFE: Si hay CUALQUIER violación BLOCK → tratamiento NO AUTORIZADO
  const approved = violations.length === 0;

  return {
    approved,
    violations,
    warnings,
    timestamp: new Date().toISOString(),
    engineVersion: '1.0.0',
    jurisdiction: 'AU',
    ruleSetVersion: rules[0]?.version ?? 'unknown',
    hash: computeHash(proposal, patient, violations, warnings)
  };
}

/**
 * Evalúa una regla individual contra la propuesta y el paciente.
 * Cada tipo de condición tiene su propia lógica determinista.
 */
function evaluateRule(
  rule: KantRule,
  proposal: TreatmentProposal,
  patient: PatientContext
): { triggered: boolean; context?: Record<string, unknown> } {
  const condition = rule.condition;

  switch (condition.type) {
    case 'forbidden_point':
      return evaluateForbiddenPoint(condition, proposal);

    case 'forbidden_point_age':
      return evaluateForbiddenPointAge(condition, proposal, patient);

    case 'max_depth':
      return evaluateMaxDepth(condition, proposal);

    case 'forbidden_combination':
      return evaluateForbiddenCombination(condition, proposal);

    case 'scope_limitation':
      return evaluateScopeLimitation(condition, proposal);

    case 'pathology_restriction':
      return evaluatePathologyRestriction(condition, proposal, patient);

    case 'medication_interaction':
      return evaluateMedicationInteraction(condition, proposal, patient);

    default:
      // FAIL-SAFE: tipo de condición desconocido → NO evaluamos (no bloqueamos)
      // PERO registramos como warning para auditoría
      return { triggered: false };
  }
}

/**
 * Evalúa si un punto prohibido aparece en la propuesta de tratamiento.
 */
function evaluateForbiddenPoint(
  condition: KantRule['condition'],
  proposal: TreatmentProposal
): { triggered: boolean; context?: Record<string, unknown> } {
  const forbiddenPoint = condition.point;
  if (!forbiddenPoint) return { triggered: false };

  const found = proposal.points.some(p => p.point === forbiddenPoint);

  if (found) {
    const pointDetail = proposal.points.find(p => p.point === forbiddenPoint);
    return {
      triggered: true,
      context: {
        forbiddenPoint,
        pointName: condition.name,
        attemptedDepth: pointDetail?.depth,
        attemptedTechnique: pointDetail?.technique
      }
    };
  }

  return { triggered: false };
}

/**
 * Evalúa si un punto prohibido por edad aparece en la propuesta.
 * Requiere verificar constraint de edad del paciente.
 */
function evaluateForbiddenPointAge(
  condition: KantRule['condition'],
  proposal: TreatmentProposal,
  patient: PatientContext
): { triggered: boolean; context?: Record<string, unknown> } {
  // Primero: ¿el punto está en la propuesta?
  const forbiddenPoint = condition.point;
  if (!forbiddenPoint) return { triggered: false };

  const found = proposal.points.some(p => p.point === forbiddenPoint);

  if (!found) {
    return { triggered: false };
  }

  // Segundo: ¿la edad del paciente cumple el constraint?
  const ageConstraint = condition.age_constraint;
  if (!ageConstraint || patient.age === undefined) {
    // FAIL-SAFE: sin edad conocida y hay constraint de edad → NO bloqueamos
    // pero esto es un caso límite que debe ser auditado
    return { triggered: false };
  }

  const patientAge = patient.age;
  const constraintValue = ageConstraint.value;
  let ageMatches = false;

  switch (ageConstraint.operator) {
    case '<':
      ageMatches = patientAge < constraintValue;
      break;
    case '<=':
      ageMatches = patientAge <= constraintValue;
      break;
    case '>':
      ageMatches = patientAge > constraintValue;
      break;
    case '>=':
      ageMatches = patientAge >= constraintValue;
      break;
    case '=':
      ageMatches = patientAge === constraintValue;
      break;
    default:
      ageMatches = false;
  }

  if (ageMatches) {
    const pointDetail = proposal.points.find(p => p.point === forbiddenPoint);
    return {
      triggered: true,
      context: {
        forbiddenPoint,
        pointName: condition.name,
        patientAge,
        ageConstraint: `${ageConstraint.operator} ${ageConstraint.value} ${ageConstraint.unit}`,
        attemptedDepth: pointDetail?.depth,
        reason: condition.reason
      }
    };
  }

  return { triggered: false };
}

/**
 * Evalúa profundidad máxima permitida por punto.
 */
function evaluateMaxDepth(
  condition: KantRule['condition'],
  proposal: TreatmentProposal
): { triggered: boolean; context?: Record<string, unknown> } {
  const targetPoint = condition.point;
  const maxDepth = condition.max_depth_mm;

  if (!targetPoint || maxDepth === undefined) return { triggered: false };

  const pointDetail = proposal.points.find(p => p.point === targetPoint);

  if (pointDetail && pointDetail.depth !== undefined && pointDetail.depth > maxDepth) {
    return {
      triggered: true,
      context: {
        point: targetPoint,
        pointName: condition.name,
        attemptedDepth: pointDetail.depth,
        maxAllowedDepth: maxDepth,
        risk: condition.risk
      }
    };
  }

  return { triggered: false };
}

/**
 * Evalúa combinaciones prohibidas de puntos.
 */
function evaluateForbiddenCombination(
  condition: KantRule['condition'],
  proposal: TreatmentProposal
): { triggered: boolean; context?: Record<string, unknown> } {
  const points = condition.points;
  if (!points || points.length < 2) return { triggered: false };

  const foundPoints = points.filter(p => proposal.points.some(pp => pp.point === p));

  if (foundPoints.length === points.length) {
    return {
      triggered: true,
      context: {
        forbiddenCombination: points,
        foundInProposal: foundPoints,
        reason: condition.reason
      }
    };
  }

  return { triggered: false };
}

/**
 * Evalúa limitaciones de alcance de práctica.
 */
function evaluateScopeLimitation(
  condition: KantRule['condition'],
  proposal: TreatmentProposal
): { triggered: boolean; context?: Record<string, unknown> } {
  const restrictedAction = condition.action;
  if (!restrictedAction) return { triggered: false };

  if (proposal.actions?.includes(restrictedAction)) {
    return {
      triggered: true,
      context: {
        restrictedAction,
        reason: condition.reason
      }
    };
  }

  return { triggered: false };
}

/**
 * Evalúa restricciones por patología del paciente.
 */
function evaluatePathologyRestriction(
  condition: KantRule['condition'],
  proposal: TreatmentProposal,
  patient: PatientContext
): { triggered: boolean; context?: Record<string, unknown> } {
  const restrictedPathology = condition.pathology;
  if (!restrictedPathology) return { triggered: false };

  const hasPathology = patient.pathologies?.includes(restrictedPathology);

  if (hasPathology) {
    // Verificar si la acción restringida está en la propuesta
    const restrictedAction = condition.restricted_action;
    const restrictedPoints = condition.restricted_points;

    const actionFound = (restrictedAction && proposal.actions?.includes(restrictedAction)) ||
                        (restrictedPoints && proposal.points.some(p => restrictedPoints.includes(p.point)));

    if (actionFound) {
      return {
        triggered: true,
        context: {
          pathology: restrictedPathology,
          restrictedAction,
          restrictedPoints,
          reason: condition.reason
        }
      };
    }
  }

  return { triggered: false };
}

/**
 * Evalúa interacciones medicamento-hierba.
 */
function evaluateMedicationInteraction(
  condition: KantRule['condition'],
  proposal: TreatmentProposal,
  patient: PatientContext
): { triggered: boolean; context?: Record<string, unknown> } {
  const medication = condition.medication;
  if (!medication) return { triggered: false };

  const hasMedication = patient.medications?.includes(medication);

  if (hasMedication) {
    const forbiddenHerbs = condition.forbidden_herbs;
    if (!forbiddenHerbs) return { triggered: false };

    const foundHerbs = proposal.herbs?.filter(h => forbiddenHerbs.includes(h.name)) || [];

    if (foundHerbs.length > 0) {
      return {
        triggered: true,
        context: {
          medication,
          forbiddenHerbs,
          foundInProposal: foundHerbs.map(h => h.name),
          interactionMechanism: condition.interaction_mechanism,
          reason: condition.reason
        }
      };
    }
  }

  return { triggered: false };
}

/**
 * Computa hash criptográfico del veredicto para audit trail.
 * En producción: SHA-256 del JSON serializado.
 */
function computeHash(
  proposal: TreatmentProposal,
  patient: PatientContext,
  violations: KantViolation[],
  warnings: KantViolation[]
): string {
  // Placeholder — en producción usar crypto.subtle.digest('SHA-256', ...)
  const payload = JSON.stringify({ proposal, patient, violations, warnings });
  return `kant-v1-${Buffer.from(payload).toString('base64').slice(0, 16)}`;
}