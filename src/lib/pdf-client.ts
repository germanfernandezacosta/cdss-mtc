/**
 * src/lib/pdf-client.ts
 * Utilidad cliente para generar y descargar PDFs forense y empático
 * CDSS MTC Premium v3.0 — Fase E
 */

import { generateForensicPDF, ForensicPdfData } from './pdf-generators/forensic-pdf';
import { generateEmpathicPDF, EmpathicPdfData } from './pdf-generators/empathic-pdf';
import { configurePdfMake } from './pdfmake-config';

export interface PdfGenerationResult {
  forensicBlob: Blob;
  empathicBlob: Blob;
  forensicFileName: string;
  empathicFileName: string;
}

/**
 * Genera ambos PDFs a partir de los datos de una consulta
 */
export async function generateConsultationPDFs(
  consultationData: {
    id: number;
    patientName: string;
    patientHash: string;
    patientAge?: number;
    patientGender?: string;
    consultationDate: string;
    syndrome: string;
    symptoms: string;
    rationale?: string | null;
    reasoning?: string | null;
    points?: Array<{ name: string; location: string; indication: string }> | null;
    herbs?: Array<{ name: string; dose: string; preparation: string }> | null;
    kantStatus: string;
    kantScore: number;
    practitionerName?: string;
    practitionerRegistration?: string;
    practitionerQualification?: string;
    practitionerClinic?: string;
    practitionerPhone?: string;
    hasEvolution?: boolean;
    previousSyndrome?: string | null;
    empathicNarrative?: string | null;
    llmModel?: string | null;
  }
): Promise<PdfGenerationResult> {
  
  // Asegurar que pdfmake está configurado
  await configurePdfMake();

  const timestamp = new Date(consultationData.consultationDate).toISOString().replace(/[:.]/g, '-');
  const hashPrefix = consultationData.patientHash.slice(0, 16);

  // ─── FORENSIC PDF ───
  const forensicData: ForensicPdfData = {
    patient: {
      name: consultationData.patientName,
      hash: consultationData.patientHash,
      age: consultationData.patientAge,
      gender: consultationData.patientGender,
    },
    session: {
      id: consultationData.id,
      date: consultationData.consultationDate,
    },
    practitioner: {
      name: consultationData.practitionerName,
      registration: consultationData.practitionerRegistration,
      qualification: consultationData.practitionerQualification,
      clinic: consultationData.practitionerClinic,
      address: undefined,
      phone: consultationData.practitionerPhone,
    },
    sections: {
      A: `Estado de seguridad KANT: ${consultationData.kantStatus.toUpperCase()} (Score: ${consultationData.kantScore}/100)\n\nSíntomas reportados: ${consultationData.symptoms}`,
      B: `Síndrome MTC identificado: ${consultationData.syndrome}\n\n${consultationData.rationale || 'Razonamiento clínico no disponible'}\n\n${consultationData.reasoning ? `Traza de pensamiento: ${consultationData.reasoning}` : ''}`,
    },
    points: consultationData.points || undefined,
    herbs: consultationData.herbs || undefined,
    hasEvolution: consultationData.hasEvolution || false,
    previousSyndrome: consultationData.previousSyndrome || null,
    kant: {
      status: consultationData.kantStatus,
      score: consultationData.kantScore,
    },
    system: {
      version: '3.0',
      model: consultationData.llmModel || 'GPT-4o-mini',
      timestamp: new Date().toISOString(),
    },
  };

  // ─── EMPATHIC PDF ───
  const empathicData: EmpathicPdfData = {
    patient: {
      name: consultationData.patientName,
      preferredName: consultationData.patientName,
      age: consultationData.patientAge,
      gender: consultationData.patientGender,
    },
    session: {
      date: consultationData.consultationDate,
    },
    practitioner: {
      name: consultationData.practitionerName,
      qualification: consultationData.practitionerQualification,
      clinic: consultationData.practitionerClinic,
      phone: consultationData.practitionerPhone,
    },
    sectionC: consultationData.empathicNarrative || buildDefaultEmpathicNarrative(consultationData),
    hasEvolution: consultationData.hasEvolution || false,
    previousSyndrome: consultationData.previousSyndrome || null,
  };

  const [forensicBlob, empathicBlob] = await Promise.all([
    generateForensicPDF(forensicData),
    generateEmpathicPDF(empathicData),
  ]);

  return {
    forensicBlob,
    empathicBlob,
    forensicFileName: `${hashPrefix}_${timestamp}_forensic.pdf`,
    empathicFileName: `${hashPrefix}_${timestamp}_empathic.pdf`,
  };
}

/**
 * Narrativa empática por defecto si no hay una guardada
 */
function buildDefaultEmpathicNarrative(data: {
  patientName: string;
  syndrome: string;
  symptoms: string;
  points?: Array<{ name: string }> | null;
  herbs?: Array<{ name: string }> | null;
  rationale?: string | null;
}): string {
  const hasPoints = data.points && data.points.length > 0;
  const hasHerbs = data.herbs && data.herbs.length > 0;

  let narrative = `Hola, ${data.patientName}.\n\n`;
  narrative += `Gracias por confiar en nosotros con tu cuidado hoy. Hemos tomado tiempo para entender tu patrón único y hemos preparado un plan suave para apoyar la curación natural de tu cuerpo.\n\n`;
  
  narrative += `📋 Tu consulta de hoy\n`;
  narrative += `Entendemos que has venido con ${data.symptoms.toLowerCase()}. Desde la perspectiva de la Medicina Tradicional China, tu cuerpo nos está mostrando un patrón conocido como "${data.syndrome}". Esto describe cómo tu energía vital (Qi) necesita apoyo para encontrar su equilibrio natural.\n\n`;
  
  if (hasPoints) {
    narrative += `🌿 Tu tratamiento de acupuntura\n`;
    narrative += `Hoy usamos puntos cuidadosamente seleccionados para ayudar a tu cuerpo a encontrar su equilibrio. Tu tratamiento fue adaptado específicamente a tus necesidades individuales.\n\n`;
  }
  
  if (hasHerbs) {
    narrative += `🍎 Apoyo con fitoterapia\n`;
    narrative += `Se ha considerado un apoyo herbal personalizado basado en tu patrón tradicional. Tu terapeuta te explicará los detalles en la consulta si considera que es apropiado para tu caso.\n\n`;
  }
  
  narrative += `🏃 Cuidados en casa\n`;
  narrative += `• Descansa bien después del tratamiento — tu cuerpo está procesando el trabajo que hicimos hoy.\n`;
  narrative += `• Mantente abrigado y evita corrientes de aire frío, especialmente sobre las áreas tratadas.\n`;
  narrative += `• Bebe agua tibia durante el día para apoyar tu sistema.\n`;
  narrative += `• Si notas cualquier molestia inusual, por favor contáctanos inmediatamente.\n\n`;
  
  narrative += `⚠️ Importante\n`;
  narrative += `Este documento es informativo y no sustituye el consejo médico de tu médico de cabecera o especialista. La acupuntura y la fitoterapia son terapias complementarias. Los resultados varían según cada persona. Nunca modifiques tu medicación prescrita sin consultar a tu médico.\n\n`;
  
  narrative += `Con dedicación y cuidado,\nTu Equipo de Salud`;

  return narrative;
}

/**
 * Descarga un Blob como archivo en el navegador
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convierte Blob a Base64 para enviar al servidor
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Guarda PDFs en el servidor vía /api/documents
 */
export async function savePDFsToServer(
  result: PdfGenerationResult,
  ehrId: string,
  consultationId: number
): Promise<{ forensicId?: number; empathicId?: number }> {
  const [forensicBase64, empathicBase64] = await Promise.all([
    blobToBase64(result.forensicBlob),
    blobToBase64(result.empathicBlob),
  ]);

  const [forensicRes, empathicRes] = await Promise.all([
    fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ehrId,
        consultationId,
        type: 'forensic',
        fileName: result.forensicFileName,
        fileData: forensicBase64,
      }),
    }),
    fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ehrId,
        consultationId,
        type: 'empathic',
        fileName: result.empathicFileName,
        fileData: empathicBase64,
      }),
    }),
  ]);

  const forensicData = forensicRes.ok ? await forensicRes.json() : null;
  const empathicData = empathicRes.ok ? await empathicRes.json() : null;

  return {
    forensicId: forensicData?.documentId,
    empathicId: empathicData?.documentId,
  };
}