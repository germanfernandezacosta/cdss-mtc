// src/app/api/patients/route.ts
// CRUD Pacientes — CDSS MTC Premium v3.0

import { NextRequest, NextResponse } from 'next/server';
import { createPatient, getPatientByEhrId, getPatientByPatientId, searchPatients } from '@/lib/ehr/store';
import { deidentifyPatient } from '@/lib/privacy/deidentify';

export interface CreatePatientRequest {
  name: string;
  dob: string;        // YYYY-MM-DD
  email?: string;
  phone?: string;
  address?: string;
  patientId?: string; // Opcional: solo si el terapeuta ya lo tiene
}

export async function POST(req: NextRequest) {
  try {
    const body: CreatePatientRequest = await req.json();

    // Validación mínima
    if (!body.name || !body.dob) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'Nombre y fecha de nacimiento son obligatorios' },
        { status: 400 }
      );
    }

    // Verificar si patientId ya existe (si se proporcionó)
    if (body.patientId) {
      const existing = getPatientByPatientId(body.patientId);
      if (existing) {
        return NextResponse.json(
          { error: 'DUPLICATE_PATIENT_ID', message: `El ID ${body.patientId} ya existe`, existingEhrId: existing.ehrId },
          { status: 409 }
        );
      }
    }

    // Crear paciente
    const ehrId = createPatient({
      name: body.name,
      dob: body.dob,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      patientId: body.patientId || null,
    });

    // Generar hash para uso interno
    const anonymized = deidentifyPatient({
      name: body.name,
      dob: body.dob,
      email: body.email,
      symptoms: ''
    }, body.patientId || null);

    return NextResponse.json({
      success: true,
      ehrId,
      patientHash: anonymized.patientHash,
      message: body.patientId 
        ? 'Paciente creado con historial clínico activado'
        : 'Paciente creado. Asigne un Nº Historia después de la primera consulta.',
    }, { status: 201 });

  } catch (error: any) {
    console.error('[API Patients POST]', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    if (!q) {
      return NextResponse.json(
        { error: 'MISSING_QUERY', message: 'Parámetro q requerido' },
        { status: 400 }
      );
    }

    const results = searchPatients(q);
    return NextResponse.json({ success: true, patients: results }, { status: 200 });

  } catch (error: any) {
    console.error('[API Patients GET]', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error.message },
      { status: 500 }
    );
  }
}