"use client";

import React from "react";

interface ErrorScreenProps {
  error: {
    type: string;
    message: string;
    reason?: string;
    dialogueHistory?: any[];
    lastProposal?: any;
    safety?: any;
    ehr?: any;
  } | null;
  onReset: () => void;
}

export default function ErrorScreen({ error, onReset }: ErrorScreenProps) {
  if (!error) return null;

  const isHumanRequired = error.type === 'HUMAN_REQUIRED';
  const isSafetyBlocked = error.type === 'SAFETY_BLOCKED';
  const isNetworkError = error.type === 'NETWORK_ERROR';

  return (
    <section className="min-h-[60vh] flex flex-col items-center justify-center transition-all duration-700">
      <div className="glass-strong rounded-2xl p-10 sm:p-14 max-w-2xl w-full text-center">
        
        {/* Icono según tipo de error */}
        <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
          isHumanRequired ? "bg-gold-100" : isSafetyBlocked ? "bg-terra-100" : "bg-slate-100"
        }`}>
          <svg className={`w-10 h-10 ${
            isHumanRequired ? "text-gold-600" : isSafetyBlocked ? "text-terra-600" : "text-slate-600"
          }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {isHumanRequired ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            ) : isSafetyBlocked ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            )}
          </svg>
        </div>

        {/* Título */}
        <h2 className="text-2xl sm:text-3xl text-ink mb-3" style={{ fontFamily: "var(--font-playfair)" }}>
          {isHumanRequired ? "Control Humano Requerido" : 
           isSafetyBlocked ? "Bloqueo de Seguridad" : 
           "Error de Conexión"}
        </h2>

        {/* Mensaje principal */}
        <p className="text-slate mb-6 leading-relaxed">
          {error.message}
        </p>

        {/* Razón detallada (solo Control Humano) */}
        {error.reason && (
          <div className="p-4 rounded-xl bg-gold-50 border border-gold-200 mb-6 text-left">
            <h3 className="text-sm font-semibold text-gold-800 mb-2">Detalle del sistema:</h3>
            <p className="text-sm text-gold-700 leading-relaxed">{error.reason}</p>
          </div>
        )}

        {/* Historial del diálogo (solo Control Humano) */}
        {error.dialogueHistory && error.dialogueHistory.length > 0 && (
          <div className="mb-6 text-left">
            <h3 className="text-sm font-semibold text-ink mb-3">Historial del diálogo Fukuoka-H ↔ KANT:</h3>
            <div className="space-y-2">
              {error.dialogueHistory.map((round: any, i: number) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${
                  round.verdict === 'PASS' ? 'bg-jade-50 border border-jade-100' :
                  round.verdict === 'FAIL_SOFT' ? 'bg-gold-50 border border-gold-100' :
                  'bg-terra-50 border border-terra-100'
                }`}>
                  <span className="font-mono text-xs text-slate">#{round.attempt}</span>
                  <span className={`font-semibold ${
                    round.verdict === 'PASS' ? 'text-jade' :
                    round.verdict === 'FAIL_SOFT' ? 'text-gold' :
                    'text-terra'
                  }`}>{round.verdict}</span>
                  <span className="text-slate">Score: {round.kantScore}</span>
                  <span className="text-slate text-xs">({round.kantStatus})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Safety info (si existe) */}
        {error.safety && (
          <div className="mb-6 p-4 rounded-xl bg-terra-50 border border-terra-100 text-left">
            <h3 className="text-sm font-semibold text-terra-dark mb-2">Estado de seguridad:</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-block w-3 h-3 rounded-full ${
                error.safety.status === 'green' ? 'bg-jade' :
                error.safety.status === 'yellow' ? 'bg-gold' :
                'bg-terra'
              }`} />
              <span className="text-sm text-ink font-medium uppercase">{error.safety.status}</span>
              <span className="text-sm text-slate">Score: {error.safety.score}</span>
            </div>
            {error.safety.alerts?.length > 0 && (
              <div className="mt-2 space-y-1">
                {error.safety.alerts.map((alert: any, i: number) => (
                  <p key={i} className="text-xs text-terra-dark">• {alert.message}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EHR info (si existe) */}
        {error.ehr && (
          <div className="mb-6 text-sm text-slate">
            <p>Caso guardado en EHR con ID: <span className="font-mono text-ink">{error.ehr.id}</span></p>
            <p>Estado: <span className="font-medium text-gold">Pendiente de revisión humana</span></p>
          </div>
        )}

        {/* Botón de acción */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isNetworkError && (
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary py-3 px-6 rounded-xl text-sm font-medium"
            >
              Recargar página
            </button>
          )}
          <button
            onClick={onReset}
            className="btn-primary py-3 px-8 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Nueva consulta
          </button>
        </div>

        {/* Disclaimer legal */}
        <p className="text-[10px] text-fog mt-6">
          Este caso ha sido documentado para revisión clínica. No se ha generado ninguna prescripción automática.
        </p>
      </div>
    </section>
  );
}