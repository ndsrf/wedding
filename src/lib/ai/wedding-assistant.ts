/**
 * Wedding AI Assistant
 *
 * Generates contextual replies to guest WhatsApp messages using OpenAI or Gemini.
 * The assistant is aware of all wedding details and responds in the guest's language.
 *
 * Configuration (env vars):
 *   AI_PROVIDER    - "openai" (default) or "gemini"
 *   OPENAI_API_KEY - Required when AI_PROVIDER=openai
 *   OPENAI_MODEL   - Optional, defaults to "gpt-4o-mini"
 *   GEMINI_API_KEY - Required when AI_PROVIDER=gemini
 *   GEMINI_MODEL   - Optional, defaults to "gemini-1.5-flash"
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Wedding, Family, FamilyMember } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface FamilyContext extends Pick<Family, 'name' | 'magic_token' | 'preferred_language'> {
  members: Pick<FamilyMember, 'name' | 'attending'>[];
}

// ============================================================================
// LANGUAGE SUPPORT
// ============================================================================

const LANGUAGE_NAMES: Record<string, string> = {
  ES: 'Spanish',
  EN: 'English',
  FR: 'French',
  IT: 'Italian',
  DE: 'German',
};

// "Contact the couple" suffix in each supported language
const CONTACT_COUPLE_SUFFIX: Record<string, string> = {
  ES: 'Para una respuesta más personal, puedes contactar directamente con los novios.',
  EN: 'For a more personal answer, feel free to contact the couple directly.',
  FR: "Pour une réponse plus personnalisée, n'hésitez pas à contacter les mariés directement.",
  IT: 'Per una risposta più personale, non esitare a contattare direttamente gli sposi.',
  DE: 'Für eine persönlichere Antwort kannst du die Brautleute gerne direkt kontaktieren.',
};

// ============================================================================
// PROMPT BUILDER
// ============================================================================

function formatDate(date: Date, locale = 'en-GB'): string {
  return new Date(date).toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function buildSystemPrompt(
  wedding: Wedding,
  family: FamilyContext | null,
  language: string,
  appUrl: string,
  rsvpUrl?: string | null
): string {
  const lang = language in LANGUAGE_NAMES ? language : 'EN';
  const languageName = LANGUAGE_NAMES[lang];
  const contactSuffix = CONTACT_COUPLE_SUFFIX[lang] ?? CONTACT_COUPLE_SUFFIX['EN'];

  const weddingDate = formatDate(wedding.wedding_date);
  const cutoffDate = formatDate(wedding.rsvp_cutoff_date);

  let prompt = `You are a helpful wedding assistant for ${wedding.couple_names}'s wedding. `;
  prompt += `Your role is to answer questions from wedding guests in a warm, friendly, and concise manner.\n\n`;

  prompt += `## Wedding Details\n`;
  prompt += `- Couple: ${wedding.couple_names}\n`;
  prompt += `- Date: ${weddingDate}\n`;
  prompt += `- Time: ${wedding.wedding_time}\n`;
  prompt += `- Venue/Location: ${wedding.location}\n`;
  prompt += `- RSVP Deadline: ${cutoffDate}\n`;

  if (wedding.dress_code) {
    prompt += `- Dress Code: ${wedding.dress_code}\n`;
  }
  if (wedding.gift_iban) {
    prompt += `- Bank Account for Gifts (IBAN): ${wedding.gift_iban}\n`;
  }
  if (wedding.additional_info) {
    prompt += `- Additional Information: ${wedding.additional_info}\n`;
  }
  if (wedding.transportation_question_enabled && wedding.transportation_question_text) {
    prompt += `- Transportation: ${wedding.transportation_question_text}\n`;
  }
  if (wedding.dietary_restrictions_enabled) {
    prompt += `- Dietary restrictions can be specified when submitting the RSVP.\n`;
  }
  if (wedding.allow_guest_additions) {
    prompt += `- Guests may bring additional family members (specify when RSVPing).\n`;
  }

  // Extra questions configured for this wedding
  if (wedding.extra_question_1_enabled && wedding.extra_question_1_text) {
    prompt += `- ${wedding.extra_question_1_text}\n`;
  }
  if (wedding.extra_question_2_enabled && wedding.extra_question_2_text) {
    prompt += `- ${wedding.extra_question_2_text}\n`;
  }
  if (wedding.extra_question_3_enabled && wedding.extra_question_3_text) {
    prompt += `- ${wedding.extra_question_3_text}\n`;
  }

  if (family) {
    // Use provided short URL if available, fallback to long URL
    const finalRsvpUrl = rsvpUrl ?? `${appUrl}/rsvp/${family.magic_token}`;
    const attending = family.members.filter(m => m.attending === true);
    const notAttending = family.members.filter(m => m.attending === false);
    const pending = family.members.filter(m => m.attending === null);

    prompt += `\n## Guest Information\n`;
    prompt += `- Guest Family: ${family.name}\n`;
    prompt += `- RSVP Link: ${finalRsvpUrl}\n`;

    if (attending.length > 0) {
      prompt += `- Confirmed attending (${attending.length}): ${attending.map(m => m.name).join(', ')}\n`;
    }
    if (notAttending.length > 0) {
      prompt += `- Not attending (${notAttending.length}): ${notAttending.map(m => m.name).join(', ')}\n`;
    }
    if (pending.length > 0) {
      prompt += `- Pending RSVP (${pending.length}): ${pending.map(m => m.name).join(', ')}\n`;
    }
  }

  prompt += `\n## Instructions\n`;
  prompt += `1. Respond ONLY in ${languageName}. Do not use any other language.\n`;
  prompt += `2. Be warm, friendly, and concise (2–3 short paragraphs maximum).\n`;
  prompt += `3. Only answer questions relevant to the wedding using the information above.\n`;
  prompt += `4. If you cannot answer a question from the available information, say so politely.\n`;
  prompt += `5. If the guest's message involves anything that may require updating their RSVP (e.g. attendance, dietary restrictions, extra guests, transportation, or any other RSVP field), always include the RSVP link in your response.\n`;
  prompt += `6. Always end your response with this exact sentence: "${contactSuffix}"\n`;

  return prompt;
}

// ============================================================================
// OPENAI PROVIDER
// ============================================================================

async function generateWithOpenAI(systemPrompt: string, userMessage: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[AI_ASSISTANT] OPENAI_API_KEY is not configured');
    return null;
  }

  const openai = new OpenAI({ apiKey });

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 600,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content?.trim() ?? null;
}

// ============================================================================
// GEMINI PROVIDER
// ============================================================================

async function generateWithGemini(systemPrompt: string, userMessage: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[AI_ASSISTANT] GEMINI_API_KEY is not configured');
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userMessage);
  return result.response.text()?.trim() || null;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate an AI reply to a guest's WhatsApp message.
 *
 * @param guestMessage - The text sent by the guest
 * @param wedding      - Full Wedding record from the database
 * @param family       - Family context (null if the sender was not found)
 * @param language     - Language code (ES, EN, FR, IT, DE)
 * @param rsvpUrl      - Optional short RSVP URL to use instead of generating a long one
 * @returns AI-generated reply string, or null if no provider is available / call fails
 */
export async function generateWeddingReply(
  guestMessage: string,
  wedding: Wedding,
  family: FamilyContext | null,
  language = 'EN',
  rsvpUrl?: string | null
): Promise<string | null> {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const systemPrompt = buildSystemPrompt(wedding, family, language, appUrl, rsvpUrl);

  // Determine provider: explicit env var → fallback to whichever key is present
  const provider =
    process.env.AI_PROVIDER ||
    (process.env.OPENAI_API_KEY ? 'openai' : 'gemini');

  console.log('[AI_ASSISTANT] Generating reply', {
    provider,
    language,
    family: family?.name ?? '(unknown)',
    messageLength: guestMessage.length,
  });

  try {
    if (provider === 'gemini') {
      return await generateWithGemini(systemPrompt, guestMessage);
    }
    return await generateWithOpenAI(systemPrompt, guestMessage);
  } catch (error) {
    console.error('[AI_ASSISTANT] Generation failed:', error);
    return null;
  }
}
