/**
 * Menu Generator AI
 *
 * Selects the best combination of dishes for a wedding menu based on:
 * - Desired quantities per category (appetizers, first course, second course, dessert)
 * - Wedding date and location (season, regional cuisine)
 * - Available dishes with their ratings and descriptions
 *
 * Uses the same OpenAI / Gemini provider as the rest of the AI layer.
 */

import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MenuDish {
  id: string;
  name: string;
  description?: string | null;
  average_score?: number | null;
  section_name: string;
}

export interface GenerateMenuInput {
  dishes: MenuDish[];
  quantities: {
    appetizers: number;
    first_course: number;
    second_course: number;
    dessert: number;
  };
  weddingDate?: string | null;  // ISO date string
  location?: string | null;
}

export interface GenerateMenuResult {
  selectedDishIds: string[];
  reasoning?: string;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(input: GenerateMenuInput): string {
  const { dishes, quantities, weddingDate, location } = input;

  const contextParts: string[] = [];
  if (weddingDate) {
    const date = new Date(weddingDate);
    const month = date.toLocaleString('en-US', { month: 'long' });
    const season = getSeason(date.getMonth());
    contextParts.push(`Wedding date: ${month} (${season})`);
  }
  if (location) {
    contextParts.push(`Wedding location: ${location}`);
  }

  const context = contextParts.length > 0
    ? contextParts.join('. ') + '.'
    : 'No specific date or location provided.';

  const dishList = dishes
    .map(d =>
      `- ID: ${d.id} | Section: ${d.section_name} | Name: ${d.name}` +
      (d.description ? ` | Description: ${d.description}` : '') +
      (d.average_score != null ? ` | Rating: ${d.average_score.toFixed(1)}/10` : '')
    )
    .join('\n');

  return `You are a professional wedding menu consultant. Select the best combination of dishes for a wedding menu.

Context: ${context}

You must select exactly:
- ${quantities.appetizers} appetizer(s) / aperitivo(s)
- ${quantities.first_course} first course(s) / primer plato(s)
- ${quantities.second_course} second course(s) / segundo plato(s)
- ${quantities.dessert} dessert(s) / postre(s)

Consider:
1. Dish ratings (higher is better)
2. Seasonal and regional appropriateness based on the wedding date and location
3. Balance and variety (avoid repetitive flavors or ingredients)
4. Culinary harmony between courses

Available dishes:
${dishList}

Map sections to categories using the section name. Sections named like "Aperitivo", "Cóctel", "Cocktail", "Canapés" → appetizers. Sections named like "Primer Plato", "Entrante", "Starter", "First Course" → first course. Sections named like "Segundo Plato", "Principal", "Main Course", "Second Course" → second course. Sections named like "Postre", "Dessert" → dessert. If a section doesn't clearly match a category, use your best judgement based on the dish names and descriptions.

IMPORTANT: Return ONLY a valid JSON object with this exact structure, no markdown, no explanation:
{
  "selectedDishIds": ["id1", "id2", "..."],
  "reasoning": "Brief explanation of your choices"
}`;
}

function getSeason(month: number): string {
  if (month >= 2 && month <= 4) return 'Spring';
  if (month >= 5 && month <= 7) return 'Summer';
  if (month >= 8 && month <= 10) return 'Autumn';
  return 'Winter';
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function generateWithOpenAI(prompt: string): Promise<GenerateMenuResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[MENU_GENERATOR] OPENAI_API_KEY is not configured');
    return null;
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2048,
    temperature: 0.3,
  });

  const text = response.choices[0]?.message?.content?.trim() ?? '';
  return extractJson(text);
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function generateWithGemini(prompt: string): Promise<GenerateMenuResult | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error('[MENU_GENERATOR] GEMINI_API_KEY is not configured');
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  const result = await ai.models.generateContent({
    model: modelName,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const text = result.text?.trim() ?? '';
  return extractJson(text);
}

// ─── JSON extractor ───────────────────────────────────────────────────────────

function extractJson(text: string): GenerateMenuResult | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && Array.isArray(parsed.selectedDishIds)) {
      return {
        selectedDishIds: parsed.selectedDishIds as string[],
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : undefined,
      };
    }
    console.error('[MENU_GENERATOR] Unexpected JSON shape:', cleaned.slice(0, 200));
    return null;
  } catch {
    console.error('[MENU_GENERATOR] Failed to parse JSON:', cleaned.slice(0, 200));
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate the best wedding menu selection using AI.
 *
 * @param input - Dishes, desired quantities, and wedding context
 * @returns Selected dish IDs and reasoning, or null if generation fails
 */
export async function generateBestMenu(input: GenerateMenuInput): Promise<GenerateMenuResult | null> {
  const provider =
    process.env.AI_PROVIDER ||
    (process.env.OPENAI_API_KEY ? 'openai' : process.env.GEMINI_API_KEY ? 'gemini' : null);

  if (!provider) {
    console.error('[MENU_GENERATOR] No AI provider configured');
    return null;
  }

  const prompt = buildPrompt(input);
  console.log('[MENU_GENERATOR] Generating menu', {
    provider,
    totalDishes: input.dishes.length,
    quantities: input.quantities,
  });

  try {
    if (provider === 'gemini') {
      return await generateWithGemini(prompt);
    }
    return await generateWithOpenAI(prompt);
  } catch (error) {
    console.error('[MENU_GENERATOR] Failed:', error);
    return null;
  }
}
