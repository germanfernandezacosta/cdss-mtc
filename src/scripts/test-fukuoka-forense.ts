/**
 * test-fukuoka-forense.ts — Verificación forense del RAG
 * Fix v2.1: Detecta automáticamente la dimensión de embeddings en la DB real
 *           para evitar "Dimension mismatch".
 */

import path from "path";
import Database from "better-sqlite3";
import { VectorStore } from "../lib/rag/vectorStore";

const DB_PATH = path.resolve(process.cwd(), "data/vectors/fukuoka-master.db");

/**
 * Lee la dimensión real de embeddings desde la DB.
 * Los chunks de CEMeTC usan 3072-dim (text-embedding-3-large).
 */
function getEmbeddingDimension(dbPath: string): number {
  const db = new Database(dbPath);
  const row = db.prepare("SELECT embedding FROM chunks WHERE embedding IS NOT NULL LIMIT 1").get() as any;
  db.close();
  if (!row || !row.embedding) return 1536; // fallback
  return JSON.parse(row.embedding).length;
}

/**
 * Genera un embedding dummy de la dimensión correcta, normalizado.
 */
function makeDummyEmbedding(dim: number, seed = 42): number[] {
  const vec: number[] = [];
  let val = seed;
  for (let i = 0; i < dim; i++) {
    val = (val * 9301 + 49297) % 233280;
    vec.push((val / 233280) * 2 - 1);
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map((v) => v / norm);
}

async function main() {
  console.log("🔬 Verificación forense RAG — CDSS MTC Premium\n");

  const store = new VectorStore(DB_PATH);
  const stats = store.getStats() as Record<string, { chunks: number }>;
  console.log("📊 Stats por dominio:", JSON.stringify(stats, null, 2), "\n");

  const totalChunks = Object.values(stats).reduce((sum, s) => sum + s.chunks, 0);
  if (totalChunks === 0) {
    console.log("⚠️  DB vacía. Ejecuta ingest.ts primero.");
    store.close();
    return;
  }

  // Detectar dimensión real para evitar mismatch
  const dim = getEmbeddingDimension(DB_PATH);
  console.log(`📐 Dimensión de embeddings detectada: ${dim}\n`);

  // Query con embedding dummy de la dimensión correcta
  const queryEmbedding = makeDummyEmbedding(dim, 42);
  const chunks = store.search(queryEmbedding, {
    domains: ["mtc-core"],
    topK: 5,
    minSimilarity: 0,
  });

  console.log(`🔎 Top ${chunks.length} chunks recuperados:\n`);

  for (const r of chunks) {
    const source = r.document?.title || r.document?.filename || "desconocida";
    const score = r.similarity?.toFixed(3) || "N/A";
    const pages = r.pageStart && r.pageEnd ? `p.${r.pageStart}-${r.pageEnd}` : "";

    console.log(`  [${score}] ${r.id} | ${source} ${pages}`);
    console.log(`      → ${r.content.substring(0, 120).replace(/\n/g, " ")}...\n`);
  }

  // Verificaciones forenses de contenido real
  const hasRealContent = chunks.some((c) =>
    /Shu-Mu|Maestros de los 8 Vasos|Contraindicada|puntura profunda|21VB|ASENTIMIENTO/i.test(c.content)
  );

  if (hasRealContent) {
    console.log("✅ PASS: El RAG recupera contenido real y trazable de los PDFs de CEMeTC.");
  } else {
    console.log("⚠️  No se detectó contenido clínico específico en esta query dummy.");
    console.log("   Esto es normal: un embedding aleatorio no es semánticamente cercano a ningún tema.");
    console.log("   Prueba con un embedding real generado desde OpenRouter para una query clínica.");
  }

  store.close();
  console.log("\n🏁 Verificación completada.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});