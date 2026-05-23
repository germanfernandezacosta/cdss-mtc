/**
 * API Route: /api/treatment
 * Orquesta FUKUOKA-H (inferencia) + KANT (validación de seguridad) + FOUCAULT (custodia documental)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateClinicalProposal, isValidFukuokaProposal } from '@/lib/kant/validator';
import { generateDoublePdf } from '@/lib/foucault';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_APP_URL = process.env.OPENROUTER_APP_URL || 'https://localhost:3000';
const MODEL_ID = 'openai/gpt-3.5-turbo';
const MAX_REQUEST_AGE_MS = 25000;
const MAX_INPUT_LENGTH = 2000;

function sanitizeClinicalInput(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let cleaned = raw.normalize('NFKC');
  cleaned = cleaned.slice(0, MAX_INPUT_LENGTH);
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

const SYSTEM_PROMPT = `You are FUKUOKA-H, a TCM syndrome differentiation engine.
You MUST return ONLY a JSON object with this structure:
{
  "syndrome_analysis": [
    {
      "syndrome_name": "Spleen Qi Deficiency",
      "confidence": 0.85,
      "supporting_evidence": ["fatigue", "loose stools"]
    }
  ],
  "treatment_proposal": {
    "acupuncture_points": ["SP6", "ST36"],
    "herbal_formula": "Gui Pi Tang",
    "rationale": "Brief rationale here"
  }
}
NEVER include markdown, dosages, or safety warnings.`;

async function callFukuoka(symptoms: string, pulse: string, tongue: string, ryodoraku: string, context: string) {
  const userMessage = [
    `SYMPTOMS: ${symptoms}`,
    `PULSE: ${pulse}`,
    `TONGUE: ${tongue}`,
    ryodoraku ? `RYODORAKU: ${ryodoraku}` : '',
    context ? `ADDITIONAL_CONTEXT: ${context}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MAX_REQUEST_AGE_MS);

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': OPENROUTER_APP_URL,
        'X-Title': 'Fukuoka-H CDSS MVP',
      },
      body: JSON.stringify({
        model: MODEL_ID,
        temperature: 0.1,
        max_tokens: 1500,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${text}`);
    }

    const data = await res.json();

    if (data.error) {
      throw new Error(`OpenRouter payload error: ${data.error.message}`);
    }

    const choice = data.choices?.[0];
    if (!choice || !choice.message || !choice.message.content) {
      throw new Error('Empty response from OpenRouter');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(choice.message.content);
    } catch {
      throw new Error('Invalid JSON in response');
    }

    if (!isValidFukuokaProposal(parsed)) {
      throw new Error('Response does not match expected schema');
    }

    return { success: true, data: parsed, request_id: data.id };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const symptoms = sanitizeClinicalInput(body.symptoms);
    const pulse = sanitizeClinicalInput(body.pulse);
    const tongue = sanitizeClinicalInput(body.tongue);
    const ryodoraku = sanitizeClinicalInput(body.ryodoraku);
    const context = sanitizeClinicalInput(body.context);

    if (!symptoms || !pulse || !tongue) {
      return NextResponse.json(
        { error: 'Missing required fields: symptoms, pulse, tongue' },
        { status: 400 }
      );
    }

    // ── Contexto de seguridad del paciente ───────────────────────────────
    const patient = body.patient || {};
    const pregnancy = patient.pregnancy || {};

    const patientContext = {
      age: typeof patient.age === 'number' ? patient.age : undefined,
      isPregnant: pregnancy.active === true,
      trimester: typeof pregnancy.trimester === 'number' ? pregnancy.trimester : undefined,
      weeks: typeof pregnancy.weeks === 'number' ? pregnancy.weeks : undefined,
      medications: Array.isArray(patient.medications)
        ? patient.medications.map((m: string) => String(m).toLowerCase())
        : [],
      knownAllergies: Array.isArray(patient.knownAllergies)
        ? patient.knownAllergies.map((a: string) => String(a).toLowerCase())
        : [],
    };

    // ── Contexto enriquecido para FUKUOKA-H ──────────────────────────────
    const enrichedContext = [
      context,
      patientContext.isPregnant ? `PATIENT_IS_PREGNANT: trimester=${patientContext.trimester}, weeks=${patientContext.weeks}` : '',
      patientContext.age ? `PATIENT_AGE: ${patientContext.age}` : '',
      patientContext.medications.length ? `MEDICATIONS: ${patientContext.medications.join(', ')}` : '',
    ].filter(Boolean).join(' | ');

    // ── FUKUOKA-H: Inferencia ────────────────────────────────────────────
    const fukuokaResult = await callFukuoka(symptoms, pulse, tongue, ryodoraku, enrichedContext);

    // ── KANT: Validación de seguridad ────────────────────────────────────
    const kantResult = validateClinicalProposal(fukuokaResult.data, patientContext);

    // ── FOUCAULT: Custodia documental ─────────────────────────────────────
    const foucaultInput = {
      patient: {
        id: patient.id,
        age: patientContext.age,
        sex: patient.sex,
        pregnancy: patientContext.isPregnant ? {
          active: true,
          trimester: patientContext.trimester,
          weeks: patientContext.weeks,
        } : undefined,
      },
      clinicalInput: {
        symptoms,
        pulse,
        tongue,
        ryodoraku: typeof body.ryodoraku === 'string' ? body.ryodoraku : undefined,
      },
      fukuokaResult: {
        request_id: fukuokaResult.request_id,
        data: fukuokaResult.data,
      },
      kantResult,
      generatedAt: new Date().toISOString(),
    };

    const foucaultResult = await generateDoublePdf(foucaultInput);

    // ── Respuesta combinada ────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      fukuoka: {
        request_id: fukuokaResult.request_id,
        data: fukuokaResult.data,
      },
      kant: {
        verdict: kantResult.verdict,
        violations: kantResult.violations,
        evaluatedAt: kantResult.evaluatedAt,
        totalRulesChecked: kantResult.totalRulesChecked,
      },
      foucault: {
        forensicHash: foucaultResult.auditLog.documentHashes.forensic,
        empathicHash: foucaultResult.auditLog.documentHashes.empathic,
        ahpraFlags: foucaultResult.auditLog.ahpraFlags,
        chainOfCustody: foucaultResult.auditLog.chainOfCustody,
        pdfs: {
          forensic: foucaultResult.forensicPdfBase64,
          empathic: foucaultResult.empathicPdfBase64,
        },
      },
      _warning: kantResult.verdict === 'ROJO'
        ? 'BLOQUEADO: La propuesta incumple reglas de seguridad críticas. NO proceder.'
        : kantResult.verdict === 'AMARILLO'
        ? 'PRECAUCIÓN: Requiere confirmación manual antes de proceder.'
        : 'APROBADO: Propuesta validada por KANT. Revisión clínica habitual recomendada.',
    });

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[TREATMENT] Error:', error.message);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 502 }
    );
  }
}
