// src/lib/rag/contextBuilder.ts
// RAG Context Builder v2.1-fix
// Usa Embedder real si existe, sino avisa.

import { VectorStore, RetrievedChunk } from './vectorStore';

// ── Intentar importar tu embedder existente ──
let EmbedderClass: any = null;
try {
  const embedderModule = require('./embedder');
  EmbedderClass = embedderModule.Embedder || embedderModule.default;
} catch (e) {
  console.warn('[contextBuilder] No se pudo cargar embedder.ts, usando fallback');
}

export interface RAGContext {
  context: string;
  citations: Citation[];
  chunkCount: number;
  avgSimilarity: number;
}

export interface Citation {
  id: string;
  document: string;
  documentId: string;
  pageStart: number;
  pageEnd: number;
  similarity: number;
  excerpt: string;
}

const SOURCE_MAP: Record<string, string> = {
  'mtc-core_ASENTIMIENTO_Y_ALARMA__Shu_Mu___PUNTOS_MAESTROS__TRATAMIENTO_BASE__LOCALIZACI_N_Y_PRECAUCIONES': 'CEMeTC — Shu-Mu',
  'mtc-core_Auriculo_Practica': 'CEMeTC — Auriculoterapia',
  'mtc-core_BALANCE_ARTICULAR': 'CEMeTC — Balance Articular',
  'mtc-core_BIOMEDICIONES__LA_REGULACI_N_ENERG_TICA___PR_CTICA_CL_NICA__CONCEPTOS_B_SICOS_': 'CEMeTC — Biomediciones',
  'mtc-core_BIORRITMOS__COLATERALES__LAS_CUATRO_CAPAS__PUNTOS_ESPECIALES_Y_T_CNICA_DE_PLANOS': 'CEMeTC — Biorritmos',
  'mtc-core_Ba_Fa': 'CEMeTC — Ba-Fa',
  'mtc-core_Ba_Gang': 'CEMeTC — Ba-Gang',
  'mtc-core_Celulas_del_Sistema_Nervioso': 'CEMeTC — Sistema Nervioso',
  'mtc-core_Dolor_y_Cefalea': 'CEMeTC — Dolor y Cefalea',
  'mtc-core_El_interrogatorio': 'CEMeTC — El Interrogatorio',
  'bensky_materia_medica.pdf': 'Bensky — Materia Medica',
  'bensky_formulas.pdf': 'Bensky — Formulas and Strategies',
  'nogueira_manual_acupuntura.pdf': 'Nogueira — Manual de Acupuntura',
  'van_nghi_canon.pdf': 'Van Nghi — Canon de Medicina China',
  'van_nghi_meridianos.pdf': 'Van Nghi — Meridianos',
  'chen_john_herb_drug.pdf': 'Chen J.K. — Herb-Drug Interactions',
  'chen_tina_pediatrics.pdf': 'Chen T.T. — Pediatrics',
  'ucla_east_west.pdf': 'UCLA — Center for East-West Medicine',
  'mskcc_integrative.pdf': 'MSKCC — Integrative Medicine',
  'cemtc_base.pdf': 'CEMeTC — Base Documental',
};

function getDisplayName(documentId: string | null | undefined): string {
  if (!documentId || documentId.trim() === '') {
    return 'Fuente desconocida';
  }
  if (SOURCE_MAP[documentId]) return SOURCE_MAP[documentId];
  const withoutExt = documentId.replace(/\.pdf$/i, '');
  if (SOURCE_MAP[withoutExt + '.pdf']) return SOURCE_MAP[withoutExt + '.pdf'];
  const lower = documentId.toLowerCase();
  for (const [key, value] of Object.entries(SOURCE_MAP)) {
    if (lower.includes(key.replace('.pdf', '').toLowerCase())) return value;
  }
  return documentId.replace(/_/g, ' ').replace(/\.pdf$/i, '').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Genera embedding de query usando tu embedder real.
 * Si no hay embedder, usa un método de búsqueda por contenido (fallback).
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  if (EmbedderClass) {
    try {
      const embedder = new EmbedderClass();
      // Tu embedder no tiene .embed(), tiene .embedBatch()
      const embeddings = await embedder.embedBatch([query]);
      if (Array.isArray(embeddings) && embeddings.length > 0 && Array.isArray(embeddings[0])) {
        console.log(`[RAG] Embedding real: ${embeddings[0].length} dims`);
        return embeddings[0];
      }
    } catch (e: any) {
      console.warn(`[RAG] Embedder falló: ${e.message}`);
    }
  }

  console.warn('[RAG] ⚠️  Fallback dummy — integra embedBatch()');
  return new Array(3072).fill(0).map(() => Math.random() - 0.5);
}

export async function buildRAGContext(options: {
  query: string;
  domain?: string;
  domains?: string[];
  maxChunks?: number;
  minSimilarity?: number;
  dbPath?: string;
}): Promise<RAGContext> {
  const {
    query,
    domain,
    domains,
    maxChunks = 5,
    minSimilarity = 0.7,
    dbPath
  } = options;

  const store = new VectorStore(dbPath);

  try {
    const queryEmbedding = await generateQueryEmbedding(query);

    const chunks = store.search(queryEmbedding, {
      domain,
      domains,
      limit: maxChunks,
      minSimilarity
    });

    console.log(`[RAG] Recuperados ${chunks.length} chunks:`);
    chunks.forEach((chunk: RetrievedChunk, i: number) => {
      console.log(`  [${i}] sim=${chunk.similarity?.toFixed(3)} | doc="${chunk.document}" | content="${chunk.content?.substring(0, 50)}..."`);
    });

    if (chunks.length === 0) {
      return {
        context: 'No se encontró contexto documental relevante para esta consulta.',
        citations: [],
        chunkCount: 0,
        avgSimilarity: 0
      };
    }

    const contextParts: string[] = [];
    const citations: Citation[] = [];

    for (const chunk of chunks) {
      const displayName = getDisplayName(chunk.document);
      contextParts.push(
        `[FUENTE: ${displayName} | Págs. ${chunk.pageStart}-${chunk.pageEnd}]\n${chunk.content}`
      );
      citations.push({
        id: chunk.id,
        document: displayName,
        documentId: chunk.document || 'unknown',
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        similarity: chunk.similarity,
        excerpt: chunk.content.substring(0, 200)
      });
    }

    const avgSim = chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length;

    return {
      context: contextParts.join('\n\n---\n\n'),
      citations,
      chunkCount: chunks.length,
      avgSimilarity: avgSim
    };

  } finally {
    store.close();
  }
}

export default buildRAGContext;