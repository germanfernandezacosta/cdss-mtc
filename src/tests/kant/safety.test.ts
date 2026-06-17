/**
 * KANT TESTS — contraindication_absolute
 * Cobertura forense: 100% de casos límite para dominio contraindication
 * 
 * Filosofía de testing: "Si no está testeado, no existe."
 * Cada regla tiene tests positivos (debe bloquear) y negativos (no debe bloquear).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { evaluate } from '@/lib/kant/engine';
import { loadRulesFromJSON } from '@/lib/kant/rules-loader';
import { KantRule, TreatmentProposal, PatientContext, KantVerdict, KantViolation } from '@/lib/kant/types';

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const RULES_JSON = `{
  "version": "1.0.0",
  "jurisdiction": "AU",
  "domain": "contraindication_absolute",
  "description": "Test fixtures",
  "validatedBy": "Test",
  "validationDate": "2026-06-16",
  "rules": [
    {
      "id": "AU-SAFETY-001a",
      "domain": "contraindication_absolute",
      "jurisdiction": "AU",
      "severity": "BLOCK",
      "condition": {
        "type": "forbidden_point",
        "point": "17E",
        "name": "Tiantu",
        "reason": "Punto absolutamente prohibido",
        "source": "CEMETC",
        "applies_to": ["all_patients"]
      },
      "message": "El punto 17E está ABSOLUTAMENTE PROHIBIDO.",
      "remediation": "Seleccionar punto alternativo.",
      "source": "CEMETC",
      "version": "1.0.0"
    },
    {
      "id": "AU-SAFETY-001b",
      "domain": "contraindication_absolute",
      "jurisdiction": "AU",
      "severity": "BLOCK",
      "condition": {
        "type": "forbidden_point",
        "point": "8RM",
        "name": "Shenque",
        "reason": "Punto absolutamente prohibido",
        "source": "CEMETC",
        "applies_to": ["all_patients"]
      },
      "message": "El punto 8RM está ABSOLUTAMENTE PROHIBIDO.",
      "remediation": "Seleccionar punto alternativo.",
      "source": "CEMETC",
      "version": "1.0.0"
    },
    {
      "id": "AU-SAFETY-001c",
      "domain": "contraindication_absolute",
      "jurisdiction": "AU",
      "severity": "BLOCK",
      "condition": {
        "type": "forbidden_point",
        "point": "2C",
        "name": "Quze",
        "reason": "Punto absolutamente prohibido",
        "source": "CEMETC",
        "applies_to": ["all_patients"]
      },
      "message": "El punto 2C está ABSOLUTAMENTE PROHIBIDO.",
      "remediation": "Seleccionar punto alternativo.",
      "source": "CEMETC",
      "version": "1.0.0"
    },
    {
      "id": "AU-SAFETY-001d",
      "domain": "contraindication_absolute",
      "jurisdiction": "AU",
      "severity": "BLOCK",
      "condition": {
        "type": "forbidden_point",
        "point": "13IG",
        "name": "Shouwuli",
        "reason": "Punto absolutamente prohibido",
        "source": "CEMETC",
        "applies_to": ["all_patients"]
      },
      "message": "El punto 13IG está ABSOLUTAMENTE PROHIBIDO.",
      "remediation": "Seleccionar punto alternativo.",
      "source": "CEMETC",
      "version": "1.0.0"
    },
    {
      "id": "AU-SAFETY-001e",
      "domain": "contraindication_absolute",
      "jurisdiction": "AU",
      "severity": "BLOCK",
      "condition": {
        "type": "forbidden_point",
        "point": "56V",
        "name": "Chengfu",
        "reason": "Punto absolutamente prohibido",
        "source": "CEMETC",
        "applies_to": ["all_patients"]
      },
      "message": "El punto 56V está ABSOLUTAMENTE PROHIBIDO.",
      "remediation": "Seleccionar punto alternativo.",
      "source": "CEMETC",
      "version": "1.0.0"
    },
    {
      "id": "AU-SAFETY-002a",
      "domain": "contraindication_absolute",
      "jurisdiction": "AU",
      "severity": "BLOCK",
      "condition": {
        "type": "forbidden_point_age",
        "point": "22DM",
        "name": "Xinhui",
        "reason": "Fontanela no cerrada — riesgo de muerte",
        "source": "CEMETC / Anatomía pediátrica",
        "applies_to": ["pediatric"],
        "age_constraint": {
          "operator": "<",
          "value": 8,
          "unit": "years"
        }
      },
      "message": "22DM PROHIBIDO en menores de 8 años.",
      "remediation": "NO punturar. Usar puntos alternativos.",
      "source": "CEMETC",
      "version": "1.0.0"
    },
    {
      "id": "AU-SAFETY-002b",
      "domain": "contraindication_absolute",
      "jurisdiction": "AU",
      "severity": "BLOCK",
      "condition": {
        "type": "forbidden_point_age",
        "point": "18DM",
        "name": "Qiangjian",
        "reason": "Fontanela no cerrada — riesgo de muerte",
        "source": "CEMETC / Anatomía pediátrica",
        "applies_to": ["pediatric"],
        "age_constraint": {
          "operator": "<",
          "value": 8,
          "unit": "years"
        }
      },
      "message": "18DM PROHIBIDO en menores de 8 años.",
      "remediation": "NO punturar. Usar puntos alternativos.",
      "source": "CEMETC",
      "version": "1.0.0"
    }
  ]
}`;

let rules: KantRule[];

beforeAll(() => {
  rules = loadRulesFromJSON(RULES_JSON);
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function createProposal(points: string[]): TreatmentProposal {
  return {
    id: 'test-proposal-001',
    patientId: 'test-patient-001',
    generatedBy: 'fukuoka-h',
    generatedAt: new Date().toISOString(),
    points: points.map(p => ({ point: p })),
  };
}

function createPatient(age?: number): PatientContext {
  return {
    id: 'test-patient-001',
    age,
  };
}

function assertBlocked(verdict: KantVerdict, expectedRuleId: string) {
  expect(verdict.approved).toBe(false);
  expect(verdict.violations.length).toBeGreaterThan(0);
  const violation = verdict.violations.find((v: KantViolation) => v.ruleId === expectedRuleId);
  expect(violation).toBeDefined();
  expect(violation!.severity).toBe('BLOCK');
}

function assertApproved(verdict: KantVerdict) {
  expect(verdict.approved).toBe(true);
  expect(verdict.violations.length).toBe(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS: PUNTOS PROHIBIDOS ABSOLUTOS (AU-SAFETY-001a-e)
// ─────────────────────────────────────────────────────────────────────────────

describe('AU-SAFETY-001: Puntos prohibidos absolutos', () => {

  describe('AU-SAFETY-001a — 17E (Tiantu)', () => {
    it('DEBE bloquear cuando 17E está en la propuesta', () => {
      const proposal = createProposal(['4RM', '17E', '36E']);
      const patient = createPatient(35);
      const verdict = evaluate(proposal, patient, rules);
      assertBlocked(verdict, 'AU-SAFETY-001a');
    });

    it('NO debe bloquear cuando 17E NO está en la propuesta', () => {
      const proposal = createProposal(['4RM', '36E', '40V']);
      const patient = createPatient(35);
      const verdict = evaluate(proposal, patient, rules);
      assertApproved(verdict);
    });

    it('NO debe bloquear cuando la propuesta está vacía', () => {
      const proposal = createProposal([]);
      const patient = createPatient(35);
      const verdict = evaluate(proposal, patient, rules);
      assertApproved(verdict);
    });

    it('DEBE bloquear cuando 17E es el ÚNICO punto', () => {
      const proposal = createProposal(['17E']);
      const patient = createPatient(35);
      const verdict = evaluate(proposal, patient, rules);
      assertBlocked(verdict, 'AU-SAFETY-001a');
    });
  });

  describe('AU-SAFETY-001b — 8RM (Shenque)', () => {
    it('DEBE bloquear cuando 8RM está en la propuesta', () => {
      const proposal = createProposal(['4RM', '8RM']);
      const patient = createPatient(35);
      const verdict = evaluate(proposal, patient, rules);
      assertBlocked(verdict, 'AU-SAFETY-001b');
    });

    it('NO debe bloquear cuando 8RM NO está en la propuesta', () => {
      const proposal = createProposal(['4RM', '36E']);
      const patient = createPatient(35);
      const verdict = evaluate(proposal, patient, rules);
      assertApproved(verdict);
    });
  });

  describe('AU-SAFETY-001c — 2C (Quze)', () => {
    it('DEBE bloquear cuando 2C está en la propuesta', () => {
      const proposal = createProposal(['2C', '4RM']);
      const patient = createPatient(35);
      const verdict = evaluate(proposal, patient, rules);
      assertBlocked(verdict, 'AU-SAFETY-001c');
    });

    it('NO debe bloquear cuando 2C NO está en la propuesta', () => {
      const proposal = createProposal(['4RM', '36E']);
      const patient = createPatient(35);
      const verdict = evaluate(proposal, patient, rules);
      assertApproved(verdict);
    });
  });

  describe('AU-SAFETY-001d — 13IG (Shouwuli)', () => {
    it('DEBE bloquear cuando 13IG está en la propuesta', () => {
      const proposal = createProposal(['13IG', '4RM']);
      const patient = createPatient(35);
      const verdict = evaluate(proposal, patient, rules);
      assertBlocked(verdict, 'AU-SAFETY-001d');
    });

    it('NO debe bloquear cuando 13IG NO está en la propuesta', () => {
      const proposal = createProposal(['4RM', '36E']);
      const patient = createPatient(35);
      const verdict = evaluate(proposal, patient, rules);
      assertApproved(verdict);
    });
  });

  describe('AU-SAFETY-001e — 56V (Chengfu)', () => {
    it('DEBE bloquear cuando 56V está en la propuesta', () => {
      const proposal = createProposal(['56V', '4RM']);
      const patient = createPatient(35);
      const verdict = evaluate(proposal, patient, rules);
      assertBlocked(verdict, 'AU-SAFETY-001e');
    });

    it('NO debe bloquear cuando 56V NO está en la propuesta', () => {
      const proposal = createProposal(['4RM', '36E']);
      const patient = createPatient(35);
      const verdict = evaluate(proposal, patient, rules);
      assertApproved(verdict);
    });
  });

  describe('Múltiples puntos prohibidos', () => {
    it('DEBE bloquear y reportar TODAS las violaciones cuando hay múltiples puntos prohibidos', () => {
      const proposal = createProposal(['17E', '8RM', '2C']);
      const patient = createPatient(35);
      const verdict = evaluate(proposal, patient, rules);

      expect(verdict.approved).toBe(false);
      expect(verdict.violations.length).toBe(3);

      const violatedIds = verdict.violations.map((v: KantViolation) => v.ruleId).sort();
      expect(violatedIds).toEqual(['AU-SAFETY-001a', 'AU-SAFETY-001b', 'AU-SAFETY-001c']);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS: PUNTOS PROHIBIDOS POR EDAD (AU-SAFETY-002a-b)
// ─────────────────────────────────────────────────────────────────────────────

describe('AU-SAFETY-002: Puntos prohibidos por edad (fontanelas)', () => {

  describe('AU-SAFETY-002a — 22DM (Xinhui) en menores de 8 años', () => {
    it('DEBE bloquear cuando paciente tiene 7 años y propuesta incluye 22DM', () => {
      const proposal = createProposal(['22DM', '4RM']);
      const patient = createPatient(7);
      const verdict = evaluate(proposal, patient, rules);
      assertBlocked(verdict, 'AU-SAFETY-002a');
      expect(verdict.violations[0].context?.patientAge).toBe(7);
    });

    it('DEBE bloquear cuando paciente tiene 0 años (recién nacido)', () => {
      const proposal = createProposal(['22DM']);
      const patient = createPatient(0);
      const verdict = evaluate(proposal, patient, rules);
      assertBlocked(verdict, 'AU-SAFETY-002a');
    });

    it('DEBE bloquear cuando paciente tiene 5 años', () => {
      const proposal = createProposal(['22DM', '20VB']);
      const patient = createPatient(5);
      const verdict = evaluate(proposal, patient, rules);
      assertBlocked(verdict, 'AU-SAFETY-002a');
    });

    it('NO debe bloquear cuando paciente tiene exactamente 8 años', () => {
      const proposal = createProposal(['22DM', '4RM']);
      const patient = createPatient(8);
      const verdict = evaluate(proposal, patient, rules);
      assertApproved(verdict);
    });

    it('NO debe bloquear cuando paciente tiene 10 años', () => {
      const proposal = createProposal(['22DM', '4RM']);
      const patient = createPatient(10);
      const verdict = evaluate(proposal, patient, rules);
      assertApproved(verdict);
    });

    it('NO debe bloquear cuando paciente tiene 35 años (adulto)', () => {
      const proposal = createProposal(['22DM', '4RM']);
      const patient = createPatient(35);
      const verdict = evaluate(proposal, patient, rules);
      assertApproved(verdict);
    });

    it('NO debe bloquear cuando 22DM NO está en la propuesta (niño de 5 años)', () => {
      const proposal = createProposal(['20VB', '4RM']);
      const patient = createPatient(5);
      const verdict = evaluate(proposal, patient, rules);
      assertApproved(verdict);
    });

    it('NO debe bloquear cuando edad es undefined (sin información de edad)', () => {
      const proposal = createProposal(['22DM', '4RM']);
      const patient = createPatient(undefined);
      const verdict = evaluate(proposal, patient, rules);
      // FAIL-SAFE: sin edad conocida, no bloqueamos por constraint de edad
      assertApproved(verdict);
    });
  });

  describe('AU-SAFETY-002b — 18DM (Qiangjian) en menores de 8 años', () => {
    it('DEBE bloquear cuando paciente tiene 3 años y propuesta incluye 18DM', () => {
      const proposal = createProposal(['18DM', '4RM']);
      const patient = createPatient(3);
      const verdict = evaluate(proposal, patient, rules);
      assertBlocked(verdict, 'AU-SAFETY-002b');
    });

    it('DEBE bloquear cuando paciente tiene 7 años', () => {
      const proposal = createProposal(['18DM']);
      const patient = createPatient(7);
      const verdict = evaluate(proposal, patient, rules);
      assertBlocked(verdict, 'AU-SAFETY-002b');
    });

    it('NO debe bloquear cuando paciente tiene 8 años', () => {
      const proposal = createProposal(['18DM', '4RM']);
      const patient = createPatient(8);
      const verdict = evaluate(proposal, patient, rules);
      assertApproved(verdict);
    });

    it('NO debe bloquear cuando paciente tiene 45 años', () => {
      const proposal = createProposal(['18DM', '4RM']);
      const patient = createPatient(45);
      const verdict = evaluate(proposal, patient, rules);
      assertApproved(verdict);
    });

    it('NO debe bloquear cuando 18DM NO está en la propuesta (niño de 4 años)', () => {
      const proposal = createProposal(['20VB', '4RM']);
      const patient = createPatient(4);
      const verdict = evaluate(proposal, patient, rules);
      assertApproved(verdict);
    });
  });

  describe('Combinación: puntos prohibidos absolutos + prohibidos por edad', () => {
    it('DEBE bloquear por AMBOS motivos: 17E (absoluto) + 22DM (edad) en niño de 5 años', () => {
      const proposal = createProposal(['17E', '22DM', '4RM']);
      const patient = createPatient(5);
      const verdict = evaluate(proposal, patient, rules);

      expect(verdict.approved).toBe(false);
      expect(verdict.violations.length).toBe(2);

      const violatedIds = verdict.violations.map((v: KantViolation) => v.ruleId).sort();
      expect(violatedIds).toEqual(['AU-SAFETY-001a', 'AU-SAFETY-002a']);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS: CASOS LÍMITE Y FAIL-SAFE
// ─────────────────────────────────────────────────────────────────────────────

describe('Casos límite y fail-safe', () => {

  it('DEBE aprobar propuesta vacía (sin puntos)', () => {
    const proposal = createProposal([]);
    const patient = createPatient(35);
    const verdict = evaluate(proposal, patient, rules);
    assertApproved(verdict);
  });

  it('DEBE aprobar propuesta con puntos seguros únicamente', () => {
    const proposal = createProposal(['4RM', '36E', '40V', '20VB']);
    const patient = createPatient(35);
    const verdict = evaluate(proposal, patient, rules);
    assertApproved(verdict);
    expect(verdict.warnings.length).toBe(0);
    expect(verdict.violations.length).toBe(0);
  });

  it('DEBE incluir hash en el veredicto', () => {
    const proposal = createProposal(['4RM']);
    const patient = createPatient(35);
    const verdict = evaluate(proposal, patient, rules);
    expect(verdict.hash).toBeDefined();
    expect(typeof verdict.hash).toBe('string');
    expect(verdict.hash.length).toBeGreaterThan(0);
  });

  it('DEBE incluir timestamp ISO 8601', () => {
    const proposal = createProposal(['4RM']);
    const patient = createPatient(35);
    const verdict = evaluate(proposal, patient, rules);
    expect(verdict.timestamp).toBeDefined();
    expect(new Date(verdict.timestamp).toISOString()).toBe(verdict.timestamp);
  });

  it('DEBE incluir versión del motor', () => {
    const proposal = createProposal(['4RM']);
    const patient = createPatient(35);
    const verdict = evaluate(proposal, patient, rules);
    expect(verdict.engineVersion).toBe('1.0.0');
  });

  it('DEBE incluir versión del catálogo de reglas', () => {
    const proposal = createProposal(['4RM']);
    const patient = createPatient(35);
    const verdict = evaluate(proposal, patient, rules);
    expect(verdict.ruleSetVersion).toBe('1.0.0');
  });

  it('NO debe tener warnings cuando no hay violaciones', () => {
    const proposal = createProposal(['4RM', '36E']);
    const patient = createPatient(35);
    const verdict = evaluate(proposal, patient, rules);
    expect(verdict.warnings.length).toBe(0);
  });

  it('context de violación debe incluir punto prohibido y detalles', () => {
    const proposal = createProposal(['17E']);
    const patient = createPatient(35);
    const verdict = evaluate(proposal, patient, rules);

    const violation = verdict.violations.find((v: KantViolation) => v.ruleId === 'AU-SAFETY-001a');
    expect(violation).toBeDefined();
    expect(violation!.context).toBeDefined();
    expect(violation!.context!.forbiddenPoint).toBe('17E');
    expect(violation!.context!.pointName).toBe('Tiantu');
  });

  it('context de violación por edad debe incluir edad del paciente y constraint', () => {
    const proposal = createProposal(['22DM']);
    const patient = createPatient(5);
    const verdict = evaluate(proposal, patient, rules);

    const violation = verdict.violations.find((v: KantViolation) => v.ruleId === 'AU-SAFETY-002a');
    expect(violation).toBeDefined();
    expect(violation!.context!.patientAge).toBe(5);
    expect(violation!.context!.ageConstraint).toBe('< 8 years');
    expect(typeof violation!.context!.reason === 'string' ? violation!.context!.reason.toLowerCase() : '').toContain('fontanela');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS: PERFORMANCE (<10ms por evaluación)
// ─────────────────────────────────────────────────────────────────────────────

describe('Rendimiento', () => {
  it('cada evaluación debe completarse en menos de 10ms', () => {
    const proposal = createProposal(['4RM', '36E', '40V', '20VB']);
    const patient = createPatient(35);

    const start = performance.now();
    const verdict = evaluate(proposal, patient, rules);
    const end = performance.now();

    expect(verdict).toBeDefined();
    expect(end - start).toBeLessThan(10);
  });

  it('evaluación con violaciones debe completarse en menos de 10ms', () => {
    const proposal = createProposal(['17E', '8RM', '2C', '13IG', '56V']);
    const patient = createPatient(35);

    const start = performance.now();
    const verdict = evaluate(proposal, patient, rules);
    const end = performance.now();

    expect(verdict.violations.length).toBe(5);
    expect(end - start).toBeLessThan(10);
  });
});