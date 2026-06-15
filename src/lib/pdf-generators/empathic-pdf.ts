/**
 * empathic-pdf.ts v2.3 DEFINITIVO
 * Generador PDF Empático con pdfmake + VFS
 * FIX Bug #10: 100% español
 */

import * as pdfMake from 'pdfmake/build/pdfmake';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { configurePdfMake, PDF_COLORS } from '../pdfmake-config';

export interface EmpathicPdfData {
  patient: {
    name: string;
    preferredName?: string;
    age?: number;
    gender?: string;
  };
  session: {
    date: string;
  };
  practitioner: {
    name?: string;
    qualification?: string;
    clinic?: string;
    phone?: string;
  };
  sectionC: string;
  hasEvolution: boolean;
  previousSyndrome?: string | null;
}

export async function generateEmpathicPDF(data: EmpathicPdfData): Promise<Blob> {
  await configurePdfMake();

  const greetingName = data.patient.preferredName || data.patient.name || 'Paciente';
  const paragraphs = data.sectionC.split('\n\n').filter(p => p.trim().length > 0);

  const content: Content[] = [];

  // HEADER
  content.push({
    columns: [
      {
        width: '*',
        stack: [
          { text: 'Informe para el Paciente', fontSize: 24, bold: true, color: PDF_COLORS.jade, font: 'NotoSerif' },
          { text: 'Tu plan personalizado de bienestar', fontSize: 11, color: PDF_COLORS.gold, font: 'NotoSerif', margin: [0, 3, 0, 0] as [number, number, number, number] },
        ],
      },
      {
        width: 'auto',
        stack: [
          { text: new Date(data.session.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }), fontSize: 9, color: '#666', alignment: 'right' },
        ],
      },
    ],
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  // Línea decorativa
  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: PDF_COLORS.gold }],
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  // SALUDO
  content.push({
    text: `Hola, ${greetingName}`,
    fontSize: 14, bold: true, color: PDF_COLORS.jade,
    margin: [0, 0, 0, 16] as [number, number, number, number],
  });

  // CONTENIDO NARRATIVO
  paragraphs.forEach((para) => {
    const trimmed = para.trim();
    if (!trimmed) return;

    if (/disclaimer|aviso legal|no sustituye|no reemplaza|consultar.*médico/i.test(trimmed)) {
      content.push({ text: trimmed, fontSize: 8, color: '#888', italics: true, margin: [0, 12, 0, 12] as [number, number, number, number] });
      return;
    }

    const isTitle = (trimmed.length < 70 && !trimmed.endsWith('.')) || /^[📋🍎🏃⚠️🌿💧🔥]/.test(trimmed);

    if (isTitle) {
      content.push({
        text: trimmed.replace(/^[📋🍎🏃⚠️🌿💧🔥]\s*/, ''),
        fontSize: 12, bold: true, color: PDF_COLORS.gold,
        margin: [0, 16, 0, 8] as [number, number, number, number],
      });
    } else {
      content.push({
        text: trimmed,
        fontSize: 10.5, color: '#444', lineHeight: 1.55,
        margin: [0, 0, 0, 10] as [number, number, number, number],
      });
    }
  });

  // EVOLUCIÓN
  if (data.hasEvolution && data.previousSyndrome) {
    content.push({
      table: {
        widths: ['*'],
        body: [[
          {
            stack: [
              { text: 'Tu evolución', fontSize: 12, bold: true, color: PDF_COLORS.jade, margin: [0, 0, 0, 8] as [number, number, number, number] },
              { text: `Desde tu última visita, hemos observado cambios positivos en tu patrón energético. Lo que antes se manifestaba como ${data.previousSyndrome} ha evolucionado favorablemente. Esto indica que tu cuerpo está respondiendo bien al tratamiento.`, fontSize: 10, color: '#555', lineHeight: 1.5, margin: [0, 0, 0, 6] as [number, number, number, number] },
              { text: 'Sigamos consolidando estos cambios juntos.', fontSize: 10, color: '#555', italics: true },
            ],
            border: [false, false, false, false],
            fillColor: '#f0f7f4',
            margin: [12, 12, 12, 12] as [number, number, number, number],
          },
        ]],
      },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
      margin: [0, 16, 0, 16] as [number, number, number, number],
    });
  }

  // DESPEDIDA
  content.push(
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: PDF_COLORS.gold }], margin: [0, 20, 0, 16] as [number, number, number, number] },
    { text: 'Con dedicación y cuidado,', fontSize: 10, color: '#555', margin: [0, 0, 0, 4] as [number, number, number, number] },
    { text: data.practitioner.name || 'Tu Equipo de Salud', bold: true, color: PDF_COLORS.jade, fontSize: 11 },
    { text: data.practitioner.qualification || '', fontSize: 9, color: '#666' },
    { text: data.practitioner.clinic || '', fontSize: 9, color: '#666' },
    { text: data.practitioner.phone ? `Teléfono: ${data.practitioner.phone}` : '', fontSize: 9, color: '#666', margin: [0, 0, 0, 20] as [number, number, number, number] }
  );

  // DISCLAIMER
  content.push({
    text: [
      'Este documento es un resumen de apoyo para tu cuidado personal. ',
      'No sustituye la opinión de un médico generalista o especialista. ',
      'Si experimentas síntomas agudos o graves, consulta a tu médico de cabecera o servicios de urgencia. ',
      'Los detalles de fitoterapia se gestionan por separado bajo supervisión TGA/AHPRA. ',
      'Tus datos están protegidos bajo la Privacy Act 1988 y residen en Australia.',
    ],
    fontSize: 7.5, color: '#999', italics: true, alignment: 'center', lineHeight: 1.4,
  });

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [20, 20, 20, 20] as [number, number, number, number],
    defaultStyle: { font: 'NotoSans', fontSize: 10, color: '#2c3e50', lineHeight: 1.5 },
    content,
  };

  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  return pdfDocGenerator.getBlob();
}