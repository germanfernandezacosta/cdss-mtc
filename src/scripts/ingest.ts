#!/usr/bin/env tsx
/**
 * FUKUOKA-H v3.0 — Script de ingestión masiva
 * Uso: npx tsx src/scripts/ingest.ts --domain=mtc-core --path=./data/sources/01-mtc-core/
 */

import fs from "fs";
import path from "path";
import { Chunker } from "../lib/rag/chunker";
import { Embedder } from "../lib/rag/embedder";
import { VectorStore } from "../lib/rag/vectorStore";

function parseArgs() {
  const args = process.argv.slice(2);
  const domain = args.find(a => a.startsWith("--domain="))?.split("=")[1];
  const sourcePath = args.find(a => a.startsWith("--path="))?.split("=")[1];
  const clear = args.includes("--clear");

  if (!domain || !sourcePath) {
    console.error("Uso: npx tsx src/scripts/ingest.ts --domain=<dominio> --path=<ruta> [--clear]");
    process.exit(1);
  }

  return { domain, sourcePath, clear };
}

async function ingest() {
  const { domain, sourcePath, clear } = parseArgs();
  const absolutePath = path.resolve(sourcePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Ruta no existe: ${absolutePath}`);
    process.exit(1);
  }

  console.log(`🧠 FUKUOKA-H Ingesta v3.0`);
  console.log(`Dominio: ${domain}`);
  console.log(`Origen: ${absolutePath}\n`);

  const chunker = new Chunker();
  const embedder = new Embedder();
  const store = new VectorStore();

  if (clear) {
    console.log(`🗑️  Limpiando dominio: ${domain}`);
    store.clearDomain(domain);
  }

  const files = fs.readdirSync(absolutePath)
    .filter(f => f.toLowerCase().endsWith(".pdf"))
    .map(f => path.join(absolutePath, f));

  if (files.length === 0) {
    console.error("❌ No se encontraron PDFs");
    process.exit(1);
  }

  console.log(`📚 PDFs encontrados: ${files.length}\n`);

  for (const filePath of files) {
    const filename = path.basename(filePath);
    console.log(`📄 ${filename}`);

    try {
      const { text, info } = await chunker.extractText(filePath);
      const metadata = await chunker.extractMetadata(filePath);

      const docId = `${domain}_${filename.replace(/\.pdf$/i, "").replace(/[^a-z0-9]/gi, "_")}`;
      
      store.upsertDocument({
        id: docId,
        domain,
        filename,
        title: metadata.title,
        totalPages: metadata.totalPages
      });

      const chunks = chunker.chunkText(text, docId, domain as import("../lib/rag/types").Domain);
      console.log(`   └─ ${chunks.length} chunks`);

      // Embeddings en batches
      const BATCH_SIZE = 16;
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const embedded = await embedder.embedChunks(batch);
        store.insertChunks(embedded.map(c => ({
          id: c.id,
          documentId: c.documentId,
          domain: c.domain,
          content: c.content,
          pageStart: c.pageStart,
          pageEnd: c.pageEnd,
          embedding: c.embedding
        })));
        process.stdout.write(`   └─ Embeddings: ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length}\r`);
      }
      console.log();

    } catch (error) {
      console.error(`   ❌ Error:`, error);
    }
  }

  const stats = store.getStats();
  console.log(`\n✅ Ingesta completada`);
  console.log(`─────────────────────────────`);
  for (const stat of stats) {
    console.log(`${stat.domain}: ${stat.files} archivos, ${stat.chunks} chunks`);
  }
  console.log(`─────────────────────────────\n`);

  chunker.dispose();
  store.close();
}

ingest().catch(console.error);