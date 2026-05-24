/**
 * Wedding Disruption Alerts Generator
 *
 * Uses AI to identify the 3 most important location/date-specific risks
 * that could disrupt a wedding (e.g. local holidays, weather, price surges).
 * Called once at wedding creation time; results are added to the checklist.
 */

import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

export interface DisruptionAlert {
  title: string;
  description: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  ES: 'Spanish',
  EN: 'English',
  FR: 'French',
  IT: 'Italian',
  DE: 'German',
};

export interface WeddingAlertContext {
  coupleNames: string;
  weddingDate: string; // ISO date YYYY-MM-DD
  location?: string | null;
  language?: string | null; // Language enum: ES | EN | FR | IT | DE
}

function buildPrompt(ctx: WeddingAlertContext): string {
  const date = new Date(ctx.weddingDate);
  const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const responseLang = (ctx.language && LANGUAGE_NAMES[ctx.language]) || 'English';

  return `You are an expert wedding planner. Given the wedding details below, identify the 3 most important potential disruptions or risks the couple and planner should be aware of and act on proactively.

LANGUAGE: Write all text in ${responseLang}.

Wedding details:
- Couple: ${ctx.coupleNames}
- Date: ${dateStr}
- Location: ${ctx.location || 'Not specified'}

Consider: local public holidays or festivals that affect vendor pricing/availability, seasonal weather risks, major local events causing traffic or accommodation shortages, transport price surges (e.g. Christmas, Easter), school holiday periods, seasonal demand spikes, etc.

Return ONLY a valid JSON array with exactly 3 objects — no markdown, no extra text:
[
  {
    "title": "Short risk title in ${responseLang}, max 80 characters",
    "description": "1-2 sentences of actionable advice in ${responseLang}. Max 200 characters."
  }
]`;
}

function extractAlerts(text: string): DisruptionAlert[] | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every(
        (item) => typeof item.title === 'string' && typeof item.description === 'string'
      )
    ) {
      return parsed.slice(0, 3).map((item) => ({
        title: String(item.title).slice(0, 80),
        description: String(item.description).slice(0, 200),
      }));
    }
    console.error('[DISRUPTION_ALERTS] Unexpected JSON shape:', cleaned.slice(0, 200));
    return null;
  } catch {
    console.error('[DISRUPTION_ALERTS] Failed to parse JSON:', cleaned.slice(0, 200));
    return null;
  }
}

async function generateWithOpenAI(prompt: string): Promise<DisruptionAlert[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[DISRUPTION_ALERTS] OPENAI_API_KEY is not configured');
    return null;
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1024,
    temperature: 0.4,
  });

  const text = response.choices[0]?.message?.content?.trim() ?? '';
  return extractAlerts(text);
}

async function generateWithGemini(prompt: string): Promise<DisruptionAlert[] | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error('[DISRUPTION_ALERTS] GEMINI_API_KEY is not configured');
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  const result = await ai.models.generateContent({
    model: modelName,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const text = result.text?.trim() ?? '';
  return extractAlerts(text);
}

/**
 * Generate 3 disruption-risk alerts for a wedding based on its location and date.
 * Returns null if AI is not configured or generation fails (non-critical).
 */
export async function generateDisruptionAlerts(
  ctx: WeddingAlertContext
): Promise<DisruptionAlert[] | null> {
  const provider =
    process.env.AI_PROVIDER ||
    (process.env.OPENAI_API_KEY ? 'openai' : process.env.GEMINI_API_KEY ? 'gemini' : null);

  if (!provider) {
    console.warn('[DISRUPTION_ALERTS] No AI provider configured — skipping disruption alerts');
    return null;
  }

  const prompt = buildPrompt(ctx);
  console.log('[DISRUPTION_ALERTS] Generating alerts', {
    provider,
    location: ctx.location,
    weddingDate: ctx.weddingDate,
  });

  try {
    if (provider === 'gemini') {
      return await generateWithGemini(prompt);
    }
    return await generateWithOpenAI(prompt);
  } catch (error) {
    console.error('[DISRUPTION_ALERTS] Failed:', error);
    return null;
  }
}
