/**
 * test-search.ts — Verificación forense de vectorStore.search()
 * Compatible con API v2.0 (TextChunk, RetrievedChunk, SourceDocument, Domain)
 * Uso: npx tsx src/scripts/test-search.ts
 */

import path from "path";
import { VectorStore } from "../lib/rag/vectorStore";
import { TextChunk, Domain, SourceDocument } from "../lib/rag/types";

const DB_PATH = path.resolve(process.cwd(), "data/vectors/test-fukuoka.db");

// Embedding dummy de 1536 dims normalizado
function makeDummyEmbedding(dim = 1536, seed = 42): number[] {
  const vec: number[] = [];
  let val = seed;
  for (let i = 0; i < dim; i++) {
    val = (val * 9301 + 49297) % 233280;
    vec.push((val / 233280) * 2 - 1);
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map((v) => v / norm);
}

function main() {
  console.log("🔍 Test de vectorStore.search() — CDSS MTC Premium v2.0\n");

  // Usar DB de test para no contaminar la producción
  const store = new VectorStore(DB_PATH);

  // Limpiar dominio de test si existe
  store.clearDomain("mtc-core");

  // 1. Insertar documento fuente
  const doc: SourceDocument = {
    id: "mtc-core_test_shu_mu",
    domain: "mtc-core",
    filename: "test_shu_mu.pdf",
    title: "Técnica Shu-Mu",
    author: "CEMeTC",
    totalPages: 200,
    ingestedAt: new Date().toISOString(),
  };
  store.upsertDocument(doc);

  // 2. Insertar chunks de prueba
  const chunks: TextChunk[] = [
    {
      id: "chunk-001",
      documentId: "mtc-core_test_shu_mu",
      domain: "mtc-core",
      content:
        "Técnica Shu-Mu: combinación de puntos Shu de dorso y Mu de abdomen para trastornos zang-fu.",
      pageStart: 42,
      pageEnd: 43,
      tokenCount: 18,
      embedding: makeDummyEmbedding(1536, 1),
    },
    {
      id: "chunk-002",
      documentId: "mtc-core_test_shu_mu",
      domain: "mtc-core",
      content:
        "Puntos Maestros de los 8 Vasos Reguladores: 21VB — Contraindicada su puntura profunda.",
      pageStart: 88,
      pageEnd: 89,
      tokenCount: 14,
      embedding: makeDummyEmbedding(1536, 2),
    },
    {
      id: "chunk-003",
      documentId: "mtc-core_test_shu_mu",
      domain: "mtc-core",
      content:
        "Movimiento Tierra: spleen/stomach, digestión, pensamiento excesivo, color amarillo.",
      pageStart: 120,
      pageEnd: 121,
      tokenCount: 12,
      embedding: makeDummyEmbedding(1536, 3),
    },
  ];

  store.insertChunks(chunks);
  console.log(`✅ Insertados ${chunks.length} chunks de prueba\n`);

  // 3. Stats
  const stats = store.getStats();
  console.log("📊 Stats:", JSON.stringify(stats, null, 2), "\n");

  // 4. Búsqueda: query idéntico al chunk-001 (seed=1)
  const queryEmbedding = makeDummyEmbedding(1536, 1);
  console.log("🔎 Query idéntica a chunk-001 (Shu-Mu)...");
  const results = store.search(queryEmbedding, {
    domains: ["mtc-core"],
    topK: 3,
    minSimilarity: 0.0,
  });

  console.log(`   Resultados: ${results.length}\n`);
  results.forEach((r, i) => {
    console.log(
      `   [${i + 1}] sim=${r.similarity.toFixed(4)} | chunk=${r.id} | doc=${r.documentId}`
    );
    console.log(`       content: ${r.content.substring(0, 90)}...`);
    console.log(`       pages: ${r.pageStart}-${r.pageEnd} | tokens: ${r.tokenCount}`);
    console.log(`       source: ${r.document.title} by ${r.document.author}\n`);
  });

  // 5. Validaciones
  const top1 = results[0];
  if (top1?.id === "chunk-001" && top1.similarity > 0.9999) {
    console.log("✅ PASS: top-1 es chunk-001 con similitud ~1.0");
  } else {
    console.log("❌ FAIL: top-1 no coincide");
    process.exit(1);
  }

  // 6. Threshold alto
  const strict = store.search(queryEmbedding, {
    domains: ["mtc-core"],
    topK: 5,
    minSimilarity: 0.999,
  });
  console.log(`\n🔒 Threshold 0.999: ${strict.length} resultados (esperado: 1)`);
  if (strict.length === 1 && strict[0].id === "chunk-001") {
    console.log("✅ PASS: threshold funciona");
  } else {
    console.log("❌ FAIL: threshold roto");
    process.exit(1);
  }

  // 7. Filtro por dominio (dominio inexistente)
  const empty = store.search(queryEmbedding, {
    domains: ["farmacopea"],
    topK: 5,
    minSimilarity: 0.0,
  });
  console.log(`\n📂 Filtro domain='farmacopea': ${empty.length} resultados (esperado: 0)`);
  if (empty.length === 0) {
    console.log("✅ PASS: filtro por dominio funciona");
  } else {
    console.log("❌ FAIL: filtro por dominio roto");
    process.exit(1);
  }

  store.close();

  // Limpiar DB de test
  try {
    const fs = require("fs");
    fs.unlinkSync(DB_PATH);
  } catch {}

  console.log("\n🏁 Todos los tests pasaron. vectorStore.search() está funcional.");
}

main();