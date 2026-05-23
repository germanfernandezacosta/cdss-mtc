/**
 * KANT — El Cortafuegos Determinista
 * 
 * Principios:
 * 1. Nunca razona probabilísticamente. Solo contrasta contra reglas duras.
 * 2. Toda regla tiene ID único, severidad fija y mensaje clínico exacto.
 * 3. Veredicto determinista: ROJO > AMARILLO > VERDE.
 * 4. Fuente de reglas desacoplada (mock hoy, Supabase mañana).
 */

// ─── TIPOS ─────────────────────────────────────────────────────────────────

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
  medications?: string[];
  knownAllergies?: string[];
}

export type Verdict = 'VERDE' | 'AMARILLO' | 'ROJO';

export interface Violation {
  ruleId: string;
  severity: 'ROJO' | 'AMARILLO';
  category: 'ACUPUNCTURE' | 'HERBAL' | 'GENERAL';
  message: string;
}

export interface KANTResult {
  verdict: Verdict;
  violations: Violation[];
  evaluatedAt: string;
  engineVersion: string;
  totalRulesChecked: number;
  originalProposalHash: string;
}

// ─── REPOSITORIO DE REGLAS (MVP: en memoria) ─────────────────────────────────

interface SafetyRule {
  readonly id: string;
  readonly category: Violation['category'];
  readonly severity: Violation['severity'];
  readonly message: string;
  evaluate(proposal: FukuokaProposal, context: PatientContext): boolean;
}

class MockRuleRepository {
  getAllRules(): SafetyRule[] {
    return [
      // R-001: LI4/Hegu en embarazo — ABSOLUTAMENTE PROHIBIDO
      {
        id: 'R-001',
        category: 'ACUPUNCTURE',
        severity: 'ROJO',
        message:
          'LI4 (Hegu) está absolutamente contraindicado durante el embarazo. ' +
          'Riesgo documentado de inducción uterina y aborto.',
        evaluate: (_proposal, context) => {
          if (!context.isPregnant) return false;
          const points = _proposal.treatment_proposal.acupuncture_points.map((p) =>
            p.toUpperCase().trim()
          );
          const forbidden = ['LI4', 'HEGU', '合谷'];
          return points.some((p) => forbidden.includes(p));
        },
      },

      // R-002: SP6/Sanyinjiao en embarazo — ABSOLUTAMENTE PROHIBIDO
      {
        id: 'R-002',
        category: 'ACUPUNCTURE',
        severity: 'ROJO',
        message:
          'SP6 (Sanyinjiao) está contraindicado en el embarazo. ' +
          'Efecto descendente sobre el útero documentado en literatura clásica y moderna.',
        evaluate: (_proposal, context) => {
          if (!context.isPregnant) return false;
          const points = _proposal.treatment_proposal.acupuncture_points.map((p) =>
            p.toUpperCase().trim()
          );
          const forbidden = ['SP6', 'SANYINJIAO', '三阴交'];
          return points.some((p) => forbidden.includes(p));
        },
      },

      // R-003: Dang Gui + anticoagulantes — RIESGO HEMORRÁGICO
      {
        id: 'R-003',
        category: 'HERBAL',
        severity: 'ROJO',
        message:
          'Dang Gui (Angelica sinensis) potencia el efecto de anticoagulantes occidentales ' +
          '(warfarina, heparina, apixabán, rivaroxabán, dabigatrán). ' +
          'Riesgo de sangrado mayor. Requiere coordinación con hematología.',
        evaluate: (proposal, context) => {
          if (!proposal.treatment_proposal.herbal_formula) return false;
          const meds = (context.medications ?? []).map((m) => m.toLowerCase());
          const anticoagulants = [
            'warfarin', 'heparin', 'apixaban', 'rivaroxaban', 
            'dabigatran', 'enoxaparin', 'acenocoumarol',
          ];
          const isOnAnticoagulant = meds.some((m) => anticoagulants.includes(m));
          if (!isOnAnticoagulant) return false;

          const formula = proposal.treatment_proposal.herbal_formula.toLowerCase();
          const herbs = ['dang gui', 'angelica sinensis', '当归', '當歸'];
          return herbs.some((h) => formula.includes(h));
        },
      },

      // R-004: Paciente pediátrico — PRECACCIÓN
      {
        id: 'R-004',
        category: 'GENERAL',
        severity: 'AMARILLO',
        message:
          'Paciente pediátrico (< 12 años). La propuesta requiere confirmación manual ' +
          'por un profesional senior en acupuntura pediátrica antes de ejecución.',
        evaluate: (_proposal, context) => {
          return (context.age ?? 999) < 12;
        },
      },

      // R-005: Puntos abdominales en embarazo — PRECACCIÓN
      {
        id: 'R-005',
        category: 'ACUPUNCTURE',
        severity: 'AMARILLO',
        message:
          'Se han propuesto puntos abdominales durante el embarazo (RN4-RN12, ST25, etc.). ' +
          'No están absolutamente prohibidos, pero requieren valoración manual del terapeuta ' +
          'y consentimiento informado específico.',
        evaluate: (proposal, context) => {
          if (!context.isPregnant) return false;
          const points = proposal.treatment_proposal.acupuncture_points.map((p) =>
            p.toUpperCase().trim()
          );
          const abdominal = [
            'RN4', 'CV4', 'GUANYUAN',
            'RN6', 'CV6', 'QIHAI',
            'RN8', 'CV8', 'SHENQUE',
            'RN12', 'CV12', 'ZHONGWAN',
            'ST25', 'TIANSHU', '天枢',
          ];
          return points.some((p) => abdominal.includes(p));
        },
      },
    ];
  }
}

// ─── MOTOR KANT ─────────────────────────────────────────────────────────────

export class KANTEngine {
  private readonly repository: MockRuleRepository;
  private readonly version = '1.0.0-mvp';

  constructor(repository = new MockRuleRepository()) {
    this.repository = repository;
  }

  evaluate(proposal: FukuokaProposal, context: PatientContext): KANTResult {
    const rules = this.repository.getAllRules();
    const violations: Violation[] = [];
    const evaluatedAt = new Date().toISOString();

    for (const rule of rules) {
      try {
        const isViolated = rule.evaluate(proposal, context);
        if (isViolated) {
          violations.push({
            ruleId: rule.id,
            severity: rule.severity,
            category: rule.category,
            message: rule.message,
          });
        }
      } catch (err) {
        console.error(`[KANT] Rule ${rule.id} crashed:`, err);
        violations.push({
          ruleId: `${rule.id}-ERR`,
          severity: 'AMARILLO',
          category: 'GENERAL',
          message: `Fallo técnico en regla ${rule.id}. Requiere revisión manual.`,
        });
      }
    }

    let verdict: Verdict = 'VERDE';
    if (violations.some((v) => v.severity === 'ROJO')) {
      verdict = 'ROJO';
    } else if (violations.some((v) => v.severity === 'AMARILLO')) {
      verdict = 'AMARILLO';
    }

    const originalProposalHash = this.computeHashPlaceholder(proposal);

    return {
      verdict,
      violations,
      evaluatedAt,
      engineVersion: this.version,
      totalRulesChecked: rules.length,
      originalProposalHash,
    };
  }

  private computeHashPlaceholder(proposal: FukuokaProposal): string {
    const str = JSON.stringify(proposal);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `kant-mvp-${Math.abs(hash).toString(16)}`;
  }
}

// ─── FUNCIÓN DE FACHADA ─────────────────────────────────────────────────────

export function validateClinicalProposal(
  proposal: FukuokaProposal,
  context: PatientContext
): KANTResult {
  const engine = new KANTEngine();
  return engine.evaluate(proposal, context);
}

// ─── TYPE GUARDS ───────────────────────────────────────────────────────────

export function isValidFukuokaProposal(obj: unknown): obj is FukuokaProposal {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    Array.isArray(p.syndrome_analysis) &&
    p.treatment_proposal !== null &&
    typeof p.treatment_proposal === 'object' &&
    Array.isArray((p.treatment_proposal as Record<string, unknown>).acupuncture_points)
  );
}