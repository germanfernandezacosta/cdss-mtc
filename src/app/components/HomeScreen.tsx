"use client";

import { useRouter } from "next/navigation";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">CDSS MTC Premium</h1>
          <p className="text-lg text-slate-600">Sistema de Soporte Clínico — Medicina Tradicional China</p>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">v3.0 NotebookLM Brain</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => router.push("/new-patient")} className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-emerald-400 text-left">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Ficha Nueva</h2>
              <p className="text-slate-600 leading-relaxed">Paciente sin historial clínico. El sistema generará un EHR ID automáticamente.</p>
              <div className="mt-4 flex items-center text-emerald-600 font-medium"><span>Comenzar</span><svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></div>
            </div>
          </button>

          <button onClick={() => router.push("/history")} className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-400 text-left">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Historial Clínico</h2>
              <p className="text-slate-600 leading-relaxed">Buscar paciente existente por nombre o Nº Historia. Ver evolución y nueva consulta.</p>
              <div className="mt-4 flex items-center text-blue-600 font-medium"><span>Buscar</span><svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></div>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-slate-500"><p>CEMETC España · AHPRA Australia · TGA Compliant</p></div>
      </div>
    </div>
  );
}