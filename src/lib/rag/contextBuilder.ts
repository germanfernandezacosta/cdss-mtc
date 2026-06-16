// src/lib/rag/contextBuilder.ts
// RAG Context Builder v3.0 — sqlite-vec, sin hacks

import { VectorStore, RetrievedChunk } from './vectorStore';
import { Embedder } from './embedder';

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
  'bensky_materia_medica': 'Bensky — Materia Medica',
  'bensky_formulas': 'Bensky — Formulas and Strategies',
  'nogueira_manual_acupuntura': 'Nogueira — Manual de Acupuntura',
  'van_nghi_canon': 'Van Nghi — Canon de Medicina China',
  'van_nghi_meridianos': 'Van Nghi — Meridianos',
  'cemtc_base': 'CEMeTC — Base Documental',
};

function getDisplayName(documentId: string | null | undefined): string {
  if (!documentId) return 'Fuente desconocida';
  if (SOURCE_MAP[documentId]) return SOURCE_MAP[documentId];
  const base = documentId.replace(/^mtc-core_/, '').replace(/_/g, ' ');
  return base.replace(/\b\w/g, l => l.toUpperCase());
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
  const embedder = new Embedder();

  try {
    const queryEmbedding = await embedder.embedQuery(query);

    const chunks = store.search(queryEmbedding, {
      domain,
      domains,
      limit: maxChunks,
      minSimilarity
    });

    console.log(`[RAG] Recuperados ${chunks.length} chunks (minSim=${minSimilarity}):`);
    chunks.forEach((chunk: RetrievedChunk, i: number) => {
      console.log(`  [${i}] sim=${chunk.similarity?.toFixed(3)} | doc="${chunk.document}" | ${chunk.content?.substring(0, 50)}...`);
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
        documentId: chunk.documentId,
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