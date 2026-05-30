"use client";

import React from "react";

interface Props {
  data?: any;
  onContinue: () => void;
}

export default function FukuokaResult({ data, onContinue }: Props) {
  // El backend devuelve los datos directamente, no dentro de un objeto "fukuoka"
  const syndrome = data?.syndrome || "Patrón no identificado";
  const points = data?.points || [];
  const herbs = data?.herbs || [];
  const rationale = data?.rationale || "";
  const citations = data?.citations || [];
  const model = data?.model || "";

  return (
    <div className="space-y-6">
      {/* Síndrome principal */}
      <div className="card-premium card-jade p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="badge-jade">Patrón Zang-Fu Principal</span>
          {model && <span className="text-xs text-ash">{model}</span>}
        </div>
        <h3 className="text-xl font-semibold text-jade-dark mb-2">{syndrome}</h3>
        {rationale && (
          <p className="text-sm text-slate leading-relaxed">{rationale}</p>
        )}
      </div>

      {/* Puntos de acupuntura */}
      {points.length > 0 && (
        <div className="card-premium p-6 border-t-4 border-terra-400">
          <div className="flex items-center gap-2 mb-4">
            <span className="badge-terra">Puntos de Acupuntura</span>
            <span className="text-xs text-slate">{points.length} recomendados</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {points.map((point: any, i: number) => (
              <div key={i} className="p-4 rounded-xl bg-stone-50 border border-stone-100">
                <h4 className="text-sm font-semibold text-ink mb-1">{point.name || point.point || `Punto ${i + 1}`}</h4>
                <p className="text-xs text-slate mb-1.5">{point.location || ""}</p>
                <p className="text-xs text-jade-dark">{point.indication || ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fórmula herbal */}
      {herbs.length > 0 && (
        <div className="card-premium p-6 border-t-4 border-gold-400">
          <div className="flex items-center gap-2 mb-4">
            <span className="badge-gold">Fórmula Herbal</span>
          </div>
          <div className="space-y-3">
            {herbs.map((herb: any, i: number) => (
              <div key={i} className="flex items-start justify-between p-3 rounded-lg bg-gold-50 border border-gold-100">
                <div>
                  <p className="text-sm font-medium text-ink">{herb.name || herb.herb || `Hierba ${i + 1}`}</p>
                  <p className="text-xs text-slate">{herb.preparation || ""}</p>
                </div>
                <span className="text-sm font-semibold text-gold-dark">{herb.dose || ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Citas del RAG */}
      {citations.length > 0 && (
        <div className="card-premium p-5 bg-stone-50">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge-jade text-[10px]">Evidencia RAG</span>
            <span className="text-xs text-slate">{citations.length} citas</span>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {citations.map((citation: any, i: number) => (
              <div key={i} className="text-xs text-slate border-l-2 border-jade-200 pl-3">
                <p className="font-medium text-ink mb-0.5">{citation.document || "Documento"}</p>
                <p className="italic leading-relaxed opacity-80 line-clamp-4">{citation.excerpt || ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón continuar */}
      <div className="text-center">
        <button
          onClick={onContinue}
          className="btn-primary py-3 px-8 rounded-xl text-sm font-medium inline-flex items-center gap-2"
        >
          Generar documentación FOUCAULT
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}