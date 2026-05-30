"use client";

import React from "react";

interface Props {
  data?: any;
  onNewConsultation: () => void;
}

export default function FoucaultDocs({ data, onNewConsultation }: Props) {
  const foucault = data?.foucault || {};
  const forensicHash = foucault.forensicHash || "—";
  const empathicHash = foucault.empathicHash || "—";
  const ahpraFlags = foucault.ahpraFlags || [];
  const pdfs = foucault.pdfs || {};

  const downloadBase64 = (base64String: string, filename: string) => {
    if (!base64String) {
      alert("El documento no está disponible");
      return;
    }
    try {
      const byteCharacters = atob(base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const isHtml = byteCharacters.trim().toLowerCase().startsWith("<!doctype") || 
                     byteCharacters.trim().toLowerCase().startsWith("<html");
      const mimeType = isHtml ? "text/html" : "application/pdf";
      const extension = isHtml ? ".html" : ".pdf";
      const blob = new Blob([byteArray], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al descargar:", error);
      alert("Error al generar la descarga.");
    }
  };

  const hasForensic = !!pdfs.forensic;
  const hasEmpathic = !!pdfs.empathic;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        {/* FORENSE */}
        <div className="card-premium p-6 border-t-4 border-jade-500 bg-white rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-jade-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-jade-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-ink">Informe Técnico Forense</h3>
              <p className="text-xs text-slate">Para archivo clínico profesional</p>
            </div>
          </div>

          <div className="space-y-2.5 mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-slate">Hash SHA-256:</span>
              <span className="text-ink font-mono text-[10px] truncate max-w-[150px]">{forensicHash}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate">Estado AHPRA:</span>
              <span className={ahpraFlags.length === 0 ? "text-jade font-semibold" : "text-terra font-semibold"}>
                {ahpraFlags.length === 0 ? "✓ Limpio" : `${ahpraFlags.length} flags`}
              </span>
            </div>
          </div>

          <button
            onClick={() => downloadBase64(pdfs.forensic, "informe-forense")}
            disabled={!hasForensic}
            className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all duration-200 ${
              hasForensic
                ? "bg-jade-50 border border-jade-200 text-jade-800 hover:bg-jade-100 hover:border-jade-300 hover:shadow-md active:scale-[0.98]"
                : "bg-stone border border-stone text-ash cursor-not-allowed"
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${hasForensic ? "bg-jade-200" : "bg-gray-300"}`}>
              <svg className="w-3.5 h-3.5 text-jade-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            {hasForensic ? "Descargar informe forense" : "Documento no disponible"}
          </button>
        </div>

        {/* EMPÁTICO */}
        <div className="card-premium p-6 border-t-4 border-gold-500 bg-white rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gold-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-gold-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-ink">Documento Educativo Empático</h3>
              <p className="text-xs text-slate">Para el paciente</p>
            </div>
          </div>

          <div className="space-y-2.5 mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-slate">Hash SHA-256:</span>
              <span className="text-ink font-mono text-[10px] truncate max-w-[150px]">{empathicHash}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate">Tono:</span>
              <span className="text-gold font-semibold">Empático / Educativo</span>
            </div>
          </div>

          <button
            onClick={() => downloadBase64(pdfs.empathic, "plan-bienestar")}
            disabled={!hasEmpathic}
            className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all duration-200 ${
              hasEmpathic
                ? "bg-gold-50 border border-gold-200 text-gold-800 hover:bg-gold-100 hover:border-gold-300 hover:shadow-md active:scale-[0.98]"
                : "bg-stone border border-stone text-ash cursor-not-allowed"
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${hasEmpathic ? "bg-gold-200" : "bg-gray-300"}`}>
              <svg className="w-3.5 h-3.5 text-gold-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            {hasEmpathic ? "Descargar para paciente" : "Documento no disponible"}
          </button>
        </div>
      </div>

      {/* Botón nueva consulta */}
      <div className="flex justify-center pt-6 pb-2">
        <button
          onClick={onNewConsultation}
          className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl shadow-lg hover:shadow-xl hover:from-slate-700 hover:to-slate-800 transition-all duration-300 transform hover:-translate-y-0.5"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="text-left">
            <span className="block text-sm font-bold">Nueva consulta</span>
            <span className="block text-[10px] text-white/70 font-medium">Volver al formulario de anamnesis</span>
          </div>
          <svg className="w-5 h-5 text-white/50 group-hover:text-white/80 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}