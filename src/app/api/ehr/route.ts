/**
 * API Route: /api/ehr
 * POST: Guardar nueva consulta en EHR persistente
 * CDSS MTC Premium v2.1 — Drizzle ORM
 */

import { NextRequest, NextResponse } from "next/server";
import { saveConsultation } from "@/lib/ehr/store";
import { type NewConsultation } from "@/lib/ehr/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validación mínima
    if (!body.patientHash || !body.consultationDate) {
      return NextResponse.json(
        { error: "MISSING_FIELDS", message: "patientHash y consultationDate son obligatorios" },
        { status: 400 }
      );
    }

    // Drizzle valida tipos automáticamente en tiempo de compilación
    // pero hacemos validación runtime para campos críticos
    const record: NewConsultation = {
      ehrId: "TEMP-EHR",
      patientHash: body.patientHash,
      consultationDate: body.consultationDate,
      patientAge: body.patientAge,
      patientGender: body.patientGender,
      symptoms: body.symptoms,
      diagnosis: body.diagnosis,
      syndrome: body.syndrome,
      points: body.points,
      herbs: body.herbs,
      rationale: body.rationale,
      kantStatus: body.kantStatus,
      kantScore: body.kantScore,
      kantAlerts: body.kantAlerts,
      kantContraindications: body.kantContraindications,
      kantAuditTrail: body.kantAuditTrail,
      ragCitations: body.ragCitations,
      llmModel: body.llmModel,
      foucaultPdfPath: body.foucaultPdfPath,
      foucaultForensicHash: body.foucaultForensicHash,
      foucaultEmpathicHash: body.foucaultEmpathicHash,
      ahpraFlags: body.ahpraFlags,
      chainOfCustody: body.chainOfCustody,
    };

    const id = saveConsultation(record);

    return NextResponse.json({
      success: true,
      id,
      message: "Consulta guardada en EHR (ACID transaction)",
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error: any) {
    console.error("[EHR API POST]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message },
      { status: 500 }
    );
  }
}