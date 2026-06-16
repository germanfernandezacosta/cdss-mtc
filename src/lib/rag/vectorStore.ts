// src/lib/rag/vectorStore.ts
// Vector Store v3.1 — Sin sqlite-vec, cosine similarity nativo, robusto
// FIX: Elimina dependencia de sqlite-vec que falla con tipos de metadata

import Database from 'better-sqlite3';
import path from 'path';

export interface Chunk {
  id: string;
  documentId: string;
  domain: string;
  content: string;
  pageStart: number;
  pageEnd: number;
  embedding?: number[];
  tokenCount?: number;
  document?: any;
  [key: string]: any;
}

export interface RetrievedChunk {
  id: string;
  document: any;
  documentId: string;
  domain: string;
  content: string;
  pageStart: number;
  pageEnd: number;
  similarity: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
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
      CREATE TABLE IF NOT EXISTS documents (
        document_id TEXT PRIMARY KEY,
        domain TEXT,
        filename TEXT,
        title TEXT,
        total_pages INTEGER,
        ingested_at TEXT
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chunks (
        chunk_id TEXT PRIMARY KEY,
        document_id TEXT,
        domain TEXT,
        content TEXT,
        page_start REAL,
        page_end REAL,
        embedding TEXT
      );
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chunks_domain ON chunks(domain);
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON chunks(document_id);
    `);
  }

  upsertDocument(doc: { id: string; domain: string; filename: string; title?: string; totalPages?: number }): void {
    const stmt = this.db.prepare(`
      INSERT INTO documents (document_id, domain, filename, title, total_pages, ingested_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(document_id) DO UPDATE SET
        domain = excluded.domain,
        filename = excluded.filename,
        title = excluded.title,
        total_pages = excluded.total_pages
    `);
    stmt.run(doc.id, doc.domain, doc.filename, doc.title || null, doc.totalPages || 0, new Date().toISOString());
  }

  insertChunks(chunks: Chunk[]): void {
    const validChunks = chunks.filter(c => {
      if (!c.embedding || !Array.isArray(c.embedding) || c.embedding.length === 0) {
        console.warn(`[VectorStore] Chunk ${c.id} omitido: sin embedding valido`);
        return false;
      }
      return true;
    });

    if (validChunks.length === 0) {
      console.warn('[VectorStore] No hay chunks con embedding para insertar');
      return;
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO chunks (chunk_id, document_id, domain, content, page_start, page_end, embedding)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = this.db.transaction((items: Chunk[]) => {
      for (const chunk of items) {
        stmt.run(
          chunk.id,
          chunk.documentId,
          chunk.domain,
          chunk.content,
          chunk.pageStart,
          chunk.pageEnd,
          JSON.stringify(chunk.embedding)
        );
      }
    });

    tx(validChunks);
  }

  clearDomain(domain: string): void {
    this.db.prepare("DELETE FROM chunks WHERE domain = ?").run(domain);
    this.db.prepare("DELETE FROM documents WHERE domain = ?").run(domain);
  }

  search(queryEmbedding: number[], options: {
    domain?: string;
    domains?: string[];
    limit?: number;
    topK?: number;
    minSimilarity?: number;
  } = {}): RetrievedChunk[] {
    const { domain, domains, limit, topK, minSimilarity = 0.7 } = options;
    const effectiveLimit = topK || limit || 5;
    const targetDomains = domains || (domain ? [domain] : []);

    let rows: any[];

    if (targetDomains.length === 1) {
      rows = this.db.prepare("SELECT * FROM chunks WHERE domain = ?").all(targetDomains[0]);
    } else if (targetDomains.length > 1) {
      const placeholders = targetDomains.map(() => '?').join(',');
      rows = this.db.prepare(`SELECT * FROM chunks WHERE domain IN (${placeholders})`).all(...targetDomains);
    } else {
      rows = this.db.prepare("SELECT * FROM chunks").all();
    }

    const results: RetrievedChunk[] = rows.map(row => ({
      id: row.chunk_id,
      document: row.document_id,
      documentId: row.document_id,
      domain: row.domain,
      content: row.content,
      pageStart: row.page_start,
      pageEnd: row.page_end,
      similarity: cosineSimilarity(queryEmbedding, JSON.parse(row.embedding))
    }));

    return results
      .filter(r => r.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, effectiveLimit);
  }

  getStats(): Array<{ domain: string; files: number; chunks: number }> {
    const rows = this.db.prepare(`
      SELECT domain, COUNT(DISTINCT document_id) as files, COUNT(*) as chunks
      FROM chunks
      GROUP BY domain
    `).all() as any[];

    return rows.map(r => ({
      domain: r.domain,
      files: r.files,
      chunks: r.chunks
    }));
  }

  diagnostic(): { total: number; domains: string[] } {
    const total = this.db.prepare('SELECT COUNT(*) as c FROM chunks').get() as { c: number };
    const domains = this.db.prepare('SELECT DISTINCT domain FROM chunks').all() as any[];
    return {
      total: total.c,
      domains: domains.map(d => d.domain)
    };
  }

  close(): void {
    this.db.close();
  }
}