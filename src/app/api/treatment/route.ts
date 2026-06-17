// src/app/api/treatment/route.ts
// API Route de Tratamiento — CDSS MTC Premium v2.3 "Cerebro NotebookLM"
// v2.3: Prompt unificado narrativo + memoria clínica + PDFs narrativos
// FIX v3.0: Corregido orden de variables, ehrId consistente, campos NOT NULL completos

import { NextRequest, NextResponse } from 'next/server';
import { KantEngine } from '@/lib/kant/engine-compat';
import { buildRAGContext } from '@/lib/rag/contextBuilder';
import { generateTreatment, parseNotebookLMResponse } from '@/lib/fukuoka-h/engine';
import { deidentifyPatient } from '@/lib/privacy/deidentify';
import { saveConsultation, getLastConsultationByHash } from '@/lib/ehr/store';
import { type NewConsultation } from '@/lib/ehr/schema';
import { db } from '@/lib/ehr/db';
import { patients } from '@/lib/ehr/schema';
import { and, eq } from 'drizzle-orm';

function resolveEhrId(patient: TreatmentRequest['patient']): string {
  // 1. Si viene en el payload, usarlo directamente
  if (patient.patientId) return patient.patientId;
  
  // 2. Fallback: buscar en BD por nombre + DOB
  if (patient.name && patient.dob) {
    const found = db.select()
      .from(patients)
      .where(and(eq(patients.name, patient.name), eq(patients.dob, patient.dob)))
      .get();
    if (found) {
      console.log('[resolveEhrId] Fallback BD encontrado:', found.ehrId);
      return found.ehrId;
    }
  }
  
  console.warn('[resolveEhrId] No se pudo resolver ehrId para:', patient.name, patient.dob);
  return '';
}

// ═══════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════

export interface TreatmentRequest {
  patient: {
    name: string;
    dob: string;
    gender: string;
    patientId?: string;
    pregnancy?: boolean;
    history?: string;
    medicalHistory?: string;
    diagnosis?: string;
    medications?: string[];
    allergies?: string[];
    symptoms?: string;
    safetyAlerts?: Record<string, boolean>;
    tongue?: string;
    pulse?: string;
    ryodoraku?: Record<string, number>;
  };
  consultation: {
    goal: string;
    tongue?: string;
    pulse?: string;
    symptoms?: string;
    ryodoraku?: Record<string, number>;
    preferences?: string[];
    safetyAlerts?: Record<string, boolean>;
  };
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

function getSymptoms(body: TreatmentRequest): string {
  return (body.consultation?.symptoms || body.patient?.symptoms || '').trim();
}

function getPregnancy(body: TreatmentRequest): boolean {
  return !!(
    body.patient?.pregnancy ||
    body.consultation?.safetyAlerts?.pregnancy ||
    body.patient?.safetyAlerts?.pregnancy
  );
}

function getSafetyAlerts(body: TreatmentRequest): Record<string, boolean> {
  const fromConsultation = body.consultation?.safetyAlerts || {};
  const fromPatient = body.patient?.safetyAlerts || {};
  return {
    pregnancy: getPregnancy(body),
    bleedingDisorder: !!(fromConsultation.bleedingDisorder || fromPatient.bleedingDisorder),
    pacemaker: !!(fromConsultation.pacemaker || fromPatient.pacemaker),
    immunodeficiency: !!(fromConsultation.immunodeficiency || fromPatient.immunodeficiency),
    epilepsy: !!(fromConsultation.epilepsy || fromPatient.epilepsy),
    anticoagulants: !!(fromConsultation.anticoagulants || fromPatient.anticoagulants),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════

function buildNotebookLMPrompt(
  patient: any,
  consultation: any,
  kantProfile: any,
  ragContext: any,
  lastConsultation: any,
  previousAttempt?: any
): { systemPrompt: string; userPrompt: string } {

  const age = calculateAge(patient.dob);
  const isPregnant = patient.pregnancy;
  const symptoms = getSymptoms({ patient, consultation } as TreatmentRequest);

  const safetyBlocks: string[] = [];

  if (isPregnant) {
    safetyBlocks.push(`⚠️ EMBARAZO — RESTRICCIONES ABSOLUTAS:
- PUNTOS PROHIBIDOS (nunca proponer): SP6, LI4, GB21, CV3-CV7, BL60, BL67, SI1, ST12, GB26-GB30, BL31-34
- HIERBAS PROHIBIDAS: Fu Zi, Chuan Wu, Cao Wu, Ban Xia, Tian Nan Xing, Ba Dou, Qian Niu Zi, Gan Sui, Yuan Hua, Jing Da Ji, Shang Lu, She Xiang, Bing Lang, Lei Wan, Wu Gong, Quan Xie, Zhu Sha, Xiong Huang, Qing Fen
- TÉCNICAS SEGURAS: Acupuntura manual superficial, moxibustión indirecta, tuina suave, auriculoterapia con semillas
- ZONAS SEGURAS: Extremidades superiores, espalda alta (>L3), puntos distales tipo ST36, SP9, PC6, Yintang`);
  }

  if (patient.safetyAlerts?.pacemaker) {
    safetyBlocks.push(`⚠️ MARCAPASOS — PROHIBIDO: Electroacupuntura, TENS, laseracupuntura alta potencia, magnetoterapia, sangrado. PERMITIDO: Acupuntura manual, moxibustión, ventosas secas.`);
  }

  if (patient.medications?.some((m: string) => /warfarina|apixaban|rivaroxaban|dabigatrán|edoxaban|heparina/i.test(m))) {
    safetyBlocks.push(`⚠️ ANTICOAGULANTE — Evitar punción profunda, zonas de riesgo de hematoma. No sangrado intencional. Punción superficial 0.20mm permitida.`);
  }

  if (patient.safetyAlerts?.epilepsy) {
    safetyBlocks.push(`⚠️ EPILEPSIA — PROHIBIDO: Electroacupuntura >100Hz en cabeza/cara, láser alta intensidad. PRECAUCIÓN: Puntos craneales DU20, GB20, EX-HN1 (punción superficial).`);
  }

  if (age < 7) {
    safetyBlocks.push(`⚠️ PEDIÁTRICO (${age}a) — Preferir shonishin, masaje tuina, moxa indirecta, auriculoterapia con semillas.`);
  } else if (age < 12) {
    safetyBlocks.push(`⚠️ PEDIÁTRICO (${age}a) — Agujas 0.16-0.20mm, retención máxima 10-15 min. Evitar fontanela anterior.`);
  }

  const safetyPrefix = safetyBlocks.length > 0
    ? `\n\n═══════════════════════════════════════════════════\nPROTOCOLOS DE SEGURIDAD ACTIVOS (incumplimiento = rechazo automático):\n${safetyBlocks.join('\n\n')}\n═══════════════════════════════════════════════════\n`
    : '';

  let memoryBlock = '';
  if (lastConsultation) {
    memoryBlock = `\n\n═══════════════════════════════════════════════════\nMEMORIA CLÍNICA — CONSULTA ANTERIOR (${lastConsultation.consultationDate}):
- Síndrome previo: ${lastConsultation.syndrome || 'No registrado'}
- Puntos utilizados: ${lastConsultation.points ? lastConsultation.points.map((p: any) => p.name || p).join(', ') : 'No registrado'}
- Evolución registrada: ${lastConsultation.evolutionNotes || 'Sin notas de evolución'}
- Resumen técnico previo: ${lastConsultation.summarySectionB ? lastConsultation.summarySectionB.substring(0, 300) + '...' : 'No disponible'}
═══════════════════════════════════════════════════\n`;
  }

  const feedbackBlock = previousAttempt
    ? `\n\n═══ FEEDBACK DEL SUPERVISOR KANT (Intento ${previousAttempt.attempt}) ═══\nVeredicto: ${previousAttempt.verdict}\nProblemas: ${previousAttempt.feedback}\n\nReformula el tratamiento corrigiendo EXACTAMENTE estos problemas. Elimina puntos/herbas/técnicas prohibidas. Mantén coherencia clínica y narrativa.\n`
    : '';

  const systemPrompt = `Eres FUKUOKA-H v2.3, asistente clínico senior de Medicina Tradicional China (MTC), formado en la escuela de Van Nghi y Nogueira. Operas bajo supervisión del motor KANT de seguridad clínica.

MISIÓN: Generar un informe médico integral en 3 secciones narrativas para un CDSS forense australiano (AHPRA/TGA).

REGLAS ABSOLUTAS:
1. Responde ÚNICAMENTE en español (medical Spanish, Australia).
2. NO uses JSON en el cuerpo narrativo. Usa texto fluido, profesional, forense.
3. Al final del mensaje, incluye un bloque JSON estructurado entre \`\`\`json y \`\`\`.
4. Respeta TODAS las contraindicaciones de seguridad proporcionadas abajo.
5. NO propongas puntos, hierbas o técnicas prohibidas para este paciente.
6. Integra las citaciones RAG naturalmente en el texto de la Sección B (ej: "Según el Vademecum Español, pp. 45-47...").
7. La Sección C debe usar metáforas comprensibles, SIN tecnicismos, SIN nombrar enfermedades occidentales como diagnóstico.
8. Si hay MEMORIA CLÍNICA, describe la evolución desde la consulta anterior en la Sección C.
9. PROHIBICIÓN ABSOLUTA EN TEXTO: Si el paciente está embarazada, NUNCA menciones en el texto narrativo los puntos SP6/Sanyinjiao, LI4/Hegu, GB21/Jianjing, CV3-CV7, BL60/Kunlun, BL67/Zhiyin, SI1/Shaoze, ST12/Quepen, GB26-GB30 ni ningún punto de la lista de prohibidos. Usa únicamente puntos seguros como ST36, SP9, PC6, Yintang. Si necesitas un punto prohibido para el razonamiento, descríbelo indirectamente como "puntos de regulación del meridiano X" sin nombrarlo.

ESTRUCTURA OBLIGATORIA DE RESPUESTA:

=== SECCIÓN A — ALERTA KANT (Seguridad) ===
Estado: [VERDE / AMARILLO / ROJO]
Justificación narrativa (2-3 párrafos): Explica el perfil de riesgo del paciente, factores de seguridad identificados, y por qué el estado es X. Menciona precauciones específicas para esta sesión. Si no hay riesgos, confirma explícitamente que el perfil es seguro para tratamiento MTC.

=== SECCIÓN B — INFORME TÉCNICO FUKUOKA (Director Médico) ===
Diagnóstico bioenergético integrado: Conecta lengua, pulso y ryodoraku en una narrativa coherente. NO listas desconectadas. Explica el patrón Zang-Fu identificado.
Protocolo de tratamiento: Describe puntos de acupuntura con justificación clínica de cada uno en texto fluido. Incluye localización anatómica precisa.
Cronograma clínico: Fases de tratamiento y objetivos medibles (ej: "Fase 1 (semanas 1-2): regulación del Qi del Hígado...").
Citaciones RAG: Integra naturalmente las referencias documentales.

=== SECCIÓN C — INFORME FOUCAULT (Comunicación al Paciente) ===
Metáfora comprensible: Explica el diagnóstico MTC con una imagen natural (río, jardín, clima, etc.).
Evolución: ${lastConsultation ? 'Compara con la consulta anterior: qué ha mejorado, qué falta, qué se mantiene.' : 'Esta es la primera consulta. Establecemos línea base.'}
Recomendaciones prácticas: Alimentación, hábitos, ejercicios concretos y realizables.
Pautas de seguimiento: Cuándo volver, señales de alarma.
Disclaimer: Este informe no sustituye el juicio médico de un profesional registrado.

=== METADATOS ESTRUCTURADOS (JSON) ===
\`\`\`json
{
  "syndrome": "string - nombre del síndrome MTC",
  "points": [{"name":"string","location":"string","indication":"string"}],
  "herbs": [{"name":"string","dose":"string","preparation":"string"}],
  "rationale": "string - resumen técnico del razonamiento"
}
\`\`\`

CONTEXTO DOCUMENTAL (RAG):
${ragContext.context || 'Sin contexto documental disponible.'}

REGLAS DE SEGURIDAD (KANT):
${kantProfile.auditTrail?.join('\n') || 'Sin traza de auditoría previa'}
${kantProfile.contraindications?.length > 0 ? '\nCONTRAINDICACIONES ACTIVAS:\n' + kantProfile.contraindications.map((c: any) => `- ${c.item}: ${c.reason}`).join('\n') : ''}
${safetyPrefix}
${feedbackBlock}`;

  const tongueData = consultation?.tongue || patient?.tongue || 'No especificado';
  const pulseData = consultation?.pulse || patient?.pulse || 'No especificado';
  const ryodorakuData = consultation?.ryodoraku || patient?.ryodoraku || {};
  const medicalHistoryData = patient?.history || patient?.medicalHistory || 'No especificado';

  const ryodorakuFormatted = Object.keys(ryodorakuData).length > 0
    ? Object.entries(ryodorakuData).map(([meridian, value]) => `${meridian}: ${value}`).join(', ')
    : 'No registrado';

  const userPrompt = `DATOS DEL PACIENTE:
- Nombre: ${patient.name}
- Edad: ${age} años
- Sexo: ${patient.gender}
- Objetivo: ${consultation?.goal || 'No especificado'}
- Síntomas: ${symptoms || 'No especificado'}

EXPLORACIÓN CLÍNICA OBJETIVA:
- Diagnóstico de lengua: ${tongueData}
- Lectura de pulso: ${pulseData}
- Valores Ryodoraku: ${ryodorakuFormatted}

${patient?.diagnosis ? `- Diagnóstico previo: ${patient.diagnosis}` : ''}
${medicalHistoryData !== 'No especificado' ? `- Historial médico: ${medicalHistoryData}` : ''}
${patient?.medications?.length ? `- Fármacos actuales: ${patient.medications.join(', ')}` : ''}
${patient?.allergies?.length ? `- Alergias: ${patient.allergies.join(', ')}` : ''}

${memoryBlock}

Genera el informe completo siguiendo EXACTAMENTE la estructura de 3 secciones + JSON.`;

  return { systemPrompt, userPrompt };
}

// ═══════════════════════════════════════════════════════════════════════
// SANITIZADOR
// ═══════════════════════════════════════════════════════════════════════

function sanitizeMetadata(
  metadata: any,
  safetyAlerts: Record<string, boolean>
): any {
  let clean = { ...metadata };

  if (safetyAlerts.pregnancy && clean.points) {
    const forbiddenPoints = [
      'SP6','LI4','GB21','CV3','CV4','CV5','CV6','CV7',
      'BL60','BL67','SI1','ST12','GB26','GB27','GB28','GB29','GB30',
      'BL31','BL32','BL33','BL34','SANYINJIAO','HEGU','JIANJING',
      'ZHONGJI','GUANYUAN','SHIMEN','QIHAO','YINJIAO','KUNLUN',
      'ZHIYIN','SHAOZE','QUEPEN','DAIMAI','WUSHU','WEIDAO','JULIAO',
      'HUANTIAO','BALIAO'
    ];

    const normalizePoint = (name: string): string => {
      return name.toUpperCase()
        .replace(/\s/g, '')
        .replace(/[()]/g, '')
        .replace(/-/g, '')
        .replace(/^(\d+)V$/, 'BL$1')
        .replace(/^(\d+)E$/, 'ST$1')
        .replace(/^(\d+)BP$/, 'SP$1')
        .replace(/^GI(\d+)$/, 'LI$1')
        .replace(/^IG(\d+)$/, 'SI$1')
        .replace(/^MC(\d+)$/, 'PC$1')
        .replace(/^RM(\d+)$/, 'CV$1')
        .replace(/^H(\d+)$/, 'LR$1')
        .replace(/^VB(\d+)$/, 'GB$1');
    };

    const safePoints = clean.points.filter((p: any) => {
      const rawName = (p.name || p).toString();
      const normalized = normalizePoint(rawName);
      const isForbidden = forbiddenPoints.some(fp =>
        normalized === fp || normalized.includes(fp) || fp.includes(normalized)
      );
      if (isForbidden) console.log(`[SANITIZER v2.3] Filtrado punto prohibido: ${rawName}`);
      return !isForbidden;
    });

    if (clean.points.length > 0 && safePoints.length === 0) {
      clean.points = [
        { name: 'ST36', location: '3 cun inferior a la rótula, 1 cun lateral a la cresta tibial', indication: 'Tonificación Qi general, seguro en embarazo' },
        { name: 'SP9', location: 'Depresión inferior al borde medial de la rótula', indication: 'Drenaje humedad Bazo, seguro en embarazo' },
        { name: 'PC6', location: '2 cun proximal a la flexura de la muñeca, entre tendones', indication: 'Náuseas, ansiedad, seguro en embarazo' },
        { name: 'Yintang', location: 'Entre las cejas', indication: 'Calmante Shen, seguro en embarazo' }
      ];
    } else {
      clean.points = safePoints;
    }
  }

  return clean;
}

// ═══════════════════════════════════════════════════════════════════════
// POST HANDLER
// ═══════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const consultationDate = new Date().toISOString();
  const dialogueHistory: any[] = [];

  try {
    const body: TreatmentRequest = await req.json();
    console.log(`[v2.3] Payload recibido: ${JSON.stringify(body, null, 2)}`);
    const { patient, consultation } = body;
    console.log('>>> DEBUG payload patient:', JSON.stringify(patient, null, 2));

    const enrichedPatient = {
      ...patient,
      pregnancy: getPregnancy(body),
      safetyAlerts: getSafetyAlerts(body),
      age: calculateAge(patient.dob)
    };

    // Normalizar campos críticos
    const symptoms = getSymptoms(body);
    const safetyAlerts = getSafetyAlerts(body);
    const tongue = consultation?.tongue || patient?.tongue || '';
    const pulse = consultation?.pulse || patient?.pulse || '';
    const ryodorakuRaw = consultation?.ryodoraku || patient?.ryodoraku || {};
    const ryodoraku: Record<string, number> = {};
    for (const [key, value] of Object.entries(ryodorakuRaw)) {
      ryodoraku[key] = typeof value === 'string' ? parseInt(value, 10) : value;
    }
    const medicalHistory = patient?.history || patient?.medicalHistory || '';

    // ─── PASO 0: Anonimización + KANT base ───
    const anonymized = deidentifyPatient({
      name: patient.name,
      dob: patient.dob,
      symptoms,
      medicalHistory
    }, patient.patientId);

    // v2.3: Recuperar memoria clínica
    const lastConsultation = getLastConsultationByHash(anonymized.patientHash);
    if (lastConsultation) {
      console.log(`[v2.3] Memoria clínica recuperada: ${lastConsultation.consultationDate}`);
    }

    const kantBase = new KantEngine();
    const safetyProfile: any = {
      pregnancy: safetyAlerts.pregnancy,
      pacemaker: safetyAlerts.pacemaker,
      epilepsy: safetyAlerts.epilepsy || false,
      anticoagulants: safetyAlerts.anticoagulants ? ['apixaban'] : [],
      antiplatelets: safetyAlerts.bleedingDisorder ? ['antiplatelet'] : [],
      currentPharmaceuticals: patient.medications || [],
      age: calculateAge(patient.dob),
      allergies: patient.allergies || [],
      medicalHistory: medicalHistory,
      knownAllergies: patient.allergies || [],
    };

    const baseKantResult = kantBase.evaluate(safetyProfile);

    if (baseKantResult.status === 'red' && (baseKantResult.score || 0) >= 80) {
      return NextResponse.json({
        error: 'SAFETY_BLOCKED_BASELINE',
        message: 'El perfil del paciente presenta riesgos de seguridad que impiden cualquier tratamiento automatizado.',
        safety: baseKantResult,
        timestamp: consultationDate
      }, { status: 403 });
    }

    // RAG
    const ragQuery = `${symptoms} ${patient.diagnosis || ''} ${consultation.goal}`;
    const ragContext = await buildRAGContext({
      query: ragQuery,
      domain: 'mtc-core',
      maxChunks: 5,
      minSimilarity: 0.6
    });

    // ─── PASO 1-3: DIÁLOGO FUKUOKA-H ↔ KANT ───
    let finalNotebookResult: any = null;
    let finalKantResult = baseKantResult;
    let finalVerdict = 'FAIL_HARD';
    let humanRequired = false;
    let humanReason = '';

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`[v2.3 DIALOGO] Intento ${attempt}/3`);

      const previousRound = attempt > 1 ? dialogueHistory[dialogueHistory.length - 1] : undefined;
      const { systemPrompt, userPrompt } = buildNotebookLMPrompt(
        enrichedPatient,
        consultation,
        baseKantResult,
        ragContext,
        lastConsultation,
        previousRound
      );

      const rawLlmResponse = await generateTreatment({
        systemPrompt,
        userPrompt,
        model: process.env.LLM_MODEL || 'openai/gpt-4o-mini',
        temperature: attempt === 1 ? 0.4 : 0.3
      });

      const notebookResult = parseNotebookLMResponse(rawLlmResponse);
      const sanitizedMetadata = sanitizeMetadata(notebookResult.metadata, safetyAlerts);

      const proposedTreatment = {
        points: sanitizedMetadata.points?.map((p: any) => p.name || p) || [],
        herbs: sanitizedMetadata.herbs?.map((h: any) => h.name || h) || [],
        techniques: ['acupuntura manual'],
        rationale: sanitizedMetadata.rationale || ''
      };

      const kantEvaluator = new KantEngine();
      const kantResult = kantEvaluator.evaluate(
        safetyProfile,
        proposedTreatment,
        `${sanitizedMetadata.syndrome} ${sanitizedMetadata.rationale}`
      );

      let verdict: 'PASS' | 'FAIL_SOFT' | 'FAIL_HARD' = 'PASS';
      let feedback = '';

      if (kantResult.contraindications?.some((c: any) => c.severity === 'absolute')) {
        verdict = 'FAIL_HARD';
        feedback = `CONTRAINDICACIÓN ABSOLUTA: ${kantResult.contraindications.filter((c: any) => c.severity === 'absolute').map((c: any) => c.reason).join('; ')}`;
      } else if (kantResult.status === 'red' && (kantResult.score || 0) >= 70) {
        verdict = 'FAIL_HARD';
        feedback = `RIESGO CRÍTICO: Score ${kantResult.score}/100`;
      } else if (kantResult.status === 'red' || kantResult.status === 'yellow') {
        verdict = 'FAIL_SOFT';
        const parts: string[] = [];
        if (kantResult.contraindications?.length > 0) parts.push(`CONTRAINDICACIONES: ${kantResult.contraindications.map((c: any) => `${c.item} → ${c.reason}`).join('; ')}`);
        if (kantResult.alerts?.length > 0) parts.push(`ALERTAS: ${kantResult.alerts.map((a: any) => a.message).join('; ')}`);
        feedback = parts.join('\n');
      } else {
        verdict = 'PASS';
        feedback = 'Tratamiento validado por KANT. Proceder a documentación.';
      }

      const round = { attempt, verdict, feedback, kantScore: kantResult.score, kantStatus: kantResult.status };
      dialogueHistory.push(round);

      console.log(`[v2.3 DIALOGO] Intento ${attempt}: ${verdict} | Score: ${kantResult.score}`);

      if (verdict === 'PASS') {
        finalNotebookResult = { ...notebookResult, metadata: sanitizedMetadata };
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
        finalNotebookResult = { ...notebookResult, metadata: sanitizedMetadata };
        finalKantResult = kantResult;
        finalVerdict = verdict;
        humanRequired = true;
        humanReason = `KANT rechazó 3 propuestas. Problemas: ${feedback}`;
      }
    }

    // ─── PREPARAR DATOS COMUNES ───
    const chainOfCustody = [
      `[${consultationDate}] v2.3 Treatment API processed`,
      `[${consultationDate}] Diálogo Fukuoka-H ↔ KANT: ${dialogueHistory.length} intentos`,
      ...dialogueHistory.map((d: any) => `[${consultationDate}] Intento ${d.attempt}: ${d.verdict} (score ${d.kantScore})`),
      `[${consultationDate}] Veredicto final: ${finalVerdict}`,
      `[${consultationDate}] RAG: ${ragContext.citations.length} citaciones`,
      `[${consultationDate}] LLM: ${process.env.LLM_MODEL || 'openai/gpt-4o-mini'}`
    ];

    const ragCitations = ragContext.citations.map((c: any) => ({
      document: c.document,
      documentId: c.documentId || c.document,
      pageStart: c.pageStart,
      pageEnd: c.pageEnd,
      excerpt: c.excerpt
    }));

    const llmModel = process.env.LLM_MODEL || 'openai/gpt-4o-mini';

    // ─── PASO 4: CONTROL HUMANO ───
    if (humanRequired) {
      const ehrPending: NewConsultation = {
        ehrId: resolveEhrId(patient),
        patientHash: anonymized.patientHash,
        consultationDate,
        language: 'es',
        patientAge: calculateAge(patient.dob),
        patientGender: patient.gender,
        symptoms,
        diagnosis: patient.diagnosis || '',
        syndrome: finalNotebookResult?.metadata?.syndrome || 'PENDIENTE_REVISION',
        points: finalNotebookResult?.metadata?.points || [],
        herbs: finalNotebookResult?.metadata?.herbs || [],
        rationale: humanReason,
        kantStatus: 'red',
        kantScore: finalKantResult.score,
        kantAlerts: finalKantResult.alerts || [],
        kantContraindications: finalKantResult.contraindications || [],
        kantAuditTrail: finalKantResult.auditTrail || [],
        ragCitations,
        llmModel,
        foucaultPdfPath: null,
        foucaultForensicHash: null,
        foucaultEmpathicHash: null,
        regulatoryFramework: 'AHPRA',
        isTest: false,
        ahpraFlags: [],
        chainOfCustody: [
          `[${consultationDate}] CONTROL HUMANO REQUERIDO v2.3`,
          `[${consultationDate}] Razón: ${humanReason}`,
          `[${consultationDate}] Intentos: ${dialogueHistory.length}`,
          ...dialogueHistory.map((d: any) => `[${consultationDate}] Intento ${d.attempt}: ${d.verdict} (score ${d.kantScore})`)
        ],
      };

      const pendingId = saveConsultation(ehrPending);

      return NextResponse.json({
        error: 'HUMAN_REQUIRED',
        message: 'El sistema no ha podido generar un tratamiento seguro.',
        reason: humanReason,
        dialogueHistory,
        lastProposal: finalNotebookResult?.metadata,
        safety: {
          status: finalKantResult.status,
          score: finalKantResult.score,
          alerts: finalKantResult.alerts,
          contraindications: finalKantResult.contraindications
        },
        ehr: { id: pendingId, patientHash: anonymized.patientHash, saved: true, status: 'PENDING_HUMAN_REVIEW' },
        timestamp: consultationDate
      }, { status: 422 });
    }

    // ─── PASO 5: FLUJO NORMAL (PASS) ───
    const sections = finalNotebookResult.sections;
    const metadata = finalNotebookResult.metadata;

    const ehrRecord: NewConsultation = {
      ehrId: resolveEhrId(patient),
      patientHash: anonymized.patientHash,
      consultationDate,
      language: 'es',
      patientAge: calculateAge(patient.dob),
      patientGender: patient.gender,
      symptoms,
      diagnosis: patient.diagnosis || '',
      syndrome: metadata.syndrome,
      points: metadata.points || [],
      herbs: metadata.herbs || [],
      rationale: metadata.rationale,
      reasoning: sections.A.substring(0, 1000),
      sources: [],
      kantStatus: finalKantResult.status,
      kantScore: finalKantResult.score,
      kantAlerts: finalKantResult.alerts || [],
      kantContraindications: finalKantResult.contraindications || [],
      kantAuditTrail: finalKantResult.auditTrail || [],
      ragCitations,
      llmModel,
      foucaultPdfPath: null,
      foucaultForensicHash: null,
      foucaultEmpathicHash: null,
      regulatoryFramework: 'AHPRA',
      isTest: false,
      ahpraFlags: [],
      chainOfCustody,
    };

    const savedId = saveConsultation(ehrRecord);

    // v2.3: Datos para reconstruir PDFs en el cliente
    const consultationData = {
      patient: {
        hash: anonymized.patientHash,
        name: patient.name,
        age: calculateAge(patient.dob),
        gender: patient.gender,
        preferredName: patient.name,
      },
      session: {
        id: savedId,
        date: consultationDate,
      },
      practitioner: {
        name: undefined,
        qualification: undefined,
        clinic: undefined,
        phone: undefined,
        registration: undefined,
      },
      notebookLM: {
        sectionA: sections.A,
        sectionB: sections.B,
        sectionC: sections.C,
        hasEvolution: !!lastConsultation,
        previousSyndrome: lastConsultation?.syndrome || null,
      },
      clinical: {
        symptoms,
        syndrome: metadata.syndrome,
        rationale: metadata.rationale,
        tongueNotes: tongue,
        pulseOverall: pulse,
        ryodorakuNotes: Object.entries(ryodoraku).map(([k,v]) => `${k}: ${v}`).join(', '),
        pointsExecution: JSON.stringify(metadata.points?.map((p: any) => ({
          point: p.name || p,
          location: p.location || '',
          technique: 'Acupuntura manual',
          depth: '',
          manipulation: '',
          duration: '',
        }))),
        herbalFormula: metadata.herbs?.map((h: any) => h.name).join(', ') || undefined,
      },
      kant: {
        status: finalKantResult.status,
        score: finalKantResult.score,
        alerts: JSON.stringify(finalKantResult.alerts || []),
        contraindications: JSON.stringify(finalKantResult.contraindications || []),
        auditTrail: JSON.stringify(finalKantResult.auditTrail || []),
      },
      system: {
        foucaultVersion: '2.3',
        openrouterModel: llmModel,
        generationTimestamp: consultationDate,
      },
    };

    return NextResponse.json({
      sections: {
        A: sections.A,
        B: sections.B,
        C: sections.C
      },
      metadata: {
        syndrome: metadata.syndrome,
        points: metadata.points,
        herbs: metadata.herbs,
        rationale: metadata.rationale
      },
      syndrome: metadata.syndrome,
      points: metadata.points,
      herbs: metadata.herbs,
      rationale: metadata.rationale,
      safety: {
        status: finalKantResult.status,
        alerts: finalKantResult.alerts || [],
        contraindications: finalKantResult.contraindications || [],
        auditTrail: finalKantResult.auditTrail || []
      },
      dialogue: {
        rounds: dialogueHistory.length,
        history: dialogueHistory
      },
      citations: ragContext.citations.map((c: any) => ({
        document: c.document,
        pageStart: c.pageStart,
        pageEnd: c.pageEnd,
        excerpt: c.excerpt
      })),
      model: llmModel,
      ehr: {
        id: savedId,
        patientHash: anonymized.patientHash,
        saved: true,
        transaction: 'ACID',
      },
      consultationData,
      timestamp: consultationDate
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Treatment API v2.3]', error);
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}