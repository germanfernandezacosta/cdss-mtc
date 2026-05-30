// src/lib/rag/vectorStore.ts
// Vector Store v2.1-fix — Ultra-compatible con scripts existentes
// Usa tipos flexibles para evitar conflictos con tus interfaces de types.ts

import Database from 'better-sqlite3';
import path from 'path';

// ── Tipos internos (DB) ──
interface DBChunk {
  chunk_id: string;
  document_id: string;
  domain: string;
  content: string;
  page_start: number;
  page_end: number;
  token_count: number;
  embedding: string;
}

// ── Tipos públicos (compatibles con tus scripts) ──
export interface Chunk {
  chunk_id: string;
  document_id: string;
  domain: string;
  content: string;
  page_start: number;
  page_end: number;
  token_count: number;
  embedding: number[];
}

export interface RetrievedChunk {
  id: string;
  document: any;              // ← any: puede ser string o {title, filename}
  documentId: string;
  domain: string;
  content: string;
  pageStart: number;
  pageEnd: number;
  tokenCount: number;
  similarity: number;
}

export class VectorStore {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const finalPath = dbPath || path.join(process.cwd(), 'data', 'vectors', 'fukuoka-master.db');
    this.db = new Database(finalPath);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chunks (
        chunk_id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        domain TEXT,
        content TEXT,
        page_start INTEGER,
        page_end INTEGER,
        token_count INTEGER,
        embedding TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_chunks_domain ON chunks(domain);
      CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);
    `);
  }

  // ── insertChunk (singular) ──
  insertChunk(chunk: Chunk): void {
    if (!chunk.document_id || chunk.document_id.trim() === '') {
      throw new Error(`[VectorStore] document_id obligatorio. chunk_id=${chunk.chunk_id}`);
    }
    const stmt = this.db.prepare(`
      INSERT INTO chunks (chunk_id, document_id, domain, content, page_start, page_end, token_count, embedding)
      VALUES (@chunk_id, @document_id, @domain, @content, @page_start, @page_end, @token_count, @embedding)
      ON CONFLICT(chunk_id) DO UPDATE SET
        document_id = excluded.document_id,
        domain = excluded.domain,
        content = excluded.content,
        embedding = excluded.embedding
    `);
    stmt.run({
      chunk_id: chunk.chunk_id,
      document_id: chunk.document_id,
      domain: chunk.domain,
      content: chunk.content,
      page_start: chunk.page_start,
      page_end: chunk.page_end,
      token_count: chunk.token_count,
      embedding: JSON.stringify(chunk.embedding)
    });
  }

  // ── insertChunks (plural) — acepta TextChunk[] o Chunk[] ──
  insertChunks(chunks: any[]): void {
    const insert = this.db.prepare(`
      INSERT INTO chunks (chunk_id, document_id, domain, content, page_start, page_end, token_count, embedding)
      VALUES (@chunk_id, @document_id, @domain, @content, @page_start, @page_end, @token_count, @embedding)
      ON CONFLICT(chunk_id) DO UPDATE SET
        document_id = excluded.document_id,
        domain = excluded.domain,
        content = excluded.content,
        embedding = excluded.embedding
    `);
    const tx = this.db.transaction((items: any[]) => {
      for (const item of items) {
        const mapped = this.mapToDBChunk(item);
        if (!mapped.document_id) {
          console.warn(`[VectorStore] Saltando chunk sin document_id: ${mapped.chunk_id}`);
          continue;
        }
        insert.run({
          chunk_id: mapped.chunk_id,
          document_id: mapped.document_id,
          domain: mapped.domain,
          content: mapped.content,
          page_start: mapped.page_start,
          page_end: mapped.page_end,
          token_count: mapped.token_count,
          embedding: JSON.stringify(mapped.embedding)
        });
      }
    });
    tx(chunks);
  }

  // ── upsertDocument — acepta SourceDocument (con filename/title) ──
  upsertDocument(doc: any): void {
    // SourceDocument no tiene content/embedding, así que solo guardamos metadata
    // Si tu repo original tiene tabla 'documents', esto la ignora por ahora
    console.log(`[VectorStore] upsertDocument: ${doc.id} (${doc.filename || doc.title || 'sin nombre'})`);
  }

  // ── clearDomain ──
  clearDomain(domain: string): void {
    this.db.prepare('DELETE FROM chunks WHERE domain = ?').run(domain);
  }

  // ── search — acepta topK como alias de limit, y domains (plural) ──
  search(queryEmbedding: number[], options: any = {}): RetrievedChunk[] {
    const {
      domain,
      domains,
      limit = 5,
      topK,
      minSimilarity = 0.7
    } = options;

    const actualLimit = topK || limit;
    const targetDomains = domains || (domain ? [domain] : []);

    let sql = `SELECT chunk_id, document_id, domain, content, page_start, page_end, token_count, embedding FROM chunks`;
    const params: any[] = [];

    if (targetDomains.length === 1) {
      sql += ` WHERE domain = ?`;
      params.push(targetDomains[0]);
    } else if (targetDomains.length > 1) {
      sql += ` WHERE domain IN (${targetDomains.map(() => '?').join(',')})`;
      params.push(...targetDomains);
    }

    const rows = this.db.prepare(sql).all(...params) as DBChunk[];

    const results: RetrievedChunk[] = rows.map(row => {
      const embedding: number[] = JSON.parse(row.embedding);
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      return {
        id: row.chunk_id,
        document: row.document_id,      // ← string por defecto
        documentId: row.document_id,
        domain: row.domain,
        content: row.content,
        pageStart: row.page_start,
        pageEnd: row.page_end,
        tokenCount: row.token_count,
        similarity
      };
    });

    return results
      .filter(r => r.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, actualLimit);
  }

  // ── getStats — devuelve formato que tus scripts esperan ──
  getStats(): any {
    const rows = this.db.prepare(`
      SELECT domain, COUNT(DISTINCT document_id) as files, COUNT(*) as chunks
      FROM chunks
      GROUP BY domain
    `).all() as any[];

    // Formato array con {domain, files, chunks}
    return rows.map(r => ({
      domain: r.domain,
      files: r.files,
      chunks: r.chunks
    }));
  }

  // ── DIAGNÓSTICO ──
  diagnostic(): { total: number; withDocId: number; withoutDocId: number; sampleDocs: string[] } {
    const total = this.db.prepare('SELECT COUNT(*) as c FROM chunks').get() as { c: number };
    const withDocId = this.db.prepare(`SELECT COUNT(*) as c FROM chunks WHERE document_id IS NOT NULL AND document_id != ''`).get() as { c: number };
    const withoutDocId = this.db.prepare(`SELECT COUNT(*) as c FROM chunks WHERE document_id IS NULL OR document_id = ''`).get() as { c: number };
    const samples = this.db.prepare(`SELECT DISTINCT document_id FROM chunks WHERE document_id IS NOT NULL LIMIT 10`).all() as any[];
    return {
      total: total.c,
      withDocId: withDocId.c,
      withoutDocId: withoutDocId.c,
      sampleDocs: samples.map(s => s.document_id)
    };
  }

  private mapToDBChunk(item: any): Chunk {
    // Mapea TextChunk (id, documentId, pageStart...) a DB Chunk (chunk_id, document_id, page_start...)
    return {
      chunk_id: item.id || item.chunk_id,
      document_id: item.documentId || item.document_id || item.document,
      domain: item.domain,
      content: item.content,
      page_start: item.pageStart || item.page_start || 0,
      page_end: item.pageEnd || item.page_end || 0,
      token_count: item.tokenCount || item.token_count || 0,
      embedding: item.embedding
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  close(): void {
    this.db.close();
  }
}

export default VectorStore;