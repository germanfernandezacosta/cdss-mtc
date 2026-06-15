// src/lib/foucault/forensic-builder.ts
// NUEVA FUNCIÓN: devuelve objeto plano para pdfmake
import { ForensicPdfData } from '../pdf-generators/types';
import { FoucaultInput } from './types';

export function buildForensicData(input: FoucaultInput): ForensicPdfData {
  const { patient, clinicalInput, fukuokaResult, kantResult, generatedAt } = input;

  return {
    patient: {
      hash: patient.id || 'anonymous',
      age: patient.age,
      gender: patient.sex,
    },
    session: {
      id: parseInt(fukuokaResult.request_id) || 0,
      date: new Date(generatedAt).toISOString(),
      createdAt: new Date().toISOString(),
    },
    practitioner: {
      name: undefined, // Se rellena desde la BD o config
      registration: undefined,
      qualification: undefined,
      clinic: undefined,
      address: undefined,
      phone: undefined,
    },
    clinical: {
      symptoms: clinicalInput.symptoms,
      diagnosis: undefined,
      syndrome: fukuokaResult.data.syndrome_analysis.map((s: { syndrome_name: string }) => s.syndrome_name).join(', '),
      rationale: fukuokaResult.data.treatment_proposal.rationale,
      
      // Observación
      complexion: undefined,
      spirit: undefined,
      bodyShape: undefined,
      posture: undefined,
      skinCondition: undefined,
      hairCondition: undefined,
      eyes: undefined,
      nails: undefined,

      // Lengua
      tongueBodyColor: undefined,
      tongueBodyShape: undefined,
      tongueCoatingColor: undefined,
      tongueCoatingThickness: undefined,
      tongueCoatingDistribution: undefined,
      tongueMoisture: undefined,
      tongueSublingualVeins: undefined,
      tongueNotes: clinicalInput.tongue,

      // Pulso
      pulseLeftCun: undefined,
      pulseLeftGuan: undefined,
      pulseLeftChi: undefined,
      pulseRightCun: undefined,
      pulseRightGuan: undefined,
      pulseRightChi: undefined,
      pulseDepth: undefined,
      pulseRate: undefined,
      pulseRhythm: undefined,
      pulseQuality: undefined,
      pulseOverall: clinicalInput.pulse,
      pulseNotes: undefined,

      // Ryodoraku
      ryodorakuLung: undefined,
      ryodorakuPericardium: undefined,
      ryodorakuHeart: undefined,
      ryodorakuSmallIntestine: undefined,
      ryodorakuTripleWarmer: undefined,
      ryodorakuLargeIntestine: undefined,
      ryodorakuSpleen: undefined,
      ryodorakuLiver: undefined,
      ryodorakuKidney: undefined,
      ryodorakuBladder: undefined,
      ryodorakuStomach: undefined,
      ryodorakuGallbladder: undefined,
      ryodorakuNotes: clinicalInput.ryodoraku ? (typeof clinicalInput.ryodoraku === 'string' ? clinicalInput.ryodoraku : Object.entries(clinicalInput.ryodoraku).map(([k, v]) => `${k}: ${v}`).join('; ')) : undefined,

      // Abdomen
      abdomenOverall: undefined,
      abdomenSho: undefined,
      abdomenTenderness: undefined,
      abdomenTension: undefined,
      abdomenTemperature: undefined,
      abdomenWaterSound: undefined,
      abdomenNotes: undefined,

      // Diagnóstico
      bianZheng: undefined,
      zangFuPattern: undefined,
      baGang: undefined,
      qiBloodFluid: undefined,
      channelPattern: undefined,
      diseaseMechanism: undefined,
      westernDiagnosis: undefined,

      // Tratamiento
      treatmentPrinciple: undefined,
      treatmentMethod: undefined,

      // Acupuntura
      pointsExecution: JSON.stringify(
        fukuokaResult.data.treatment_proposal.acupuncture_points.map((p: string) => ({
          point: p,
          location: '',
          technique: '',
          depth: '',
          manipulation: '',
          duration: '',
        }))
      ),
      acupunctureNeedleType: undefined,
      acupunctureNeedleCount: fukuokaResult.data.treatment_proposal.acupuncture_points.length,
      acupunctureDuration: undefined,
      acupunctureFrequency: undefined,
      acupunctureTotalSessions: undefined,
      acupunctureSequence: undefined,
      acupunctureDeqi: undefined,
      acupunctureNotes: undefined,

      // Moxa
      moxibustionType: undefined,
      moxibustionPoints: undefined,
      moxibustionDuration: undefined,
      moxibustionFrequency: undefined,
      moxibustionContraindications: undefined,

      // Ventosas
      cuppingType: undefined,
      cuppingLocation: undefined,
      cuppingDuration: undefined,
      cuppingFrequency: undefined,
      cuppingNotes: undefined,

      // Tuina
      tuinaTechniques: undefined,
      tuinaDuration: undefined,
      tuinaFrequency: undefined,
      tuinaContraindications: undefined,

      // Dietética
      dietaryAdvice: undefined,
      dietaryAvoid: undefined,
      dietaryConstitution: undefined,

      // Ejercicios
      exerciseType: undefined,
      exerciseRoutine: undefined,
      exerciseContraindications: undefined,

      // Fitoterapia
      herbalFormula: fukuokaResult.data.treatment_proposal.herbal_formula || undefined,
      herbalIngredients: undefined,
      herbalModifications: undefined,
      herbalDosage: undefined,
      herbalAdministration: undefined,
      herbalDuration: undefined,
      herbalFrequency: undefined,
      herbalContraindications: undefined,
      herbalTgaStatus: undefined,
      herbalAhpraWarning: undefined,

      // Prognosis
      prognosis: undefined,
      followUpPlan: undefined,
      expectedOutcomes: undefined,
      redFlags: undefined,
      referralNeeded: kantResult.verdict === 'ROJO',
      referralTo: kantResult.verdict === 'ROJO' ? 'General Practitioner / Emergency' : undefined,
      referralReason: kantResult.violations.length > 0 
        ? kantResult.violations.map((v: { message: string }) => v.message).join('; ')
        : undefined,

      // Consentimiento
      informedConsent: undefined,
      consentDate: undefined,
      patientSignature: undefined,
      practitionerSignature: undefined,
      riskAcknowledged: undefined,
      privacyAcknowledged: undefined,
    },
    kant: {
      status: kantResult.verdict === 'ROJO' ? 'red' : kantResult.verdict === 'AMARILLO' ? 'yellow' : 'green',
      score: kantResult.score || (kantResult.violations.length > 0 ? 50 : 100), // Si hay violaciones pero no score, asumimos 0. Si no hay violaciones y no hay score, asumimos 100.
      alerts: JSON.stringify(kantResult.violations || []),
      contraindications: JSON.stringify(kantResult.contraindications || []),
      auditTrail: JSON.stringify(kantResult.auditTrail || kantResult.violations || []), // Si no hay auditTrail, usamos las violaciones como proxy para el historial de auditoría
    },
    rag: {
      citations: undefined,
    },
    system: {
      foucaultVersion: '2.2',
      ragChunksUsed: undefined,
      openrouterModel: 'GPT-4o-mini',
      generationTimestamp: new Date().toISOString(),
      forensicHash: kantResult.originalProposalHash,
    },
  };
}