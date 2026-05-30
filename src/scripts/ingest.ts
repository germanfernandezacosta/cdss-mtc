#!/usr/bin/env tsx
/**
 * FUKUOKA-H v2.0 — Script de ingestión masiva
 * Uso: npm run rag:ingest -- --domain=mtc-core --path=./data/sources/01-mtc-core/
 */

import fs from "fs";
import path from "path";
import { Chunker } from "../lib/rag/chunker";
import { Embedder } from "../lib/rag/embedder";
import { VectorStore } from "../lib/rag/vectorStore";
import { Domain, IngestProgress, SourceDocument } from "../lib/rag/types";

function parseArgs() {
  const args = process.argv.slice(2);
  const domain = args.find(a => a.startsWith("--domain="))?.split("=")[1] as Domain;
  const sourcePath = args.find(a => a.startsWith("--path="))?.split("=")[1];
  const clear = args.includes("--clear");

  if (!domain || !sourcePath) {
    console.error("Uso: npm run rag:ingest -- --domain=<dominio> --path=<ruta> [--clear]");
    console.error("Dominios válidos: mtc-core, farmacopea, oncologia, fitoterapia, safety-guides");
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

  console.log(`
🧠 FUKUOKA-H Ingesta v2.0`);
  console.log(`Dominio: ${domain}`);
  console.log(`Origen: ${absolutePath}
`);

  // Inicializar componentes
  const chunker = new Chunker();
  const embedder = new Embedder();
  const store = new VectorStore();

  // Limpiar dominio si se solicita
  if (clear) {
    console.log(`🗑️  Limpiando dominio anterior: ${domain}`);
    store.clearDomain(domain);
  }

  // Encontrar PDFs
  const files = fs.readdirSync(absolutePath)
    .filter(f => f.toLowerCase().endsWith(".pdf"))
    .map(f => path.join(absolutePath, f));

  if (files.length === 0) {
    console.error("❌ No se encontraron PDFs en la ruta especificada");
    process.exit(1);
  }

  console.log(`📚 PDFs encontrados: ${files.length}
`);

  const progress: IngestProgress = {
    totalFiles: files.length,
    processedFiles: 0,
    currentFile: "",
    totalChunks: 0,
    status: "processing",
  };

  // Procesar cada PDF
  for (const filePath of files) {
    const filename = path.basename(filePath);
    progress.currentFile = filename;
    progress.processedFiles++;

    console.log(`[${progress.processedFiles}/${progress.totalFiles}] 📄 ${filename}`);

    try {
      // 1. Extraer texto
      // 1. Extraer texto
      const { text, info } = await chunker.extractText(filePath);
      const metadata = await chunker.extractMetadata(filePath);

      // 2. Crear documento fuente
      const docId = `${domain}_${filename.replace(/\.pdf$/i, "").replace(/[^a-z0-9]/gi, "_")}`;
      const doc: SourceDocument = {
        id: docId,
        domain,
        filename,
        title: metadata.title,
        author: metadata.author,
        totalPages: metadata.totalPages || 0,
        ingestedAt: new Date().toISOString(),
      };

      // 3. Guardar documento
      store.upsertDocument(doc);

      // 4. Chunking
      const chunks = chunker.chunkText(text, docId, domain);
      console.log(`   └─ ${chunks.length} chunks generados`);

      // 5. Embeddings (en batches)
      const chunksWithEmbeddings: typeof chunks = [];
      const BATCH_SIZE = 16;

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const embedded = await embedder.embedChunks(batch);
        chunksWithEmbeddings.push(...embedded);
        process.stdout.write(`   └─ Embeddings: ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length}
`);
      }
      console.log(); // newline

      // 6. Guardar en vector store
      store.insertChunks(chunksWithEmbeddings);
      progress.totalChunks += chunks.length;

    } catch (error) {
      console.error(`   ❌ Error procesando ${filename}:`, error);
    }
  }

  progress.status = "completed";

  // Resumen final
  console.log(`
✅ Ingesta completada`);
  console.log(`─────────────────────────────`);
  const stats = store.getStats() as Record<string, { files: number; chunks: number }>;
  for (const [dom, stat] of Object.entries(stats)) {
    console.log(`${dom}: ${stat.files} archivos, ${stat.chunks} chunks`);
  }
  console.log(`─────────────────────────────
`);

  chunker.dispose();
  store.close();
}

ingest().catch(console.error);