/**
 * AHPRA Filter v2.2 — Escaneo de texto para términos regulatorios prohibidos
 * Basado en: Guidelines for advertising a regulated health service (AHPRA, Dec 2020)
 * CDSS MTC Premium v2.2
 * 
 * Fuentes regulatorias:
 * - AHPRA Guidelines for advertising a regulated health service (Dec 2020)
 * - National Law Section 133
 * - Chinese Medicine Board of Australia - Code of Conduct (June 2022)
 */

import * as fs from "fs";
import * as path from "path";
import { AHPRAFlag } from "./types";

const AHPRA_RULES_PATH = process.env.AHPRA_RULES_PATH ||
  path.resolve(process.cwd(), "data/kant/ahpra-rules.json");

interface AhpraScanResult {
  flags: AHPRAFlag[];
  clean: boolean;
  summary: string;
}

interface AhpraRule {
  claim: string;
  reason: string;
  severity: "absolute" | "high" | "moderate" | "low";
  replacement?: string;
  category: "claim" | "title" | "testimonial" | "urgency" | "image";
}

// ═══════════════════════════════════════════════════════════════════════
// REGLAS AHPRA EMBEBIDAS (fallback si no existe el archivo JSON)
// Basadas en Guidelines for advertising a regulated health service (Dec 2020)
// ═══════════════════════════════════════════════════════════════════════

const EMBEDDED_RULES: { advertisingRestrictions: { prohibitedClaims: AhpraRule[]; titleProtection: { protectedTitles: string[] }; urgencyPhrases: string[] }; scopeOfPractice: { prohibitedProcedures: any[]; mandatoryReferral: { conditions: any[] } } } = {
  advertisingRestrictions: {
    prohibitedClaims: [
      // ─── Claims de cura/certeza (Sección 4.4) ───
      { claim: "cure", reason: "AHPRA prohibits claims of 'cure' for any condition. Must use 'may assist with' or 'may help manage'.", severity: "high", replacement: "may help manage", category: "claim" },
      { claim: "cura", reason: "AHPRA prohíbe claims de 'cura' para cualquier condición. Usar 'puede ayudar a manejar'.", severity: "high", replacement: "puede ayudar a manejar", category: "claim" },
      { claim: "curar", reason: "Implies curative outcome. Prohibido bajo s.133(1)(d)", severity: "high", replacement: "puede ayudar a manejar", category: "claim" },
      { claim: "curado", reason: "Implies curative outcome. Prohibido bajo s.133(1)(d)", severity: "high", replacement: "ha recibido apoyo", category: "claim" },
      { claim: "curacion", reason: "Implies curative outcome. Prohibido bajo s.133(1)(d)", severity: "high", replacement: "proceso de apoyo", category: "claim" },
      { claim: "guaranteed", reason: "Creates unreasonable expectation of beneficial treatment (s.133(1)(d))", severity: "high", replacement: "may help", category: "claim" },
      { claim: "garantizado", reason: "Crea expectativa irrazonable de beneficio. Prohibido s.133(1)(d)", severity: "high", replacement: "puede ayudar", category: "claim" },
      { claim: "garantiza", reason: "Crea expectativa irrazonable de beneficio. Prohibido s.133(1)(d)", severity: "high", replacement: "puede ayudar", category: "claim" },
      { claim: "garantizamos", reason: "Crea expectativa irrazonable de beneficio. Prohibido s.133(1)(d)", severity: "high", replacement: "puede ayudar", category: "claim" },
      { claim: "sure cure", reason: "Implies certainty of outcome. Prohibited under s.133(1)(d)", severity: "absolute", replacement: "may assist with", category: "claim" },
      { claim: "miracle", reason: "Creates unreasonable expectation. Prohibited under s.133(1)(d)", severity: "absolute", replacement: "may help support", category: "claim" },
      { claim: "magical", reason: "Creates unreasonable expectation. Prohibited under s.133(1)(d)", severity: "absolute", replacement: "may help support", category: "claim" },
      { claim: "infallible", reason: "Implies treatment cannot fail. Prohibited under s.133(1)(d)", severity: "absolute", replacement: "may assist with", category: "claim" },
      { claim: "unfailing", reason: "Implies guaranteed success. Prohibited under s.133(1)(d)", severity: "absolute", replacement: "may assist with", category: "claim" },
      { claim: "100% effective", reason: "Overstates benefit without evidence. Prohibited under s.133(1)(a)(d)", severity: "high", replacement: "may help", category: "claim" },
      { claim: "100% efectivo", reason: "Sobreestima beneficio sin evidencia. Prohibido s.133(1)(a)(d)", severity: "high", replacement: "puede ayudar", category: "claim" },

      // ─── Claims de seguridad absoluta (Sección 4.4) ───
      { claim: "safe", reason: "Cannot claim 'safe' without acknowledging risks (s.133(1)(d))", severity: "moderate", replacement: "generally well-tolerated when provided by a registered practitioner", category: "claim" },
      { claim: "seguro", reason: "No se puede afirmar 'seguro' sin reconocer riesgos (s.133(1)(d))", severity: "moderate", replacement: "generalmente bien tolerado", category: "claim" },
      { claim: "risk-free", reason: "Minimises complexity of risk. Prohibited under s.133(1)(d)", severity: "high", replacement: "your terapeuta will discuss any potential risks", category: "claim" },
      { claim: "sin riesgo", reason: "Minimiza complejidad de riesgo. Prohibido s.133(1)(d)", severity: "high", replacement: "su terapeuta discutira cualquier riesgo potencial", category: "claim" },
      { claim: "pain-free", reason: "Minimises complexity of risk. Prohibited under s.133(1)(d)", severity: "high", replacement: "your terapeuta will discuss what to expect", category: "claim" },
      { claim: "sin dolor", reason: "Minimiza complejidad de riesgo. Prohibido s.133(1)(d)", severity: "high", replacement: "su terapeuta explicara que esperar", category: "claim" },
      { claim: "no side effects", reason: "Minimises risk. All interventions carry some risk.", severity: "high", replacement: "your terapeuta will discuss any potential effects", category: "claim" },
      { claim: "sin efectos secundarios", reason: "Minimiza riesgo. Toda intervencion conlleva algun riesgo.", severity: "high", replacement: "su terapeuta discutira cualquier efecto potencial", category: "claim" },

      // ─── Claims de eficacia directa (Sección 4.1, 4.4) ───
      { claim: "treat", reason: "Must not make unqualified claims about treating conditions without acceptable evidence (s.133(1)(a))", severity: "moderate", replacement: "may help manage", category: "claim" },
      { claim: "trata", reason: "No debe hacer claims no calificados sobre tratar condiciones sin evidencia aceptable (s.133(1)(a))", severity: "moderate", replacement: "puede ayudar a manejar", category: "claim" },
      { claim: "tratar", reason: "No debe hacer claims no calificados sobre tratar condiciones sin evidencia aceptable (s.133(1)(a))", severity: "moderate", replacement: "puede ayudar a manejar", category: "claim" },
      { claim: "heal", reason: "Implies curative outcome. Must use conditional language.", severity: "high", replacement: "may help support the body's natural processes", category: "claim" },
      { claim: "sanar", reason: "Implies curative outcome. Must use conditional language.", severity: "high", replacement: "puede ayudar a apoyar los procesos naturales del cuerpo", category: "claim" },
      { claim: "restore", reason: "Implies return to normal function. Must be conditional.", severity: "moderate", replacement: "may help support", category: "claim" },
      { claim: "restaura", reason: "Implies return to normal function. Must be conditional.", severity: "moderate", replacement: "puede ayudar a apoyar", category: "claim" },
      { claim: "restaurar", reason: "Implies return to normal function. Must be conditional.", severity: "moderate", replacement: "puede ayudar a apoyar", category: "claim" },
      { claim: "fix", reason: "Colloquial claim of resolution. Must use conditional language.", severity: "moderate", replacement: "may help with", category: "claim" },
      { claim: "eliminate", reason: "Implies complete removal. Must use conditional language.", severity: "high", replacement: "may help reduce", category: "claim" },
      { claim: "elimina", reason: "Implies complete removal. Must use conditional language.", severity: "high", replacement: "puede ayudar a reducir", category: "claim" },
      { claim: "cure permanently", reason: "Implies lasting cure. Prohibited under s.133(1)(d)", severity: "absolute", replacement: "may help manage on an ongoing basis", category: "claim" },
      { claim: "cura permanentemente", reason: "Implies lasting cure. Prohibited under s.133(1)(d)", severity: "absolute", replacement: "puede ayudar a manejar de forma continua", category: "claim" },

      // ─── Claims implícitos en español (detectados en PDFs) ───
      { claim: "promoviendo", reason: "Implies direct causation of benefit. Use 'may help with' instead (s.133(1)(d))", severity: "moderate", replacement: "que pueden ayudar con", category: "claim" },
      { claim: "promover", reason: "Implies direct causation of benefit. Use conditional language (s.133(1)(d))", severity: "moderate", replacement: "que pueden apoyar", category: "claim" },
      { claim: "tonificar", reason: "MTC term implying direct physiological action on organs. Must be framed traditionally (s.133(1)(d))", severity: "moderate", replacement: "apoyar el equilibrio energetico de", category: "claim" },
      { claim: "tonifica", reason: "MTC term implying direct physiological action. Must be conditional.", severity: "moderate", replacement: "apoya el equilibrio energetico de", category: "claim" },
      { claim: "nutrir", reason: "Implies direct nutritional benefit to organs. Use traditional framework language (s.133(1)(d))", severity: "moderate", replacement: "apoyar la funcion de", category: "claim" },
      { claim: "nutre", reason: "Implies direct nutritional benefit. Must be conditional.", severity: "moderate", replacement: "apoya la funcion de", category: "claim" },
      { claim: "estimular", reason: "Implies direct physiological stimulation. Must be conditional.", severity: "moderate", replacement: "puede ayudar a activar", category: "claim" },
      { claim: "regular", reason: "Implies direct regulatory action on body systems. Must be conditional.", severity: "moderate", replacement: "puede ayudar a equilibrar", category: "claim" },
      { claim: "equilibrar", reason: "When used as claim of outcome, must be conditional.", severity: "low", replacement: "puede ayudar a equilibrar", category: "claim" },
      { claim: "detoxificar", reason: "Implies removal of toxins. Must have acceptable evidence.", severity: "high", replacement: "puede ayudar a apoyar los procesos naturales del cuerpo", category: "claim" },
      { claim: "desintoxicar", reason: "Implies removal of toxins. Must have acceptable evidence.", severity: "high", replacement: "puede ayudar a apoyar los procesos naturales del cuerpo", category: "claim" },

      // ─── Urgencia artificial (Sección 4.5) ───
      { claim: "act now", reason: "Creates artificial urgency linked to health. Prohibited under s.133(1)(e)", severity: "high", replacement: "consulta con tu terapeuta cuando estes listo", category: "urgency" },
      { claim: "don't delay", reason: "Creates artificial urgency. Prohibited under s.133(1)(e)", severity: "high", replacement: "consulta con tu terapeuta", category: "urgency" },
      { claim: "time is running out", reason: "Creates artificial urgency. Prohibited under s.133(1)(e)", severity: "high", replacement: "consulta con tu terapeuta", category: "urgency" },
      { claim: "limited time only", reason: "Creates artificial urgency for health service. Prohibited under s.133(1)(e)", severity: "high", replacement: "consulta con tu terapeuta", category: "urgency" },
      { claim: "antes de que sea demasiado tarde", reason: "Urgencia artificial vinculada a salud. Prohibido s.133(1)(e)", severity: "high", replacement: "cuando estes listo para consultar", category: "urgency" },
      { claim: "no esperes mas", reason: "Urgencia artificial vinculada a salud. Prohibido s.133(1)(e)", severity: "high", replacement: "cuando estes listo para consultar", category: "urgency" },
      { claim: "ultima oportunidad", reason: "Urgencia artificial vinculada a salud. Prohibido s.133(1)(e)", severity: "high", replacement: "cuando estes listo para consultar", category: "urgency" },

      // ─── Testimonios (Sección 4.3) ───
      { claim: "testimonio", reason: "Testimonials about clinical aspects prohibited in advertising (s.133(1)(c))", severity: "high", replacement: "[REMOVER - Testimonio no permitido]", category: "testimonial" },
      { claim: "testimonial", reason: "Testimonials about clinical aspects prohibited in advertising (s.133(1)(c))", severity: "high", replacement: "[REMOVER - Testimonial no permitido]", category: "testimonial" },
      { claim: "success story", reason: "Patient stories about outcomes are testimonials. Prohibited s.133(1)(c)", severity: "high", replacement: "[REMOVER]", category: "testimonial" },
      { claim: "historia de exito", reason: "Testimonio sobre aspectos clinicos. Prohibido s.133(1)(c)", severity: "high", replacement: "[REMOVER]", category: "testimonial" },

      // ─── Claims de exclusividad (Sección 4.4) ───
      { claim: "exclusive", reason: "Implies unique skill/remedy. Prohibited under s.133(1)(d)", severity: "high", replacement: "part of a personalised approach", category: "claim" },
      { claim: "unique", reason: "Implies exclusive benefit. Must be factual.", severity: "moderate", replacement: "personalised", category: "claim" },
      { claim: "secret", reason: "Implies hidden knowledge. Misleading under s.133(1)(a)", severity: "high", replacement: "traditional approach", category: "claim" },
      { claim: "único", reason: "Implies exclusividad. Debe ser factual.", severity: "moderate", replacement: "personalizado", category: "claim" },
      { claim: "exclusivo", reason: "Implies habilidad unica. Prohibido s.133(1)(d)", severity: "high", replacement: "parte de un enfoque personalizado", category: "claim" },

      // ─── Claims sin evidencia (Sección 4.1.1) ───
      { claim: "clinically proven", reason: "Must be supported by acceptable evidence (peer-reviewed RCTs). s.133(1)(a)", severity: "high", replacement: "based on traditional use", category: "claim" },
      { claim: "scientifically proven", reason: "Must be supported by acceptable evidence. s.133(1)(a)", severity: "high", replacement: "based on traditional use and emerging research", category: "claim" },
      { claim: "evidence-based", reason: "Must specify the evidence. Vague claims prohibited. s.133(1)(a)", severity: "moderate", replacement: "informed by traditional knowledge", category: "claim" },
      { claim: "comprobado clinicamente", reason: "Requiere evidencia aceptable. s.133(1)(a)", severity: "high", replacement: "basado en uso tradicional", category: "claim" },
      { claim: "cientificamente probado", reason: "Requiere evidencia aceptable. s.133(1)(a)", severity: "high", replacement: "basado en uso tradicional e investigacion emergente", category: "claim" },
    ],
    titleProtection: {
      protectedTitles: [
        "medical practitioner", "doctor", "physician", "surgeon", 
        "specialist", "consultant", "registrar", "registrada"
      ]
    },
    urgencyPhrases: [
      "act now", "don't delay", "time is running out", "limited time only",
      "antes de que sea demasiado tarde", "no esperes mas", "ultima oportunidad"
    ]
  },
  scopeOfPractice: {
    // ─── Procedimientos prohibidos para MTC no médico en Australia ───
    prohibitedProcedures: [
      { procedure: "diagnosticar enfermedades occidentales", reason: "Los practicantes de MTC no pueden diagnosticar condiciones médicas occidentales (AHPRA Scope of Practice)", severity: "absolute" },
      { procedure: "prescribir medicamentos farmacéuticos", reason: "Fuera del scope. Solo médicos registrados pueden prescribir farmacos (National Law)", severity: "absolute" },
      { procedure: "inyecciones intravenosas", reason: "Procedimiento invasivo prohibido para practicantes de MTC no médicos", severity: "absolute" },
      { procedure: "cirugia menor", reason: "Fuera del scope de práctica de MTC", severity: "absolute" },
      { procedure: "interpretar radiografias", reason: "Radiología requiere registro médico específico", severity: "high" },
      { procedure: "prescribir imagenes diagnosticas", reason: "Solicitud de imagenología requiere ser médico registrado", severity: "high" },
      { procedure: "administrar anestesia", reason: "Procedimiento restringido a anestesistas médicos", severity: "absolute" },
      { procedure: "practicar moxibustion directa sobre piel lesionada", reason: "Riesgo de quemadura. Debe ser indirecta o con supervisión médica si hay lesión cutánea", severity: "high" },
      { procedure: "ventosas sobre heridas abiertas", reason: "Riesgo de infección. Contraindicado absoluto", severity: "absolute" },
      { procedure: "acupuntura sobre tumores no diagnosticados", reason: "Puede propagar células malignas. Requiere diagnóstico médico previo", severity: "absolute" },
      { procedure: "acupuntura durante hemorragia activa", reason: "Contraindicado hasta estabilización médica", severity: "high" },
    ],
    // ─── Derivación obligatoria (red flags médicas) ───
    mandatoryReferral: {
      conditions: [
        { condition: "dolor toracico agudo", reason: "Posible evento cardiovascular. Derivación inmediata a emergencias", severity: "absolute", to: "emergency_department" },
        { condition: "dificultad respiratoria severa", reason: "Posible emergencia respiratoria", severity: "absolute", to: "emergency_department" },
        { condition: "perdida de conciencia", reason: "Emergencia neurológica", severity: "absolute", to: "emergency_department" },
        { condition: "hemorragia inexplicada", reason: "Puede indicar coagulopatía o neoplasia", severity: "absolute", to: "medical_practitioner" },
        { condition: "perdida de peso rapida e inexplicada", reason: "Red flag para cáncer, hipertiroidismo, diabetes", severity: "high", to: "medical_practitioner" },
        { condition: "masa palpable o bulto", reason: "Requiere diagnóstico médico (biopsia, imagen) antes de MTC", severity: "high", to: "medical_practitioner" },
        { condition: "sangre en heces", reason: "Red flag gastrointestinal (cáncer colorrectal, hemorroides severas)", severity: "high", to: "medical_practitioner" },
        { condition: "sangre en orina", reason: "Red flag urológica/nefrológica", severity: "high", to: "medical_practitioner" },
        { condition: "dolor de cabeza thunderclap", reason: "Posible hemorragia subaracnoidea", severity: "absolute", to: "emergency_department" },
        { condition: "paralisis o debilidad unilateral", reason: "Posible ACV", severity: "absolute", to: "emergency_department" },
        { condition: "vision borrosa repentina", reason: "Posible glaucoma agudo, desprendimiento de retina, ACV", severity: "absolute", to: "emergency_department" },
        { condition: "fiebre persistente > 39°C", reason: "Posible sepsis o infección severa", severity: "high", to: "medical_practitioner" },
        { condition: "embarazo de alto riesgo", reason: "Requiere supervisión obstétrica conjunta", severity: "high", to: "obstetrician" },
        { condition: "dolor abdominal severo en embarazo", reason: "Posible emergencia obstétrica (ectópico, aborto)", severity: "absolute", to: "emergency_department" },
        { condition: "sintomas neurológicos progresivos", reason: "Posible esclerosis múltiple, tumor, enfermedad degenerativa", severity: "high", to: "neurologist" },
        { condition: "traumatismo craneoencefalico", reason: "Requiere evaluación médica antes de cualquier intervención", severity: "absolute", to: "emergency_department" },
      ]
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════
// CARGA DE REGLAS
// ═══════════════════════════════════════════════════════════════════════

function loadAhpraRules(): any {
  if (!fs.existsSync(AHPRA_RULES_PATH)) {
    console.warn("[AHPRA Filter] Rules file not found:", AHPRA_RULES_PATH, "- usando reglas embebidas v2.2");
    return EMBEDDED_RULES;
  }
  try {
    const raw = fs.readFileSync(AHPRA_RULES_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    // Merge con reglas embebidas para asegurar cobertura completa
    if (!parsed.advertisingRestrictions?.prohibitedClaims?.length) {
      parsed.advertisingRestrictions = { ...EMBEDDED_RULES.advertisingRestrictions, ...parsed.advertisingRestrictions };
    }
    return parsed;
  } catch (e) {
    console.warn("[AHPRA Filter] Error cargando reglas, usando embebidas:", e);
    return EMBEDDED_RULES;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SCANNER
// ═══════════════════════════════════════════════════════════════════════

export function scanTextForAHPRA(text: string, location: "empathic_content" | "original_input" | "forensic_content" = "empathic_content"): AhpraScanResult {
  const rules = loadAhpraRules();
  const flags: AHPRAFlag[] = [];
  const textLower = text.toLowerCase();

  // ─── Scan de claims prohibidos ───
  const prohibitedClaims = rules?.advertisingRestrictions?.prohibitedClaims || EMBEDDED_RULES.advertisingRestrictions.prohibitedClaims;

  for (const claim of prohibitedClaims) {
    const claimLower = claim.claim.toLowerCase();

    // Match exacto o como palabra completa
    const regex = new RegExp(`\\b${claimLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi");

    if (regex.test(textLower)) {
      const severity = claim.severity === "absolute" ? "CRITICAL" : 
                       claim.severity === "high" ? "WARNING" : "ADVISORY";

      flags.push({
        ruleId: `AHPRA-${claim.category.toUpperCase()}-${claim.claim.substring(0, 3).toUpperCase()}`,
        term: claim.claim,
        location,
        severity,
        replacement: claim.replacement || "[REMOVER O SUSTITUIR]",
        reason: claim.reason,
      });
    }
  }

  // ─── Scan de títulos protegidos ───
  const protectedTitles = rules?.advertisingRestrictions?.titleProtection?.protectedTitles || 
                          EMBEDDED_RULES.advertisingRestrictions.titleProtection.protectedTitles;

  for (const title of protectedTitles) {
    const titleRegex = new RegExp(`\\b${title.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "g");
    if (titleRegex.test(textLower)) {
      flags.push({
        ruleId: `AHPRA-TITLE-${title.toUpperCase().replace(/\s+/g, "-")}`,
        term: title,
        location,
        severity: "WARNING",
        replacement: "practitioner de Medicina China registrado",
        reason: `Title protection: "${title}" is a protected title under the National Law`,
      });
    }
  }

  // ─── Scan de frases de urgencia ───
  const urgencyPhrases = rules?.advertisingRestrictions?.urgencyPhrases || 
                         EMBEDDED_RULES.advertisingRestrictions.urgencyPhrases;

  for (const phrase of urgencyPhrases) {
    if (textLower.includes(phrase.toLowerCase())) {
      flags.push({
        ruleId: `AHPRA-URGENCY-${phrase.substring(0, 3).toUpperCase()}`,
        term: phrase,
        location,
        severity: "WARNING",
        replacement: "consulta con tu terapeuta cuando estes listo",
        reason: "Encourages indiscriminate or unnecessary use through artificial urgency (s.133(1)(e))",
      });
    }
  }

  // ─── Scan de claims implícitos (patrones de lenguaje) ───
  // Detecta "trabajan para [verbo de resultado]" como claim directo
  const implicitPatterns = [
    { pattern: /trabajan para (\w+)/gi, reason: "Implies direct causation of benefit. Use conditional language.", severity: "ADVISORY" as const },
    { pattern: /ayudan a (\w+)/gi, reason: "OK if conditional, but verify context.", severity: "ADVISORY" as const },
    { pattern: /mejoran (\w+)/gi, reason: "Implies direct improvement. Use 'may help improve'.", severity: "ADVISORY" as const },
  ];

  for (const { pattern, reason, severity } of implicitPatterns) {
    let match;
    while ((match = pattern.exec(textLower)) !== null) {
      // Solo flaggear si el verbo no está precedido de "pueden" o "puede"
      const beforeMatch = textLower.substring(Math.max(0, match.index - 30), match.index);
      if (!beforeMatch.includes("pueden") && !beforeMatch.includes("puede") && !beforeMatch.includes("pueda")) {
        flags.push({
          ruleId: `AHPRA-IMPLICIT-${match[1].substring(0, 3).toUpperCase()}`,
          term: match[0],
          location,
          severity,
          replacement: `pueden ${match[1]}`,
          reason,
        });
      }
    }
  }

  return {
    flags,
    clean: flags.length === 0,
    summary: flags.length > 0 
      ? `AHPRA: ${flags.length} violation(s) detected (${flags.filter(f => f.severity === "CRITICAL").length} critical)` 
      : "AHPRA: clean",
  };
}

// ═══════════════════════════════════════════════════════════════════════
// SANITIZADOR
// ═══════════════════════════════════════════════════════════════════════

export function sanitizeForAHPRA(text: string): { sanitized: string; changes: string[] } {
  const rules = loadAhpraRules();
  const changes: string[] = [];
  let sanitized = text;

  const prohibitedClaims = rules?.advertisingRestrictions?.prohibitedClaims || 
                           EMBEDDED_RULES.advertisingRestrictions.prohibitedClaims;

  for (const claim of prohibitedClaims) {
    const claimLower = claim.claim.toLowerCase();
    const regex = new RegExp(`\\b${claimLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi");

    if (regex.test(sanitized.toLowerCase())) {
      const replacement = claim.replacement || "[término no permitido por AHPRA]";
      sanitized = sanitized.replace(regex, replacement);
      changes.push(`"${claim.claim}" → "${replacement}" (${claim.severity})`);
    }
  }

  // Sanitizar patrones implícitos
  sanitized = sanitized.replace(/trabajan para (\w+)/gi, "se utilizan tradicionalmente para apoyar $1");
  sanitized = sanitized.replace(/mejoran (\w+)/gi, "pueden ayudar a mejorar $1");

  return { sanitized, changes };
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDADOR DE PDF
// ═══════════════════════════════════════════════════════════════════════

export function validatePdfForAHPRA(htmlContent: string): { valid: boolean; flags: AHPRAFlag[]; criticalCount: number } {
  const scan = scanTextForAHPRA(htmlContent, "empathic_content");
  const criticalFlags = scan.flags.filter(f => f.severity === "CRITICAL");

  return {
    valid: criticalFlags.length === 0,
    flags: scan.flags,
    criticalCount: criticalFlags.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDADOR DE SCOPE OF PRACTICE
// ═══════════════════════════════════════════════════════════════════════

export function validateScopeOfPractice(text: string): { violations: any[]; requiresReferral: boolean } {
  const rules = loadAhpraRules();
  const violations: any[] = [];
  const textLower = text.toLowerCase();

  const prohibited = rules?.scopeOfPractice?.prohibitedProcedures || [];
  for (const proc of prohibited) {
    if (textLower.includes(proc.procedure.toLowerCase())) {
      violations.push({
        type: "SCOPE_VIOLATION",
        procedure: proc.procedure,
        reason: proc.reason,
        severity: proc.severity,
      });
    }
  }

  const mandatory = rules?.scopeOfPractice?.mandatoryReferral?.conditions || [];
  let requiresReferral = false;
  for (const cond of mandatory) {
    if (textLower.includes(cond.condition.toLowerCase())) {
      violations.push({
        type: "MANDATORY_REFERRAL",
        condition: cond.condition,
        reason: cond.reason,
        severity: cond.severity,
        referTo: cond.to,
      });
      requiresReferral = true;
    }
  }

  return { violations, requiresReferral };
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDADOR TGA (Therapeutic Goods Administration)
// Para claims sobre productos herbales en Australia
// ═══════════════════════════════════════════════════════════════════════

export function validateTGAClaims(text: string): { flags: AHPRAFlag[]; compliant: boolean } {
  const flags: AHPRAFlag[] = [];
  const textLower = text.toLowerCase();

  // TGA: No therapeutic claims sin registro
  const tgaProhibited = [
    { term: "trata la diabetes", reason: "TGA: Claim terapéutico sobre enfermedad crónica sin registro como medicamento", severity: "CRITICAL" as const },
    { term: "cura la hipertension", reason: "TGA: Claim de cura sobre condición médica. Requiere registro ARTG", severity: "CRITICAL" as const },
    { term: "cura la diabetes", reason: "TGA: Claim de cura sobre condición médica. Requiere registro ARTG", severity: "CRITICAL" as const },
    { term: "previene el cancer", reason: "TGA: Claim preventivo sobre enfermedad grave sin evidencia aceptable", severity: "CRITICAL" as const },
    { term: "antibiotico natural", reason: "TGA: Implica propiedad farmacológica no demostrada", severity: "WARNING" as const },
    { term: "esteroide natural", reason: "TGA: Implica acción farmacológica específica no registrada", severity: "WARNING" as const },
    { term: "reemplaza tu medicacion", reason: "TGA: No puede recomendar abandono de medicación prescrita", severity: "CRITICAL" as const },
    { term: "deja los farmacos", reason: "TGA: Contraindicado. Nunca abandonar medicación sin médico", severity: "CRITICAL" as const },
    { term: "sustituye tu medicacion", reason: "TGA: No puede recomendar sustitución de medicación prescrita", severity: "CRITICAL" as const },
  ];

  for (const rule of tgaProhibited) {
    if (textLower.includes(rule.term.toLowerCase())) {
      flags.push({
        ruleId: `TGA-${rule.term.substring(0, 3).toUpperCase()}`,
        term: rule.term,
        location: "empathic_content",
        severity: rule.severity,
        replacement: "[REMOVER - Claim no permitido por TGA]",
        reason: rule.reason,
      });
    }
  }

  return { flags, compliant: flags.length === 0 };
}
