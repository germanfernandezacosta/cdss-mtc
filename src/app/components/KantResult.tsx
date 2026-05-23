'use client';

import { type TreatmentResponse } from '@/lib/api';

interface Props {
  data: TreatmentResponse['kant'];
}

export default function KantResult({ data }: Props) {
  const colorMap = {
    VERDE: 'bg-green-100 text-green-800 border-green-200',
    AMARILLO: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    ROJO: 'bg-red-100 text-red-800 border-red-200',
  };

  const verdictColor = colorMap[data.verdict] || colorMap.VERDE;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">KANT — Validación de Seguridad</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${verdictColor}`}>
          {data.verdict}
        </span>
      </div>

      <div className="mb-4 text-sm text-gray-600">
        Reglas revisadas: <span className="font-semibold">{data.totalRulesChecked}</span> | 
        Evaluado: <span className="font-mono">{new Date(data.evaluatedAt).toLocaleString('es-ES')}</span>
      </div>

      {data.violations.length === 0 ? (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm">
          ✅ No se detectaron violaciones de seguridad.
        </div>
      ) : (
        <div className="space-y-3">
          {data.violations.map((v, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border ${
                v.severity === 'ROJO'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                  v.severity === 'ROJO' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                }`}>
                  {v.severity}
                </span>
                <span className="text-xs font-mono text-gray-500">{v.ruleId}</span>
                <span className="text-xs text-gray-400">[{v.category}]</span>
              </div>
              <p className="text-sm text-gray-700">{v.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}