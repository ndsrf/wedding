/**
 * Shared AI Provider Factory
 *
 * Returns Vercel AI SDK LanguageModel and EmbeddingModel based on AI_PROVIDER env var.
 * Supports OpenAI and Gemini providers.
 *
 * Configuration:
 *   AI_PROVIDER              - "openai" (default) or "gemini"
 *   OPENAI_API_KEY           - Required when provider=openai
 *   OPENAI_MODEL             - Optional, defaults to "gpt-4o-mini"
 *   GEMINI_API_KEY           - Required when provider=gemini
 *   GOOGLE_GENERATIVE_AI_API_KEY - Alternative to GEMINI_API_KEY
 *   GEMINI_MODEL             - Optional, defaults to "gemini-1.5-flash"
 */

import type { LanguageModel, EmbeddingModel } from 'ai';
// In ai v6, EmbeddingModel is a union type alias (not generic).
type AnyEmbeddingModel = EmbeddingModel;
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export function getProvider(): 'openai' | 'gemini' {
  const explicit = process.env.AI_PROVIDER;
  if (explicit === 'openai' || explicit === 'gemini') return explicit;
  return process.env.OPENAI_API_KEY ? 'openai' : 'gemini';
}

export function getChatModel(): LanguageModel {
  const provider = getProvider();

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const google = createGoogleGenerativeAI({ apiKey });
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    return google(modelName);
  }

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  return openai(modelName);
}

export function getEmbeddingModel(): AnyEmbeddingModel {
  const provider = getProvider();

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const google = createGoogleGenerativeAI({ apiKey });
    return google.textEmbeddingModel('text-embedding-004');
  }

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai.embedding('text-embedding-3-small');
}
