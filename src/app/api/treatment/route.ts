// src/app/api/treatment/route.ts
// API Route de Tratamiento — RAG + KANT + FUKUOKA-H + FOUCAULT + EHR v2.2
// FIX: Compatibilidad con payload del nuevo frontend (symptoms en consultation, pregnancy en patient)

import { NextRequest, NextResponse } from 'next/server';
import { KantEngine } from '@/lib/kant/engine';
import { buildRAGContext } from '@/lib/rag/contextBuilder';
import { generateTreatment } from '@/lib/fukuoka-h/engine';
import { deidentifyPatient } from '@/lib/privacy/deidentify';
import { generateDoublePdf } from '@/lib/foucault/engine';
import { saveConsultation, saveFoucaultPDFs } from '@/lib/ehr/store';
import { type NewConsultation } from '@/lib/ehr/schema';
import { type KantResult } from '@/lib/kant/types';

// ═══════════════════════════════════════════════════════════════════════
// INTERFACES — Alineadas con el frontend v2.2
// ═══════════════════════════════════════════════════════════════════════

export interface TreatmentRequest {
  patient: {
    name: string;
    dob: string;
    gender: string;
    pregnancy?: boolean;
    history?: string;
    medicalHistory?: string;        // ← compatibilidad legacy
    diagnosis?: string;
    medications?: string[];
    allergies?: string[];
    symptoms?: string;              // ← compatibilidad legacy
    safetyAlerts?: Record<string, boolean>; // ← compatibilidad legacy
  };
  consultation: {
    goal: string;
    tongue?: string;
    pulse?: string;
    symptoms?: string;
    ryodoraku?: Record<string, number>;
    preferences?: string[];
    safetyAlerts?: Record<string, boolean>; // ← nuevo frontend v2.2
  };
}

// ═══════════════════════════════════════════════════════════════════════
// ADAPTADOR KANT → FOUCAULT
// ═══════════════════════════════════════════════════════════════════════

function adaptKantForFoucault(kantResult: KantResult): any {
  const statusMap: Record<string, string> = {
    green: 'VERDE',
    yellow: 'AMARILLO',
    red: 'ROJO',
  };

  const violations: any[] = [];

  for (const alert of kantResult.alerts || []) {
    violations.push({
      ruleId: alert.code,
      severity: alert.severity === 'absolute' ? 'ROJO' : alert.severity === 'high' ? 'ROJO' : 'AMARILLO',
      category: alert.category.toUpperCase() as 'ACUPUNCTURE' | 'HERBAL' | 'GENERAL',
      message: alert.message,
    });
  }

  for (const contraindication of kantResult.contraindications || []) {
    violations.push({
      ruleId: `KANT-CONTRA-${contraindication.type.toUpperCase()}`,
      severity: contraindication.severity === 'absolute' ? 'ROJO' : contraindication.severity === 'high' ? 'ROJO' : 'AMARILLO',
      category: contraindication.type === 'herb' ? 'HERBAL' : contraindication.type === 'point' ? 'ACUPUNCTURE' : 'GENERAL',
      message: contraindication.reason,
    });
  }

  return {
    verdict: statusMap[kantResult.status] || 'VERDE',
    status: kantResult.status,
    score: kantResult.score,
    alerts: kantResult.alerts,
    contraindications: kantResult.contraindications,
    clearedForTreatment: kantResult.clearedForTreatment,
    requiresSupervision: kantResult.requiresSupervision,
    requiresPhysicianClearance: kantResult.requiresPhysicianClearance,
    auditTrail: kantResult.auditTrail,
    violations,
    totalRulesChecked: kantResult.auditTrail?.length || 0,
    evaluatedAt: new Date().toISOString(),
    engineVersion: 'KANT-v2.2',
    originalProposalHash: '',
  };
}

// ═══════════════════════════════════════════════════════════════════════
// DIÁLOGO FUKUOKA-H ↔ KANT
// ═══════════════════════════════════════════════════════════════════════

type KantVerdict = 'PASS' | 'FAIL_SOFT' | 'FAIL_HARD';

interface DialogueRound {
  attempt: number;
  fukuokaProposal: any;
  kantResult: KantResult;
  verdict: KantVerdict;
  feedback: string;
}

function evaluateKantVerdict(kantResult: KantResult): { verdict: KantVerdict; feedback: string } {
  // FAIL_HARD: Contraindicaciones absolutas
  if (kantResult.contraindications?.some((c: any) => c.severity === 'absolute')) {
    return {
      verdict: 'FAIL_HARD',
      feedback: `CONTRAINDICACIÓN ABSOLUTA: ${kantResult.contraindications
        .filter((c: any) => c.severity === 'absolute')
        .map((c: any) => c.reason)
        .join('; ')}. Este tratamiento no puede ser administrado bajo ninguna circunstancia.`
    };
  }

  // FAIL_HARD: Score crítico (≥ 70)
  if (kantResult.status === 'red' && (kantResult.score || 0) >= 70) {
    return {
      verdict: 'FAIL_HARD',
      feedback: `RIESGO CRÍTICO: Score de seguridad ${kantResult.score}/100. ${kantResult.alerts
        ?.filter((a: any) => a.severity === 'high' || a.severity === 'absolute')
        .map((a: any) => a.message)
        .join('; ')}. Requiere evaluación médica directa.`
    };
  }

  // FAIL_SOFT: Status red o yellow con problemas corregibles
  if (kantResult.status === 'red' || kantResult.status === 'yellow') {
    const feedbackParts: string[] = [];

    if (kantResult.contraindications?.length > 0) {
      feedbackParts.push(`CONTRAINDICACIONES: ${kantResult.contraindications
        .map((c: any) => `${c.item} → ${c.reason} (alternativa: ${c.alternative || 'consultar manual'})`)
        .join('; ')}`);
    }

    if (kantResult.alerts?.length > 0) {
      feedbackParts.push(`ALERTAS: ${kantResult.alerts
        .map((a: any) => `${a.message} (${a.recommendation || 'revisar'})`)
        .join('; ')}`);
    }

    return {
      verdict: 'FAIL_SOFT',
      feedback: feedbackParts.join('\n')
    };
  }

  // PASS: Todo verde
  return {
    verdict: 'PASS',
    feedback: 'Tratamiento validado por KANT. Proceder a documentación.'
  };
}

function buildFukuokaPrompt(
  patient: any,
  consultation: any,
  kantProfile: any,
  ragContext: any,
  previousAttempt?: DialogueRound
): { systemPrompt: string; userPrompt: string } {

  const baseSystemPrompt = `Eres FUKUOKA-H, asistente clínico de Medicina Tradicional China con nivel de maestro (Van Nghi, Nogueira).

REGLAS DE SEGURIDAD (KANT):
${kantProfile.auditTrail?.join('\n') || 'Sin advertencias previas'}
${kantProfile.contraindications?.length > 0 ? '\nCONTRAINDICACIONES ACTIVAS:\n' + kantProfile.contraindications.map((c: any) => `- ${c.item}: ${c.reason}`).join('\n') : ''}

CONTEXTO DOCUMENTAL (basado en evidencia):
${ragContext.context}

Instrucciones:
1. Analiza el patrón (síndrome) según teoría Zang-Fu
2. Propone puntos de acupuntura con localización anatómica precisa
3. Propone fórmula/herbas con dosis seguras (referencia Bensky/Chen)
4. Justifica cada decisión con rationale clínico
5. Cita las fuentes usando los IDs proporcionados

Responde ÚNICAMENTE en JSON válido con esta estructura:
{
  "syndrome": "string",
  "points": [{"name":"string","location":"string","indication":"string"}],
  "herbs": [{"name":"string","dose":"string","preparation":"string"}],
  "rationale": "string"
}`;

  const feedbackPrompt = previousAttempt
    ? `\n\n═══ FEEDBACK DEL SUPERVISOR KANT (Intento ${previousAttempt.attempt}) ═══\nKANT rechazó la propuesta anterior con el siguiente veredicto: ${previousAttempt.verdict}\n\nPROBLEMAS DETECTADOS:\n${previousAttempt.feedback}\n\nReformula el tratamiento corrigiendo EXACTAMENTE estos problemas. Mantén la coherencia clínica.`
    : '';

  const systemPrompt = baseSystemPrompt + feedbackPrompt;

  const userPrompt = `DATOS DEL PACIENTE:
- Síntomas: ${consultation.symptoms || patient.symptoms || 'No especificado'}
- Edad: ${calculateAge(patient.dob)} años
- Sexo: ${patient.gender}
- Objetivo: ${consultation.goal}
${patient.diagnosis ? `- Diagnóstico previo: ${patient.diagnosis}` : ''}
${patient.history ? `- Historial médico: ${patient.history}` : ''}
${patient.medications?.length ? `- Fármacos actuales: ${patient.medications.join(', ')}` : ''}`;

  return { systemPrompt, userPrompt };
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/** Extrae síntomas del payload con fallback para compatibilidad legacy */
function getSymptoms(body: TreatmentRequest): string {
  return (body.consultation?.symptoms || body.patient?.symptoms || '').trim();
}

/** Extrae embarazo del payload con múltiples fuentes */
function getPregnancy(body: TreatmentRequest): boolean {
  return !!(
    body.patient?.pregnancy ||
    body.consultation?.safetyAlerts?.pregnancy ||
    body.patient?.safetyAlerts?.pregnancy
  );
}

/** Extrae alertas de seguridad del payload con múltiples fuentes */
function getSafetyAlerts(body: TreatmentRequest): Record<string, boolean> {
  const fromConsultation = body.consultation?.safetyAlerts || {};
  const fromPatient = body.patient?.safetyAlerts || {};
  return {
    pregnancy: getPregnancy(body),
    bleedingDisorder: !!(fromConsultation.bleedingDisorder || fromPatient.bleedingDisorder),
    pacemaker: !!(fromConsultation.pacemaker || fromPatient.pacemaker),
    immunodeficiency: !!(fromConsultation.immunodeficiency || fromPatient.immunodeficiency),
    epilepsy: !!(fromConsultation.epilepsy || fromPatient.epilepsy),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// POST HANDLER
// ═══════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const consultationDate = new Date().toISOString();
  const dialogueHistory: DialogueRound[] = [];

  try {
    const body: TreatmentRequest = await req.json();
    const { patient, consultation } = body;

    // ─── Normalizar campos críticos (nunca undefined para la DB) ───
    const symptoms = getSymptoms(body);
    const safetyAlerts = getSafetyAlerts(body);
    const tongue = consultation?.tongue || '';
    const pulse = consultation?.pulse || '';
    const ryodoraku = consultation?.ryodoraku || {};
    const medicalHistory = patient?.history || patient?.medicalHistory || '';

    // ═══════════════════════════════════════════════════════════════
    // PASO 0: Anonimización y perfil de seguridad base
    // ═══════════════════════════════════════════════════════════════

    const anonymized = deidentifyPatient({
      name: patient.name,
      dob: patient.dob,
      symptoms,
      medicalHistory
    });

    const kantBase = new KantEngine();
    const safetyProfile: any = {
      pregnancy: safetyAlerts.pregnancy,
      pacemaker: safetyAlerts.pacemaker,
      epilepsy: safetyAlerts.epilepsy || false,
      anticoagulants: safetyAlerts.bleedingDisorder ? ['anticoagulant'] : [],
      antiplatelets: safetyAlerts.bleedingDisorder ? ['antiplatelet'] : [],
      currentPharmaceuticals: patient.medications || [],
      age: calculateAge(patient.dob),
      allergies: patient.allergies || [],
      medicalHistory
    };

    // Evaluación base del paciente (sin tratamiento propuesto aún)
    const baseKantResult = kantBase.evaluate(safetyProfile);

    // Si el perfil base ya es crítico, bloqueo inmediato
    if (baseKantResult.status === 'red' && (baseKantResult.score || 0) >= 80) {
      return NextResponse.json({
        error: 'SAFETY_BLOCKED_BASELINE',
        message: 'El perfil del paciente presenta riesgos de seguridad que impiden cualquier tratamiento automatizado.',
        safety: baseKantResult,
        timestamp: consultationDate
      }, { status: 403 });
    }

    // RAG (se hace una sola vez, antes del diálogo)
    const ragQuery = `${symptoms} ${patient.diagnosis || ''} ${consultation.goal}`;
    const ragContext = await buildRAGContext({
      query: ragQuery,
      domain: 'mtc-core',
      maxChunks: 5,
      minSimilarity: 0.6
    });

    // ═══════════════════════════════════════════════════════════════
    // PASO 1-3: DIÁLOGO FUKUOKA-H ↔ KANT (máximo 3 intentos)
    // ═══════════════════════════════════════════════════════════════

    let finalProposal: any = null;
    let finalKantResult: KantResult = baseKantResult;
    let finalVerdict: KantVerdict = 'FAIL_HARD';
    let humanRequired = false;
    let humanReason = '';

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`[DIALOGO] Intento ${attempt}/3`);

      const previousRound = attempt > 1 ? dialogueHistory[dialogueHistory.length - 1] : undefined;
      const { systemPrompt, userPrompt } = buildFukuokaPrompt(
        patient,
        consultation,
        baseKantResult,
        ragContext,
        previousRound
      );

      // Fukuoka-H propone tratamiento
      const llmResponse = await generateTreatment({
        systemPrompt,
        userPrompt,
        model: process.env.LLM_MODEL || 'openai/gpt-3.5-turbo',
        temperature: attempt === 1 ? 0.7 : 0.5
      });

      // Construir propuesta estructurada para KANT
      const proposedTreatment = {
        points: llmResponse.points?.map((p: any) => p.name) || [],
        herbs: llmResponse.herbs?.map((h: any) => h.name) || [],
        techniques: ['acupuntura manual'],
        rationale: llmResponse.rationale || ''
      };

      // KANT evalúa el perfil del paciente + la propuesta concreta
      const kantEvaluator = new KantEngine();
      const kantResult = kantEvaluator.evaluate(
        safetyProfile,
        proposedTreatment,
        `${llmResponse.syndrome} ${llmResponse.rationale}`
      );

      const { verdict, feedback } = evaluateKantVerdict(kantResult);

      const round: DialogueRound = {
        attempt,
        fukuokaProposal: llmResponse,
        kantResult,
        verdict,
        feedback
      };
      dialogueHistory.push(round);

      console.log(`[DIALOGO] Intento ${attempt}: ${verdict} | Score: ${kantResult.score} | Alerts: ${kantResult.alerts?.length || 0} | Contras: ${kantResult.contraindications?.length || 0}`);

      if (verdict === 'PASS') {
        finalProposal = llmResponse;
        finalKantResult = kantResult;
        finalVerdict = verdict;
        break;
      }

      if (verdict === 'FAIL_HARD') {
        finalKantResult = kantResult;
        finalVerdict = verdict;
        humanRequired = true;
        humanReason = feedback;
        break;
      }

      if (verdict === 'FAIL_SOFT' && attempt === 3) {
        finalProposal = llmResponse;
        finalKantResult = kantResult;
        finalVerdict = verdict;
        humanRequired = true;
        humanReason = `KANT rechazó 3 propuestas consecutivas. Problemas persistentes: ${feedback}`;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // PASO 4: CONTROL HUMANO (si aplica)
    // ═══════════════════════════════════════════════════════════════

    if (humanRequired) {
      const ehrPending: NewConsultation = {
        patientHash: anonymized.patientHash,
        consultationDate,
        patientAge: calculateAge(patient.dob),
        patientGender: patient.gender,
        symptoms,                       // ← FIX: nunca undefined
        diagnosis: patient.diagnosis || '',
        syndrome: finalProposal?.syndrome || 'PENDIENTE_REVISION',
        points: finalProposal?.points || [],
        herbs: finalProposal?.herbs || [],
        rationale: humanReason,
        kantStatus: 'red',
        kantScore: finalKantResult.score,
        kantAlerts: finalKantResult.alerts || [],
        kantContraindications: finalKantResult.contraindications || [],
        kantAuditTrail: finalKantResult.auditTrail || [],
        ragCitations: ragContext.citations.map((c: any) => ({
          document: c.document,
          documentId: c.documentId || c.document,
          pageStart: c.pageStart,
          pageEnd: c.pageEnd,
          excerpt: c.excerpt
        })),
        llmModel: process.env.LLM_MODEL || 'openai/gpt-3.5-turbo',
        foucaultPdfPath: null,
        foucaultForensicHash: null,
        foucaultEmpathicHash: null,
        ahpraFlags: [],
        chainOfCustody: [
          `[${consultationDate}] CONTROL HUMANO REQUERIDO`,
          `[${consultationDate}] Razón: ${humanReason}`,
          `[${consultationDate}] Intentos Fukuoka-H: ${dialogueHistory.length}`,
          ...dialogueHistory.map(d => `[${consultationDate}] Intento ${d.attempt}: ${d.verdict} (score ${d.kantResult.score})`)
        ],
      };

      const ehrId = saveConsultation(ehrPending);

      return NextResponse.json({
        error: 'HUMAN_REQUIRED',
        message: 'El sistema no ha podido generar un tratamiento que cumpla con los filtros de seguridad.',
        reason: humanReason,
        dialogueHistory: dialogueHistory.map(d => ({
          attempt: d.attempt,
          verdict: d.verdict,
          feedback: d.feedback,
          kantScore: d.kantResult.score,
          kantStatus: d.kantResult.status
        })),
        lastProposal: finalProposal,
        safety: {
          status: finalKantResult.status,
          score: finalKantResult.score,
          alerts: finalKantResult.alerts,
          contraindications: finalKantResult.contraindications
        },
        ehr: {
          id: ehrId,
          patientHash: anonymized.patientHash,
          saved: true,
          status: 'PENDING_HUMAN_REVIEW'
        },
        timestamp: consultationDate
      }, { status: 422 });
    }

    // ═══════════════════════════════════════════════════════════════
    // PASO 5: FLUJO NORMAL (PASS) → Foucault + EHR
    // ═══════════════════════════════════════════════════════════════

    const kantForFoucault = adaptKantForFoucault(finalKantResult);

    let foucaultResult: any = null;
    let pdfPaths: any = null;
    let foucaultError: string | null = null;

    try {
      foucaultResult = await generateDoublePdf({
        patient: {
          id: anonymized.patientHash,
          age: calculateAge(patient.dob),
          sex: patient.gender as "M" | "F"
        },
        clinicalInput: {
          symptoms,
          pulse,
          tongue
        },
        fukuokaResult: {
          request_id: `ehr-${Date.now()}`,
          data: {
            syndrome_analysis: [{
              syndrome_name: finalProposal.syndrome,
              confidence: 0.85,
              supporting_evidence: ['Análisis Fukuoka-H v2.2']
            }],
            treatment_proposal: {
              acupuncture_points: finalProposal.points?.map((p: any) => p.name) || [],
              herbal_formula: finalProposal.herbs?.map((h: any) => h.name).join(', ') || null,
              rationale: finalProposal.rationale
            }
          }
        },
        kantResult: kantForFoucault,
        generatedAt: consultationDate
      });

      pdfPaths = saveFoucaultPDFs(
        anonymized.patientHash,
        consultationDate,
        foucaultResult.forensicPdfBase64,
        foucaultResult.empathicPdfBase64,
        foucaultResult.auditLog.documentHashes.forensic,
        foucaultResult.auditLog.documentHashes.empathic
      );
    } catch (err: any) {
      foucaultError = err.message;
      console.error('[FOUCAULT] Error:', err.message);
    }

    // Guardar en EHR
    const chainOfCustody = [
      `[${consultationDate}] Treatment API processed`,
      `[${consultationDate}] Diálogo Fukuoka-H ↔ KANT: ${dialogueHistory.length} intentos`,
      ...dialogueHistory.map(d => `[${consultationDate}] Intento ${d.attempt}: ${d.verdict} (score ${d.kantResult.score})`),
      `[${consultationDate}] Veredicto final: ${finalVerdict}`,
      `[${consultationDate}] RAG retrieved: ${ragContext.citations.length} citations`,
      `[${consultationDate}] LLM: ${process.env.LLM_MODEL || 'openai/gpt-3.5-turbo'}`
    ];

    if (foucaultResult) {
      chainOfCustody.push(`[${consultationDate}] Foucault PDFs generated`);
      chainOfCustody.push(`[${consultationDate}] Forensic hash: ${foucaultResult.auditLog.documentHashes.forensic}`);
      chainOfCustody.push(`[${consultationDate}] Empathic hash: ${foucaultResult.auditLog.documentHashes.empathic}`);
    }
    if (foucaultError) {
      chainOfCustody.push(`[${consultationDate}] Foucault ERROR: ${foucaultError}`);
    }

    const ehrRecord: NewConsultation = {
      patientHash: anonymized.patientHash,
      consultationDate,
      patientAge: calculateAge(patient.dob),
      patientGender: patient.gender,
      symptoms,                       // ← FIX: nunca undefined
      diagnosis: patient.diagnosis || '',
      syndrome: finalProposal.syndrome,
      points: finalProposal.points || [],
      herbs: finalProposal.herbs || [],
      rationale: finalProposal.rationale,
      kantStatus: finalKantResult.status,
      kantScore: finalKantResult.score,
      kantAlerts: finalKantResult.alerts || [],
      kantContraindications: finalKantResult.contraindications || [],
      kantAuditTrail: finalKantResult.auditTrail || [],
      ragCitations: ragContext.citations.map((c: any) => ({
        document: c.document,
        documentId: c.documentId || c.document,
        pageStart: c.pageStart,
        pageEnd: c.pageEnd,
        excerpt: c.excerpt
      })),
      llmModel: process.env.LLM_MODEL || 'openai/gpt-3.5-turbo',
      foucaultPdfPath: pdfPaths?.forensicPath || null,
      foucaultForensicHash: foucaultResult?.auditLog.documentHashes.forensic || null,
      foucaultEmpathicHash: foucaultResult?.auditLog.documentHashes.empathic || null,
      ahpraFlags: foucaultResult?.auditLog.ahpraFlags.map((f: any) => ({
        ruleId: f.ruleId,
        term: f.term,
        severity: f.severity
      })) || [],
      chainOfCustody,
    };

    const ehrId = saveConsultation(ehrRecord);

    return NextResponse.json({
      syndrome: finalProposal.syndrome,
      points: finalProposal.points,
      herbs: finalProposal.herbs,
      rationale: finalProposal.rationale,
      safety: {
        status: finalKantResult.status,
        alerts: finalKantResult.alerts || [],
        contraindications: finalKantResult.contraindications || [],
        auditTrail: finalKantResult.auditTrail || []
      },
      dialogue: {
        rounds: dialogueHistory.length,
        history: dialogueHistory.map(d => ({
          attempt: d.attempt,
          verdict: d.verdict,
          kantScore: d.kantResult.score,
          kantStatus: d.kantResult.status
        }))
      },
      citations: ragContext.citations.map((c: any) => ({
        document: c.document,
        pageStart: c.pageStart,
        pageEnd: c.pageEnd,
        excerpt: c.excerpt
      })),
      model: process.env.LLM_MODEL || 'openai/gpt-3.5-turbo',
      ehr: {
        id: ehrId,
        patientHash: anonymized.patientHash,
        saved: true,
        transaction: 'ACID',
      },
      foucault: foucaultResult ? {
        forensicHash: foucaultResult.auditLog.documentHashes.forensic,
        empathicHash: foucaultResult.auditLog.documentHashes.empathic,
        ahpraFlags: foucaultResult.auditLog.ahpraFlags,
        chainOfCustody: foucaultResult.auditLog.chainOfCustody,
        pdfs: {
          forensic: foucaultResult.forensicPdfBase64,
          empathic: foucaultResult.empathicPdfBase64
        }
      } : {
        error: foucaultError,
        status: 'FAILED'
      },
      timestamp: consultationDate
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Treatment API]', error);
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}