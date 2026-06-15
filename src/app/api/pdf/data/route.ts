/**
 * API Route: /api/pdf/data
 * Devuelve los datos de una consulta para generación de PDFs en cliente
 * CDSS MTC Premium v2.2
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/ehr/db';
import { consultations } from '@/lib/ehr/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing consultation id' },
        { status: 400 }
      );
    }

    const record = await db.select().from(consultations).where(eq(consultations.id, parseInt(id))).get();

    if (!record) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    // Construir objeto de datos para PDFs
    const pdfData = {
      patient: {
        hash: record.patientHash,
        age: record.patientAge || undefined,
        gender: record.patientGender || undefined,
        preferredName: undefined,
      },
      session: {
        id: record.id,
        date: record.consultationDate,
        createdAt: record.createdAt,
      },
      practitioner: {
        name: record.practitionerName || undefined,
        registration: record.practitionerRegistration || undefined,
        qualification: record.practitionerQualification || undefined,
        clinic: record.practitionerClinic || undefined,
        address: record.practitionerAddress || undefined,
        phone: record.practitionerPhone || undefined,
      },
      clinical: {
        symptoms: record.symptoms,
        diagnosis: record.diagnosis || undefined,
        syndrome: record.syndrome,
        rationale: record.rationale || undefined,

        // Observación
        complexion: record.complexion || undefined,
        spirit: record.spirit || undefined,
        bodyShape: record.bodyShape || undefined,
        posture: record.posture || undefined,
        skinCondition: record.skinCondition || undefined,
        hairCondition: record.hairCondition || undefined,
        eyes: record.eyes || undefined,
        nails: record.nails || undefined,

        // Lengua
        tongueBodyColor: record.tongueBodyColor || undefined,
        tongueBodyShape: record.tongueBodyShape || undefined,
        tongueCoatingColor: record.tongueCoatingColor || undefined,
        tongueCoatingThickness: record.tongueCoatingThickness || undefined,
        tongueCoatingDistribution: record.tongueCoatingDistribution || undefined,
        tongueMoisture: record.tongueMoisture || undefined,
        tongueSublingualVeins: record.tongueSublingualVeins || undefined,
        tongueNotes: record.tongueNotes || undefined,

        // Pulso
        pulseLeftCun: record.pulseLeftCun || undefined,
        pulseLeftGuan: record.pulseLeftGuan || undefined,
        pulseLeftChi: record.pulseLeftChi || undefined,
        pulseRightCun: record.pulseRightCun || undefined,
        pulseRightGuan: record.pulseRightGuan || undefined,
        pulseRightChi: record.pulseRightChi || undefined,
        pulseDepth: record.pulseDepth || undefined,
        pulseRate: record.pulseRate || undefined,
        pulseRhythm: record.pulseRhythm || undefined,
        pulseQuality: record.pulseQuality || undefined,
        pulseOverall: record.pulseOverall || undefined,
        pulseNotes: record.pulseNotes || undefined,

        // Ryodoraku
        ryodorakuLung: record.ryodorakuLung || undefined,
        ryodorakuPericardium: record.ryodorakuPericardium || undefined,
        ryodorakuHeart: record.ryodorakuHeart || undefined,
        ryodorakuSmallIntestine: record.ryodorakuSmallIntestine || undefined,
        ryodorakuTripleWarmer: record.ryodorakuTripleWarmer || undefined,
        ryodorakuLargeIntestine: record.ryodorakuLargeIntestine || undefined,
        ryodorakuSpleen: record.ryodorakuSpleen || undefined,
        ryodorakuLiver: record.ryodorakuLiver || undefined,
        ryodorakuKidney: record.ryodorakuKidney || undefined,
        ryodorakuBladder: record.ryodorakuBladder || undefined,
        ryodorakuStomach: record.ryodorakuStomach || undefined,
        ryodorakuGallbladder: record.ryodorakuGallbladder || undefined,
        ryodorakuNotes: record.ryodorakuNotes || undefined,

        // Abdomen
        abdomenOverall: record.abdomenOverall || undefined,
        abdomenSho: record.abdomenSho || undefined,
        abdomenTenderness: record.abdomenTenderness || undefined,
        abdomenTension: record.abdomenTension || undefined,
        abdomenTemperature: record.abdomenTemperature || undefined,
        abdomenWaterSound: record.abdomenWaterSound || undefined,
        abdomenNotes: record.abdomenNotes || undefined,

        // Diagnóstico
        bianZheng: record.bianZheng || undefined,
        zangFuPattern: record.zangFuPattern || undefined,
        baGang: record.baGang || undefined,
        qiBloodFluid: record.qiBloodFluid || undefined,
        channelPattern: record.channelPattern || undefined,
        diseaseMechanism: record.diseaseMechanism || undefined,
        westernDiagnosis: record.westernDiagnosis || undefined,

        // Tratamiento
        treatmentPrinciple: record.treatmentPrinciple || undefined,
        treatmentMethod: record.treatmentMethod || undefined,

        // Acupuntura
        pointsExecution: record.pointsExecution || undefined,
        acupunctureNeedleType: record.acupunctureNeedleType || undefined,
        acupunctureNeedleCount: record.acupunctureNeedleCount || undefined,
        acupunctureDuration: record.acupunctureDuration || undefined,
        acupunctureFrequency: record.acupunctureFrequency || undefined,
        acupunctureTotalSessions: record.acupunctureTotalSessions || undefined,
        acupunctureSequence: record.acupunctureSequence || undefined,
        acupunctureDeqi: record.acupunctureDeqi || undefined,
        acupunctureNotes: record.acupunctureNotes || undefined,

        // Moxa
        moxibustionType: record.moxibustionType || undefined,
        moxibustionPoints: record.moxibustionPoints || undefined,
        moxibustionDuration: record.moxibustionDuration || undefined,
        moxibustionFrequency: record.moxibustionFrequency || undefined,
        moxibustionContraindications: record.moxibustionContraindications || undefined,

        // Ventosas
        cuppingType: record.cuppingType || undefined,
        cuppingLocation: record.cuppingLocation || undefined,
        cuppingDuration: record.cuppingDuration || undefined,
        cuppingFrequency: record.cuppingFrequency || undefined,
        cuppingNotes: record.cuppingNotes || undefined,

        // Tuina
        tuinaTechniques: record.tuinaTechniques || undefined,
        tuinaDuration: record.tuinaDuration || undefined,
        tuinaFrequency: record.tuinaFrequency || undefined,
        tuinaContraindications: record.tuinaContraindications || undefined,

        // Dietética
        dietaryAdvice: record.dietaryAdvice || undefined,
        dietaryAvoid: record.dietaryAvoid || undefined,
        dietaryConstitution: record.dietaryConstitution || undefined,

        // Ejercicios
        exerciseType: record.exerciseType || undefined,
        exerciseRoutine: record.exerciseRoutine || undefined,
        exerciseContraindications: record.exerciseContraindications || undefined,

        // Fitoterapia
        herbalFormula: record.herbalFormula || undefined,
        herbalIngredients: record.herbalIngredients || undefined,
        herbalModifications: record.herbalModifications || undefined,
        herbalDosage: record.herbalDosage || undefined,
        herbalAdministration: record.herbalAdministration || undefined,
        herbalDuration: record.herbalDuration || undefined,
        herbalFrequency: record.herbalFrequency || undefined,
        herbalContraindications: record.herbalContraindications || undefined,
        herbalTgaStatus: record.herbalTgaStatus || undefined,
        herbalAhpraWarning: record.herbalAhpraWarning || undefined,

        // Prognosis
        prognosis: record.prognosis || undefined,
        followUpPlan: record.followUpPlan || undefined,
        expectedOutcomes: record.expectedOutcomes || undefined,
        redFlags: record.redFlags || undefined,
        referralNeeded: record.referralNeeded || undefined,
        referralTo: record.referralTo || undefined,
        referralReason: record.referralReason || undefined,

        // Consentimiento
        informedConsent: record.informedConsent || undefined,
        consentDate: record.consentDate || undefined,
        patientSignature: record.patientSignature || undefined,
        practitionerSignature: record.practitionerSignature || undefined,
        riskAcknowledged: record.riskAcknowledged || undefined,
        privacyAcknowledged: record.privacyAcknowledged || undefined,

        // Empático
        empathicNarrative: record.empathicNarrative || undefined,
        homeCareInstructions: record.homeCareInstructions || undefined,
      },
      kant: {
        status: record.kantStatus,
        score: record.kantScore,
        alerts: record.kantAlerts || undefined,
        contraindications: record.kantContraindications || undefined,
        auditTrail: record.kantAuditTrail || undefined,
      },
      system: {
        foucaultVersion: record.foucaultVersion || undefined,
        ragChunksUsed: record.ragChunksUsed || undefined,
        openrouterModel: record.openrouterModel || undefined,
        generationTimestamp: record.generationTimestamp || undefined,
        forensicHash: record.foucaultForensicHash || undefined,
      },
    };

    return NextResponse.json({ data: pdfData });

  } catch (error) {
    console.error('[PDF Data API]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}