/**
 * API Route: /api/ehr/[hash]
 * GET: Historial completo de un paciente
 * DELETE: Eliminar una consulta específica (por ID en body)
 * CDSS MTC Premium v2.1 — Drizzle ORM
 */

import { NextRequest, NextResponse } from "next/server";
import { getConsultationsByPatient, getPatientStats, deleteConsultation } from "@/lib/ehr/store";
import { type EHRQuery } from "@/lib/ehr/store";

export async function GET(
  req: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash } = params;
    const { searchParams } = new URL(req.url);

    const query: EHRQuery = {
      patientHash: hash,
      dateFrom: searchParams.get("from") || undefined,
      dateTo: searchParams.get("to") || undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
    };

    const consultations = getConsultationsByPatient(hash);
    const stats = getPatientStats(hash);

    return NextResponse.json({
      patientHash: hash,
      stats,
      consultations,
      count: consultations.length,
      timestamp: new Date().toISOString(),
    }, { status: 200 });

  } catch (error: any) {
    console.error("[EHR API GET]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id || typeof id !== "number") {
      return NextResponse.json(
        { error: "INVALID_ID", message: "Se requiere id numérico" },
        { status: 400 }
      );
    }

    const deleted = deleteConsultation(id);

    return NextResponse.json({
      success: deleted,
      message: deleted ? "Consulta eliminada" : "Consulta no encontrada",
      timestamp: new Date().toISOString(),
    }, { status: deleted ? 200 : 404 });

  } catch (error: any) {
    console.error("[EHR API DELETE]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message },
      { status: 500 }
    );
  }
}