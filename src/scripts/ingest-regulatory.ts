#!/usr/bin/env tsx
/**
 * FUKUOKA-H v2.2 — Ingestion de documentos regulatorios (AHPRA / CMBA)
 * Uso: npx tsx src/scripts/ingest-regulatory.ts
 */

import * as fs from "fs";
import * as path from "path";
import { Chunker } from "../lib/rag/chunker";
import { Embedder } from "../lib/rag/embedder";
import { VectorStore } from "../lib/rag/vectorStore";

const REGULATORY_PATH = path.join(process.cwd(), "data", "regulatory");

interface RegulatoryDoc {
  filename: string;
  fullPath: string;
  domain: string;
  authority: "AHPRA" | "CMBA";
  docType: string;
  effectiveDate: string;
  description: string;
}

function findPdfFiles(): RegulatoryDoc[] {
  const docs: RegulatoryDoc[] = [];
  
  // Buscar recursivamente en data/regulatory/ y subcarpetas
  function scanDir(dir: string, authority: "AHPRA" | "CMBA") {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Determinar autoridad por nombre de carpeta
        const subAuthority = entry.name.toLowerCase().includes("ahpra") ? "AHPRA" : "CMBA";
        scanDir(fullPath, subAuthority);
      } else if (entry.name.toLowerCase().endsWith(".pdf")) {
        // Determinar tipo de documento por nombre de archivo
        const name = entry.name.toLowerCase();
        let docType = "Regulatory Document";
        let effectiveDate = "2020-01-01";
        let description = "Documento regulatorio";
        let domain = "regulatory-cmba";
        
        if (name.includes("advertising") || name.includes("ahpra")) {
          docType = "Advertising Guidelines";
          effectiveDate = "2020-12-14";
          description = "Guidelines for advertising a regulated health service - National Law s.133";
          domain = "regulatory-ahpra";
        } else if (name.includes("conduct") || name.includes("code")) {
          docType = "Code of Conduct";
          effectiveDate = "2022-06-29";
          description = "Chinese Medicine Board of Australia Code of Conduct";
          domain = "regulatory-cmba";
        } else if (name.includes("herbal") || name.includes("safe")) {
          docType = "Safe Herbal Practice";
          effectiveDate = "2023-12-01";
          description = "Guidelines for safe practice of Chinese herbal medicine";
          domain = "regulatory-cmba";
        } else if (name.includes("infection") || name.includes("control")) {
          docType = "Infection Control";
          effectiveDate = "2023-12-01";
          description = "Guidelines on infection prevention and control for acupuncture";
          domain = "regulatory-cmba";
        } else if (name.includes("record") || name.includes("health")) {
          docType = "Patient Health Records";
          effectiveDate = "2026-01-01";
          description = "Guidelines on patient health records for Chinese medicine practitioners";
          domain = "regulatory-cmba";
        }
        
        docs.push({
          filename: entry.name,
          fullPath,
          domain,
          authority,
          docType,
          effectiveDate,
          description,
        });
      }
    }
  }
  
  scanDir(REGULATORY_PATH, "CMBA");
  return docs;
}

async function ingestRegulatory() {
  console.log("");
  console.log("🏛️  FUKUOKA-H v2.2 — Ingestion de Documentos Regulatorios");
  console.log("═════════════════════════════════════════════════════════");

  if (!fs.existsSync(REGULATORY_PATH)) {
    fs.mkdirSync(REGULATORY_PATH, { recursive: true });
    console.log("📁 Directorio creado: " + REGULATORY_PATH);
  }

  console.log("");
  console.log("🔍 Buscando PDFs regulatorios...");
  console.log("");
  
  const foundDocs = findPdfFiles();
  
  if (foundDocs.length === 0) {
    console.error("❌ No se encontro ningun PDF en " + REGULATORY_PATH);
    console.log("");
    console.log("📋 Estructura esperada:");
    console.log("   data/regulatory/ahpra/ahpra-advertising-guidelines-2020.pdf");
    console.log("   data/regulatory/cmba/cmba-code-of-conduct-2022.pdf");
    console.log("   data/regulatory/cmba/cmba-safe-herbal-practice-2023.pdf");
    console.log("   data/regulatory/cmba/cmba-infection-control-acupuncture-2023.pdf");
    console.log("   data/regulatory/cmba/cmba-patient-health-records-2026.pdf");
    process.exit(1);
  }

  console.log("📚 PDFs encontrados: " + foundDocs.length);
  for (const doc of foundDocs) {
    const stats = fs.statSync(doc.fullPath);
    console.log("  ✅ " + doc.filename + " (" + (stats.size / 1024).toFixed(1) + " KB) [" + doc.authority + "]");
  }

  const chunker = new Chunker();
  const embedder = new Embedder();
  const store = new VectorStore();

  let totalChunks = 0;
  let totalEmbeddings = 0;

  for (const doc of foundDocs) {
    const docId = "reg_" + doc.authority.toLowerCase() + "_" + doc.docType.toLowerCase().replace(/\s+/g, "_") + "_" + doc.effectiveDate;

    console.log("");
    console.log("📖 [" + doc.authority + "] " + doc.docType);
    console.log("   Archivo: " + doc.filename);
    console.log("   Doc ID: " + docId);

    try {
      const { text, info } = await chunker.extractText(doc.fullPath);
      console.log("   └─ Paginas: " + (info.numpages || "N/A") + " | Caracteres: " + text.length);

      const chunks = chunker.chunkText(text, docId, doc.domain as any);
      console.log("   └─ Chunks generados: " + chunks.length);

      const enrichedChunks = chunks.map(chunk => ({
        ...chunk,
        content: "[" + doc.authority + " | " + doc.docType + " | Vigente: " + doc.effectiveDate + "]\n" + chunk.content,
      }));

      const BATCH_SIZE = 16;
      const chunksWithEmbeddings: typeof enrichedChunks = [];

      for (let i = 0; i < enrichedChunks.length; i += BATCH_SIZE) {
        const batch = enrichedChunks.slice(i, i + BATCH_SIZE);
        const embedded = await embedder.embedChunks(batch);
        chunksWithEmbeddings.push(...embedded);
        process.stdout.write("   └─ Embeddings: " + Math.min(i + BATCH_SIZE, enrichedChunks.length) + "/" + enrichedChunks.length + "\r");
      }
      console.log("   └─ Embeddings: " + enrichedChunks.length + "/" + enrichedChunks.length + " ✅");

      store.insertChunks(chunksWithEmbeddings);
      totalChunks += chunks.length;
      totalEmbeddings += chunksWithEmbeddings.length;

      console.log("   └─ ✅ Guardado en VectorStore");

    } catch (error) {
      console.error("   ❌ Error procesando " + doc.filename + ":", error);
    }
  }

  console.log("");
  console.log("═════════════════════════════════════════════════════════");
  console.log("✅ INGESTA REGULATORIA COMPLETADA");
  console.log("═════════════════════════════════════════════════════════");
  console.log("Documentos procesados: " + foundDocs.length);
  console.log("Total chunks: " + totalChunks);
  console.log("Total embeddings: " + totalEmbeddings);
  console.log("Dimensiones: 3072 (text-embedding-3-large)");

  const stats = store.getStats();
  console.log("");
  console.log("📊 Estadisticas por dominio:");
  for (const stat of stats) {
    if (stat.domain.startsWith("regulatory")) {
      console.log("   " + stat.domain + ": " + stat.chunks + " chunks");
    }
  }

  console.log("");
  console.log("💡 Uso en Fukuoka-H / KANT:");
  console.log("   - Busca en dominios: \"regulatory-ahpra\", \"regulatory-cmba\"");
  console.log("   - Las citas incluyen: [AUTORIDAD | TIPO | FECHA_VIGENCIA]");
  console.log("   - Ejemplo: \"[CMBA | Code of Conduct | 2022-06-29] Section 4.2...\"");

  chunker.dispose();
  store.close();
}

ingestRegulatory().catch((error) => {
  console.error("\n❌ Error fatal en ingestion regulatoria:", error);
  process.exit(1);
});
