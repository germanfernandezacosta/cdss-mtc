/**
 * forensic-pdf.ts v2.3 DEFINITIVO
 * Generador PDF Forense con pdfmake + VFS
 */

import * as pdfMake from 'pdfmake/build/pdfmake';
import { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import { configurePdfMake, PDF_COLORS } from '../pdfmake-config';

export interface ForensicPdfData {
  patient: { name: string; hash: string; age?: number; gender?: string };
  session: { id: number; date: string };
  practitioner: { name?: string; registration?: string; qualification?: string; clinic?: string; address?: string; phone?: string };
  sections: { A: string; B: string };
  ryodoraku?: Record<string, number>;
  points?: Array<{ name: string; location: string; indication: string }>;
  herbs?: Array<{ name: string; dose: string; preparation: string }>;
  hasEvolution: boolean;
  previousSyndrome?: string | null;
  kant: { status: string; score: number };
  system: { version: string; model?: string; timestamp: string };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function kantColor(status: string): string {
  if (status === 'red') return PDF_COLORS.alertRed;
  if (status === 'yellow') return PDF_COLORS.alertYellow;
  return PDF_COLORS.jade;
}

function kantBgColor(status: string): string {
  if (status === 'red') return '#fff5f5';
  if (status === 'yellow') return '#fffbf0';
  return '#f0f7f4';
}

function kantText(status: string): string {
  if (status === 'red') return 'ROJO — Requiere atención inmediata';
  if (status === 'yellow') return 'AMARILLO — Precauciones activas';
  return 'VERDE — Perfil seguro';
}

function parseNarrative(text: string): Content[] {
  return text.split('\n\n').filter(p => p.trim().length > 0).map(p => ({
    text: p.trim(),
    fontSize: 9.5,
    lineHeight: 1.5,
    color: '#333',
    margin: [0, 0, 0, 8] as [number, number, number, number],
  }));
}

function buildRyodorakuTable(ryodoraku: Record<string, number> | undefined): Content {
  if (!ryodoraku || Object.keys(ryodoraku).length === 0) {
    return { text: 'No hay datos de Ryodoraku registrados.', fontSize: 9, color: '#888', italics: true };
  }

  const meridians = [
    { key: 'LU', label: 'LU', organ: 'Pulmón (肺)' },
    { key: 'LI', label: 'LI', organ: 'Intestino Grueso (大肠)' },
    { key: 'ST', label: 'ST', organ: 'Estómago (胃)' },
    { key: 'SP', label: 'SP', organ: 'Bazo (脾)' },
    { key: 'HT', label: 'HT', organ: 'Corazón (心)' },
    { key: 'SI', label: 'SI', organ: 'Intestino Delgado (小肠)' },
    { key: 'BL', label: 'BL', organ: 'Vejiga (膀胱)' },
    { key: 'KI', label: 'KI', organ: 'Riñón (肾)' },
    { key: 'PC', label: 'PC', organ: 'Pericardio (心包)' },
    { key: 'TE', label: 'TE', organ: 'Triple Calentador (三焦)' },
    { key: 'GB', label: 'GB', organ: 'Vesícula Biliar (胆)' },
    { key: 'LR', label: 'LR', organ: 'Hígado (肝)' },
  ];

  const body: TableCell[][] = [
    [
      { text: 'Meridiano', bold: true, color: '#fff', fillColor: PDF_COLORS.jade, fontSize: 8 },
      { text: 'Valor', bold: true, color: '#fff', fillColor: PDF_COLORS.jade, fontSize: 8, alignment: 'center' },
      { text: 'Estado', bold: true, color: '#fff', fillColor: PDF_COLORS.jade, fontSize: 8, alignment: 'center' },
    ]
  ];

  for (const m of meridians) {
    const val = ryodoraku[m.key];
    if (val === undefined) continue;
    let status = 'Normal', statusColor: string = PDF_COLORS.jade;
    if (val > 60) { status = 'Exceso'; statusColor = '#c0392b'; }
    else if (val < 40) { status = 'Deficiencia'; statusColor = '#2980b9'; }
    body.push([
      { text: `${m.label} — ${m.organ}`, fontSize: 8.5, color: '#333' },
      { text: String(val), fontSize: 9, bold: true, alignment: 'center', color: statusColor },
      { text: status, fontSize: 8, alignment: 'center', color: statusColor, bold: true },
    ]);
  }

  return {
    table: { widths: ['*', 60, 80], body },
    layout: {
      hLineWidth: (i: number) => i === 0 ? 0 : 0.5,
      vLineWidth: () => 0,
      hLineColor: () => '#e0e0e0',
      fillColor: (i: number) => i % 2 === 0 ? '#f8f9fa' : null,
      paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 4, paddingBottom: () => 4,
    },
    margin: [0, 8, 0, 12] as [number, number, number, number],
  };
}

function buildPointsTable(points: Array<{ name: string; location: string; indication: string }> | undefined): Content {
  if (!points || points.length === 0) {
    return { text: 'No hay puntos de acupuntura registrados.', fontSize: 9, color: '#888', italics: true };
  }
  const body: TableCell[][] = [
    [
      { text: 'Punto', bold: true, color: '#fff', fillColor: PDF_COLORS.jade, fontSize: 8 },
      { text: 'Localización anatómica', bold: true, color: '#fff', fillColor: PDF_COLORS.jade, fontSize: 8 },
      { text: 'Indicación clínica', bold: true, color: '#fff', fillColor: PDF_COLORS.jade, fontSize: 8 },
    ]
  ];
  for (const p of points) {
    body.push([
      { text: p.name, fontSize: 9, bold: true, color: PDF_COLORS.jade },
      { text: p.location, fontSize: 8, color: '#555' },
      { text: p.indication, fontSize: 8, color: '#555' },
    ]);
  }
  return {
    table: { widths: [80, '*', '*'], body },
    layout: {
      hLineWidth: (i: number) => i === 0 ? 0 : 0.5,
      vLineWidth: () => 0,
      hLineColor: () => '#e0e0e0',
      fillColor: (i: number) => i % 2 === 0 ? '#f8f9fa' : null,
      paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 5, paddingBottom: () => 5,
    },
    margin: [0, 8, 0, 12] as [number, number, number, number],
  };
}

export async function generateForensicPDF(data: ForensicPdfData): Promise<Blob> {
  await configurePdfMake();

  const content: Content[] = [];

  // HEADER
  content.push({
    columns: [
      {
        width: '*',
        stack: [
          { text: 'CDSS MTC Premium', fontSize: 22, bold: true, color: PDF_COLORS.jade, font: 'NotoSerif' },
          { text: 'Informe Clínico Forense', fontSize: 11, color: PDF_COLORS.gold, font: 'NotoSerif', margin: [0, 2, 0, 0] as [number, number, number, number] },
        ],
      },
      {
        width: 'auto',
        stack: [
          { text: `Sesión #${data.session.id}`, fontSize: 10, bold: true, color: PDF_COLORS.jade, alignment: 'right' },
          { text: formatDate(data.session.date), fontSize: 8, color: '#666', alignment: 'right', margin: [0, 2, 0, 0] as [number, number, number, number] },
          { text: `v${data.system.version}`, fontSize: 7, color: '#999', alignment: 'right' },
        ],
      },
    ],
    margin: [0, 0, 0, 16] as [number, number, number, number],
  });

  // Línea decorativa
  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: PDF_COLORS.jade }],
    margin: [0, 0, 0, 16] as [number, number, number, number],
  });

  // META BAR
  content.push({
    table: {
      widths: ['*', '*', '*'],
      body: [[
        {
          text: [{ text: 'Paciente: ', bold: true, color: PDF_COLORS.jade, fontSize: 8 }, { text: `${data.patient.name} (${data.patient.age}a, ${data.patient.gender || 'N/D'})`, fontSize: 8, color: '#333' }],
          border: [false, false, false, false],
        },
        {
          text: [{ text: 'Hash: ', bold: true, color: PDF_COLORS.jade, fontSize: 8 }, { text: data.patient.hash.slice(0, 16) + '...', fontSize: 7, color: '#666'}],
          border: [false, false, false, false], alignment: 'center',
        },
        {
          text: [{ text: 'Modelo: ', bold: true, color: PDF_COLORS.jade, fontSize: 8 }, { text: data.system.model || 'N/D', fontSize: 8, color: '#333' }],
          border: [false, false, false, false], alignment: 'right',
        },
      ]],
    },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 4 },
    margin: [0, 0, 0, 12] as [number, number, number, number],
  });

  // SECCIÓN A — ALERTA KANT
  content.push({
    text: 'SECCIÓN A — Alerta de Seguridad (KANT)',
    fontSize: 13, bold: true, color: '#fff', fillColor: PDF_COLORS.jade,
    margin: [0, 0, 0, 0] as [number, number, number, number],
  });
  content.push({
    table: {
      widths: ['*'],
      body: [[
        {
          stack: [
            { text: `Estado: ${kantText(data.kant.status)}`, fontSize: 10, bold: true, color: kantColor(data.kant.status), margin: [0, 0, 0, 4] as [number, number, number, number] },
            { text: `Score de seguridad: ${data.kant.score}/100`, fontSize: 9, color: '#555', margin: [0, 0, 0, 8] as [number, number, number, number] },
            ...parseNarrative(data.sections.A),
          ],
          border: [false, false, false, false],
          fillColor: kantBgColor(data.kant.status),
          margin: [10, 10, 10, 10] as [number, number, number, number],
        },
      ]],
    },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
    margin: [0, 0, 0, 16] as [number, number, number, number],
  });

  // SECCIÓN B — INFORME TÉCNICO
  content.push({
    text: 'SECCIÓN B — Informe Técnico Fukuoka',
    fontSize: 13, bold: true, color: '#fff', fillColor: PDF_COLORS.jade,
    margin: [0, 0, 0, 0] as [number, number, number, number],
  });
  content.push({
    stack: [...parseNarrative(data.sections.B)],
    margin: [0, 10, 0, 16] as [number, number, number, number],
  });

  // RYODORAKU
  if (data.ryodoraku && Object.keys(data.ryodoraku).length > 0) {
    content.push(
      { text: 'Datos Ryodoraku (良導絡)', fontSize: 11, bold: true, color: PDF_COLORS.jade, margin: [0, 8, 0, 6] as [number, number, number, number] },
      buildRyodorakuTable(data.ryodoraku),
      { text: '', margin: [0, 0, 0, 8] as [number, number, number, number] },
    );
  }

  // PUNTOS
  if (data.points && data.points.length > 0) {
    content.push(
      { text: 'Protocolo de Acupuntura', fontSize: 11, bold: true, color: PDF_COLORS.jade, margin: [0, 8, 0, 6] as [number, number, number, number] },
      buildPointsTable(data.points),
      { text: '', margin: [0, 0, 0, 8] as [number, number, number, number] },
    );
  }

  // HERBAS
  if (data.herbs && data.herbs.length > 0) {
    const herbBody: TableCell[][] = [
      [{ text: 'Hierba', bold: true, color: '#fff', fillColor: PDF_COLORS.jade, fontSize: 8 }, { text: 'Dosis', bold: true, color: '#fff', fillColor: PDF_COLORS.jade, fontSize: 8 }, { text: 'Preparación', bold: true, color: '#fff', fillColor: PDF_COLORS.jade, fontSize: 8 }]
    ];
    for (const h of data.herbs) {
      herbBody.push([{ text: h.name, fontSize: 9, bold: true, color: PDF_COLORS.jade }, { text: h.dose, fontSize: 8, color: '#555' }, { text: h.preparation, fontSize: 8, color: '#555' }]);
    }
    content.push(
      { text: 'Fitoterapia (中药)', fontSize: 11, bold: true, color: PDF_COLORS.jade, margin: [0, 8, 0, 6] as [number, number, number, number] },
      { table: { widths: ['*', 80, '*'], body: herbBody }, layout: { hLineWidth: (i: number) => i === 0 ? 0 : 0.5, vLineWidth: () => 0, hLineColor: () => '#e0e0e0', fillColor: (i: number) => i % 2 === 0 ? '#f8f9fa' : null, paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 5, paddingBottom: () => 5 }, margin: [0, 0, 0, 12] as [number, number, number, number] },
      { text: '⚠️ Advertencia AHPRA / TGA: Los productos de fitoterapia china no están evaluados por la TGA salvo indicación explícita. Este documento no constituye prescripción médica.', fontSize: 7.5, color: '#8B0000', italics: true, margin: [0, 4, 0, 8] as [number, number, number, number] }
    );
  }

  // EVOLUCIÓN
  if (data.hasEvolution) {
    content.push(
      { text: 'Evolución desde Consulta Anterior', fontSize: 11, bold: true, color: PDF_COLORS.jade, margin: [0, 8, 0, 6] as [number, number, number, number] },
      { text: `Síndrome previo: ${data.previousSyndrome || 'No registrado'}`, fontSize: 9, color: '#555', margin: [0, 0, 0, 4] as [number, number, number, number] },
      { text: 'El paciente presenta evolución desde la consulta previa. Los cambios en el patrón bioenergético se detallan en el informe técnico.', fontSize: 9, color: '#555', italics: true, margin: [0, 0, 0, 12] as [number, number, number, number] }
    );
  }

  // FIRMAS
  content.push(
    { text: '', margin: [0, 20, 0, 0] as [number, number, number, number] },
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: '', margin: [0, 0, 0, 20] as [number, number, number, number] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: '#333' }], margin: [0, 0, 0, 4] as [number, number, number, number] },
            { text: data.practitioner.name || '_________________', fontSize: 9, bold: true, color: '#333' },
            { text: data.practitioner.registration || '', fontSize: 8, color: '#666' },
            { text: 'Firma y sello del practitioner', fontSize: 7, color: '#999', margin: [0, 2, 0, 0] as [number, number, number, number] },
          ],
        },
        {
          width: '*',
          stack: [
            { text: '', margin: [0, 0, 0, 20] as [number, number, number, number] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: '#333' }], margin: [0, 0, 0, 4] as [number, number, number, number] },
            { text: data.patient.name, fontSize: 9, bold: true, color: '#333' },
            { text: `Hash: ${data.patient.hash.slice(0, 16)}...`, fontSize: 7, color: '#666'},
            { text: 'Firma de consentimiento', fontSize: 7, color: '#999', margin: [0, 2, 0, 0] as [number, number, number, number] },
          ],
          alignment: 'right',
        },
      ],
      margin: [0, 0, 0, 20] as [number, number, number, number],
    }
  );

  // DISCLAIMER
  content.push({
    table: {
      widths: ['*'],
      body: [[
        {
          stack: [
            { text: 'Disclaimer Regulatorio', fontSize: 9, bold: true, color: PDF_COLORS.gold, margin: [0, 0, 0, 6] as [number, number, number, number] },
            {
              text: [
                { text: 'AHPRA: ', bold: true, color: PDF_COLORS.jade },
                'Este documento es un registro clínico generado por un CDSS y no sustituye el juicio clínico del practitioner registrado. El practitioner es responsable de verificar la idoneidad del tratamiento según el Scope of Practice de acupuntura en Australia.\n\n',
                { text: 'TGA: ', bold: true, color: PDF_COLORS.jade },
                'Los productos de fitoterapia china mencionados no están evaluados por la TGA salvo indicación explícita. No se debe interpretar este documento como prescripción de medicamentos registrados.\n\n',
                { text: 'Privacy Act 1988: ', bold: true, color: PDF_COLORS.jade },
                'Los datos del paciente están anonimizados mediante hash SHA-256. Residencia de datos: Australia (Azure AU East).',
              ],
              fontSize: 7.5, color: '#555', lineHeight: 1.4,
            },
          ],
          border: [false, false, false, false],
          fillColor: '#faf8f3',
          margin: [10, 10, 10, 10] as [number, number, number, number],
        },
      ]],
    },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
  });

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [20, 20, 20, 20] as [number, number, number, number],
    defaultStyle: { font: 'NotoSans', fontSize: 9.5, color: '#333', lineHeight: 1.4 },
    content,
    footer: (currentPage: number, pageCount: number) => ({
      text: `CDSS MTC Premium v${data.system.version} · Página ${currentPage} de ${pageCount}`,
      fontSize: 7, color: '#aaa', alignment: 'center', margin: [0, 10, 0, 0] as [number, number, number, number],
    }),
  };

  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  return pdfDocGenerator.getBlob();
}