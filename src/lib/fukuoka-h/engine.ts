// src/lib/fukuoka-h/engine.ts
// ═══════════════════════════════════════════════════════════════
// CDSS MTC Premium v3.0 — Motor Fukuoka-H (Cerebro diagnóstico)
// ═══════════════════════════════════════════════════════════════
// Arquitectura: FUKUOKA → KANT (3 intentos) → FOUCAULT
// Si KANT detecta incidencias tras 3 intentos → ALERTA HUMANA
// Autor: Germán Fernández Acosta | Diplomado CEMETC (España)
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

export interface GenerateTreatmentParams {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxRetries?: number;
  enableKantLoop?: boolean;
}

export interface Point {
  name: string;
  location: string;
  indication: string;
}

export interface Herb {
  name: string;
  dose: string;
  preparation: string;
}

export interface TreatmentMetadata {
  syndrome: string;
  points: Point[];
  herbs: Herb[];
  rationale: string;
  contraindications?: string[];
  followUp?: string;
}

export interface ParsedResponse {
  sections: {
    A: string;
    B: string;
    C: string;
  };
  metadata: TreatmentMetadata;
}

export interface KantAlert {
  severity: "warning" | "critical" | "fatal";
  rule: string;
  message: string;
  affectedPoints?: string[];
  affectedHerbs?: string[];
  recommendation?: string;
}

export interface TreatmentResult {
  success: boolean;
  rawResponse: string;
  parsed: ParsedResponse;
  kantAlerts: KantAlert[];
  attempts: number;
  requiresHumanIntervention: boolean;
  humanInterventionReason?: string;
}

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────

const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_RETRIES = 3;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ─────────────────────────────────────────────────────────────
// 1. GENERATE TREATMENT (FUKUOKA)
// ─────────────────────────────────────────────────────────────

export async function generateTreatment({
  systemPrompt,
  userPrompt,
  model = DEFAULT_MODEL,
  temperature = DEFAULT_TEMPERATURE,
}: Omit<GenerateTreatmentParams, "maxRetries" | "enableKantLoop">): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY no configurada");
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000",
      "X-Title": "CDSS MTC Premium",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const rawContent = data.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error("Respuesta vacía del LLM");
  }

  return rawContent;
}

// ─────────────────────────────────────────────────────────────
// 2. PARSE NOTEBOOKLM RESPONSE — VERSIÓN ROBUSTA
// ─────────────────────────────────────────────────────────────
// Soporta ambos formatos de sección:
//   === SECCIÓN A ===  (formato actual de route.ts v2.3)
//   ## Sección A:      (formato alternativo NotebookLM)
// ─────────────────────────────────────────────────────────────

export function parseNotebookLMResponse(rawLlmResponse: string): ParsedResponse {
  const sectionA = extractSection(rawLlmResponse, "A");
  const sectionB = extractSection(rawLlmResponse, "B");
  const sectionC = extractSection(rawLlmResponse, "C");

  const jsonMatch = rawLlmResponse.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonBlock = jsonMatch ? jsonMatch[1].trim() : null;

  let metadata: TreatmentMetadata;

  if (jsonBlock) {
    try {
      const parsed = JSON.parse(jsonBlock);
      metadata = {
        syndrome: parsed.syndrome ?? "",
        points: Array.isArray(parsed.points)
          ? parsed.points.map((p: Record<string, string>) => ({
              name: p.name ?? "",
              location: p.location ?? "",
              indication: p.indication ?? "",
            }))
          : [],
        herbs: Array.isArray(parsed.herbs)
          ? parsed.herbs.map((h: Record<string, string>) => ({
              name: h.name ?? "",
              dose: h.dose ?? "",
              preparation: h.preparation ?? "",
            }))
          : [],
        rationale: parsed.rationale ?? "",
        contraindications: Array.isArray(parsed.contraindications)
          ? parsed.contraindications
          : undefined,
        followUp: parsed.followUp ?? undefined,
      };
    } catch {
      metadata = getEmptyMetadata();
    }
  } else {
    metadata = getEmptyMetadata();
  }

  return {
    sections: { A: sectionA, B: sectionB, C: sectionC },
    metadata,
  };
}

// ─────────────────────────────────────────────────────────────
// 3. BUCLE KANT-FUKUOKA (3 INTENTOS → ALERTA HUMANA)
// ─────────────────────────────────────────────────────────────

export async function generateTreatmentWithKantLoop(
  params: GenerateTreatmentParams,
  kantValidator: (parsed: ParsedResponse) => Promise<KantAlert[]> | KantAlert[]
): Promise<TreatmentResult> {
  const maxRetries = params.maxRetries ?? DEFAULT_MAX_RETRIES;
  const enableKantLoop = params.enableKantLoop ?? true;

  let attempts = 0;
  let lastRawResponse = "";
  let lastParsed: ParsedResponse = {
    sections: { A: "", B: "", C: "" },
    metadata: getEmptyMetadata(),
  };
  let allAlerts: KantAlert[] = [];

  while (attempts < maxRetries) {
    attempts++;

    const currentPrompt = buildPromptWithCorrections(
      params.systemPrompt,
      params.userPrompt,
      allAlerts,
      attempts
    );

    lastRawResponse = await generateTreatment({
      systemPrompt: currentPrompt.systemPrompt,
      userPrompt: currentPrompt.userPrompt,
      model: params.model,
      temperature: params.temperature,
    });

    lastParsed = parseNotebookLMResponse(lastRawResponse);

    if (!enableKantLoop) break;

    const alerts = await Promise.resolve(kantValidator(lastParsed));
    const criticalAlerts = alerts.filter(
      (a) => a.severity === "critical" || a.severity === "fatal"
    );

    if (criticalAlerts.length === 0) {
      return {
        success: true,
        rawResponse: lastRawResponse,
        parsed: lastParsed,
        kantAlerts: alerts,
        attempts,
        requiresHumanIntervention: false,
      };
    }

    allAlerts = [...allAlerts, ...criticalAlerts];

    if (attempts >= maxRetries) break;
  }

  return {
    success: false,
    rawResponse: lastRawResponse,
    parsed: lastParsed,
    kantAlerts: allAlerts,
    attempts,
    requiresHumanIntervention: true,
    humanInterventionReason: buildHumanInterventionReason(allAlerts),
  };
}

// ─────────────────────────────────────────────────────────────
// 4. SYSTEM PROMPT BASE — CEMETC EXCLUSIVO
// ─────────────────────────────────────────────────────────────

export function getFukuokaSystemPrompt(language: "es" | "en" = "es"): string {
  const isSpanish = language === "es";

  return isSpanish
    ? `Eres Fukuoka-H, el motor diagnóstico-terapéutico del CDSS MTC Premium v3.0.

IDENTIDAD:
- Desarrollado para Germán Fernández Acosta, acupuntor diplomado por CEMETC (España).
- Tu única fuente de conocimiento son los documentos del CEMETC ingestados en este sistema.
- NO uses conocimiento genérico de IA. NO inventes puntos, fórmulas ni diagnósticos.
- Si la información no está en las fuentes CEMETC, indica "No disponible en fuentes".

FLUJO DE RAZONAMIENTO OBLIGATORIO:
1. Ba Gang (八纲) → Clasificación Yin/Yang, frío/calor, vacío/exceso, interior/exterior
2. Zang Fu (脏腑) → Identificación de órganos/visceras afectados
3. Meridianos principales → Selección basada en Shu-Mu, puntos maestros, puntos de comando
4. Puntos → Localización precisa (Cun), indicación según fuentes CEMETC, precauciones
5. Técnicas complementarias → Auriculoterapia (CEMETC), balance articular, microsistemas si aplica
6. Fitoterapia → Solo fórmulas documentadas en el Vademecum CEMETC

FORMATO DE SALIDA:
## Sección A: Diagnóstico Energético
[Análisis Ba Gang + Zang Fu + síndrome confirmado]

## Sección B: Tratamiento de Acupuntura
[Puntos seleccionados con localización Cun, técnica, indicación según fuentes]
[Precauciones y contraindicaciones específicas]
[Técnicas complementarias si aplica]

## Sección C: Fitoterapia
[Fórmula base del Vademecum CEMETC]
[Modificaciones según síndrome]
[Dosis y preparación]
[Contraindicaciones]

## Metadatos JSON
\`\`\`json
{
  "syndrome": "string",
  "points": [
    { "name": "string", "location": "string", "indication": "string" }
  ],
  "herbs": [
    { "name": "string", "dose": "string", "preparation": "string" }
  ],
  "rationale": "string",
  "contraindications": ["string"],
  "followUp": "string"
}
\`\`\`

REGLAS INQUEBRANTABLES:
- Cada punto debe citar su meridiano y categoría (Shu, Mu, Maestro, etc.).
- Las dosis de fitoterapia deben estar en gramos y seguir el Vademecum CEMETC.
- Si hay contraindicaciones de seguridad (embarazo, puntos prohibidos), deben ir en MAYÚSCULAS.
- NO prescribas técnicas no documentadas en las fuentes CEMETC.`
    : `You are Fukuoka-H, the diagnostic-therapeutic engine of CDSS MTC Premium v3.0.

IDENTITY:
- Developed for Germán Fernández Acosta, acupuncturist graduated from CEMETC (Spain).
- Your ONLY knowledge source are the CEMETC documents ingested in this system.
- DO NOT use generic AI knowledge. DO NOT invent points, formulas, or diagnoses.
- If information is not in CEMETC sources, state "Not available in sources".

MANDATORY REASONING FLOW:
1. Ba Gang (八纲) → Yin/Yang, cold/heat, deficiency/excess, interior/exterior
2. Zang Fu (脏腑) → Affected organs/viscera identification
3. Principal meridians → Selection based on Shu-Mu, master points, command points
4. Points → Precise location (Cun), indication per CEMETC sources, precautions
5. Complementary techniques → Auriculotherapy (CEMETC), articular balance, microsystems if applicable
6. Herbal therapy → Only formulas documented in the CEMETC Vademecum

OUTPUT FORMAT:
## Section A: Energetic Diagnosis
[Ba Gang + Zang Fu + confirmed syndrome analysis]

## Section B: Acupuncture Treatment
[Selected points with Cun location, technique, indication per sources]
[Specific precautions and contraindications]
[Complementary techniques if applicable]

## Section C: Herbal Therapy
[Base formula from CEMETC Vademecum]
[Modifications per syndrome]
[Dosage and preparation]
[Contraindications]

## Metadata JSON
\`\`\`json
{
  "syndrome": "string",
  "points": [
    { "name": "string", "location": "string", "indication": "string" }
  ],
  "herbs": [
    { "name": "string", "dose": "string", "preparation": "string" }
  ],
  "rationale": "string",
  "contraindications": ["string"],
  "followUp": "string"
}
\`\`\`

UNBREAKABLE RULES:
- Each point must cite its meridian and category (Shu, Mu, Master, etc.).
- Herbal dosages must be in grams and follow the CEMETC Vademecum.
- Safety contraindications (pregnancy, forbidden points) must be in UPPERCASE.
- DO NOT prescribe techniques not documented in CEMETC sources.`;
}

// ─────────────────────────────────────────────────────────────
// 5. HELPERS PRIVADOS
// ─────────────────────────────────────────────────────────────

interface PromptPair {
  systemPrompt: string;
  userPrompt: string;
}

function buildPromptWithCorrections(
  baseSystemPrompt: string,
  baseUserPrompt: string,
  previousAlerts: KantAlert[],
  attemptNumber: number
): PromptPair {
  if (previousAlerts.length === 0 || attemptNumber <= 1) {
    return { systemPrompt: baseSystemPrompt, userPrompt: baseUserPrompt };
  }

  const correctionBlock = previousAlerts
    .map(
      (alert, idx) =>
        `${idx + 1}. [${alert.severity.toUpperCase()}] ${alert.rule}: ${alert.message}` +
        (alert.recommendation ? ` → Corrección: ${alert.recommendation}` : "") +
        (alert.affectedPoints?.length
          ? ` → Puntos afectados: ${alert.affectedPoints.join(", ")}`
          : "") +
        (alert.affectedHerbs?.length
          ? ` → Hierbas afectadas: ${alert.affectedHerbs.join(", ")}`
          : "")
    )
    .join("\n");

  const amendedSystem = `${baseSystemPrompt}

⚠️ CORRECCIONES DE SEGURIDAD (intento ${attemptNumber}/3):
El sistema de validación Kant ha detectado las siguientes incidencias en intentos previos.
DEBES corregir el tratamiento eliminando o modificando los elementos señalados:

${correctionBlock}

Si no puedes corregir todas las incidencias manteniendo la eficacia terapéutica,
indica claramente qué elemento no puede sustituirse y por qué.`;

  return { systemPrompt: amendedSystem, userPrompt: baseUserPrompt };
}

function buildHumanInterventionReason(alerts: KantAlert[]): string {
  const criticalCount = alerts.filter(
    (a) => a.severity === "critical" || a.severity === "fatal"
  ).length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return [
    "═════════════════════════════════════════════════════════════",
    "  ALERTA DE INTERVENCIÓN HUMANA OBLIGATORIA",
    "═════════════════════════════════════════════════════════════",
    "",
    `El motor Fukuoka-H ha agotado sus 3 intentos de corrección automática`,
    `y Kant sigue detectando ${criticalCount} incidencia(s) crítica(s) y ${warningCount} advertencia(s).`,
    "",
    "El tratamiento generado NO puede ser validado automáticamente.",
    "Un profesional de la salud debe revisar manualmente el caso.",
    "",
    "Incidencias pendientes:",
    ...alerts.map((a) => `  • [${a.severity.toUpperCase()}] ${a.rule}: ${a.message}`),
    "",
    "ACCIONES RECOMENDADAS:",
    "  1. Revisar los puntos y hierbas señalados por Kant.",
    "  2. Consultar las guías AHPRA/CMBA directamente.",
    "  3. Ajustar el tratamiento manualmente o derivar al paciente.",
    "═════════════════════════════════════════════════════════════",
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────
// EXTRACT SECTION — VERSIÓN ROBUSTA (soporta ambos formatos)
// ─────────────────────────────────────────────────────────────

function extractSection(text: string, sectionLabel: string): string {
  // Patrón 1: === SECCIÓN A === (formato actual de route.ts v2.3)
  // Ejemplo: === SECCIÓN A — ALERTA KANT (Seguridad) ===
  const patternTripleEquals = new RegExp(
    `(?:={3,}\\s*(?:SECCIÓN|SECTION|Sección|Section)?\\s*${sectionLabel}[\\s\\w\\u2014\\u2013\\-—–]*={3,})` +
    `([\\s\\S]*?)(?=(?:={3,}\\s*(?:SECCIÓN|SECTION|Sección|Section)?\\s*[BC][\\s\\w\\u2014\\u2013\\-—–]*={3,}|##\\s*Metadatos|$))`,
    "i"
  );

  // Patrón 2: ## Sección A: (formato alternativo NotebookLM)
  const patternHash = new RegExp(
    `(?:#{1,3}\\s*(?:Sección|Section)?\\s*${sectionLabel}[.:\\s]*)` +
    `([\\s\\S]*?)(?=\\n(?:#{1,3}\\s*(?:Sección|Section)?\\s*[BC][.:\\s]*|##\\s*Metadatos|$))`,
    "i"
  );

  // Patrón 3: Section A: (inglés simple)
  const patternSimple = new RegExp(
    `(?:^|\\n)${sectionLabel}[.:\\)\\]\\s]+([\\s\\S]*?)(?=\\n[BC][.:\\)\\]\\s]+|##\\s*Metadatos|$)`,
    "i"
  );

  const patterns = [patternTripleEquals, patternHash, patternSimple];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const content = match[1].trim();
      if (content.length > 0) {
        return content;
      }
    }
  }

  // Fallback: si no encuentra secciones estructuradas, intentar extraer
  // cualquier texto que parezca ser la sección buscada
  const fallbackPattern = new RegExp(
    `(?:^|\\n)(?:.*?(?:${sectionLabel}).*?(?:\\n|:))` +
    `([\\s\\S]{50,}?(?=\\n(?:.*?(?:[BC]).*?(?:\\n|:))|$))`,
    "i"
  );
  const fallbackMatch = text.match(fallbackPattern);
  if (fallbackMatch?.[1]) {
    return fallbackMatch[1].trim();
  }

  return "";
}

function getEmptyMetadata(): TreatmentMetadata {
  return {
    syndrome: "",
    points: [],
    herbs: [],
    rationale: "",
  };
}

export { getEmptyMetadata };