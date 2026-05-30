"use client";

import React from "react";

interface Props {
  data?: any;
  onValidated: () => void;
  onReject: () => void;
}

export default function KantResult({ data, onValidated, onReject }: Props) {
  // La respuesta del backend pone la seguridad en data.safety, no en data.kant
  const safety = data?.safety || {};
  const status = safety.status || "unknown"; // "green", "yellow", "red"
  const alerts = safety.alerts || [];
  const contraindications = safety.contraindications || [];
  const auditTrail = safety.auditTrail || [];

  // Mapeo del backend a los colores de la UI
  const statusMap: Record<string, { label: string; class: string; canProceed: boolean }> = {
    green: { label: "VERDE", class: "text-jade bg-jade-50 border-jade-200", canProceed: true },
    yellow: { label: "AMARILLO", class: "text-gold bg-gold-50 border-gold-200", canProceed: true },
    red: { label: "ROJO", class: "text-terra bg-terra-50 border-terra-200", canProceed: false },
    unknown: { label: "PENDIENTE", class: "text-slate bg-stone-50 border-stone-200", canProceed: false },
  };

  const verdict = statusMap[status] || statusMap.unknown;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Tarjeta de veredicto */}
      <div className={`glass-strong rounded-2xl p-6 sm:p-8 border-l-4 ${verdict.class.split(" ")[2] || "border-stone-300"}`}>
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${status === "red" ? "bg-terra-100 animate-pulse-terra" : "bg-jade-100"}`}>
            <svg className={`w-6 h-6 ${status === "red" ? "text-terra-600" : "text-jade-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-ink mb-1">Resultado de Validación KANT</h3>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border ${verdict.class}`}>
              <span className="uppercase">{verdict.label}</span>
            </div>
            <p className="text-sm text-slate mt-2">
              Estado de seguridad: <strong>{status}</strong>
              {data?.ehr?.id && <> · Consulta #{data.ehr.id}</>}
            </p>
          </div>
        </div>

        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-ink mb-2">Alertas detectadas ({alerts.length})</h4>
            <div className="space-y-2">
              {alerts.map((alert: any, i: number) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-terra-50 border border-terra-100">
                  <span className="text-terra text-xs font-bold uppercase mt-0.5">{alert.severity || "WARN"}</span>
                  <div>
                    <p className="text-sm text-ink font-medium">{alert.message || alert.rule || JSON.stringify(alert)}</p>
                    <p className="text-xs text-slate">{alert.category || "General"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contraindicaciones */}
        {contraindications.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-ink mb-2">Contraindicaciones ({contraindications.length})</h4>
            <div className="space-y-2">
              {contraindications.map((c: any, i: number) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-terra-50 border border-terra-100">
                  <span className="text-terra text-xs font-bold uppercase mt-0.5">{c.severity || "ALTA"}</span>
                  <p className="text-sm text-ink">{c.reason || c.message || JSON.stringify(c)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit trail (trazabilidad) */}
        {auditTrail.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-ink mb-2">Trazabilidad ({auditTrail.length})</h4>
            <ul className="space-y-1">
              {auditTrail.map((entry: string, i: number) => (
                <li key={i} className="text-xs text-slate font-mono">• {entry}</li>
              ))}
            </ul>
          </div>
        )}

        {alerts.length === 0 && contraindications.length === 0 && (
          <div className="p-4 rounded-lg bg-jade-50 border border-jade-100">
            <p className="text-sm text-jade-dark font-medium">✓ Ninguna violación detectada. El caso cumple con los filtros de seguridad.</p>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onReject}
          className="btn-outline flex-1 py-3 px-6 rounded-xl text-sm font-medium"
        >
          Rechazar y volver al formulario
        </button>
        <button
          onClick={onValidated}
          disabled={!verdict.canProceed}
          className={`btn-primary flex-1 py-3 px-6 rounded-xl text-sm font-medium ${
            !verdict.canProceed ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {verdict.canProceed ? "Validar y continuar →" : "Veredicto bloqueante"}
        </button>
      </div>
    </div>
  );
}