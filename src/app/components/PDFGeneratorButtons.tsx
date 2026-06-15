/**
 * PDFGeneratorButtons.tsx
 * Botones de generación de PDFs forense y empático
 * CDSS MTC Premium v3.0 — Fase E
 */

"use client";

import { useState } from "react";
import { generateConsultationPDFs, downloadBlob, savePDFsToServer } from "@/lib/pdf-client";

interface PDFGeneratorButtonsProps {
  consultation: {
    id: number;
    consultationDate: string;
    syndrome: string;
    symptoms: string;
    kantStatus: string;
    kantScore: number;
    rationale: string | null;
    reasoning: string | null;
    points: Array<{ name: string; location: string; indication: string }> | null;
    herbs: Array<{ name: string; dose: string; preparation: string }> | null;
    llmModel: string | null;
  };
  patientName: string;
  patientHash: string;
  ehrId: string;
}

export default function PDFGeneratorButtons({
  consultation,
  patientName,
  patientHash,
  ehrId,
}: PDFGeneratorButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleGenerate = async (saveToServer: boolean = false) => {
    setLoading(true);
    try {
      const result = await generateConsultationPDFs({
        id: consultation.id,
        patientName,
        patientHash,
        consultationDate: consultation.consultationDate,
        syndrome: consultation.syndrome,
        symptoms: consultation.symptoms,
        rationale: consultation.rationale,
        reasoning: consultation.reasoning,
        points: consultation.points,
        herbs: consultation.herbs,
        kantStatus: consultation.kantStatus,
        kantScore: consultation.kantScore,
        llmModel: consultation.llmModel,
      });

      // Descargar ambos PDFs
      downloadBlob(result.forensicBlob, result.forensicFileName);
      downloadBlob(result.empathicBlob, result.empathicFileName);

      // Opcional: guardar en servidor
      if (saveToServer) {
        const savedIds = await savePDFsToServer(result, ehrId, consultation.id);
        console.log('[PDFs] Guardados en servidor:', savedIds);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('[PDFs] Error generando:', error);
      alert('Error generando PDFs: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-100 rounded-lg p-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => handleGenerate(false)}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generando...
            </>
          ) : (
            <>
              📄 Descargar PDFs
            </>
          )}
        </button>
        <button
          onClick={() => handleGenerate(true)}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {saved ? '✅ Guardado' : '💾 Guardar y descargar'}
        </button>
      </div>
      {saved && (
        <p className="text-xs text-emerald-600 text-center mt-2">
          PDFs guardados en el historial del paciente
        </p>
      )}
    </div>
  );
}