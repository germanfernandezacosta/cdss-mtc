"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface FormData {
  name: string;
  dob: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  chiefComplaint: string;
  symptoms: string;
  tongue: string;
  pulse: string;
  ryodoraku: Record<string, string>;
  isPregnant: boolean;
  safetyAlerts: {
    bleedingDisorder: boolean;
    pacemaker: boolean;
    immunodeficiency: boolean;
    epilepsy: boolean;
    anticoagulants: boolean;
  };
}

const RYODORAKU_MERIDIANS = [
  { key: "lung", label: "Pulmón (V)" },
  { key: "pericardium", label: "Pericardio (MC)" },
  { key: "heart", label: "Corazón (C)" },
  { key: "smallIntestine", label: "Intestino Delgado (ID)" },
  { key: "tripleWarmer", label: "Triple Calentador (3E)" },
  { key: "largeIntestine", label: "Intestino Grueso (GI)" },
  { key: "spleen", label: "Bazo (BP)" },
  { key: "liver", label: "Hígado (F)" },
  { key: "kidney", label: "Riñón (R)" },
  { key: "bladder", label: "Vejiga (V)" },
  { key: "stomach", label: "Estómago (E)" },
  { key: "gallbladder", label: "Vesícula Biliar (VB)" },
];

export default function NewPatientForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Detectar si venimos de historial (modo seguimiento)
  const followupEhrId = searchParams.get("ehrId");
  const followupMode = searchParams.get("mode") === "followup";
  const [patientLoaded, setPatientLoaded] = useState(!followupMode);
  const [patientData, setPatientData] = useState<any>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<FormData>({
    name: "",
    dob: "",
    gender: "",
    email: "",
    phone: "",
    address: "",
    chiefComplaint: "",
    symptoms: "",
    tongue: "",
    pulse: "",
    ryodoraku: {},
    isPregnant: false,
    safetyAlerts: {
      bleedingDisorder: false,
      pacemaker: false,
      immunodeficiency: false,
      epilepsy: false,
      anticoagulants: false,
    },
  });

  // Precargar datos del paciente si venimos de historial
  useEffect(() => {
    if (followupMode && followupEhrId) {
      fetch(`/api/patients/${followupEhrId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setPatientData(data.patient);
            setFormData((prev) => ({
              ...prev,
              name: data.patient.name || "",
              dob: data.patient.dob || "",
              gender: data.patient.gender || "",
              email: data.patient.email || "",
              phone: data.patient.phone || "",
              address: data.patient.address || "",
            }));
            setPatientLoaded(true);
          }
        })
        .catch((err) => {
          console.error("Error cargando paciente:", err);
          setPatientLoaded(true);
        });
    }
  }, [followupMode, followupEhrId]);

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateRyodoraku = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      ryodoraku: { ...prev.ryodoraku, [key]: value },
    }));
  };

  const updateSafetyAlert = (key: keyof FormData["safetyAlerts"], value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      safetyAlerts: { ...prev.safetyAlerts, [key]: value },
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      let ehrId = followupEhrId;
      let patientHash = "";

      // Si es seguimiento, no creamos paciente nuevo
      if (!followupMode) {
        // 1. Crear paciente
        const patientRes = await fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            dob: formData.dob,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            address: formData.address || undefined,
          }),
        });

        const patientData = await patientRes.json();
        if (!patientData.success) {
          throw new Error(patientData.message || "Error creando paciente");
        }

        ehrId = patientData.ehrId;
        patientHash = patientData.patientHash;
      } else {
        // En seguimiento, usamos el hash del paciente existente
        patientHash = patientData?.patientHash || ehrId || "";
      }

      // 2. Enviar a tratamiento
      const treatmentRes = await fetch("/api/treatment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient: {
            name: formData.name,
            dob: formData.dob,
            gender: formData.gender || "F",
            pregnancy: formData.isPregnant,
            symptoms: formData.symptoms,
            tongue: formData.tongue,
            pulse: formData.pulse,
            ryodoraku: formData.ryodoraku,
            safetyAlerts: formData.safetyAlerts,
          },
          consultation: {
            goal: formData.chiefComplaint,
            symptoms: formData.symptoms,
            tongue: formData.tongue,
            pulse: formData.pulse,
            ryodoraku: formData.ryodoraku,
            safetyAlerts: formData.safetyAlerts,
          },
        }),
      });

      const treatmentData = await treatmentRes.json();
      if (treatmentData.error) {
        throw new Error(treatmentData.message || "Error en tratamiento");
      }

      setResult({
        ehrId,
        patientHash,
        treatment: treatmentData,
      });

      setStep(4); // Resultado
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isFieldLocked = (field: string) => {
    // En modo seguimiento:
    // - BLOQUEADOS: identidad fija (nombre, DOB, sexo) — nunca cambian
    // - EDITABLES: contacto (email, teléfono, dirección) — pueden actualizarse
    if (!followupMode) return false;
    const lockedFields = ["name", "dob"];
    if (lockedFields.includes(field)) return true;
    // Gender bloqueado si ya tiene valor (dato clínico fijo)
    if (field === "gender" && formData.gender) return true;
    return false;
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">
        {followupMode ? "Paso 1: Datos del Paciente (Precargados)" : "Paso 1: Datos del Paciente"}
      </h2>
      <p className="text-slate-600">
        {followupMode 
          ? "Datos del paciente cargados desde el historial. No modificables."
          : "Información básica. El EHR ID se generará automáticamente."
        }
      </p>

      {!patientLoaded && followupMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-blue-700">Cargando datos del paciente...</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateField("name", e.target.value)}
            disabled={isFieldLocked("name")}
            className={`w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-400 focus:border-transparent ${
              isFieldLocked("name") ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
            }`}
            placeholder="Ej: Elena Martínez"
            required
          />
          {isFieldLocked("name") && <p className="text-xs text-slate-400 mt-1">🔒 Cargado desde historial</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de nacimiento *</label>
          <input
            type="date"
            value={formData.dob}
            onChange={(e) => updateField("dob", e.target.value)}
            disabled={isFieldLocked("dob")}
            className={`w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-400 focus:border-transparent ${
              isFieldLocked("dob") ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
            }`}
            required
          />
          {isFieldLocked("dob") && <p className="text-xs text-slate-400 mt-1">🔒 Cargado desde historial</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Sexo *</label>
          <select
            value={formData.gender}
            onChange={(e) => updateField("gender", e.target.value)}
            disabled={isFieldLocked("gender")}
            className={`w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-400 focus:border-transparent ${
              isFieldLocked("gender") ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
            }`}
            required
          >
            <option value="">Seleccionar...</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
            <option value="O">Otro</option>
          </select>
          {followupMode && formData.gender && <p className="text-xs text-slate-400 mt-1">🔒 Cargado desde historial</p>}
          {followupMode && !formData.gender && <p className="text-xs text-amber-600 mt-1">⚠️ Selecciona el sexo para continuar</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            placeholder="opcional"
          />
          {followupMode && <p className="text-xs text-blue-600 mt-1">✏️ Puedes actualizar el email si ha cambiado</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            placeholder="opcional"
          />
          {followupMode && <p className="text-xs text-blue-600 mt-1">✏️ Puedes actualizar el teléfono si ha cambiado</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => updateField("address", e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
          placeholder="opcional"
        />
        {followupMode && <p className="text-xs text-blue-600 mt-1">✏️ Puedes actualizar la dirección si ha cambiado</p>}
      </div>

      {!followupMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>Nota:</strong> El Nº Historia (patientId) no se solicita en la primera consulta. 
            El terapeuta lo asignará después en la ficha física y lo añadirá al sistema posteriormente.
          </p>
        </div>
      )}

      {followupMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Modo seguimiento:</strong> Paciente {patientData?.ehrId}. 
            Los datos personales están bloqueados para mantener la integridad del historial.
          </p>
        </div>
      )}

      <button
        onClick={() => setStep(2)}
        disabled={!formData.name || !formData.dob || !formData.gender || !patientLoaded}
        className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Siguiente: Exploración Clínica →
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Paso 2: Exploración Clínica</h2>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Motivo de consulta *</label>
        <textarea
          value={formData.chiefComplaint}
          onChange={(e) => updateField("chiefComplaint", e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-400 focus:border-transparent h-20"
          placeholder="¿Qué trae el paciente hoy?"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Síntomas detallados</label>
        <textarea
          value={formData.symptoms}
          onChange={(e) => updateField("symptoms", e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-400 focus:border-transparent h-24"
          placeholder="Descripción completa de síntomas, duración, intensidad..."
        />
      </div>

      {/* Desplegable Lengua */}
      <details className="group rounded-lg border border-slate-200 overflow-hidden">
        <summary className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100">
          <span className="font-medium text-slate-700">👅 Diagnóstico de Lengua (望诊)</span>
          <svg className="w-5 h-5 text-slate-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="p-4 space-y-3">
          <textarea
            value={formData.tongue}
            onChange={(e) => updateField("tongue", e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-400 focus:border-transparent h-20"
            placeholder="Color del cuerpo, saburra, humedad, venas sublinguales..."
          />
        </div>
      </details>

      {/* Desplegable Pulso */}
      <details className="group rounded-lg border border-slate-200 overflow-hidden">
        <summary className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100">
          <span className="font-medium text-slate-700">💓 Lectura de Pulso (脉诊)</span>
          <svg className="w-5 h-5 text-slate-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="p-4 space-y-3">
          <textarea
            value={formData.pulse}
            onChange={(e) => updateField("pulse", e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-400 focus:border-transparent h-20"
            placeholder="Cun, Guan, Chi (izq/der), profundidad, velocidad, calidad..."
          />
        </div>
      </details>

      {/* Desplegable Ryodoraku */}
      <details className="group rounded-lg border border-slate-200 overflow-hidden">
        <summary className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100">
          <span className="font-medium text-slate-700">⚡ Valores Ryodoraku (良導絡)</span>
          <svg className="w-5 h-5 text-slate-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          {RYODORAKU_MERIDIANS.map((m) => (
            <div key={m.key}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{m.label}</label>
              <input
                type="number"
                value={formData.ryodoraku[m.key] || ""}
                onChange={(e) => updateRyodoraku(m.key, e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm"
                placeholder="0-200"
                min="0"
                max="200"
              />
            </div>
          ))}
        </div>
      </details>

      <div className="flex gap-3">
        <button
          onClick={() => setStep(1)}
          className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
        >
          ← Anterior
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={!formData.chiefComplaint}
          className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          Siguiente: Seguridad →
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Paso 3: Alertas de Seguridad</h2>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={formData.isPregnant}
            onChange={(e) => updateField("isPregnant", e.target.checked)}
            className="w-5 h-5 rounded border-red-300 text-red-600 focus:ring-red-500"
          />
          <span className="font-medium text-red-800">Paciente embarazada o en edad fértil</span>
        </label>
        {formData.isPregnant && (
          <p className="mt-2 text-sm text-red-700">
            ⚠️ Se activarán restricciones automáticas: SP6, LI4, GB21 y puntos prohibidos no se propondrán.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-slate-700">Condiciones especiales:</h3>
        {Object.entries(formData.safetyAlerts).map(([key, value]) => (
          <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => updateSafetyAlert(key as any, e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-slate-700">
              {key === "bleedingDisorder" && "Trastorno de sangrado / Coagulopatía"}
              {key === "pacemaker" && "Marcapasos"}
              {key === "immunodeficiency" && "Inmunodeficiencia"}
              {key === "epilepsy" && "Epilepsia"}
              {key === "anticoagulants" && "Anticoagulantes (Warfarina, Apixaban, etc.)"}
            </span>
          </label>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep(2)}
          className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
        >
          ← Anterior
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analizando con NotebookLM...
            </>
          ) : (
            "🧠 Analizar y Generar Tratamiento"
          )}
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-emerald-800 mb-2">✅ Tratamiento Generado</h2>
        <p className="text-emerald-700">
          EHR ID: <strong>{result?.ehrId}</strong>
        </p>
        <p className="text-sm text-emerald-600 mt-1">
          Anota este código en la ficha física del paciente.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <p className="text-slate-600">Resultados del análisis NotebookLM...</p>
        <pre className="mt-4 bg-slate-50 p-4 rounded-lg text-xs overflow-auto">
          {JSON.stringify(result?.treatment, null, 2)}
        </pre>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => router.push("/")}
          className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
        >
          ← Volver al Inicio
        </button>
        <button
          onClick={() => {
            setStep(1);
            setResult(null);
            setFormData({
              name: followupMode ? (patientData?.name || "") : "",
              dob: followupMode ? (patientData?.dob || "") : "",
              gender: followupMode ? (patientData?.gender || "") : "",
              email: followupMode ? (patientData?.email || "") : "",
              phone: followupMode ? (patientData?.phone || "") : "",
              address: followupMode ? (patientData?.address || "") : "",
              chiefComplaint: "",
              symptoms: "",
              tongue: "",
              pulse: "",
              ryodoraku: {},
              isPregnant: false,
              safetyAlerts: {
                bleedingDisorder: false,
                pacemaker: false,
                immunodeficiency: false,
                epilepsy: false,
                anticoagulants: false,
              },
            });
          }}
          className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
        >
          {followupMode ? "Nueva Consulta de Seguimiento" : "Nueva Ficha"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/")}
            className="text-slate-500 hover:text-slate-700 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al inicio
          </button>
          <h1 className="text-3xl font-bold text-slate-800">
            {followupMode ? "Nueva Consulta — Seguimiento" : "Ficha Nueva"}
          </h1>
          <p className="text-slate-600 mt-1">
            {followupMode 
              ? `Paciente: ${patientData?.name} (${patientData?.ehrId})`
              : "Paciente sin historial clínico previo"
            }
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full transition-colors ${
                s <= step ? "bg-emerald-500" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </div>
    </div>
  );
}