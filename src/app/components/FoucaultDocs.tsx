'use client';

import { useState } from 'react';
import { type TreatmentResponse, decodeBase64Html } from '@/lib/api';

interface Props {
  data: TreatmentResponse['foucault'];
}

export default function FoucaultDocs({ data }: Props) {
  const [activeTab, setActiveTab] = useState<'forensic' | 'empathic'>('forensic');

  const forensicHtml = decodeBase64Html(data.pdfs.forensic);
  const empathicHtml = decodeBase64Html(data.pdfs.empathic);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">FOUCAULT — Documentación</h2>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4">
        <button
          onClick={() => setActiveTab('forensic')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'forensic'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 Técnico Forense
        </button>
        <button
          onClick={() => setActiveTab('empathic')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'empathic'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          💚 Educativo Empático
        </button>
      </div>

      {/* Hashes */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs font-mono text-gray-500 space-y-1">
        <div>Forensic Hash: <span className="text-gray-700">{data.forensicHash}</span></div>
        <div>Empathic Hash: <span className="text-gray-700">{data.empathicHash}</span></div>
        <div>AHPRA Flags: <span className="text-green-600">{data.ahpraFlags.length} (clean)</span></div>
      </div>

      {/* Preview */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <iframe
          srcDoc={activeTab === 'forensic' ? forensicHtml : empathicHtml}
          className="w-full h-96 bg-white"
          title={activeTab === 'forensic' ? 'Forensic Document' : 'Empathic Document'}
        />
      </div>

      {/* Chain of Custody */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
          🔒 Cadena de Custodia ({data.chainOfCustody.length} eventos)
        </summary>
        <ul className="mt-2 space-y-1 text-xs font-mono text-gray-500 bg-gray-50 p-3 rounded-lg">
          {data.chainOfCustody.map((entry, i) => (
            <li key={i}>{entry}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}