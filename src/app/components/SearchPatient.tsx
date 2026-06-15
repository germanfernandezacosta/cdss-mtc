"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PatientResult {
  id: number;
  ehrId: string;
  name: string;
  dob: string;
  email: string | null;
  phone: string | null;
  patientId: string | null;
  createdAt: string;
}

export default function SearchPatient() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setResults([]); // Limpiar resultados anteriores mientras carga
    try {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) setResults(data.patients || []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <button onClick={() => router.push("/")} className="text-slate-500 hover:text-slate-700 flex items-center gap-2 mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver al inicio
          </button>
          <h1 className="text-3xl font-bold text-slate-800">Historial Clínico</h1>
          <p className="text-slate-600 mt-1">Buscar paciente por nombre, EHR ID o Nº Historia</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder="Nombre, EHR ID o Nº Historia..." className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
            </div>
            <button onClick={handleSearch} disabled={loading || !query.trim()} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Buscando...
                </span>
              ) : (
                "Buscar"
              )}
            </button>
          </div>
        </div>

        {/* ESTADO DE CARGA */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-lg text-slate-600">Buscando en el historial clínico...</p>
            <p className="text-sm text-slate-400 mt-1">Esto puede tardar unos segundos</p>
          </div>
        )}

        {/* RESULTADOS — solo mostrar cuando NO está cargando */}
        {!loading && searched && (
          <div className="space-y-4">
            {results.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-lg text-slate-600 mb-2">No se encontraron pacientes</p>
                <p className="text-slate-500">Prueba con otro nombre o verifica el EHR ID</p>
                <button onClick={() => router.push("/new-patient")} className="mt-4 text-blue-600 hover:text-blue-700 font-medium">¿Crear ficha nueva? →</button>
              </div>
            ) : (
              results.map((patient) => (
                <div key={patient.id} onClick={() => router.push(`/history/${patient.ehrId}`)} className="bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-transparent hover:border-blue-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{patient.name}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">EHR: {patient.ehrId}</span>
                        {patient.patientId && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Nº Historia: {patient.patientId}</span>}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">DOB: {patient.dob}</span>
                      </div>
                      {(patient.email || patient.phone) && <p className="mt-2 text-sm text-slate-500">{patient.email && `📧 ${patient.email}`}{patient.email && patient.phone && " · "}{patient.phone && `📞 ${patient.phone}`}</p>}
                    </div>
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}