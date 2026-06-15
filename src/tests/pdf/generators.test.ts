import { describe, it, expect, vi } from 'vitest';

// Mock de pdfmake para tests (no necesitamos generar PDFs reales en tests)
vi.mock('pdfmake/build/pdfmake', () => ({
  createPdf: vi.fn(() => ({
    getBlob: vi.fn(() => Promise.resolve(new Blob(['fake-pdf'], { type: 'application/pdf' }))),
  })),
}));

vi.mock('@/lib/pdfmake-config', () => ({
  configurePdfMake: vi.fn(() => Promise.resolve()),
  PDF_COLORS: {
    jade: '#1a4731',
    gold: '#c9a227',
  },
}));

import { generateForensicPDF } from '@/lib/pdf-generators/forensic-pdf';
import { generateEmpathicPDF } from '@/lib/pdf-generators/empathic-pdf';

describe('Generadores PDF', () => {
  it('generateForensicPDF debe devolver un Blob', async () => {
    const data = {
      patient: { name: 'Test', hash: 'abc123', age: 30, gender: 'M' },
      session: { id: 1, date: '2026-06-15T00:00:00Z' },
      practitioner: {},
      sections: { A: 'Sección A', B: 'Sección B' },
      kant: { status: 'green', score: 95 },
      system: { version: '3.0', timestamp: '2026-06-15T00:00:00Z' },
    };

    const blob = await generateForensicPDF(data as any);
    
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
  });

  it('generateEmpathicPDF debe devolver un Blob', async () => {
    const data = {
      patient: { name: 'Test', preferredName: 'Test', age: 30, gender: 'M' },
      session: { date: '2026-06-15T00:00:00Z' },
      practitioner: {},
      sectionC: 'Hola, Test.\n\nGracias por confiar...',
      hasEvolution: false,
      previousSyndrome: null,
    };

    const blob = await generateEmpathicPDF(data as any);
    
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
  });
});