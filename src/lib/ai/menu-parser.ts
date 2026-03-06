/**
 * Menu Parser AI
 *
 * Parses a tasting menu from a PDF or image file using AI vision.
 * Supports OpenAI (images only) and Gemini (images + PDFs).
 *
 * Configuration (env vars):
 *   AI_PROVIDER    - "openai" (default) or "gemini"
 *   OPENAI_API_KEY - Required when AI_PROVIDER=openai
 *   OPENAI_VISION_MODEL - Optional, defaults to "gpt-4o"
 *   GEMINI_API_KEY - Required when AI_PROVIDER=gemini
 *   GEMINI_MODEL   - Optional, defaults to "gemini-2.0-flash"
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  if (mimeType === 'application/pdf') {
    console.error('[MENU_PARSER] OpenAI does not support PDF files. Use Gemini or upload an image.');
    return null;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[MENU_PARSER] OPENAI_API_KEY is not configured');
    return null;
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o';
  const base64 = fileBuffer.toString('base64');

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: SYSTEM_PROMPT },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
        ],
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

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const model = genAI.getGenerativeModel({ model: modelName });

  const base64 = fileBuffer.toString('base64');

  const result = await model.generateContent([
    SYSTEM_PROMPT,
    { inlineData: { data: base64, mimeType } },
  ]);

  const text = result.response.text()?.trim() ?? '';
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
 * @returns Parsed menu structure or null if parsing fails
 */
export async function parseMenuFromFile(fileBuffer: Buffer, mimeType: string): Promise<ParsedMenu | null> {
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
    if (provider === 'gemini') {
      return await parseWithGemini(fileBuffer, mimeType);
    }
    // OpenAI is the default — but for PDFs fall back to Gemini if key is available
    if (mimeType === 'application/pdf' && process.env.GEMINI_API_KEY) {
      console.log('[MENU_PARSER] PDF detected, falling back to Gemini');
      return await parseWithGemini(fileBuffer, mimeType);
    }
    return await parseWithOpenAI(fileBuffer, mimeType);
  } catch (error) {
    console.error('[MENU_PARSER] Failed:', error);
    return null;
  }
}
