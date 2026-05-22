/**
 * FUKUOKA-H — Motor de Inferencia Híbrido (MVP)
 * Next.js 14 App Router — API Route
 * Incluye: Síntomas, Pulso, Lengua, Ryodoraku
 */

import { NextRequest, NextResponse } from 'next/server';

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
You receive clinical data including: symptoms, pulse, tongue, and Ryodoraku measurements.
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

Ryodoraku interpretation:
- Values >+20 indicate EXCESS (Shi) in that meridian
- Values between -10 and +10 indicate BALANCE
- Values <-20 indicate DEFICIENCY (Xu) in that meridian
- Extreme imbalances between left/right sides indicate pathology

NEVER include markdown, dosages, needle depths, or safety warnings.`;

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const symptoms = body.symptoms;
  const pulse = body.pulse;
  const tongue = body.tongue;
  const ryodoraku = body.ryodoraku;
  const context = body.context;

  if (!symptoms || !pulse || !tongue) {
    return NextResponse.json(
      { error: 'Missing required fields: symptoms, pulse, tongue' },
      { status: 400 }
    );
  }

  const cleanSymptoms = sanitizeClinicalInput(symptoms);
  const cleanPulse = sanitizeClinicalInput(pulse);
  const cleanTongue = sanitizeClinicalInput(tongue);
  const cleanRyodoraku = ryodoraku ? sanitizeClinicalInput(ryodoraku) : '';
  const cleanContext = sanitizeClinicalInput(context);

  if (!cleanSymptoms || !cleanPulse || !cleanTongue) {
    return NextResponse.json(
      { error: 'Clinical inputs are empty after sanitization' },
      { status: 400 }
    );
  }

  const userMessage = [
    `SYMPTOMS: ${cleanSymptoms}`,
    `PULSE: ${cleanPulse}`,
    `TONGUE: ${cleanTongue}`,
    cleanRyodoraku ? `RYODORAKU: ${cleanRyodoraku}` : '',
    cleanContext ? `ADDITIONAL_CONTEXT: ${cleanContext}` : '',
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

    const result = parsed as Record<string, unknown>;
    if (!result.syndrome_analysis || !result.treatment_proposal) {
      console.error('[FUKUOKA-H] Schema mismatch. Raw:', choice.message.content);
      throw new Error('Response missing required fields');
    }

    return NextResponse.json({
      success: true,
      request_id: data.id,
      data: parsed,
      _warning: 'PROPOSAL_ONLY — MUST pass through KANT before clinical use.',
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[FUKUOKA-H] Inference failed:', error.message);

    return NextResponse.json({
      success: false,
      error: error.message,
      debug: true,
    }, { status: 502 });
  }
}