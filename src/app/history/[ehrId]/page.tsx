// src/app/history/[ehrId]/page.tsx
// Página de resumen del paciente — CDSS MTC Premium v3.0 Fase C
// Línea de tiempo clínica + Nueva consulta + Solo acupuntura

import PatientSummary from '@/app/components/PatientSummary';

interface PageProps {
  params: { ehrId: string };
}

export default function PatientDetailPage({ params }: PageProps) {
  return <PatientSummary ehrId={params.ehrId} />;
}