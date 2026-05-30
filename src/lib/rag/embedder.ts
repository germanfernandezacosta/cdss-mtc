/**
 * FUKUOKA-H v2.0 — Embedder
 * Cliente para generar embeddings vía OpenRouter
 * Modelo: text-embedding-3-large (3072 dims, máxima calidad)
 */

import { TextChunk } from "./types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/embeddings";
const MODEL = "openai/text-embedding-3-large";
const BATCH_SIZE = 16;  // OpenRouter permite batching

export class Embedder {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("OPENROUTER_API_KEY no configurada");
    }
  }

  /**
   * Genera embeddings para un batch de chunks
   */
  async embedChunks(chunks: TextChunk[]): Promise<TextChunk[]> {
    const texts = chunks.map(c => c.content);
    const embeddings = await this.embedBatch(texts);

    return chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i],
    }));
  }

  /**
   * Genera embedding para una query clínica
   */
  async embedQuery(caseSummary: string): Promise<number[]> {
    const embeddings = await this.embedBatch([caseSummary]);
    return embeddings[0];
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "CDSS-MTC-FukuokaH",
      },
      body: JSON.stringify({
        model: MODEL,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter embedding error: ${response.status} ${error}`);
    }

    const data = await response.json();

    // OpenRouter devuelve { data: [{ embedding: [...], index: 0 }, ...] }
    const results: number[][] = new Array(texts.length);
    for (const item of data.data) {
      results[item.index] = item.embedding;
    }

    return results;
  }

  /**
   * Resume un caso clínico para embedding optimizado
   */
  static summarizeCase(
    symptoms: string,
    pulse?: string,
    tongue?: string,
    ryodoraku?: Record<string, number>
  ): string {
    const parts: string[] = [
      `Síntomas: ${symptoms}`,
    ];

    if (pulse) parts.push(`Pulso: ${pulse}`);
    if (tongue) parts.push(`Lengua: ${tongue}`);

    if (ryodoraku) {
      const ryodoSummary = Object.entries(ryodoraku)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      parts.push(`Ryodoraku: ${ryodoSummary}`);
    }

    return parts.join(". ");
  }
}