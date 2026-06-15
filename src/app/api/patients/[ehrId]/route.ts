// src/app/api/patients/[ehrId]/route.ts
// API: Datos completos de paciente + historial de consultas
// v3.0 Fase C — Historial clínico con línea de tiempo
// FIX: Calcula patientHash usando deidentifyPatient para consistencia

import { NextRequest, NextResponse } from 'next/server';
import { getPatientByEhrId, getConsultationsByEhrId, getPatientStats, getConsultationsByPatientHash } from '@/lib/ehr/store';
import { deidentifyPatient } from '@/lib/privacy/deidentify';

export async function GET(
  req: NextRequest,
  { params }: { params: { ehrId: string } }
) {
  try {
    const { ehrId } = params;

    // 1. Obtener paciente
    const patient = getPatientByEhrId(ehrId);
    if (!patient) {
      return NextResponse.json(
        { success: false, message: 'Paciente no encontrado' },
        { status: 404 }
      );
    }

    // 2. Calcular patientHash consistente con el resto del sistema
    //    Usamos deidentifyPatient igual que en /api/treatment/route.ts
    const anonymized = deidentifyPatient({
      name: patient.name,
      dob: patient.dob,
      symptoms: '', // No hay síntomas en este contexto, solo identidad
      medicalHistory: '',
    }, patient.patientId || undefined);

    const patientHash = anonymized.patientHash;

    // 3. Obtener consultas por ehrId (más confiable que por hash cuando patientId cambia)
    const consultationsRaw = getConsultationsByEhrId(ehrId, 100);
    const consultations = consultationsRaw.length > 0 
  ? consultationsRaw 
  : getConsultationsByPatientHash(patientHash, 100);

    // 4. Estadísticas usando el hash (getPatientStats busca por ehrId internamente)
    const stats = getPatientStats(patientHash);

    return NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        ehrId: patient.ehrId,
        name: patient.name,
        dob: patient.dob,
        email: patient.email,
        phone: patient.phone,
        address: patient.address,
        patientId: patient.patientId,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      },
      // Pasamos el hash al frontend para que lo use en consultas manuales
      patientHash,
            consultations: consultations.map((c) => {
        // SQLite guarda JSON como string; parsear si es necesario
        let points = c.points;
        let herbs = c.herbs;
        if (typeof points === 'string') {
          try { points = JSON.parse(points); } catch { points = null; }
        }
        if (typeof herbs === 'string') {
          try { herbs = JSON.parse(herbs); } catch { herbs = null; }
        }

        return {
          id: c.id,
          consultationDate: c.consultationDate,
          syndrome: c.syndrome,
          kantStatus: c.kantStatus,
          kantScore: c.kantScore,
          symptoms: c.symptoms?.substring(0, 200) + (c.symptoms && c.symptoms.length > 200 ? '...' : ''),
          isTest: c.isTest,
          llmModel: c.llmModel,
          hasNotebookLM: !!c.rationale && c.llmModel !== 'MANUAL_ENTRY',
          points: points || [],
          herbs: herbs || [],
          rationale: c.rationale || null,
          reasoning: c.reasoning || null,
        };
      }),
      stats: {
        totalConsultations: stats.totalConsultations,
        lastConsultationDate: stats.lastConsultationDate,
        averageKantScore: stats.averageKantScore,
        kantStatusDistribution: stats.kantStatusDistribution,
      },
    });

  } catch (error: any) {
    console.error('[API Patient Detail]', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}