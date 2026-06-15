"use client";

import React, { useState } from "react";
import { generateForensicPDF, type ForensicPdfData } from "@/lib/pdf-generators/forensic-pdf";
import { generateEmpathicPDF, type EmpathicPdfData } from "@/lib/pdf-generators/empathic-pdf";

interface Props {
  data?: any;
  onNewConsultation: () => void;
}

export default function FoucaultDocs({ data, onNewConsultation }: Props) {
  const [downloading, setDownloading] = useState<"forensic" | "empathic" | null>(null);

  const cd = data?.consultationData;
  const sections = data?.sections;
  const hasData = !!cd && !!sections;

  const handleForensicDownload = async () => {
    if (!hasData) return;
    setDownloading("forensic");
    try {
      const blob = await generateForensicPDF({
        patient: { name: cd.patient.name, hash: cd.patient.hash, age: cd.patient.age, gender: cd.patient.gender },
        session: cd.session,
        practitioner: cd.practitioner || {},
        sections: { A: sections.A, B: sections.B },
        ryodoraku: cd.clinical?.ryodoraku as Record<string, number>,
        points: data?.metadata?.points,
        herbs: data?.metadata?.herbs,
        hasEvolution: cd.notebookLM?.hasEvolution || false,
        previousSyndrome: cd.notebookLM?.previousSyndrome || null,
        kant: cd.kant,
        system: { version: "2.3", model: cd.system?.openrouterModel as string, timestamp: cd.session.date },
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CDSS_MTC_forensic_${cd.patient.hash.slice(0, 8)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Error generando PDF forense");
    } finally {
      setDownloading(null);
    }
  };

  const handleEmpathicDownload = async () => {
    if (!hasData) return;
    setDownloading("empathic");
    try {
      const blob = await generateEmpathicPDF({
        patient: { name: cd.patient.name, preferredName: cd.patient.preferredName || cd.patient.name, age: cd.patient.age, gender: cd.patient.gender },
        session: cd.session,
        practitioner: cd.practitioner || {},
        sectionC: sections.C,
        hasEvolution: cd.notebookLM?.hasEvolution || false,
        previousSyndrome: cd.notebookLM?.previousSyndrome || null,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Informe_Paciente_${cd.patient.name.replace(/\s+/g, "_")}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Error generando PDF empático");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-6 border-t-4 border-green-800 bg-white rounded-2xl shadow">
          <h3 className="font-semibold">Informe Clínico Forense</h3>
          <button onClick={handleForensicDownload} disabled={!hasData || downloading === "forensic"} className="w-full mt-4 py-3 bg-green-50 border border-green-200 rounded-xl">
            {downloading === "forensic" ? "Generando..." : "Descargar informe forense"}
          </button>
        </div>
        <div className="p-6 border-t-4 border-yellow-600 bg-white rounded-2xl shadow">
          <h3 className="font-semibold">Informe para el Paciente</h3>
          <button onClick={handleEmpathicDownload} disabled={!hasData || downloading === "empathic"} className="w-full mt-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl">
            {downloading === "empathic" ? "Generando..." : "Descargar para paciente"}
          </button>
        </div>
      </div>
      <div className="flex justify-center">
        <button onClick={onNewConsultation} className="px-8 py-4 bg-yellow-600 text-white rounded-2xl">Nueva consulta</button>
      </div>
    </div>
  );
}