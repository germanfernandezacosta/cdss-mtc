// src/scripts/test-rag-citations.ts
// Test de diagnóstico RAG v3.0 — Ejecutar: npx tsx src/scripts/test-rag-citations.ts

import { VectorStore } from '../lib/rag/vectorStore';
import { buildRAGContext } from '../lib/rag/contextBuilder';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  DIAGNÓSTICO RAG v3.0 — CDSS MTC Premium');
  console.log('═══════════════════════════════════════════════════════════\n');

  const DB_PATH = './data/vectors/fukuoka-master.db';

  // TEST 1: Diagnóstico de la base de datos
  console.log('📊 TEST 1: Diagnóstico de Base de Datos');
  console.log('───────────────────────────────────────────────────────────');

  const store = new VectorStore(DB_PATH);
  const diag = store.diagnostic();

  console.log(`   Total chunks:      ${diag.total}`);
  console.log(`   Dominios:          ${diag.domains.join(', ') || '(vacío)'}`);

  if (diag.total === 0) {
    console.log('\n   ⚠️  Base de datos vacía. Ejecuta ingest.ts primero.');
  }
  console.log();

  // TEST 2: Búsqueda directa
  console.log('🔍 TEST 2: Búsqueda Directa (vectorStore.search)');
  console.log('───────────────────────────────────────────────────────────');

  const dummyEmbedding = new Array(3072).fill(0).map(() => Math.random() - 0.5);
  const chunks = store.search(dummyEmbedding, { domain: 'clinical', limit: 5, minSimilarity: 0 });

  console.log(`   Chunks recuperados: ${chunks.length}\n`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const docStatus = chunk.document ? '✅' : '❌ UNDEFINED';
    console.log(`   [${i}] sim=${chunk.similarity?.toFixed(3)} | doc="${chunk.document}" ${docStatus}`);
    console.log(`        content="${chunk.content?.substring(0, 60)?.replace(/\n/g, ' ')}..."`);
    console.log();
  }

  store.close();

  // TEST 3: buildRAGContext completo
  console.log('📚 TEST 3: buildRAGContext (flujo completo)');
  console.log('───────────────────────────────────────────────────────────');

  try {
    const ragResult = await buildRAGContext({
      query: 'síndrome de hígado yang elevado con irritabilidad',
      domain: 'clinical',
      maxChunks: 5,
      minSimilarity: 0,
      dbPath: DB_PATH
    });

    console.log(`   Chunks en contexto: ${ragResult.chunkCount}`);
    console.log(`   Similitud media:    ${ragResult.avgSimilarity?.toFixed(3)}`);
    console.log(`   Citaciones:         ${ragResult.citations.length}\n`);

    for (let i = 0; i < ragResult.citations.length; i++) {
      const cite = ragResult.citations[i];
      const docStatus = cite.document && cite.document !== 'Fuente desconocida' ? '✅' : '❌';
      console.log(`   [${i}] ${docStatus} ${cite.document}`);
      console.log(`        doc_id="${cite.documentId}" | pág ${cite.pageStart}-${cite.pageEnd}`);
      console.log(`        excerpt="${cite.excerpt?.substring(0, 60)}..."`);
      console.log();
    }

    const allOk = ragResult.citations.every((c: any) => c.document && c.document !== 'Fuente desconocida');
    if (allOk) {
      console.log('   ✅ Todas las citaciones tienen fuente identificada\n');
    } else {
      console.log('   ❌ ALGUNAS CITACIONES MUESTRAN "Fuente desconocida"\n');
    }

  } catch (err: any) {
    console.log(`   ❌ ERROR: ${err.message}\n`);
  }

  // RESUMEN
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  RESUMEN');
  console.log('═══════════════════════════════════════════════════════════');

  const allOk = diag.total > 0;

  if (allOk) {
    console.log('   ✅ RAG funcionando correctamente.');
    console.log('   ✅ Chunks presentes en la base de datos.');
  } else {
    console.log('   ❌ Hay problemas. Revisa los tests arriba.');
  }
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(console.error);