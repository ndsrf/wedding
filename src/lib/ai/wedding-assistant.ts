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
import { GoogleGenAI } from '@google/genai';
import { ResourceType, Language } from '@prisma/client';
import type { Wedding, Family, FamilyMember } from '@prisma/client';
import type { TemplateDesign, SupportedLanguage, TemplateBlock } from '@/types/invitation-template';
import { checkResourceLimit, recordResourceUsage, formatLimitError } from '@/lib/license/usage';

// ============================================================================
// TYPES
// ============================================================================

export interface FamilyContext extends Pick<Family,
  'name' | 'magic_token' | 'preferred_language' |
  'extra_question_1_answer' | 'extra_question_2_answer' | 'extra_question_3_answer' |
  'extra_info_1_value' | 'extra_info_2_value' | 'extra_info_3_value' |
  'family_dropdown_question_1_answer'
> {
  members: Pick<FamilyMember,
    'name' | 'attending' |
    'guest_yn_question_1_answer' | 'guest_yn_question_2_answer' | 'guest_yn_question_3_answer' |
    'guest_dropdown_question_1_answer' | 'guest_dropdown_question_2_answer' | 'guest_dropdown_question_3_answer' |
    'guest_text_question_1_answer' | 'guest_text_question_2_answer' | 'guest_text_question_3_answer'
  >[];
}

export interface InvitationTemplateContext {
  design: TemplateDesign;
}

export interface LocationContext {
  address?: string | null;
  url?: string | null;
  google_maps_url?: string | null;
  notes?: string | null;
}

export interface MenuDishContext {
  name: string;
  description?: string | null;
}

export interface MenuSectionContext {
  name: string;
  dishes: MenuDishContext[];
}

export interface MenuContext {
  sections: MenuSectionContext[];
}

export interface ItineraryItemContext {
  item_type: string; // CEREMONY | EVENT | PRE_EVENT | POST_EVENT
  date_time: Date;
  location_name: string;
  location_address?: string | null;
  location_google_maps_url?: string | null;
  notes?: string | null;
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

function getLocalizedText(json: unknown, lang: string): string | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const record = json as Record<string, string>;
  return (record[lang] || record['EN']) ?? null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDate(date: Date, locale = 'en-GB'): string {
  return new Date(date).toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Extract all visible text from an invitation template design.
 * Collects TextBlock content and ButtonBlock labels in the guest's language.
 * Falls back to English when the requested language is not available.
 */
function extractInvitationText(design: TemplateDesign, language: string): string[] {
  const lang = language as SupportedLanguage;
  const texts: string[] = [];

  for (const block of design.blocks as TemplateBlock[]) {
    if (block.type === 'text') {
      const text = (block.content[lang] || block.content['EN'])?.trim();
      if (text) texts.push(text);
    } else if (block.type === 'button') {
      const text = (block.text[lang] || block.text['EN'])?.trim();
      if (text) texts.push(text);
    } else if (block.type === 'panel') {
      const title = (block.title[lang] || block.title['EN'])?.trim();
      const rawContent = (block.content[lang] || block.content['EN'])?.trim();
      const content = rawContent ? stripHtml(rawContent) : '';
      if (title && content) texts.push(`${title}: ${content}`);
      else if (title) texts.push(title);
      else if (content) texts.push(content);
    } else if (block.type === 'minisite') {
      const name = (block.folderNames[lang] || block.folderNames['EN'])?.trim();
      if (name) texts.push(`[Wedding info minisite: "${name}"]`);
    }
  }

  return texts;
}

function buildSystemPrompt(
  wedding: Wedding,
  family: FamilyContext | null,
  language: string,
  appUrl: string,
  rsvpUrl?: string | null,
  invitationTemplate?: InvitationTemplateContext | null,
  location?: LocationContext | null,
  menu?: MenuContext | null,
  itinerary?: ItineraryItemContext[] | null
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
  if (location?.address) {
    prompt += `- Address: ${location.address}\n`;
  }
  if (location?.url) {
    prompt += `- Venue Website: ${location.url}\n`;
  }
  if (location?.google_maps_url) {
    prompt += `- Google Maps: ${location.google_maps_url}\n`;
  }
  if (location?.notes) {
    prompt += `- Location Notes: ${location.notes}\n`;
  }
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

  // Family-level yes/no questions
  for (let i = 1; i <= 3; i++) {
    const w = wedding as unknown as Record<string, unknown>;
    if (w[`extra_question_${i}_enabled`]) {
      const text = getLocalizedText(w[`extra_question_${i}_text`], lang);
      if (text) prompt += `- RSVP yes/no question (family): ${text}\n`;
    }
  }

  // Family-level text info fields
  for (let i = 1; i <= 3; i++) {
    const w = wedding as unknown as Record<string, unknown>;
    if (w[`extra_info_${i}_enabled`]) {
      const label = getLocalizedText(w[`extra_info_${i}_label`], lang);
      if (label) prompt += `- RSVP text field (family): ${label}\n`;
    }
  }

  // Family-level dropdown
  if (wedding.family_dropdown_question_1_enabled) {
    const label = getLocalizedText(wedding.family_dropdown_question_1_label, lang);
    const options = (wedding.family_dropdown_question_1_options as Record<string, string[]> | null);
    const optList = options?.[lang] ?? options?.['EN'];
    if (label) prompt += `- RSVP dropdown (family): ${label}${optList ? ` (options: ${optList.join(', ')})` : ''}\n`;
  }

  // Per-guest yes/no questions
  for (let i = 1; i <= 3; i++) {
    const w = wedding as unknown as Record<string, unknown>;
    if (w[`guest_yn_question_${i}_enabled`]) {
      const text = getLocalizedText(w[`guest_yn_question_${i}_text`], lang);
      if (text) prompt += `- RSVP yes/no question (per guest): ${text}\n`;
    }
  }

  // Per-guest dropdown questions
  for (let i = 1; i <= 3; i++) {
    const w = wedding as unknown as Record<string, unknown>;
    if (w[`guest_dropdown_question_${i}_enabled`]) {
      const label = getLocalizedText(w[`guest_dropdown_question_${i}_label`], lang);
      const options = w[`guest_dropdown_question_${i}_options`] as Record<string, string[]> | null;
      const optList = options?.[lang] ?? options?.['EN'];
      if (label) prompt += `- RSVP dropdown (per guest): ${label}${optList ? ` (options: ${optList.join(', ')})` : ''}\n`;
    }
  }

  // Per-guest text questions
  for (let i = 1; i <= 3; i++) {
    const w = wedding as unknown as Record<string, unknown>;
    if (w[`guest_text_question_${i}_enabled`]) {
      const label = getLocalizedText(w[`guest_text_question_${i}_label`], lang);
      if (label) prompt += `- RSVP text field (per guest): ${label}\n`;
    }
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

    // Family-level question answers
    const w = wedding as unknown as Record<string, unknown>;
    const f = family as unknown as Record<string, unknown>;
    for (let i = 1; i <= 3; i++) {
      if (w[`extra_question_${i}_enabled`]) {
        const label = getLocalizedText(w[`extra_question_${i}_text`], lang);
        const answer = f[`extra_question_${i}_answer`];
        if (label && answer !== null && answer !== undefined) {
          prompt += `- ${label}: ${answer === true ? 'Yes' : 'No'}\n`;
        }
      }
      if (w[`extra_info_${i}_enabled`]) {
        const label = getLocalizedText(w[`extra_info_${i}_label`], lang);
        const value = f[`extra_info_${i}_value`];
        if (label && value) prompt += `- ${label}: ${value}\n`;
      }
    }
    if (wedding.family_dropdown_question_1_enabled) {
      const label = getLocalizedText(wedding.family_dropdown_question_1_label, lang);
      if (label && family.family_dropdown_question_1_answer) {
        prompt += `- ${label}: ${family.family_dropdown_question_1_answer}\n`;
      }
    }

    // Per-guest question answers
    const hasGuestQuestions = [1, 2, 3].some(i =>
      w[`guest_yn_question_${i}_enabled`] ||
      w[`guest_dropdown_question_${i}_enabled`] ||
      w[`guest_text_question_${i}_enabled`]
    );
    if (hasGuestQuestions) {
      prompt += `\n### Guest answers to RSVP questions\n`;
      for (const member of family.members) {
        const answers: string[] = [];
        const m = member as unknown as Record<string, unknown>;
        for (let i = 1; i <= 3; i++) {
          if (w[`guest_yn_question_${i}_enabled`]) {
            const label = getLocalizedText(w[`guest_yn_question_${i}_text`], lang);
            const ans = m[`guest_yn_question_${i}_answer`];
            if (label && ans !== null && ans !== undefined) {
              answers.push(`${label}: ${ans === true ? 'Yes' : 'No'}`);
            }
          }
          if (w[`guest_dropdown_question_${i}_enabled`]) {
            const label = getLocalizedText(w[`guest_dropdown_question_${i}_label`], lang);
            const ans = m[`guest_dropdown_question_${i}_answer`];
            if (label && ans) answers.push(`${label}: ${ans}`);
          }
          if (w[`guest_text_question_${i}_enabled`]) {
            const label = getLocalizedText(w[`guest_text_question_${i}_label`], lang);
            const ans = m[`guest_text_question_${i}_answer`];
            if (label && ans) answers.push(`${label}: ${ans}`);
          }
        }
        if (answers.length > 0) {
          prompt += `- ${member.name}: ${answers.join('; ')}\n`;
        }
      }
    }
  }

  if (invitationTemplate) {
    const invitationTexts = extractInvitationText(invitationTemplate.design, lang);
    if (invitationTexts.length > 0) {
      prompt += `\n## Invitation Content\n`;
      prompt += `The following text blocks appear in the wedding invitation and may be referenced by guests:\n`;
      for (const text of invitationTexts) {
        prompt += `- ${text}\n`;
      }
    }
  }

  if (menu && menu.sections.length > 0) {
    const selectedSections = menu.sections.filter(s => s.dishes.length > 0);
    if (selectedSections.length > 0) {
      prompt += `\n## Wedding Menu\n`;
      prompt += `The following dishes have been selected for the wedding banquet:\n`;
      for (const section of selectedSections) {
        prompt += `\n### ${section.name}\n`;
        for (const dish of section.dishes) {
          prompt += `- ${dish.name}`;
          if (dish.description) {
            prompt += `: ${dish.description}`;
          }
          prompt += `\n`;
        }
      }
    }
  }

  if (itinerary && itinerary.length > 0) {
    prompt += `\n## Wedding Itinerary\n`;
    const TYPE_LABELS: Record<string, string> = {
      CEREMONY: 'Ceremony',
      EVENT: 'Event',
      PRE_EVENT: 'Pre-event',
      POST_EVENT: 'Post-event',
    };
    for (const item of itinerary) {
      const typeLabel = TYPE_LABELS[item.item_type] ?? item.item_type;
      const dt = formatDate(item.date_time);
      const time = new Date(item.date_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      prompt += `- [${typeLabel}] ${dt} at ${time} — ${item.location_name}`;
      if (item.location_address) prompt += `, ${item.location_address}`;
      if (item.location_google_maps_url) prompt += ` | Maps: ${item.location_google_maps_url}`;
      if (item.notes) prompt += ` | Notes: ${item.notes}`;
      prompt += `\n`;
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

  const ai = new GoogleGenAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

  const result = await ai.models.generateContent({
    model: modelName,
    contents: userMessage,
    config: { systemInstruction: systemPrompt },
  });
  return result.text?.trim() || null;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate an AI reply to a guest's WhatsApp message.
 *
 * @param guestMessage       - The text sent by the guest
 * @param wedding            - Full Wedding record from the database
 * @param family             - Family context (null if the sender was not found)
 * @param language           - Language code (ES, EN, FR, IT, DE)
 * @param rsvpUrl            - Optional short RSVP URL to use instead of generating a long one
 * @param invitationTemplate - Optional active invitation template whose text blocks are added to the AI context
 * @param location           - Optional main event location details (address, website, Google Maps, notes)
 * @param menu               - Optional selected wedding menu (sections with dishes) to answer food-related questions
 * @returns AI-generated reply string, or null if no provider is available / call fails
 */
export async function generateWeddingReply(
  guestMessage: string,
  wedding: Wedding,
  family: FamilyContext | null,
  language = 'EN',
  rsvpUrl?: string | null,
  invitationTemplate?: InvitationTemplateContext | null,
  location?: LocationContext | null,
  menu?: MenuContext | null,
  itinerary?: ItineraryItemContext[] | null
): Promise<string | null> {
  // Check AI Standard limit
  const result = await checkResourceLimit({
    plannerId: wedding.planner_id,
    type: ResourceType.AI_STANDARD,
  });

  if (!result.allowed) {
    const errorMessage = await formatLimitError({
      resourceType: result.resourceType!,
      limit: result.limit!,
      used: result.used!,
      role: 'wedding_admin', // Guests are part of the couple's wedding context
      language: (language as Language) || 'ES',
    });
    console.warn(`[AI_ASSISTANT] Limit reached for planner ${wedding.planner_id}: ${errorMessage}`);
    return errorMessage;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const systemPrompt = buildSystemPrompt(wedding, family, language, appUrl, rsvpUrl, invitationTemplate, location, menu, itinerary);

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
    let reply: string | null = null;
    if (provider === 'gemini') {
      reply = await generateWithGemini(systemPrompt, guestMessage);
    } else {
      reply = await generateWithOpenAI(systemPrompt, guestMessage);
    }

    if (reply) {
      // Record AI Standard usage
      void recordResourceUsage({
        plannerId: wedding.planner_id,
        type: ResourceType.AI_STANDARD,
      });
    }

    return reply;
  } catch (error) {
    console.error('[AI_ASSISTANT] Generation failed:', error);
    return null;
  }
}
