'use client';

import { useState } from 'react';
import ClinicalForm from './components/ClinicalForm';
import FukuokaResult from './components/FukuokaResult';
import KantResult from './components/KantResult';
import FoucaultDocs from './components/FoucaultDocs';
import { type TreatmentResponse } from '@/lib/api';

export default function Home() {
  const [result, setResult] = useState<TreatmentResponse | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CDSS MTC</h1>
            <p className="text-sm text-gray-500">Clinical Decision Support System — Medicina Tradicional China</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-gray-500">FUKUOKA-H • KANT • FOUCAULT</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Formulario */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <ClinicalForm onResult={setResult} onLoading={setLoading} />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Analizando caso clínico...</span>
          </div>
        )}

        {/* Resultados */}
        {result && !loading && (
          <div className="space-y-6">
            {/* Warning banner */}
            <div className={`p-4 rounded-lg border ${
              result.kant.verdict === 'ROJO'
                ? 'bg-red-50 border-red-200 text-red-800'
                : result.kant.verdict === 'AMARILLO'
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : 'bg-green-50 border-green-200 text-green-800'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {result.kant.verdict === 'ROJO' ? '⛔' : result.kant.verdict === 'AMARILLO' ? '⚠️' : '✅'}
                </span>
                <span className="font-semibold">{result._warning}</span>
              </div>
            </div>

            <FukuokaResult data={result.fukuoka} />
            <KantResult data={result.kant} />
            <FoucaultDocs data={result.foucault} />
          </div>
        )}
      </div>
    </main>
  );
}