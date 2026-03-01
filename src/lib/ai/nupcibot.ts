/**
 * NupciBot AI Assistant
 *
 * Answers questions about the Nupci wedding management platform.
 * Uses the same OpenAI/Gemini providers as the wedding-assistant.
 * Supports multi-turn conversation history.
 *
 * Configuration (env vars):
 *   AI_PROVIDER    - "openai" (default) or "gemini"
 *   OPENAI_API_KEY - Required when AI_PROVIDER=openai
 *   OPENAI_MODEL   - Optional, defaults to "gpt-4o-mini"
 *   GEMINI_API_KEY - Required when AI_PROVIDER=gemini
 *   GEMINI_MODEL   - Optional, defaults to "gemini-2.0-flash"
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ============================================================================
// PLATFORM KNOWLEDGE BASE
// ============================================================================

const PLATFORM_DOCS = `
# Nupci – Wedding Management Platform

Nupci is a comprehensive, multi-tenant wedding management platform designed for professional wedding planners. It allows planners to manage multiple weddings simultaneously and gives each couple secure access to their own wedding data.

## User Roles
- **Wedding Planner** (Planner): Creates and manages weddings. Accesses the platform at /planner/dashboard. Can invite Wedding Admins, manage providers, create checklist templates, and configure message templates.
- **Wedding Admin** (Couple): Manages a specific wedding. Accesses the admin panel at /admin. Handles guests, RSVPs, invitations, seating, payments, etc.
- **Guest**: Receives a magic link via WhatsApp, email, or SMS and RSVPs without creating an account.

---

## Admin Pages & Features

### Dashboard (/admin)
The main hub for wedding admins. Shows:
- Wedding details: couple names, date, location, days until wedding countdown
- Key metrics: total guests, RSVP completion %, attending count, gifts received
- RSVP progress bar
- Upcoming tasks widget
- Quick links to all sections
- NupciBot floating assistant (bottom-right)

---

### Guest Management (/admin/guests)
Manage all wedding guests organized as family units.
- **Add/Edit guests**: Each family has a name, contact person, email, phone, WhatsApp, language, preferred channel (WhatsApp/Email/SMS), and members.
- **Family Members**: Each member has a name, type (adult/child/infant), age, and RSVP status.
- **Import from Excel**: Upload an Excel file (.xlsx) with family data. Template available to download.
- **Export to Excel**: Download the full guest list.
- **Bulk Actions**: Select multiple guests to delete or bulk-edit properties (language, channel, attendance status).
- **Filters**: Filter by RSVP status, channel, payment/gift status, language, or who invited them.
- **RSVP Status**: Pending (not answered), Submitted (answered), Attending/Not Attending.
- **Invited By**: Each family can be attributed to a specific wedding admin.
- **Guest Activity Timeline**: View the full activity history for each family (link opens, RSVP submitted, invitations sent, etc.).

---

### Configure Wedding (/admin/configure)
Customize all RSVP and wedding settings:
- **Dress code**: Text field for dress code instructions.
- **Additional info for guests**: Extra information displayed on the RSVP page.
- **Allow guest additions**: Let guests add family members during RSVP (subject to admin review).
- **Gift IBAN**: Bank account for wedding gifts.
- **Payment tracking mode**: Automated (unique reference codes) or Manual.
- **Save the Date**: Enable sending save-the-date messages before invitations.
- **RSVP Questions**: Add transportation question (Yes/No), dietary restrictions question, and up to 3 custom Yes/No questions, plus up to 3 mandatory text fields.
- **Danger Zone**: Delete all guests (irreversible).

---

### Message Templates (/admin/templates)
Create and manage message templates for invitations, reminders, confirmations, and save-the-date messages.
- **Template types**: Invitation, Reminder, Confirmation, Save the Date.
- **Channels**: Email, WhatsApp, SMS.
- **Languages**: English, Spanish, French, Italian, German (5 languages).
- **Placeholders**: Use {{familyName}}, {{coupleNames}}, {{magicLink}}, {{weddingDate}}, etc. to personalize messages.
- **Preview**: See a preview of how the message will look before saving.

---

### Invitation Builder (/admin/invitation-builder)
Design beautiful wedding invitation pages that guests see when they open their magic link.
- **Blocks**: Add text, image, location map, countdown timer, add-to-calendar button, and RSVP button.
- **Multi-language**: Each text block supports all 5 languages.
- **Canvas settings**: Set background color or background image.
- **Paper background**: Add a decorative paper texture.
- **Preview**: Preview the invitation as it appears to guests.
- **Multiple templates**: Create and manage several templates; activate the one to use.

---

### Send Invitations / Reminders (/admin/guests → select guests → send)
From the guest list, select one or multiple guests and send:
- **Invitation**: First-time invitation with magic link.
- **Save the Date**: Early announcement (if enabled in configuration).
- **Reminder**: Follow-up for pending RSVPs.
Supports all channels (WhatsApp, Email, SMS) and respects the guest's preferred channel.

---

### Notifications & Activity (/admin/notifications)
Real-time activity feed showing all guest interactions:
- Link opened, RSVP started, RSVP submitted/edited
- Invitation sent, reminder sent, save-the-date sent
- Payment received, AI reply sent
- Filter by date range, event type, family, channel
- Mark as read
- Export notifications
A notification bell (top of page) shows the unread count.

---

### Reports (/admin/reports)
Generate and export reports:
- **Attendee List**: Full guest list with contact details, RSVP status, dietary restrictions, and table assignments.
- **Guests Per Administrator**: Summary of guests invited by each admin.
- **Seating Plan Report**: Detailed seating with guest names, tables, dietary restrictions.
- **Guest Age Average**: Age statistics grouped by admin or table.
Export to Excel (.xlsx) or CSV.

---

### Seating Plan (/admin/seating)
Visually arrange guests at tables:
- **Configure tables**: Add tables with name/number and capacity.
- **Assign guests**: Drag-and-drop confirmed guests to tables.
- **Random assign**: Automatically distribute guests.
- **Split families**: Assign family members to different tables.
Stats: total guests, confirmed guests, total seats, assigned seats.

---

### Checklist (/admin/checklist)
Track wedding tasks:
- Pre-populated from the planner's template.
- Tasks have title, description, assigned to (planner/couple), due date, and status (Pending/In Progress/Completed).
- Import/export to Excel.

---

### Providers (/admin/providers)
Manage wedding service providers (venue, catering, photography, music, etc.):
- Assign providers from the planner's library to the wedding.
- Track contact info, contract status, and payments for each provider.
- Record payments with amount, method, and date.

---

### Gifts & Payments (/admin/payments)
Track wedding gifts:
- Automated mode: Each family gets a unique reference code for bank transfers.
- Manual mode: Manually record gifts received.
- Mark gifts as received or confirmed.
- Filter by attending/not attending families.

---

### Guest Additions Review (/admin/guest-additions)
When "Allow Guest Additions" is enabled in configuration, guests can add family members during RSVP. These additions appear here for the admin to review and approve.

---

### Gallery (/admin/gallery)
Manage wedding photos:
- Connect Google Photos account for automatic sync.
- Manual upload of photos.
- Show/hide photos from the public gallery.
- Guests can contribute photos to the shared album.

---

### Wedding Details (/admin/wedding-details)
View and edit wedding information:
- Couple names, date, time, location
- RSVP cutoff date
- WhatsApp sending mode (Business API via Twilio or WhatsApp Links)

---

## WhatsApp Sending Modes
- **Business mode**: Messages are sent automatically via the Twilio WhatsApp Business API.
- **Links mode**: The admin opens pre-filled wa.me links in new browser tabs and sends messages manually.

---

## Guest RSVP Experience
Guests receive a magic link (no account needed). The RSVP page shows:
- Wedding details (couple names, date, time, location, dress code)
- Family members to confirm attendance
- Optional: dietary restrictions, transportation, accessibility needs, custom questions
- Gift information (IBAN, reference code if applicable)
Guests can edit their RSVP until the cutoff date.

---

## Multi-Language Support
The platform supports English (EN), Spanish (ES), French (FR), Italian (IT), and German (DE).
- Each guest family has a preferred language.
- Message templates are available in all 5 languages.
- The guest RSVP page automatically shows in the family's language.

---

## AI Features
- **WhatsApp AI Replies**: The platform can automatically generate AI replies to guest WhatsApp messages using the wedding details as context.
- **NupciBot**: The floating assistant (this bot!) can answer questions about the platform and help admins navigate features. It also lets admins send messages to their wedding planner.

---

## Authentication
- Wedding Planners and Admins sign in via OAuth (Google, Facebook, Instagram, Apple, Microsoft).
- Guests use magic links – no passwords or accounts needed.
`;

// ============================================================================
// PROMPT BUILDER
// ============================================================================

function buildSystemPrompt(language: string, userName?: string): string {
  const languageInstructions: Record<string, string> = {
    EN: 'Respond in English.',
    ES: 'Responde siempre en español.',
    FR: 'Réponds toujours en français.',
    IT: 'Rispondi sempre in italiano.',
    DE: 'Antworte immer auf Deutsch.',
  };

  const langInstruction = languageInstructions[language] ?? languageInstructions['EN'];

  const userLine = userName ? `You are talking to ${userName}. Address them by name when appropriate.\n` : '';

  return `You are NupciBot, a friendly and helpful AI assistant for the Nupci wedding management platform. You help wedding admins (couples) understand how to use the platform, navigate its features, and get the most out of it.
${userLine}
${langInstruction}

Your knowledge about the platform is based on the following documentation:

${PLATFORM_DOCS}

## Instructions
1. ${langInstruction}
2. Be warm, concise, and helpful. Use 1–3 short paragraphs.
3. Only answer questions about the Nupci platform. If asked something unrelated, politely redirect to platform topics.
4. When mentioning platform pages, refer to them by their feature name naturally in the text (e.g. "the Guest Management page" or "la sección de Invitados"). Do NOT write raw paths like /admin/guests inline in your text.
5. If you don't know the answer based on the documentation, say so honestly rather than guessing.
6. Keep answers focused and actionable.
7. At the very end of your response, if you referenced any specific platform pages, add a block starting with exactly "[LINKS]" on its own line. Under it, list each page on its own line as: /path|Label in the response language. Example for English: /admin/guests|Guest Management. Only include pages you actually referenced. Omit the [LINKS] block entirely if no specific pages were mentioned.`;
}

// ============================================================================
// OPENAI PROVIDER
// ============================================================================

async function generateWithOpenAI(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[NUPCIBOT] OPENAI_API_KEY is not configured');
    return null;
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.Completions.ChatCompletionMessageParam)),
    { role: 'user', content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: 600,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content?.trim() ?? null;
}

// ============================================================================
// GEMINI PROVIDER
// ============================================================================

async function generateWithGemini(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[NUPCIBOT] GEMINI_API_KEY is not configured');
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
  });

  // Build Gemini chat history (all turns except the last user message)
  const geminiHistory = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history: geminiHistory });
  const result = await chat.sendMessage(userMessage);
  return result.response.text()?.trim() || null;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate a NupciBot reply to a user message.
 *
 * @param userMessage - The admin's question or message
 * @param history     - Previous conversation turns (for multi-turn chat)
 * @param language    - Language code (EN, ES, FR, IT, DE) – defaults to EN
 * @returns AI-generated reply string, or null if no provider is available / call fails
 */
export async function generateNupciBotReply(
  userMessage: string,
  history: ChatMessage[] = [],
  language = 'EN',
  userName?: string
): Promise<string | null> {
  const systemPrompt = buildSystemPrompt(language, userName);

  const provider =
    process.env.AI_PROVIDER ||
    (process.env.OPENAI_API_KEY ? 'openai' : 'gemini');

  console.log('[NUPCIBOT] Generating reply', {
    provider,
    language,
    historyLength: history.length,
    messageLength: userMessage.length,
  });

  try {
    if (provider === 'gemini') {
      return await generateWithGemini(systemPrompt, history, userMessage);
    }
    return await generateWithOpenAI(systemPrompt, history, userMessage);
  } catch (error) {
    console.error('[NUPCIBOT] Generation failed:', error);
    return null;
  }
}
