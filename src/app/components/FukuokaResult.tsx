'use client';

import { type TreatmentResponse } from '@/lib/api';

interface Props {
  data: TreatmentResponse['fukuoka'];
}

export default function FukuokaResult({ data }: Props) {
  const proposal = data.data.treatment_proposal;
  const syndromes = data.data.syndrome_analysis;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">FUKUOKA-H — Análisis Sindrómico</h2>
        <span className="text-xs text-gray-500 font-mono">{data.request_id}</span>
      </div>

      <div className="space-y-4">
        {syndromes.map((s, i) => (
          <div key={i} className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-blue-900">{s.syndrome_name}</h3>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                {(s.confidence * 100).toFixed(0)}% confianza
              </span>
            </div>
            <p className="text-sm text-blue-700">
              <span className="font-medium">Evidencia:</span> {s.supporting_evidence.join(', ')}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-3">Propuesta de Tratamiento</h3>
        <div className="space-y-2 text-sm">
          <div className="flex">
            <span className="w-32 font-medium text-gray-600">Puntos:</span>
            <span className="text-gray-800 font-mono">{proposal.acupuncture_points.join(', ')}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-medium text-gray-600">Fórmula:</span>
            <span className="text-gray-800">{proposal.herbal_formula || 'Ninguna'}</span>
          </div>
          <div className="mt-2 text-gray-600 italic">{proposal.rationale}</div>
        </div>
      </div>
    </div>
  );
}