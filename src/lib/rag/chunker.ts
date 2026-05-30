import * as fs from "fs";
import { encoding_for_model } from "tiktoken";
import { TextChunk, SourceDocument, Domain } from "./types";

const CHUNK_SIZE = 512;
const MAX_CHUNK = 768;
const OVERLAP = 50;

// Polyfill DOMException para pdf-parse/pdf.js en Node.js 18+
// @ts-ignore
if (typeof globalThis.DOMException === "undefined") {
  try {
    const { DOMException } = require("domexception");
    globalThis.DOMException = DOMException;
  } catch {
    globalThis.DOMException = class DOMException extends Error {
      constructor(message: string, name?: string) {
        super(message);
        this.name = name || "Error";
      }
    } as any;
  }
}

// @ts-ignore
const pdfParse = require("pdf-parse");

export class Chunker {
  private encoder = encoding_for_model("text-embedding-3-large");

  async extractText(pdfPath: string): Promise<{ text: string; info: any }> {
    const buffer = fs.readFileSync(pdfPath);
    const data = await (pdfParse as any)(buffer);
    return { text: data.text, info: data };
  }

  chunkText(text: string, documentId: string, domain: Domain): TextChunk[] {
    const clean = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const tokens = this.encoder.encode(clean);
    const chunks: TextChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < tokens.length) {
      const end = Math.min(start + CHUNK_SIZE, tokens.length);
      const slice = tokens.slice(start, end);
      const chunkText = this.encoder.decode(slice);

      chunks.push({
        id: `${documentId}-${index}`,
        content: typeof chunkText === "string" ? chunkText : Buffer.from(chunkText).toString("utf-8"),
        documentId,
        domain,
        // 'position' removed because TextChunk type does not include it
        tokenCount: slice.length,
        pageStart: 0,
        pageEnd: 0
      });

      start += CHUNK_SIZE - OVERLAP;
      index++;

      if (end === tokens.length) break;
    }

    return chunks;
  }

  async processDocument(
    pdfPath: string,
    source: SourceDocument,
    domain: Domain
  ): Promise<TextChunk[]> {
    const { text } = await this.extractText(pdfPath);
    return this.chunkText(text, source.id, domain);
  }

  async extractMetadata(pdfPath: string): Promise<{
    totalPages: number; title: string; author: string; pages: number; keywords?: string 
}> {
    const buffer = fs.readFileSync(pdfPath);
    const data = await (pdfParse as any)(buffer);
    return {
      totalPages: data.numpages || 0,
      title: data.info?.Title || "",
      author: data.info?.Author || "",
      pages: data.numpages || 0,
      keywords: data.info?.Keywords || "",
    };
  }

  dispose(): void {
    try {
      (this.encoder as any).free?.();
    } catch {
      // ignore
    }
  }
}