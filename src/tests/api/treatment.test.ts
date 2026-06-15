import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/treatment/route';

const mockNotebookResponse = `=== SECCIÓN A ===
Estado: VERDE

=== SECCIÓN B ===
Diagnóstico

=== SECCIÓN C ===
Metáfora

=== METADATOS ===
\`\`\`json
{
  "syndrome": "Estancamiento de Qi del Hígado",
  "points": [
    {"name":"ST36","location":"3 cun inferior","indication":"Tonificación"},
    {"name":"LR3","location":"1 cun proximal","indication":"Regulación"}
  ],
  "herbs": [],
  "rationale": "Regulación del Qi"}
\`\`\``;

vi.mock('@/lib/fukuoka-h/engine', () => ({
  generateTreatment: vi.fn(() => Promise.resolve(mockNotebookResponse)),
  parseNotebookLMResponse: vi.fn(() => ({
    sections: { A: 'Estado: VERDE', B: 'Diagnóstico', C: 'Metáfora' },
    metadata: {
      syndrome: 'Estancamiento de Qi del Hígado',
      points: [
        { name: 'ST36', location: '3 cun inferior', indication: 'Tonificación' },
        { name: 'LR3', location: '1 cun proximal', indication: 'Regulación' },
      ],
      herbs: [],
      rationale: 'Regulación del Qi',
    },
  })),
}));

vi.mock('@/lib/rag/contextBuilder', () => ({
  buildRAGContext: vi.fn(() => Promise.resolve({
    context: 'Contexto RAG de prueba',
    citations: [],
  })),
}));

describe('POST /api/treatment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe generar tratamiento válido sin contraindicaciones', async () => {
    const body = {
      patient: { name: 'Test', dob: '1985-05-15', gender: 'M', patientId: 'TEST-001' },
      consultation: { goal: 'Estrés', symptoms: 'Estrés laboral', tongue: 'Roja', pulse: 'Cuerda' },
    };

    const request = new NextRequest('http://localhost:3000/api/treatment', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metadata.syndrome).toBe('Estancamiento de Qi del Hígado');
    expect(data.metadata.points.length).toBeGreaterThan(0);
    expect(data.ehr.saved).toBe(true);
  });

  it('debe sanitizar puntos prohibidos en embarazo', async () => {
    const body = {
      patient: { name: 'Test', dob: '1990-01-01', gender: 'F', pregnancy: true, patientId: 'TEST-002' },
      consultation: { goal: 'Dolor', symptoms: 'Dolor lumbar' },
    };

    const request = new NextRequest('http://localhost:3000/api/treatment', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    const points = data.metadata?.points?.map((p: any) => p.name) || [];
    const forbidden = ['SP6', 'LI4', 'GB21', 'SANYINJIAO', 'HEGU'];
    const hasForbidden = points.some((p: string) => forbidden.some(f => p.toUpperCase().includes(f)));
    expect(hasForbidden).toBe(false);
  });

  it('debe devolver consultationData para PDFs', async () => {
    const body = {
      patient: { name: 'Test', dob: '1978-03-20', gender: 'F', patientId: 'TEST-003' },
      consultation: { goal: 'Migraña', symptoms: 'Migraña' },
    };

    const request = new NextRequest('http://localhost:3000/api/treatment', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.consultationData).toBeDefined();
    expect(data.consultationData.patient).toBeDefined();
    expect(data.consultationData.kant).toBeDefined();
  });

  it('debe manejar payload inválido', async () => {
    const request = new NextRequest('http://localhost:3000/api/treatment', {
      method: 'POST',
      body: 'invalid json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
