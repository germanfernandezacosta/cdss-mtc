"use client";

import React, { useState, useCallback } from "react";

/* ═══════════════════════════════════════════
   TIPOS
   ═══════════════════════════════════════════ */
interface SafetyAlert {
  id: string;
  label: string;
  description: string;
  severity: "high" | "medium";
}

const SAFETY_ALERTS: SafetyAlert[] = [
  {
    id: "pregnancy",
    label: "Embarazo Activo",
    description: "Contraindicaciones específicas en puntos abdominales/lumbares",
    severity: "high",
  },
  {
    id: "pacemaker",
    label: "Marcapasos",
    description: "Evitar electroacupuntura y estimulación eléctrica",
    severity: "high",
  },
  {
    id: "anticoagulants",
    label: "Anticoagulantes",
    description: "Riesgo aumentado de hematomas en punción",
    severity: "medium",
  },
  {
    id: "epilepsy",
    label: "Epilepsia",
    description: "Precaución con estimulación intensa o ciertos puntos craneales",
    severity: "medium",
  },
];

interface Props {
  onSubmit: (data: FormData) => void;
}

export interface FormData {
  patientName: string;
  patientAge: string;
  patientGender: "M" | "F" | "";
  symptoms: string;
  pulse: string;
  tongue: string;
  ryodoraku: string;
  medicalHistory: string;
  safetyAlerts: Record<string, boolean>;
}

/* ═══════════════════════════════════════════
   COMPONENTE WIZARD PREMIUM
   ═══════════════════════════════════════════ */
export default function PremiumForm({ onSubmit }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // ─── Datos del formulario ───
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState<"M" | "F" | "">("");
  const [symptoms, setSymptoms] = useState("");
  const [pulse, setPulse] = useState("");
  const [tongue, setTongue] = useState("");
  const [ryodoraku, setRyodoraku] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [safetyAlerts, setSafetyAlerts] = useState<Record<string, boolean>>({
    pregnancy: false,
    pacemaker: false,
    anticoagulants: false,
    epilepsy: false,
  });

  // ─── Validación por paso ───
  const isStep1Valid = patientName.trim().length > 0 && symptoms.trim().length > 3 && patientGender !== "";
  const isStep2Valid = tongue.trim().length > 0;

  // ─── Navegación con transición ───
  const goToStep = useCallback((nextStep: 1 | 2) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsTransitioning(false);
    }, 300);
  }, []);

  const handleNext = () => {
    if (isStep1Valid) goToStep(2);
  };

  const handleBack = () => {
    goToStep(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep2Valid) return;
    onSubmit({
      patientName,
      patientAge,
      patientGender,
      symptoms,
      pulse,
      tongue,
      ryodoraku,
      medicalHistory,
      safetyAlerts,
    });
  };

  const toggleAlert = (id: string) => {
    setSafetyAlerts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <div className="glass-strong rounded-2xl p-6 sm:p-8">
        {/* Header del wizard */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-ink">
            {step === 1 ? "Datos de la Anamnesis" : "Exploración y Seguridad"}
          </h3>
          <div className="flex justify-center gap-2 mt-3">
            <span className={`w-8 h-1.5 rounded-full transition-colors ${step === 1 ? "bg-jade" : "bg-jade-200"}`} />
            <span className={`w-8 h-1.5 rounded-full transition-colors ${step === 2 ? "bg-jade" : "bg-stone"}`} />
          </div>
        </div>

        {/* ═══════ PASO 1: ANAMNESIS ═══════ */}
        <div className={`transition-all duration-500 ease-out ${
          isTransitioning ? "opacity-0 translate-x-4" : step === 1 ? "opacity-100 translate-x-0" : "hidden opacity-0 -translate-x-4"
        }`}>
          <div className="space-y-5">
            {/* Fila: Nombre + Edad + Sexo */}
            <div className="grid grid-cols-[1fr_80px_90px] gap-3">
              <div>
                <label className="block text-sm font-medium text-slate mb-1.5">
                  Nombre del paciente
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Ej: María García López"
                  className="input-premium"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate mb-1.5">
                  Edad
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  placeholder="45"
                  className="input-premium text-center"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate mb-1.5">
                  Sexo
                </label>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value as "M" | "F" | "")}
                  className="input-premium"
                  required
                >
                  <option value="">—</option>
                  <option value="M">H</option>
                  <option value="F">M</option>
                </select>
              </div>
            </div>

            {/* Síntomas */}
            <div>
              <label className="block text-sm font-medium text-slate mb-1.5">
                Síntomas principales
              </label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Describa los síntomas observados: dolor, fatiga, insomnio, alteraciones digestivas, estado emocional..."
                rows={5}
                className="input-premium resize-none"
                required
              />
              <p className="text-xs text-ash mt-1.5">
                Sea específico: localización, intensidad, duración, factores agravantes/aliviantes.
              </p>
            </div>

            {/* Historia médica */}
            <div>
              <label className="block text-sm font-medium text-slate mb-1.5">
                Historia médica / Antecedentes
              </label>
              <textarea
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
                placeholder="Enfermedades previas, cirugías, tratamientos actuales, alergias conocidas..."
                rows={3}
                className="input-premium resize-none"
              />
            </div>
          </div>

          {/* Botón siguiente */}
          <div className="pt-6 mt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={handleNext}
              disabled={!isStep1Valid}
              className={`btn-primary w-full text-base flex items-center justify-center gap-2 transition-all duration-300 ${
                !isStep1Valid ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Siguiente: Exploración y Seguridad
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            {!isStep1Valid && (
              <p className="text-xs text-ash text-center mt-2">
                Complete el nombre, sexo y síntomas para continuar
              </p>
            )}
          </div>
        </div>

        {/* ═══════ PASO 2: EXPLORACIÓN Y SEGURIDAD ═══════ */}
        <div className={`transition-all duration-500 ease-out ${
          isTransitioning ? "opacity-0 translate-x-4" : step === 2 ? "opacity-100 translate-x-0" : "hidden opacity-0 translate-x-4"
        }`}>
          <div className="space-y-5">
            {/* Lengua */}
            <div>
              <label className="block text-sm font-medium text-slate mb-1.5">
                Diagnóstico de la lengua
              </label>
              <textarea
                value={tongue}
                onChange={(e) => setTongue(e.target.value)}
                placeholder="Color, forma, recubrimiento lingual, humedad, movimientos involuntarios..."
                rows={4}
                className="input-premium resize-none"
                required
              />
            </div>

            {/* Pulso */}
            <div>
              <label className="block text-sm font-medium text-slate mb-1.5">
                Lectura del pulso
              </label>
              <textarea
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                placeholder="Ej: Pulso superficial y rápido (Shu) en cun izquierda, profundo y lento (Chen) en chi derecha..."
                rows={4}
                className="input-premium resize-none"
              />
            </div>

            {/* Ryodoraku */}
            <div>
              <label className="block text-sm font-medium text-slate mb-1.5">
                Medición Ryodoraku
              </label>
              <textarea
                value={ryodoraku}
                onChange={(e) => setRyodoraku(e.target.value)}
                placeholder="Valores por meridiano (LU, LI, ST, SP, HT, SI, BL, KI, PC, TE, GB, LR)..."
                rows={3}
                className="input-premium resize-none"
              />
              <p className="text-xs text-ash mt-1.5">
                Opcional. Valores numéricos de conductancia eléctrica por meridiano.
              </p>
            </div>

            {/* Alertas de seguridad KANT */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 bg-terra-500 rounded-full" />
                <h4 className="text-sm font-semibold text-terra-dark">
                  Alertas de Seguridad (KANT)
                </h4>
                <span className="badge-terra text-[10px]">Obligatorio revisar</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {SAFETY_ALERTS.map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => toggleAlert(alert.id)}
                    className={`relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                      safetyAlerts[alert.id]
                        ? alert.severity === "high"
                          ? "border-terra-400 bg-terra-50 shadow-glow-terra"
                          : "border-gold-400 bg-gold-50 shadow-glow-gold"
                        : "border-stone bg-white/50 hover:border-ash"
                    }`}
                  >
                    {/* Toggle switch visual */}
                    <div className={`w-11 h-6 rounded-full flex-shrink-0 relative transition-colors duration-300 ${
                      safetyAlerts[alert.id]
                        ? alert.severity === "high"
                          ? "bg-terra-500"
                          : "bg-gold-500"
                        : "bg-fog"
                    }`}>
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                        safetyAlerts[alert.id] ? "translate-x-5" : "translate-x-0.5"
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink">
                          {alert.label}
                        </span>
                        {alert.severity === "high" && (
                          <span className="badge-terra text-[10px] py-0.5 px-1.5">
                            Alta
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ash mt-0.5 leading-relaxed">
                        {alert.description}
                      </p>
                      {safetyAlerts[alert.id] && (
                        <p className={`text-xs font-semibold mt-1 ${
                          alert.severity === "high" ? "text-terra" : "text-gold"
                        }`}>
                          ✓ Seleccionado
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-6 mt-2 border-t border-border-subtle flex gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="btn-secondary flex-shrink-0 text-sm"
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </button>

            <button
              type="submit"
              disabled={!isStep2Valid}
              className={`btn-primary flex-1 text-base flex items-center justify-center gap-2 transition-all duration-300 ${
                !isStep2Valid ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0=.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Iniciar Diagnóstico FUKUOKA-H
            </button>
          </div>

          {!isStep2Valid && (
            <p className="text-xs text-ash text-center mt-2">
              Complete el diagnóstico de la lengua para iniciar
            </p>
          )}
        </div>
      </div>
    </form>
  );
}