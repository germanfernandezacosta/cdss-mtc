// src/app/api/consultations/route.ts
// API: Guardar consulta manual (Solo acupuntura) o nueva con CDSS
// v3.0 Fase C — Documentación manual con trazabilidad legal

import { NextRequest, NextResponse } from 'next/server';
import { saveConsultation } from '@/lib/ehr/store';
import { type NewConsultation } from '@/lib/ehr/schema';

export interface ManualSessionRequest {
  ehrId: string;
  patientHash: string;
  mode: 'manual' | 'cdss';
  // Campos para modo manual
  sessionNotes?: string;
  pointsApplied?: string;
  patientResponse?: string;
  practitionerName?: string;
  practitionerRegistration?: string;
  // Campos para modo CDSS (precargados desde frontend)
  symptoms?: string;
  tongue?: string;
  pulse?: string;
  ryodoraku?: Record<string, number>;
  chiefComplaint?: string;
  // Metadatos de tratamiento en curso
  sessionNumber?: number;
  totalSessions?: number;
  treatmentPlanId?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: ManualSessionRequest = await req.json();
    const consultationDate = new Date().toISOString();

    if (body.mode === 'manual') {
      // ═══════════════════════════════════════════════════════
      // MODO MANUAL — Documentación directa del terapeuta
      // ═══════════════════════════════════════════════════════

      const manualRecord: NewConsultation = {
        ehrId: body.ehrId,
        patientHash: body.patientHash,
        consultationDate,
        language: 'es',
        patientAge: null,
        patientGender: null,

        // Campos clínicos mínimos (el terapeuta escribe libre)
        symptoms: body.sessionNotes || 'Sesión documentada manualmente por el terapeuta',
        diagnosis: 'Documentación manual — Sin intervención CDSS',
        syndrome: 'MANUAL_ENTRY',

        // No hay puntos estructurados — el terapeuta escribe texto libre
        points: [],
        herbs: [],
        rationale: `DOCUMENTACIÓN MANUAL DEL TERAPEUTA
═══════════════════════════════════════
Puntos/Intervenciones aplicadas:
${body.pointsApplied || 'No especificado'}

Notas de sesión:
${body.sessionNotes || 'Sin notas'}

Respuesta del paciente:
${body.patientResponse || 'No registrada'}

Practicante: ${body.practitionerName || 'No registrado'}
Registro: ${body.practitionerRegistration || 'No registrado'}
═══════════════════════════════════════
ADVERTENCIA LEGAL: Esta sesión fue registrada directamente por el profesional sin soporte del sistema de decisión clínica (CDSS). El terapeuta asume la responsabilidad del diagnóstico y tratamiento documentados.`,

        reasoning: 'MODO MANUAL — El terapeuta documentó la sesión sin intervención del motor Fukuoka-H.',
        sources: [],

        // Kant en gris — no evaluable por CDSS
        kantStatus: 'grey',
        kantScore: 0,
        kantAlerts: [{
          code: 'MANUAL_MODE',
          category: 'DOCUMENTATION',
          severity: 'low',
          message: 'Sesión documentada manualmente sin validación CDSS',
          sourceRule: 'MANUAL_ENTRY',
          recommendation: 'El terapeuta asume responsabilidad clínica de esta sesión',
        }],
        kantContraindications: [],
        kantAuditTrail: [
          `[${consultationDate}] MODO MANUAL activado`,
          `[${consultationDate}] Terapeuta: ${body.practitionerName || 'No registrado'}`,
          `[${consultationDate}] Sin intervención Fukuoka-H ni Kant`,
        ],

        ragCitations: [],
        llmModel: 'MANUAL_ENTRY',

        // Sin PDFs automáticos en modo manual
        foucaultPdfPath: null,
        foucaultForensicHash: null,
        foucaultEmpathicHash: null,

        regulatoryFramework: 'AHPRA',
        isTest: false,

        ahpraFlags: [],
        chainOfCustody: [
          `[${consultationDate}] CONSULTA MANUAL v3.0`,
          `[${consultationDate}] Terapeuta: ${body.practitionerName || 'No registrado'}`,
          `[${consultationDate}] Registro: ${body.practitionerRegistration || 'No registrado'}`,
          `[${consultationDate}] Sesión: ${body.sessionNumber || 'N/A'} de ${body.totalSessions || 'N/A'}`,
          `[${consultationDate}] RESPONSABILIDAD: El terapeuta documentó esta sesión sin soporte CDSS`,
        ],

        // Metadatos del practicante
        practitionerName: body.practitionerName || null,
        practitionerRegistration: body.practitionerRegistration || null,

        // Campos de tratamiento en curso
        acupunctureTotalSessions: body.totalSessions || null,
        followUpPlan: body.sessionNumber ? `Sesión ${body.sessionNumber} de ${body.totalSessions || 'planificado'}` : null,

        // Resto de campos null
        complexion: null, spirit: null, bodyShape: null, posture: null,
        skinCondition: null, hairCondition: null, eyes: null, nails: null,
        tongueBodyColor: null, tongueBodyShape: null, tongueCoatingColor: null,
        tongueCoatingThickness: null, tongueCoatingDistribution: null,
        tongueMoisture: null, tongueSublingualVeins: null, tongueNotes: null,
        pulseLeftCun: null, pulseLeftGuan: null, pulseLeftChi: null,
        pulseRightCun: null, pulseRightGuan: null, pulseRightChi: null,
        pulseDepth: null, pulseRate: null, pulseRhythm: null,
        pulseQuality: null, pulseOverall: null, pulseNotes: null,
        ryodorakuLung: null, ryodorakuPericardium: null, ryodorakuHeart: null,
        ryodorakuSmallIntestine: null, ryodorakuTripleWarmer: null,
        ryodorakuLargeIntestine: null, ryodorakuSpleen: null,
        ryodorakuLiver: null, ryodorakuKidney: null, ryodorakuBladder: null,
        ryodorakuStomach: null, ryodorakuGallbladder: null, ryodorakuNotes: null,
        abdomenOverall: null, abdomenSho: null, abdomenTenderness: null,
        abdomenTension: null, abdomenTemperature: null, abdomenWaterSound: null, abdomenNotes: null,
        bianZheng: null, zangFuPattern: null, baGang: null,
        qiBloodFluid: null, channelPattern: null, diseaseMechanism: null, westernDiagnosis: null,
        treatmentPrinciple: null, treatmentMethod: null, pointsExecution: null,
        acupunctureNeedleType: null, acupunctureNeedleCount: null,
        acupunctureDuration: null, acupunctureFrequency: null, acupunctureSequence: null,
        acupunctureDeqi: null, acupunctureNotes: null,
        moxibustionType: null, moxibustionPoints: null, moxibustionDuration: null,
        moxibustionFrequency: null, moxibustionContraindications: null,
        cuppingType: null, cuppingLocation: null, cuppingDuration: null,
        cuppingFrequency: null, cuppingNotes: null,
        tuinaTechniques: null, tuinaDuration: null, tuinaFrequency: null, tuinaContraindications: null,
        dietaryAdvice: null, dietaryAvoid: null, dietaryConstitution: null,
        exerciseType: null, exerciseRoutine: null, exerciseContraindications: null,
        herbalFormula: null, herbalIngredients: null, herbalModifications: null,
        herbalDosage: null, herbalAdministration: null, herbalDuration: null,
        herbalFrequency: null, herbalContraindications: null, herbalTgaStatus: null, herbalAhpraWarning: null,
        prognosis: null, expectedOutcomes: null, redFlags: null,
        referralNeeded: null, referralTo: null, referralReason: null,
        informedConsent: null, consentDate: null, patientSignature: null,
        practitionerSignature: null, riskAcknowledged: null, privacyAcknowledged: null,
        foucaultVersion: null, ragChunksUsed: null, openrouterModel: null,
        generationTimestamp: consultationDate,
        empathicNarrative: null, homeCareInstructions: null,
        practitionerQualification: null, practitionerClinic: null,
        practitionerAddress: null, practitionerPhone: null, practitionerLogoUrl: null,
      };

      const consultationId = saveConsultation(manualRecord);

      return NextResponse.json({
        success: true,
        mode: 'manual',
        message: 'Sesión manual documentada correctamente',
        consultationId,
        ehrId: body.ehrId,
        timestamp: consultationDate,
        legalNotice: 'Esta sesión fue documentada manualmente por el terapeuta sin intervención del CDSS.',
      });

    } else {
      // ═══════════════════════════════════════════════════════
      // MODO CDSS — Nueva consulta con precarga (Fase C+)
      // ═══════════════════════════════════════════════════════
      // Por ahora retornamos error — se implementa en Fase D
      return NextResponse.json(
        { success: false, message: 'Modo CDSS aún no implementado en esta fase. Use modo manual.' },
        { status: 501 }
      );
    }

  } catch (error: any) {
    console.error('[API Consultations]', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}