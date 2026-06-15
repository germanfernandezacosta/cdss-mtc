// src/app/api/documents/[id]/route.ts
// Descargar PDF por ID — CDSS MTC Premium v3.0

import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById } from '@/lib/ehr/store';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'INVALID_ID', message: 'ID de documento inválido' },
        { status: 400 }
      );
    }

    const doc = getDocumentById(id);
    if (!doc) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // Devolver como descarga de archivo
    return new NextResponse(doc.fileData as unknown as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${doc.fileName}"`,
        'Content-Length': String((doc.fileData as Buffer).length),
      },
    });

  } catch (error: any) {
    console.error('[API Document GET]', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error.message },
      { status: 500 }
    );
  }
}