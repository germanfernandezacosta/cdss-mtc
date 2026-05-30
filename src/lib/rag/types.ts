/**
 * FUKUOKA-H v2.0 — Sistema de Conocimiento Clínico Integrado
 * Tipos y interfaces del motor RAG multi-dominio
 */

export type Domain = "mtc-core" | "farmacopea" | "oncologia" | "fitoterapia" | "safety-guides" | "regulatory-ahpra" | "regulatory-cmba";

export interface SourceDocument {
  id: string;
  domain: Domain;
  filename: string;
  title?: string;
  author?: string;
  totalPages: number;
  ingestedAt: string;
}

export interface TextChunk {
  id: string;
  documentId: string;
  domain: Domain;
  content: string;
  pageStart: number;
  pageEnd: number;
  tokenCount: number;
  embedding?: number[];
}

export interface RetrievedChunk extends TextChunk {
  metadata: any;
  similarity: number;
  document: SourceDocument;
}

export interface ClinicalCase {
  patientName: string;
  patientAge?: string;
  symptoms: string;
  pulse?: string;
  tongue?: string;
  ryodoraku?: Record<string, number>;
  safetyAlerts?: Record<string, boolean>;
}

export interface RAGQuery {
  case: ClinicalCase;
  domains?: Domain[];        // Por defecto busca en todos
  topK?: number;             // Por defecto 5
  minSimilarity?: number;    // Por defecto 0.75
}

export interface Citation {
  author: string;
  title: string;
  chapter?: string;
  page: number;
  quote: string;
  relevance: number;
}

export interface DiagnosisResult {
  pattern: string;
  confidence: number;
  mechanism: string;
  citations: Citation[];
}

export interface TreatmentResult {
  protocol: string[];
  formula?: string;
  justification: string;
  citations: Citation[];
}

export interface RAGResponse {
  diagnosis: DiagnosisResult;
  treatment: TreatmentResult;
  safety: {
    kantStatus: "green" | "yellow" | "red";
    alerts: string[];
    contraindications: string[];
  };
  sources: RetrievedChunk[];
}

export interface IngestProgress {
  totalFiles: number;
  processedFiles: number;
  currentFile: string;
  totalChunks: number;
  status: "idle" | "processing" | "completed" | "error";
  error?: string;
}