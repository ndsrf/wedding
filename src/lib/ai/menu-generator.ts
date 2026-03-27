/**
 * Menu Generator AI
 *
 * Selects the best combination of dishes for a wedding menu based on:
 * - Desired quantities per category (appetizers, first course, second course, dessert)
 * - Wedding date and location (season, regional cuisine)
 * - Available dishes with their tasting ratings and score counts
 * - Guest context: average age, total count, dietary restrictions
 *
 * Uses the same OpenAI / Gemini provider as the rest of the AI layer.
 * The AI may ONLY select dish IDs from the provided list — it cannot invent new dishes.
 */

import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MenuDish {
  id: string;
  name: string;
  description?: string | null;
  average_score?: number | null;
  score_count?: number;           // How many tasters rated this dish
  section_name: string;
}

export interface GuestContext {
  totalGuests: number;
  averageAge: number | null;
  dietaryRestrictions: string[];  // Aggregated, de-duplicated list (no PII)
}

export interface GenerateMenuInput {
  dishes: MenuDish[];
  quantities: {
    appetizers: number;
    first_course: number;
    second_course: number;
    dessert: number;
  };
  weddingDate?: string | null;    // ISO date string
  location?: string | null;
  weddingCountry?: string | null; // ISO country code, e.g. "ES"
  guestContext?: GuestContext | null;
}

export interface GenerateMenuResult {
  selectedDishIds: string[];
  reasoning?: string;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(input: GenerateMenuInput): string {
  const { dishes, quantities, weddingDate, location, weddingCountry, guestContext } = input;

  // ── Wedding context ──────────────────────────────────────────────────────
  const contextParts: string[] = [];
  if (weddingDate) {
    const date = new Date(weddingDate);
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    const season = getSeason(date.getMonth());
    contextParts.push(`Wedding date: ${month} ${year} (${season})`);
  }
  if (location) {
    contextParts.push(`Wedding venue/location: ${location}`);
  }
  if (weddingCountry) {
    contextParts.push(`Country: ${weddingCountry}`);
  }

  // ── Guest context ────────────────────────────────────────────────────────
  if (guestContext) {
    if (guestContext.totalGuests > 0) {
      contextParts.push(`Total guests: ${guestContext.totalGuests}`);
    }
    if (guestContext.averageAge !== null && guestContext.averageAge > 0) {
      const ageDesc = describeAgeGroup(guestContext.averageAge);
      contextParts.push(
        `Average guest age: ${Math.round(guestContext.averageAge)} years old (${ageDesc})`,
      );
    }
    if (guestContext.dietaryRestrictions.length > 0) {
      contextParts.push(
        `Dietary restrictions among guests: ${guestContext.dietaryRestrictions.join(', ')}`,
      );
    }
  }

  const context = contextParts.length > 0
    ? contextParts.join('. ') + '.'
    : 'No specific context provided.';

  // ── Dish catalogue ───────────────────────────────────────────────────────
  const allIds = dishes.map(d => d.id);
  const dishList = dishes
    .map(d => {
      let line = `- ID: ${d.id} | Section: ${d.section_name} | Name: ${d.name}`;
      if (d.description) line += ` | Description: ${d.description}`;
      if (d.average_score != null) {
        const scoreInfo = d.score_count != null && d.score_count > 0
          ? ` (${d.score_count} taster${d.score_count !== 1 ? 's' : ''})`
          : '';
        line += ` | Tasting score: ${d.average_score.toFixed(1)}/10${scoreInfo}`;
      } else {
        line += ` | Tasting score: not rated yet`;
      }
      return line;
    })
    .join('\n');

  return `You are a professional wedding menu consultant. Your task is to select the best dishes for a wedding banquet.

CRITICAL CONSTRAINT: You MUST select dish IDs EXCLUSIVELY from the list below. Do NOT invent, guess, or use any ID that is not in this list. The complete set of valid IDs is:
${JSON.stringify(allIds)}

Context: ${context}

You must select exactly:
- ${quantities.appetizers} appetizer(s) / aperitivo(s)
- ${quantities.first_course} first course(s) / primer plato(s)
- ${quantities.second_course} second course(s) / segundo plato(s)
- ${quantities.dessert} dessert(s) / postre(s)

Selection criteria (in order of importance):
1. Category match — map each dish to its category using the section name:
   • Aperitivo / Cóctel / Cocktail / Canapés / Starters → appetizers
   • Primer Plato / Entrante / Starter / First Course → first course
   • Segundo Plato / Principal / Main Course / Second Course → second course
   • Postre / Dessert → dessert
   If a section name is ambiguous, use the dish name and description to infer the category.
2. Tasting scores — prefer highly-rated dishes; give extra weight to scores based on more tasters (more evidence = more reliable).
3. Seasonal & regional fit — choose dishes that suit the wedding season and local cuisine.
4. Guest profile — consider the average age of guests:
   • Young guests (< 30): bold, trendy, creative dishes.
   • Mixed / adult (30–55): balanced, crowd-pleasing classics with quality ingredients.
   • Mature guests (> 55): elegant, familiar, easily digestible options.
5. Dietary considerations — if dietary restrictions are listed, favour dishes that can accommodate them or note this in your reasoning.
6. Menu harmony — avoid repetitive proteins, flavours, or cooking methods across courses; ensure the overall menu flows well from starter to dessert.

Available dishes:
${dishList}

Return ONLY a valid JSON object — no markdown, no prose outside the JSON:
{
  "selectedDishIds": ["id1", "id2", "..."],
  "reasoning": "A concise explanation (2-4 sentences) of why these dishes were chosen."
}`;
}

function getSeason(month: number): string {
  if (month >= 2 && month <= 4) return 'Spring';
  if (month >= 5 && month <= 7) return 'Summer';
  if (month >= 8 && month <= 10) return 'Autumn';
  return 'Winter';
}

function describeAgeGroup(avg: number): string {
  if (avg < 30) return 'young crowd';
  if (avg < 45) return 'young adults';
  if (avg < 60) return 'mixed adult';
  return 'mature guests';
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
 * @param input - Dishes (with tasting scores), desired quantities, wedding context, and guest profile
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
    hasGuestContext: !!input.guestContext,
    avgAge: input.guestContext?.averageAge,
    totalGuests: input.guestContext?.totalGuests,
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
