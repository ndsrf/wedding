/**
 * Menu Parser AI
 *
 * Parses a tasting menu from a PDF or image file using AI vision.
 * Supports OpenAI (images + PDFs) and Gemini (images + PDFs).
 *
 * Configuration (env vars):
 *   AI_PROVIDER    - "openai" (default) or "gemini"
 *   OPENAI_API_KEY - Required when AI_PROVIDER=openai
 *   OPENAI_VISION_MODEL - Optional, defaults to "gpt-4o"
 *   GEMINI_API_KEY - Required when AI_PROVIDER=gemini
 *   GEMINI_MODEL   - Optional, defaults to "gemini-3-flash-preview"
 */

import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { ResourceType, Language } from '@prisma/client';
import { checkResourceLimit, recordResourceUsage, formatLimitError } from '@/lib/license/usage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedDish {
  name: string;
  description?: string;
}

export interface ParsedSection {
  name: string;
  dishes: ParsedDish[];
}

export interface ParsedMenu {
  sections: ParsedSection[];
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a menu parsing assistant. Extract the structure of a tasting/wedding menu from the provided image or PDF.

Return ONLY a valid JSON object with this exact structure:
{
  "sections": [
    {
      "name": "Section name (e.g. Cocktail Hour, Starters, Main Course, Dessert, Wines)",
      "dishes": [
        {
          "name": "Dish or item name",
          "description": "Optional description or notes"
        }
      ]
    }
  ]
}

Rules:
- Identify all sections/courses: cocktail hour (tapas, standing), starters/appetizers, main courses, desserts, cheeses, wines, beverages, etc.
- Include ALL dishes/items listed under each section
- Keep dish names and descriptions as close to the original text as possible
- If a dish has no description, omit the "description" field or set it to null
- If the document has no clear sections, group dishes logically
- Return ONLY the JSON object, no markdown, no explanation`;

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function parseWithOpenAI(fileBuffer: Buffer, mimeType: string): Promise<ParsedMenu | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[MENU_PARSER] OPENAI_API_KEY is not configured');
    return null;
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o';
  const base64 = fileBuffer.toString('base64');

  const filePart: OpenAI.ChatCompletionContentPart =
    mimeType === 'application/pdf'
      ? { type: 'file', file: { filename: 'menu.pdf', file_data: `data:application/pdf;base64,${base64}` } }
      : { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } };

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: SYSTEM_PROMPT }, filePart],
      },
    ],
    max_tokens: 4096,
    temperature: 0.1,
  });

  const text = response.choices[0]?.message?.content?.trim() ?? '';
  return extractJson(text);
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function parseWithGemini(fileBuffer: Buffer, mimeType: string): Promise<ParsedMenu | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[MENU_PARSER] GEMINI_API_KEY is not configured');
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

  const base64 = fileBuffer.toString('base64');

  const result = await ai.models.generateContent({
    model: modelName,
    contents: [
      {
        role: 'user',
        parts: [
          { text: SYSTEM_PROMPT },
          { inlineData: { data: base64, mimeType } },
        ],
      },
    ],
  });

  const text = result.text?.trim() ?? '';
  return extractJson(text);
}

// ─── JSON extractor ───────────────────────────────────────────────────────────

function extractJson(text: string): ParsedMenu | null {
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && Array.isArray(parsed.sections)) {
      return parsed as ParsedMenu;
    }
    console.error('[MENU_PARSER] Unexpected JSON shape:', cleaned.slice(0, 200));
    return null;
  } catch {
    console.error('[MENU_PARSER] Failed to parse JSON:', cleaned.slice(0, 200));
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a tasting menu from a file buffer.
 *
 * @param fileBuffer - Raw file bytes
 * @param mimeType   - MIME type of the file (e.g. "image/jpeg", "application/pdf")
 * @param plannerId  - ID of the wedding planner (for usage tracking)
 * @param weddingId  - ID of the wedding (for usage tracking)
 * @returns Parsed menu structure, error object, or null if parsing fails
 */
export async function parseMenuFromFile(
  fileBuffer: Buffer,
  mimeType: string,
  plannerId?: string,
  weddingId?: string,
  role: 'planner' | 'wedding_admin' = 'planner',
  language: Language = 'ES'
): Promise<ParsedMenu | { error: string } | null> {
  // Check resource limit if plannerId is provided
  if (plannerId) {
    const result = await checkResourceLimit({
      plannerId,
      weddingId,
      type: ResourceType.AI_PREMIUM,
    });

    if (!result.allowed) {
      const errorMessage = await formatLimitError({
        resourceType: result.resourceType!,
        limit: result.limit!,
        used: result.used!,
        role,
        language,
      });
      console.warn(`[MENU_PARSER] Limit reached for planner ${plannerId}: ${errorMessage}`);
      return { error: errorMessage };
    }
  }

  // Determine provider
  const provider =
    process.env.AI_PROVIDER ||
    (process.env.OPENAI_API_KEY ? 'openai' : process.env.GEMINI_API_KEY ? 'gemini' : null);

  if (!provider) {
    console.error('[MENU_PARSER] No AI provider configured (set OPENAI_API_KEY or GEMINI_API_KEY)');
    return null;
  }

  console.log('[MENU_PARSER] Parsing menu', { provider, mimeType, size: fileBuffer.length });

  try {
    let result: ParsedMenu | null = null;
    if (provider === 'gemini') {
      result = await parseWithGemini(fileBuffer, mimeType);
    } else {
      result = await parseWithOpenAI(fileBuffer, mimeType);
    }

    if (result && plannerId) {
      // Record usage if successful
      void recordResourceUsage({
        plannerId,
        weddingId,
        type: ResourceType.AI_PREMIUM,
      });
    }

    return result;
  } catch (error) {
    console.error('[MENU_PARSER] Failed:', error);
    return null;
  }
}
