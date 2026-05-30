"use client";

import React from "react";

interface Props {
  workflowState: string;
  onReset?: () => void;
}

export default function PremiumHeader({ workflowState, onReset }: Props) {
  return (
    <header className="sticky top-0 z-50 glass border-b border-white/20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-jade-400 to-jade-600 flex items-center justify-center shadow-glow-jade">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-ink leading-tight">CDSS MTC</h1>
            <p className="text-[10px] text-ash uppercase tracking-wider">Sistema Clínico Premium</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`badge-${workflowState === "loading" ? "jade" : workflowState === "kant" ? "terra" : workflowState === "fukuoka" ? "jade" : workflowState === "foucault" ? "gold" : "jade"}`}>
            {workflowState === "idle" ? "Listo" : workflowState === "loading" ? "Procesando..." : workflowState === "kant" ? "Validación" : workflowState === "fukuoka" ? "Resultados" : "Documentos"}
          </span>
          
          {onReset && (
            <button
              onClick={onReset}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Nueva consulta
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
