// src/app/api/documents/route.ts
// Guardar PDFs generados como BLOB — CDSS MTC Premium v3.0

import { NextRequest, NextResponse } from 'next/server';
import { saveDocument } from '@/lib/ehr/store';

export interface SaveDocumentRequest {
  ehrId: string;
  consultationId?: number;
  type: 'forensic' | 'empathic';
  fileName: string;
  fileData: string; // Base64 encoded PDF
}

export async function POST(req: NextRequest) {
  try {
    const body: SaveDocumentRequest = await req.json();

    if (!body.ehrId || !body.type || !body.fileName || !body.fileData) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'ehrId, type, fileName y fileData son obligatorios' },
        { status: 400 }
      );
    }

    // Convertir Base64 a Buffer
    const buffer = Buffer.from(body.fileData, 'base64');

    const documentId = saveDocument({
      ehrId: body.ehrId,
      consultationId: body.consultationId || null,
      type: body.type,
      fileName: body.fileName,
      fileData: buffer,
    });

    return NextResponse.json({
      success: true,
      documentId,
      message: 'Documento guardado correctamente',
    }, { status: 201 });

  } catch (error: any) {
    console.error('[API Documents POST]', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error.message },
      { status: 500 }
    );
  }
}