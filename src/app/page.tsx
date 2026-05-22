/**
 * CDSS-MTC — Frontend Clínico (MVP)
 * Formulario de consulta con soporte para Ryodoraku
 */

'use client';

import { useState } from 'react';

interface Syndrome {
  syndrome_name: string;
  confidence: number;
  supporting_evidence: string[];
}

interface TreatmentProposal {
  acupuncture_points: string[];
  herbal_formula: string | null;
  rationale: string;
}

interface FukuokaResponse {
  success: boolean;
  data?: {
    syndrome_analysis: Syndrome[];
    treatment_proposal: TreatmentProposal;
  };
  error?: string;
}

export default function Home() {
  const [symptoms, setSymptoms] = useState('');
  const [pulse, setPulse] = useState('');
  const [tongue, setTongue] = useState('');
  const [ryodoraku, setRyodoraku] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FukuokaResponse | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/fukuoka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms, pulse, tongue, ryodoraku, context }),
      });

      const data = await res.json() as FukuokaResponse;

      if (!data.success) {
        setError(data.error || 'Error desconocido del servidor');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Error de conexión. Verifica que el servidor esté corriendo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            CDSS-MTC
          </h1>
          <p className="text-slate-600">
            Sistema de Soporte a la Decisión Clínica — Medicina Tradicional China
          </p>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            ⚠️ MVP — Uso educativo y de desarrollo únicamente
          </div>
        </header>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Datos de la Consulta
          </h2>

          <div className="space-y-4">
            {/* Síntomas */}
            <div>
              <label htmlFor="symptoms" className="block text-sm font-medium text-slate-700 mb-1">
                Síntomas Principales <span className="text-red-500">*</span>
              </label>
              <textarea
                id="symptoms"
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                placeholder="Ej: Insomnio, diarrea matutina, fatiga, dolor de cabeza..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                required
              />
            </div>

            {/* Pulso */}
            <div>
              <label htmlFor="pulse" className="block text-sm font-medium text-slate-700 mb-1">
                Diagnóstico del Pulso <span className="text-red-500">*</span>
              </label>
              <textarea
                id="pulse"
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                placeholder="Ej: Débil en Cun izquierda, resbaladizo en Guan derecha..."
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                required
              />
            </div>

            {/* Lengua */}
            <div>
              <label htmlFor="tongue" className="block text-sm font-medium text-slate-700 mb-1">
                Diagnóstico de la Lengua <span className="text-red-500">*</span>
              </label>
              <textarea
                id="tongue"
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                placeholder="Ej: Roja con saburra pelada, marcas dentales en bordes..."
                value={tongue}
                onChange={(e) => setTongue(e.target.value)}
                required
              />
            </div>

            {/* Ryodoraku */}
            <div>
              <label htmlFor="ryodoraku" className="block text-sm font-medium text-slate-700 mb-1">
                Lectura Ryodoraku <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <textarea
                id="ryodoraku"
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                placeholder="Ej: Lung L: +35, Lung R: -15; Spleen L: +40, Spleen R: -20..."
                value={ryodoraku}
                onChange={(e) => setRyodoraku(e.target.value)}
              />
            </div>

            {/* Contexto adicional */}
            <div>
              <label htmlFor="context" className="block text-sm font-medium text-slate-700 mb-1">
                Contexto Adicional <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <textarea
                id="context"
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                placeholder="Edad, sexo, embarazo, medicación actual, antecedentes..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
              />
            </div>
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Analizando...' : 'Analizar Patrón Sindrómico'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-red-800">Error</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Resultado */}
        {result?.data && (
          <div className="space-y-6">
            {/* Advertencia KANT */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-amber-600 text-xl">🛡️</span>
                <div>
                  <h3 className="font-semibold text-amber-800">Pendiente de Validación de Seguridad</h3>
                  <p className="text-amber-700 text-sm mt-1">
                    Esta propuesta debe pasar por el módulo KANT antes de su uso clínico.
                    No prescriba sin verificar contraindicaciones.
                  </p>
                </div>
              </div>
            </div>

            {/* Síndromes */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-700 mb-4">
                Diferenciación Sindrómica
              </h3>
              <div className="space-y-3">
                {result.data.syndrome_analysis.map((syndrome, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-800">{syndrome.syndrome_name}</span>
                      <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {(syndrome.confidence * 100).toFixed(0)}% confianza
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="font-medium">Evidencia:</span>{' '}
                      {syndrome.supporting_evidence.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Propuesta de tratamiento */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-700 mb-4">
                Propuesta de Tratamiento
              </h3>
              
              <div className="space-y-4">
                {/* Puntos */}
                <div>
                  <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Puntos de Acupuntura
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.data.treatment_proposal.acupuncture_points.map((point, idx) => (
                      <span
                        key={idx}
                        className="bg-emerald-50 text-emerald-700 font-mono font-medium px-3 py-1.5 rounded-lg border border-emerald-200"
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Fórmula */}
                {result.data.treatment_proposal.herbal_formula && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                      Fórmula Herbal
                    </h4>
                    <span className="inline-block bg-purple-50 text-purple-700 font-medium px-3 py-1.5 rounded-lg border border-purple-200">
                      {result.data.treatment_proposal.herbal_formula}
                    </span>
                  </div>
                )}

                {/* Razonamiento */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Razonamiento Clínico
                  </h4>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {result.data.treatment_proposal.rationale}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}