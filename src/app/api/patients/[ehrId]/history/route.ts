// src/app/api/patients/[ehrId]/history/route.ts
// Historial clínico de un paciente — CDSS MTC Premium v3.0

import { NextRequest, NextResponse } from 'next/server';
import { getPatientByEhrId, getConsultationsByEhrId, getDocumentsByEhrId } from '@/lib/ehr/store';

export async function GET(
  req: NextRequest,
  { params }: { params: { ehrId: string } }
) {
  try {
    const { ehrId } = params;

    const patient = getPatientByEhrId(ehrId);
    if (!patient) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Paciente no encontrado' },
        { status: 404 }
      );
    }

    // Consultas completas
    const consultations = getConsultationsByEhrId(ehrId, 100);

    // Documentos PDF generados
    const documents = getDocumentsByEhrId(ehrId);

    return NextResponse.json({
      success: true,
      patient: {
        ehrId: patient.ehrId,
        name: patient.name,
        patientId: patient.patientId,
      },
      history: {
        totalConsultations: consultations.length,
        consultations: consultations.map(c => ({
          id: c.id,
          date: c.consultationDate,
          syndrome: c.syndrome,
          points: c.points,
          kantStatus: c.kantStatus,
          kantScore: c.kantScore,
          reasoning: c.reasoning,
        })),
      },
      documents: documents.map(d => ({
        id: d.id,
        type: d.type,
        fileName: d.fileName,
        createdAt: d.createdAt,
      })),
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API Patient History]', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error.message },
      { status: 500 }
    );
  }
}