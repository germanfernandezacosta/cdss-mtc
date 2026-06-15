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

// 12 meridianos Ryodoraku
const RYODORAKU_MERIDIANS = [
  { code: "LU", name: "Pulmón" },
  { code: "LI", name: "Int. Grueso" },
  { code: "ST", name: "Estómago" },
  { code: "SP", name: "Bazo" },
  { code: "HT", name: "Corazón" },
  { code: "SI", name: "Int. Delgado" },
  { code: "BL", name: "Vejiga" },
  { code: "KI", name: "Riñón" },
  { code: "PC", name: "Pericardio" },
  { code: "TE", name: "T. Recalentador" },
  { code: "GB", name: "Vesícula Biliar" },
  { code: "LR", name: "Hígado" },
];

interface Props {
  onSubmit: (data: FormData) => void;
}

export interface FormData {
  patientId?: string; // opcional, para edición de anamnesis existente
  patientName: string;
  patientAge: string;
  patientGender: "M" | "F" | "";
  symptoms: string;
  pulse: string;
  tongue: string;
  ryodoraku: Record<string, string>; // ← ahora es objeto, no string
  medicalHistory: string;
  safetyAlerts: Record<string, boolean>;
}

/* ═══════════════════════════════════════════
   UTILIDADES DE VALIDACIÓN (sin tocar estética)
   ═══════════════════════════════════════════ */
const blockNonNumericKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (["e", "E", "-", "+", ".", ","].includes(e.key)) {
    e.preventDefault();
  }
};

const blockNumericKeys = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  if (/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

const sanitizeNumeric = (val: string, max: number) => {
  const cleaned = val.replace(/[^0-9]/g, "");
  if (cleaned === "") return "";
  const num = parseInt(cleaned, 10);
  if (num > max) return String(max);
  return cleaned;
};

const sanitizeTextNoNumbers = (val: string) => {
  return val.replace(/[0-9]/g, "");
};

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
  const [patientId, setPatientId] = useState(""); // opcional, para edición de anamnesis existente
  const [symptoms, setSymptoms] = useState("");
  const [pulse, setPulse] = useState("");
  const [tongue, setTongue] = useState("");
  const [ryodoraku, setRyodoraku] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    RYODORAKU_MERIDIANS.forEach((m) => (init[m.code] = ""));
    return init;
  });
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
      patientId,
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

  const handleRyodorakuChange = (code: string, val: string) => {
    const cleaned = sanitizeNumeric(val, 999); // máximo 999 por meridiano
    setRyodoraku((prev) => ({ ...prev, [code]: cleaned }));
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
            <div className="grid grid-cols-[1fr_80px_90px_100px] gap-3">
              <div>
                <label className="block text-sm font-medium text-slate mb-1.5">
                  Nombre del paciente
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(sanitizeTextNoNumbers(e.target.value))}
                  onKeyDown={blockNumericKeys}
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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={patientAge}
                  onChange={(e) => setPatientAge(sanitizeNumeric(e.target.value, 120))}
                  onKeyDown={blockNonNumericKeys}
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

                          <div>
                <label className="block text-sm font-medium text-slate mb-1.5">
                  Nº Historia
                </label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value.toUpperCase())}
                  placeholder="HC-001"
                  className="input-premium text-center text-xs"
                />
              </div>

            {/* Síntomas */}
            <div>
              <label className="block text-sm font-medium text-slate mb-1.5">
                Síntomas principales
              </label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(sanitizeTextNoNumbers(e.target.value))}
                onKeyDown={blockNumericKeys}
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
                onChange={(e) => setMedicalHistory(sanitizeTextNoNumbers(e.target.value))}
                onKeyDown={blockNumericKeys}
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
                onChange={(e) => setTongue(sanitizeTextNoNumbers(e.target.value))}
                onKeyDown={blockNumericKeys}
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
                onChange={(e) => setPulse(sanitizeTextNoNumbers(e.target.value))}
                onKeyDown={blockNumericKeys}
                placeholder="Ej: Pulso superficial y rápido (Shu) en cun izquierda, profundo y lento (Chen) en chi derecha..."
                rows={4}
                className="input-premium resize-none"
              />
            </div>

            {/* Ryodoraku — 12 inputs numéricos */}
            <div>
              <label className="block text-sm font-medium text-slate mb-1.5">
                Medición Ryodoraku (conductancia por meridiano)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {RYODORAKU_MERIDIANS.map((m) => (
                  <div key={m.code} className="flex flex-col">
                    <span className="text-[10px] text-ash uppercase tracking-wider mb-0.5">
                      {m.code} <span className="text-fog">({m.name})</span>
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={ryodoraku[m.code]}
                      onChange={(e) => handleRyodorakuChange(m.code, e.target.value)}
                      onKeyDown={blockNonNumericKeys}
                      placeholder="0"
                      className="input-premium text-center text-sm py-1.5"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-ash mt-1.5">
                Valores numéricos de conductancia eléctrica por meridiano. Opcional.
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