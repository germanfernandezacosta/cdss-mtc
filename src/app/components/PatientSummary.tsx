"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateForensicPDF, ForensicPdfData } from "@/lib/pdf-generators/forensic-pdf";
import { generateEmpathicPDF, EmpathicPdfData } from "@/lib/pdf-generators/empathic-pdf";
import { configurePdfMake } from "@/lib/pdfmake-config";

interface Consultation {
  id: number;
  consultationDate: string;
  syndrome: string;
  kantStatus: string;
  kantScore: number;
  symptoms: string;
  isTest: boolean | null;
  llmModel: string | null;
  hasNotebookLM: boolean;
  points: Array<{ name: string; location: string; indication: string }> | null;
  herbs: Array<{ name: string; dose: string; preparation: string }> | null;
  rationale: string | null;
  reasoning: string | null;
}

interface Patient {
  id: number;
  ehrId: string;
  name: string;
  dob: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  patientId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface Stats {
  totalConsultations: number;
  lastConsultationDate: string | null;
  averageKantScore: number;
  kantStatusDistribution: {
    green: number;
    yellow: number;
    red: number;
  };
}

interface PatientData {
  success: boolean;
  patient: Patient;
  patientHash: string;
  consultations: Consultation[];
  stats: Stats;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Sin fecha";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getKantBadge(status: string) {
  switch (status) {
    case "green":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
          🟢 Seguro
        </span>
      );
    case "yellow":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          🟡 Precaución
        </span>
      );
    case "red":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          🔴 Revisión
        </span>
      );
    case "grey":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          ⚪ Manual
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          ⚪ {status}
        </span>
      );
  }
}

export default function PatientSummary({ ehrId }: { ehrId: string }) {
  const router = useRouter();
  const [data, setData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedConsultation, setExpandedConsultation] = useState<number | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [detailModal, setDetailModal] = useState<Consultation | null>(null);

  useEffect(() => {
    fetchPatientData();
  }, [ehrId]);

  const fetchPatientData = async () => {
    try {
      const res = await fetch(`/api/patients/${ehrId}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.message || "Error cargando paciente");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewConsultation = () => {
    const params = new URLSearchParams();
    params.set("ehrId", ehrId);
    params.set("mode", "followup");
    router.push(`/new-patient?${params.toString()}`);
  };

  const handleManualSession = () => {
    setShowManualForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-emerald-600 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-slate-600">Cargando historial clínico...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.push("/history")}
            className="text-slate-500 hover:text-slate-700 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al historial
          </button>
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <svg className="w-16 h-16 text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-lg text-red-700 mb-2">{error || "No se pudo cargar el paciente"}</p>
            <button
              onClick={fetchPatientData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { patient, consultations, stats } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/history")}
            className="text-slate-500 hover:text-slate-700 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al historial
          </button>

          {/* Modal de detalles completo */}
          {detailModal && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setDetailModal(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-slate-800 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">📋 Detalle de Consulta</h3>
                    <p className="text-sm text-slate-300">{formatDate(detailModal.consultationDate)}</p>
                  </div>
                  <button onClick={() => setDetailModal(null)} className="text-slate-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-1">Síndrome MTC</h4>
                    <p className="text-lg font-medium text-slate-800">{detailModal.syndrome}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-1">Síntomas</h4>
                    <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-3 rounded-lg">{detailModal.symptoms}</p>
                  </div>

                  {detailModal.points && detailModal.points.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Puntos de acupuntura</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {detailModal.points.map((p, i) => (
                          <div key={i} className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                            <div className="font-bold text-emerald-900">{p.name}</div>
                            <div className="text-emerald-700 text-xs mt-1">📍 {p.location}</div>
                            <div className="text-emerald-800 text-xs mt-1">🎯 {p.indication}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailModal.herbs && detailModal.herbs.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Fórmula herbal</h4>
                      <div className="space-y-1">
                        {detailModal.herbs.map((h, i) => (
                          <div key={i} className="bg-amber-50 rounded-lg p-2 border border-amber-100 text-sm">
                            <span className="font-semibold text-amber-900">{h.name}</span>
                            <span className="text-amber-700 text-xs ml-2">— {h.dose} ({h.preparation})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailModal.rationale && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-1">Razonamiento clínico</h4>
                      <p className="text-slate-600 text-sm leading-relaxed bg-blue-50 p-3 rounded-lg border border-blue-100">
                        {detailModal.rationale}
                      </p>
                    </div>
                  )}

                  {detailModal.reasoning && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-1">Traza de pensamiento (NotebookLM)</h4>
                      <p className="text-slate-600 text-xs leading-relaxed bg-slate-100 p-3 rounded-lg border border-slate-200">
                        {detailModal.reasoning}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap gap-4">
                    <span>ID consulta: {detailModal.id}</span>
                    {detailModal.isTest && <span className="text-amber-600">🧪 Caso de prueba</span>}
                  </div>

                  {/* PDF GENERATOR */}
                  <div className="pt-2">
                    <PDFButtons
                      consultation={detailModal}
                      patientName={patient.name}
                      patientHash={data.patientHash}
                      ehrId={patient.ehrId}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tarjeta de identidad del paciente */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-l-4 border-emerald-500">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{patient.name}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  EHR: {patient.ehrId}
                </span>
                {patient.patientId && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    Nº Historia: {patient.patientId}
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  DOB: {patient.dob}
                </span>
              </div>
              {(patient.email || patient.phone) && (
                <p className="mt-2 text-sm text-slate-500">
                  {patient.email && `📧 ${patient.email}`}
                  {patient.email && patient.phone && " · "}
                  {patient.phone && `📞 ${patient.phone}`}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-400">
                Ficha creada: {formatDate(patient.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-emerald-600">{stats.totalConsultations}</div>
              <div className="text-xs text-slate-500">consultas</div>
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.kantStatusDistribution.green}</div>
            <div className="text-xs text-slate-500">🟢 Seguras</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.kantStatusDistribution.yellow}</div>
            <div className="text-xs text-slate-500">🟡 Precaución</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.kantStatusDistribution.red}</div>
            <div className="text-xs text-slate-500">🔴 Revisión</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-2xl font-bold text-slate-600">
              {stats.totalConsultations - stats.kantStatusDistribution.green - stats.kantStatusDistribution.yellow - stats.kantStatusDistribution.red}
            </div>
            <div className="text-xs text-slate-500">⚪ Manuales</div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <button
            onClick={handleNewConsultation}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            🧠 Nueva Consulta con CDSS
          </button>
          <button
            onClick={handleManualSession}
            className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            ✍️ Solo Acupuntura (Manual)
          </button>
        </div>

        {/* Formulario de sesión manual */}
        {showManualForm && (
          <ManualSessionForm
            ehrId={ehrId}
            patientHash={data.patientHash}
            patientName={patient.name}
            onClose={() => setShowManualForm(false)}
            onSaved={fetchPatientData}
          />
        )}

        {/* Línea de tiempo de consultas */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800">📋 Historial de Consultas</h2>
            <p className="text-sm text-slate-500">
              {stats.lastConsultationDate
                ? `Última consulta: ${formatDate(stats.lastConsultationDate)}`
                : "Sin consultas registradas"}
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {consultations.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg mb-2">No hay consultas registradas</p>
                <p className="text-sm">Este paciente aún no tiene historial clínico</p>
              </div>
            ) : (
              consultations.map((consultation, index) => (
                <div
                  key={consultation.id}
                  className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                    index === 0 ? "bg-emerald-50/30" : ""
                  }`}
                  onClick={() =>
                    setExpandedConsultation(
                      expandedConsultation === consultation.id ? null : consultation.id
                    )
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-semibold text-slate-700">
                          {formatDate(consultation.consultationDate)}
                        </span>
                        {getKantBadge(consultation.kantStatus)}
                        {!consultation.hasNotebookLM && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-600">
                            ✍️ Manual
                          </span>
                        )}
                        {index === 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Última
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 font-medium">
                        {consultation.syndrome === "MANUAL_ENTRY"
                          ? "Documentación manual del terapeuta"
                          : consultation.syndrome}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {consultation.symptoms}
                      </p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        expandedConsultation === consultation.id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Detalles expandidos */}
                  {expandedConsultation === consultation.id && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {consultation.points && consultation.points.length > 0 && (
                          <div className="md:col-span-2">
                            <span className="font-medium text-slate-700">Puntos de acupuntura:</span>
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {consultation.points.map((p, i) => (
                                <div key={i} className="bg-slate-50 rounded-lg p-3 text-sm border border-slate-100">
                                  <div className="font-semibold text-slate-800">{p.name}</div>
                                  <div className="text-slate-500 text-xs mt-0.5">📍 {p.location}</div>
                                  <div className="text-slate-600 mt-1 text-xs">🎯 {p.indication}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {consultation.herbs && consultation.herbs.length > 0 && (
                          <div className="md:col-span-2">
                            <span className="font-medium text-slate-700">Fórmula herbal:</span>
                            <div className="mt-2 space-y-1">
                              {consultation.herbs.map((h, i) => (
                                <div key={i} className="bg-amber-50 rounded-lg p-2 text-sm border border-amber-100">
                                  <span className="font-semibold text-amber-900">{h.name}</span>
                                  <span className="text-amber-700 text-xs ml-2">— {h.dose} ({h.preparation})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {consultation.rationale && (
                          <div className="md:col-span-2">
                            <span className="font-medium text-slate-700">Razonamiento clínico:</span>
                            <p className="text-slate-600 mt-1 text-xs leading-relaxed bg-blue-50 p-3 rounded-lg">
                              {consultation.rationale}
                            </p>
                          </div>
                        )}

                        <div>
                          <span className="font-medium text-slate-700">Síntomas:</span>
                          <p className="text-slate-600 mt-1">{consultation.symptoms}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Síndrome:</span>
                          <p className="text-slate-600 mt-1">
                            {consultation.syndrome === "MANUAL_ENTRY"
                              ? "No aplica — sesión manual"
                              : consultation.syndrome}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailModal(consultation);
                          }}
                          className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          Ver detalles
                        </button>
                        {consultation.hasNotebookLM && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailModal(consultation);
                            }}
                            className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            📄 PDFs
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTE: Botones de generación PDF (Fase E)
// ═══════════════════════════════════════════════════════════════

function PDFButtons({
  consultation,
  patientName,
  patientHash,
  ehrId,
}: {
  consultation: Consultation;
  patientName: string;
  patientHash: string;
  ehrId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleGenerate = async (saveToServer: boolean) => {
    setLoading(true);
    try {
      await configurePdfMake();

      const timestamp = new Date(consultation.consultationDate).toISOString().replace(/[:.]/g, "-");
      const hashPrefix = patientHash.slice(0, 16);

      // ─── FORENSIC PDF ───
      const forensicData: ForensicPdfData = {
        patient: {
          name: patientName,
          hash: patientHash,
          age: undefined,
          gender: undefined,
        },
        session: {
          id: consultation.id,
          date: consultation.consultationDate,
        },
        practitioner: {
          name: undefined,
          registration: undefined,
          qualification: undefined,
          clinic: undefined,
          address: undefined,
          phone: undefined,
        },
        sections: {
          A: `Estado KANT: ${consultation.kantStatus.toUpperCase()} (Score: ${consultation.kantScore}/100)\n\nSíntomas: ${consultation.symptoms}`,
          B: `Síndrome: ${consultation.syndrome}\n\n${consultation.rationale || "Razonamiento no disponible"}\n\n${consultation.reasoning || ""}`,
        },
        points: consultation.points || undefined,
        herbs: consultation.herbs || undefined,
        hasEvolution: false,
        previousSyndrome: null,
        kant: {
          status: consultation.kantStatus,
          score: consultation.kantScore,
        },
        system: {
          version: "3.0",
          model: consultation.llmModel || "GPT-4o-mini",
          timestamp: new Date().toISOString(),
        },
      };

      // ─── EMPATHIC PDF ───
      const empathicNarrative = `Hola, ${patientName}.\n\nGracias por confiar en nosotros con tu cuidado hoy. Hemos tomado tiempo para entender tu patrón único y hemos preparado un plan suave para apoyar la curación natural de tu cuerpo.\n\n📋 Tu consulta de hoy\nEntendemos que has venido con ${consultation.symptoms.toLowerCase()}. Desde la perspectiva de la Medicina Tradicional China, tu cuerpo nos está mostrando un patrón conocido como "${consultation.syndrome}".\n\n${consultation.points && consultation.points.length > 0 ? `🌿 Tu tratamiento incluye acupuntura con puntos cuidadosamente seleccionados para ayudar a tu cuerpo a encontrar su equilibrio.\n\n` : ""}${consultation.herbs && consultation.herbs.length > 0 ? `🍎 Se ha considerado un apoyo herbal personalizado basado en tu patrón tradicional.\n\n` : ""}🏃 Cuidados en casa\n• Descansa bien después del tratamiento.\n• Mantente abrigado y evita corrientes de aire frío.\n• Bebe agua tibia durante el día.\n• Si notas cualquier molestia inusual, contáctanos inmediatamente.\n\n⚠️ Este documento es informativo y no sustituye el consejo médico de tu médico de cabecera.\n\nCon dedicación y cuidado,\nTu Equipo de Salud`;

      const empathicData: EmpathicPdfData = {
        patient: {
          name: patientName,
          preferredName: patientName,
          age: undefined,
          gender: undefined,
        },
        session: {
          date: consultation.consultationDate,
        },
        practitioner: {
          name: undefined,
          qualification: undefined,
          clinic: undefined,
          phone: undefined,
        },
        sectionC: empathicNarrative,
        hasEvolution: false,
        previousSyndrome: null,
      };

      const [forensicBlob, empathicBlob] = await Promise.all([
        generateForensicPDF(forensicData),
        generateEmpathicPDF(empathicData),
      ]);

      // Descargar
      const downloadBlob = (blob: Blob, fileName: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      downloadBlob(forensicBlob, `${hashPrefix}_${timestamp}_forensic.pdf`);
      downloadBlob(empathicBlob, `${hashPrefix}_${timestamp}_empathic.pdf`);

      // Guardar en servidor (opcional)
      if (saveToServer) {
        const toBase64 = (blob: Blob): Promise<string> =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

        const [forensicB64, empathicB64] = await Promise.all([
          toBase64(forensicBlob),
          toBase64(empathicBlob),
        ]);

        await Promise.all([
          fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ehrId,
              consultationId: consultation.id,
              type: "forensic",
              fileName: `${hashPrefix}_${timestamp}_forensic.pdf`,
              fileData: forensicB64,
            }),
          }),
          fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ehrId,
              consultationId: consultation.id,
              type: "empathic",
              fileName: `${hashPrefix}_${timestamp}_empathic.pdf`,
              fileData: empathicB64,
            }),
          }),
        ]);

        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("[PDFs] Error:", error);
      alert("Error generando PDFs: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-100 rounded-lg p-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => handleGenerate(false)}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generando...
            </>
          ) : (
            <>📄 Descargar PDFs</>
          )}
        </button>
        <button
          onClick={() => handleGenerate(true)}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {saved ? "✅ Guardado" : "💾 Guardar y descargar"}
        </button>
      </div>
      {saved && (
        <p className="text-xs text-emerald-600 text-center mt-2">
          PDFs guardados en el historial del paciente
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTE: Formulario de sesión manual
// ═══════════════════════════════════════════════════════════════

function ManualSessionForm({
  ehrId,
  patientHash,
  patientName,
  onClose,
  onSaved,
}: {
  ehrId: string;
  patientHash: string;
  patientName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    sessionNotes: "",
    pointsApplied: "",
    patientResponse: "",
    practitionerName: "",
    practitionerRegistration: "",
    sessionNumber: "",
    totalSessions: "",
  });

  const handleSubmit = async () => {
    if (!formData.sessionNotes.trim()) {
      setError("Las notas de sesión son obligatorias");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ehrId,
          patientHash,
          mode: "manual",
          sessionNotes: formData.sessionNotes,
          pointsApplied: formData.pointsApplied,
          patientResponse: formData.patientResponse,
          practitionerName: formData.practitionerName,
          practitionerRegistration: formData.practitionerRegistration,
          sessionNumber: formData.sessionNumber ? parseInt(formData.sessionNumber) : undefined,
          totalSessions: formData.totalSessions ? parseInt(formData.totalSessions) : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSaved();
        onClose();
      } else {
        setError(data.message || "Error guardando sesión");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-slate-800 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">✍️ Documentación Manual de Sesión</h3>
            <p className="text-sm text-slate-300">{patientName} — Sin intervención CDSS</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Aviso legal */}
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mx-6 mt-4 rounded-r-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">Aviso de responsabilidad clínica</p>
              <p className="text-xs text-amber-700 mt-1">
                Esta sesión se documenta <strong>sin soporte del sistema de decisión clínica (CDSS)</strong>.
                El terapeuta asume la responsabilidad exclusiva del diagnóstico y tratamiento registrados.
                Esta información será incluida en el historial forense del paciente.
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Datos del terapeuta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre del terapeuta *
              </label>
              <input
                type="text"
                value={formData.practitionerName}
                onChange={(e) => setFormData((p) => ({ ...p, practitionerName: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                placeholder="Ej: Germán Fernández Acosta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nº Registro profesional
              </label>
              <input
                type="text"
                value={formData.practitionerRegistration}
                onChange={(e) => setFormData((p) => ({ ...p, practitionerRegistration: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                placeholder="Ej: CEMETC-XXXX"
              />
            </div>
          </div>

          {/* Sesión del plan */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sesión Nº
              </label>
              <input
                type="number"
                value={formData.sessionNumber}
                onChange={(e) => setFormData((p) => ({ ...p, sessionNumber: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                placeholder="Ej: 3"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Total sesiones planificadas
              </label>
              <input
                type="number"
                value={formData.totalSessions}
                onChange={(e) => setFormData((p) => ({ ...p, totalSessions: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                placeholder="Ej: 10"
                min="1"
              />
            </div>
          </div>

          {/* Notas de sesión */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notas de sesión *
            </label>
            <textarea
              value={formData.sessionNotes}
              onChange={(e) => setFormData((p) => ({ ...p, sessionNotes: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-400 focus:border-transparent h-32"
              placeholder="Describe la sesión: motivo de la visita, exploración realizada, observaciones clínicas, evolución del paciente..."
              required
            />
          </div>

          {/* Puntos aplicados */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Puntos / Intervenciones aplicadas
            </label>
            <textarea
              value={formData.pointsApplied}
              onChange={(e) => setFormData((p) => ({ ...p, pointsApplied: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-400 focus:border-transparent h-24"
              placeholder="Ej: IG4 (Yuan, tonificación), H3 (Shu, sedación), GB20 (local, dolor cervical)..."
            />
          </div>

          {/* Respuesta del paciente */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Respuesta / Evolución del paciente
            </label>
            <textarea
              value={formData.patientResponse}
              onChange={(e) => setFormData((p) => ({ ...p, patientResponse: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-400 focus:border-transparent h-24"
              placeholder="Ej: Paciente refiere mejoría del 40% en rigidez cervical. Sin efectos adversos."
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.sessionNotes.trim()}
              className="flex-1 py-3 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Guardando...
                </>
              ) : (
                "💾 Guardar documentación manual"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}