/**
 * Embeddings Service
 *
 * Generates embedding vectors for text strings using the configured AI provider.
 * Batches requests to max 20 per call to avoid rate limits.
 *
 * Depends on: src/lib/ai/provider.ts
 */

import { embedMany } from 'ai';
import { getEmbeddingModel } from './provider';

const BATCH_SIZE = 20;

/**
 * Generate embedding vectors for an array of text strings.
 * Batches to max 20 per request. Returns [] for empty input.
 *
 * @param texts - Array of text strings to embed
 * @returns Array of float arrays (one per input text), in input order
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const model = getEmbeddingModel();
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const { embeddings } = await embedMany({
      model,
      values: batch,
      experimental_telemetry: { isEnabled: true },
    });
    results.push(...embeddings);
  }

  return results;
}
