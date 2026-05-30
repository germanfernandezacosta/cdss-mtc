"use client";

import React, { useState, useCallback } from "react";
import PremiumHeader from "@/components/PremiumHeader";
import PremiumForm, { FormData } from "@/components/PremiumForm";
import FukuokaResult from "@/components/FukuokaResult";
import KantResult from "@/components/KantResult";
import FoucaultDocs from "@/components/FoucaultDocs";
import ErrorScreen from "@/app/components/ErrorScreen";

type WorkflowState =
  | "idle"
  | "loading"
  | "kant"
  | "fukuoka"
  | "foucault"
  | "error";

interface ApiError {
  type: string;
  message: string;
  reason?: string;
  dialogueHistory?: any[];
  lastProposal?: any;
  safety?: any;
  ehr?: any;
}

export default function HomePage() {
  const [workflowState, setWorkflowState] = useState<WorkflowState>("idle");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [results, setResults] = useState<any>(null);
  const [apiError, setApiError] = useState<ApiError | null>(null);

  const transitionTo = useCallback((next: WorkflowState, delay = 400) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setWorkflowState(next);
      setIsTransitioning(false);
    }, delay);
  }, []);

  const handleSubmit = useCallback(async (data: FormData) => {
    setFormData(data);
    setResults(null);
    setApiError(null);
    transitionTo("loading", 300);

    try {
      const response = await fetch('/api/treatment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient: {
            name: data.patientName || "",
            dob: data.patientAge ? `${new Date().getFullYear() - parseInt(data.patientAge)}-01-01` : "",
            gender: data.patientGender || "F",
            symptoms: data.symptoms || "",
            pulse: data.pulse || "",
            tongue: data.tongue || "",
            ryodoraku: data.ryodoraku || "",
            safetyAlerts: data.safetyAlerts || {},
            medicalHistory: data.medicalHistory || "",
          },
          consultation: {
            goal: "acupuntura",
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Control Humano (HTTP 422)
        if (response.status === 422 && errorData.error === 'HUMAN_REQUIRED') {
          setApiError({
            type: 'HUMAN_REQUIRED',
            message: errorData.message || 'Control humano requerido',
            reason: errorData.reason,
            dialogueHistory: errorData.dialogueHistory,
            lastProposal: errorData.lastProposal,
            safety: errorData.safety,
            ehr: errorData.ehr,
          });
          transitionTo("error", 300);
          return;
        }

        // Bloqueo de seguridad (HTTP 403)
        if (response.status === 403 && errorData.error === 'SAFETY_BLOCKED') {
          setApiError({
            type: 'SAFETY_BLOCKED',
            message: errorData.message || 'Bloqueo de seguridad KANT',
            safety: errorData.safety,
          });
          transitionTo("error", 300);
          return;
        }

        throw new Error(`Error del servidor: ${response.status}`);
      }

      const resultData = await response.json();
      console.log("RESPUESTA DEL BACKEND:", JSON.stringify(resultData, null, 2));
      setResults(resultData);
      transitionTo("kant", 600);

    } catch (error: any) {
      console.error('Error:', error);
      setApiError({
        type: 'NETWORK_ERROR',
        message: error.message || 'Error al conectar con el backend',
      });
      transitionTo("error", 300);
    }
  }, [transitionTo]);

  const handleKantValidated = useCallback(() => {
    transitionTo("fukuoka", 500);
  }, [transitionTo]);

  const handleFukuokaComplete = useCallback(() => {
    transitionTo("foucault", 500);
  }, [transitionTo]);

  const handleReset = useCallback(() => {
    setFormData(null);
    setResults(null);
    setApiError(null);
    transitionTo("idle", 400);
  }, [transitionTo]);

  return (
    <div className="min-h-screen flex flex-col">
      <PremiumHeader
        workflowState={workflowState === "error" ? "idle" : workflowState}
        onReset={workflowState !== "idle" ? handleReset : undefined}
      />

      <div className="flex-1 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          
          {/* IDLE: Formulario */}
          {workflowState === "idle" && (
            <section className={`transition-all duration-500 ease-out ${
              isTransitioning ? "opacity-0 translate-y-4 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
            }`}>
              <div className="text-center mb-10 sm:mb-14">
                <div className="inline-flex items-center gap-2 mb-4">
                  <span className="badge-jade">Sistema Operativo Clínico</span>
                  <span className="badge-gold">v2.2 Premium</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl text-ink mb-4 tracking-tight">
                  Consulta de{" "}
                  <span className="text-jade" style={{ fontFamily: "var(--font-playfair)" }}>
                    Medicina Tradicional China
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-slate max-w-2xl mx-auto leading-relaxed">
                  Complete la anamnesis y exploración del paciente. El motor{" "}
                  <strong className="text-jade-dark">FUKUOKA-H</strong> procesará la información 
                  con validación clínica <strong className="text-terra-dark">KANT</strong>.
                </p>
                <div className="divider-jade max-w-xs mx-auto mt-6" />
              </div>

              <PremiumForm onSubmit={handleSubmit} />
            </section>
          )}

          {/* LOADING */}
          {workflowState === "loading" && (
            <section className={`min-h-[60vh] flex flex-col items-center justify-center transition-all duration-700 ${
              isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
            }`}>
              <div className="glass-strong rounded-2xl p-10 sm:p-14 max-w-lg w-full text-center">
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 rounded-full border-2 border-jade-200 animate-spin-slow" />
                  <div className="absolute inset-2 rounded-full border-2 border-terra-200" style={{ animation: "spin-slow 6s linear infinite reverse" }} />
                  <div className="absolute inset-4 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 animate-breathe flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0=.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 animate-orbit">
                    <div className="w-2 h-2 rounded-full bg-gold-400 shadow-glow-gold" />
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl text-ink mb-3" style={{ fontFamily: "var(--font-playfair)" }}>
                  Procesando diagnóstico
                </h2>
                <p className="text-slate mb-6 leading-relaxed">
                  El motor híbrido <strong className="text-jade">FUKUOKA-H</strong> está analizando 
                  los datos clínicos, correlacionando síntomas con patrones zang-fu y evaluando 
                  la calidad del pulso...
                </p>

                <div className="relative h-1.5 bg-stone rounded-full overflow-hidden mb-3">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-jade-400 via-jade-500 to-terra-400 animate-gradient-shift" style={{ width: "70%", animationDuration: "2s" }} />
                </div>
                <div className="flex justify-between text-xs text-ash">
                  <span>Análisis de síntomas</span>
                  <span>Validación clínica</span>
                </div>

                <div className="loading-dots mt-8">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </section>
          )}

          {/* ERROR: Nuevo componente integrado */}
          {workflowState === "error" && (
            <ErrorScreen error={apiError} onReset={handleReset} />
          )}

          {/* KANT */}
          {workflowState === "kant" && (
            <section className={`transition-all duration-600 ${
              isTransitioning ? "opacity-0 translate-x-8" : "opacity-100 translate-x-0"
            }`}>
              <div className="mb-8 text-center">
                <span className="badge-terra inline-flex items-center gap-1.5 mb-3">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Barrera de Seguridad KANT
                </span>
                <h2 className="text-2xl sm:text-3xl text-ink" style={{ fontFamily: "var(--font-playfair)" }}>
                  Validación Clínica Obligatoria
                </h2>
                <p className="text-slate mt-2 max-w-xl mx-auto">
                  Revise los resultados preliminares antes de continuar. Este paso es irreversible.
                </p>
              </div>

              <KantResult data={results} onValidated={handleKantValidated} onReject={handleReset} />
            </section>
          )}

          {/* FUKUOKA */}
          {workflowState === "fukuoka" && (
            <section className={`transition-all duration-600 ${
              isTransitioning ? "opacity-0 translate-y-6" : "opacity-100 translate-y-0"
            }`}>
              <div className="mb-8 text-center">
                <span className="badge-jade inline-flex items-center gap-1.5 mb-3">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Diagnóstico Validado
                </span>
                <h2 className="text-2xl sm:text-3xl text-ink" style={{ fontFamily: "var(--font-playfair)" }}>
                  Resultados del Motor{" "}
                  <span className="text-jade">FUKUOKA-H</span>
                </h2>
                <p className="text-slate mt-2 max-w-xl mx-auto">
                  Patrones identificados, tratamiento sugerido y puntos de acupuntura recomendados.
                </p>
              </div>

              <FukuokaResult data={results} onContinue={handleFukuokaComplete} />
            </section>
          )}

          {/* FOUCAULT */}
          {workflowState === "foucault" && (
            <section className={`transition-all duration-700 ${
              isTransitioning ? "opacity-0 scale-[0.97]" : "opacity-100 scale-100"
            }`}>
              <div className="mb-8 text-center">
                <span className="badge-gold inline-flex items-center gap-1.5 mb-3">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Documentación FOUCAULT
                </span>
                <h2 className="text-2xl sm:text-3xl text-ink" style={{ fontFamily: "var(--font-playfair)" }}>
                  Documentos Clínicos Generados
                </h2>
                <p className="text-slate mt-2 max-w-xl mx-auto">
                  Informe técnico forense y documento educativo empático listos para exportar.
                </p>
              </div>

              <FoucaultDocs data={results} onNewConsultation={handleReset} />
            </section>
          )}
        </div>
      </div>

      <footer className="relative py-6 px-4 text-center">
        <div className="divider-jade max-w-md mx-auto mb-4" />
        <p className="text-xs text-ash tracking-wide">
          CDSS MTC Premium · Motor FUKUOKA-H · Validación KANT · Documentación FOUCAULT
        </p>
        <p className="text-[10px] text-fog mt-1">
          Sistema de Soporte a Decisiones Clínicas · No sustituye el juicio médico profesional
        </p>
      </footer>
    </div>
  );
}