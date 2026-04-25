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
 *   GEMINI_MODEL   - Optional, defaults to "gemini-3-flash-preview"
 */

import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { ResourceType, Language } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { checkResourceLimit, recordResourceUsage, formatLimitError } from '@/lib/license/usage';

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

// ============================================================================
// PLATFORM KNOWLEDGE BASE
// ============================================================================

// Shared: intro, roles, cross-cutting concerns
const PLATFORM_DOCS_SHARED = `
# Nupci – Wedding Management Platform

Nupci is a comprehensive, multi-tenant wedding management platform designed for professional wedding planners. It allows planners to manage multiple weddings simultaneously and gives each couple secure access to their own wedding data.

## User Roles
- **Wedding Planner** (Planner): Creates and manages weddings. Accesses the platform at /planner/dashboard. Can invite Wedding Admins, manage providers, create checklist templates, and configure message templates.
- **Wedding Admin** (Couple): Manages a specific wedding. Accesses the admin panel at /admin. Handles guests, RSVPs, invitations, seating, payments, etc.
- **Guest**: Receives a magic link via WhatsApp, email, or SMS and RSVPs without creating an account.

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

// Admin (couple): all /admin pages
const PLATFORM_DOCS_ADMIN = `
## Admin Pages & Features

### Dashboard (/admin)
The main hub for wedding admins. Shows:
- Wedding details: couple names, date, location, days until wedding countdown
- Key metrics: total guests (= total individual people invited, i.e. family members), RSVP completion %, attending count (= individual people confirmed attending), gifts received
- RSVP progress bar
- Upcoming tasks widget
- Quick links to all sections
- NupciBot floating assistant (bottom-right)

---

### Guest Management (/admin/guests)
Manage all wedding guests organized as family units.
- **Important concept**: Guests are organized into "families" — contact groups that share one contact point (one email/phone). A family can represent a couple, a household, or any group. The actual number of people coming to the wedding is the total count of the individuals within those families, not the count of families. Users refer to these individuals simply as "guests" or "people", never as "members" or "family members".
- **Add/Edit guests**: Each family has a name, contact person, email, phone, WhatsApp, language, preferred channel (WhatsApp/Email/SMS), and the list of people (individuals) within it.
- **Family Members**: Each individual has a name, type (adult/child/infant), age, and RSVP status.
- **Guest Labels (Etiquetas)**: Color-coded tags that can be assigned to families to categorize them (e.g. "Bus", "Hotel", "Ceremony only"). A label is attached to the family (contact group), but it is used to filter and count the people within those families. Multiple labels can be assigned to the same family. Labels are created and managed from the guest list page.
- **Import from Excel**: Upload an Excel file (.xlsx) with family data. Template available to download.
- **Export to Excel**: Download the full guest list.
- **Bulk Actions**: Select multiple guests to delete or bulk-edit properties (language, channel, attendance status).
- **Filters**: Filter by RSVP status, channel, payment/gift status, language, label, or who invited them.
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

### Tasting Menu (/admin/tasting)
Manage the wedding tasting experience — rate dishes with guests and collaborators before choosing the final menu.

**Menu tab:**
- Create a tasting menu with a title and description.
- Add **sections** (e.g. Appetizers, Main Course, Dessert) and **dishes** within each section.
- Each dish can have a name, description, and a photo.
- **AI Import**: Upload a PDF or image of a catering menu and the platform parses it automatically into sections and dishes. A preview lets you select which items to import.
- **Average scores** (1–10) per dish are shown once participants submit their ratings.

**Participants tab:**
- Add participants (name, email, phone/WhatsApp, preferred channel, language).
- Send each participant a unique tasting link via WhatsApp, Email, or SMS using the TASTING_MENU message template.
- Copy the link directly if needed.
- WhatsApp LINKS mode: the admin opens a pre-filled wa.me URL manually.

**Sending tasting links:**
- The link goes to a personalised page at /tasting/[token] (no login required).
- The message uses the TASTING_MENU template with variables: {{tastingParticipantName}}, {{coupleNames}}, {{tastingLink}}, {{weddingDate}}.
- Configure templates at the Message Templates page.

---

### Menu Selection (/planner/weddings/[id]/menu — Planner only)
After the tasting, the planner uses this page to select the final wedding menu from the tasted dishes:
- Two-column interface: **Available Dishes** (left) and **Selected Dishes** (right).
- Move dishes between columns individually or section by section.
- Each dish shows its average tasting score (stars).
- Saving marks the chosen dishes with an is_selected flag.

---

### Guest Tasting Experience (/tasting/[token])
Participants receive a magic link and access their personalised tasting page with three tabs:

1. **My Ratings** – Rate each dish 1–10 stars, add text notes, and upload a photo. All changes auto-save.
2. **Everyone's Ratings** – See the scores, notes, and photos submitted by all other participants.
3. **Average Scores** – View the computed average score per dish (1 decimal), sortable by score or name, with the number of ratings and all uploaded photos.

Dishes are grouped by section (collapsible). The page is available in all 5 languages; participants can switch language from a top-right selector.

---

### Gallery (/admin/gallery)
Manage wedding photos:
- Connect Google Photos account for automatic sync.
- Manual upload of photos.
- Show/hide photos from the public gallery.
- Guests can contribute photos to the shared album.

---

---

### Wedding Details (/admin/wedding-details)
View and edit wedding information:
- Couple names, date, time, location
- RSVP cutoff date
- WhatsApp sending mode (Business API via Twilio or WhatsApp Links)

---
`;

// Planner: all /planner pages
const PLATFORM_DOCS_PLANNER = `
## Planner Pages & Features

### Planner Dashboard (/planner)
The central command center for wedding planners.
- **Key Metrics**: Total active weddings, total guests across all weddings, and overall RSVP completion percentage.
- **Upcoming Weddings**: A quick-view list of the next 5 upcoming weddings with countdowns.
- **Upcoming Tasks**: A unified widget showing pending tasks across all managed weddings.
- **Quick Actions**: Direct links to create a new wedding, manage providers, edit templates, and access the checklist library.

---

### Wedding Management (/planner/weddings)
The list of all weddings managed by the planner.
- **Status tracking**: View active and archived/deleted weddings.
- **Wedding Details**: Each wedding shows the couple names, date, location, and guest stats.
- **Access Control**: From the wedding detail page, planners can invite Wedding Admins (the couple) and manage their access.
- **Sub-sections**: Planners have full access to all /admin features for each wedding (Guests, Seating, Payments, etc.).

---

### Client Management (/planner/clients)
A CRM dedicated to wedding clients (couples):
- **Client Records**: Store contact information, ID numbers, addresses, and private notes.
- **Relationship History**: View all weddings, quotes, contracts, and invoices linked to a specific client in one unified timeline.
- **Lifecycle tracking**: Track clients from initial inquiry (quote) to active planning (wedding) and final billing.

---

### Provider Library (/planner/providers)
A centralized library of vendors and service providers:
- **Reusable Directory**: Save providers with their category (catering, music, flowers, etc.), contact details, and general notes.
- **Wedding Assignment**: Assign providers from this library to specific weddings.
- **Category Management**: Organize providers by type for easy searching.
- **Traceability**: Track which weddings are using each provider.

---

### Checklist Template Library (/planner/checklist-template)
Standardize workflows by creating master checklist templates:
- **Template Creation**: Build a standard list of tasks with descriptions and assignment roles (Couple or Planner).
- **Relative Deadlines**: Set due dates relative to the wedding date (e.g., "12 months before", "2 weeks before").
- **Import to Wedding**: When a new wedding is created, planners can import these templates to instantly populate the wedding checklist.
- **Global Updates**: Editing a template doesn't affect existing weddings but ensures all future weddings follow the updated process.

---

### Quotes & Budgets (/planner/quotes-finances → Quotes tab)
Create professional proposals for clients:
- **Itemized Quotes**: Add line items with quantities and unit prices.
- **Financial Controls**: Apply tax rates and discounts; automatic subtotal and total calculations.
- **Acceptance Workflow**: Set expiry dates. Quotes can be accepted, rejected, or expired.
- **One-Click Conversion**: Accepted quotes can be instantly converted into invoices.
- **Export**: Generate professional PDF versions of quotes for sharing.

---

### Contracts & Digital Signature (/planner/quotes-finances → Contracts tab)
Draft and manage legal agreements:
- **Rich-Text Editor**: Create complex contract documents with a built-in editor.
- **AI-Powered Templates**: Create contract templates and use AI to automatically fill in client names, wedding dates, and amounts based on the context.
- **Real-time Collaboration**: Multiple team members can edit a contract simultaneously.
- **Digital Signature**: Integrated with DocuSeal for secure, legally binding signatures.
- **Audit Trail**: Track when a contract was shared, viewed, and signed. Download signed PDFs with audit certificates.

---

### Invoices & Payments (/planner/quotes-finances → Invoices tab)
Full-cycle billing management:
- **Invoice Generation**: Issue invoices with unique, automatic numbering series.
- **Flexible Statuses**: Draft, Issued, Partial, Paid, Overdue, Cancelled.
- **Partial Payments**: Record multiple payments against a single invoice using various methods (Bank Transfer, Cash, PayPal, etc.).
- **Balance Tracking**: Real-time view of total amount, amount paid, and outstanding balance.
- **PDF Export**: Generate invoices as PDFs for clients.

---

### Location Management (/planner/locations)
A shared library of ceremony and reception venues:
- **Details**: Store names, addresses, maps links, and technical notes for each venue.
- **Usage tracking**: See every wedding and itinerary item that uses a specific location.
- **Conflict Prevention**: System prevents deleting locations that are currently assigned to active weddings.

---

### Message Template Library (/planner/templates)
Define master message templates for all channels:
- **Template Types**: Invitation, Reminder, Confirmation, Save the Date, Tasting Menu.
- **Multi-channel**: Design templates for WhatsApp (Business or Links), Email, and SMS.
- **Multi-language**: Write templates in all 5 supported languages (EN, ES, FR, IT, DE).
- **Personalization**: Use {{variable}} placeholders to auto-populate data when sending.

---

### Planner Reports (/planner/reports)
Global reporting across the planner's entire business:
- **Global Guest List**: Export guest data for all active weddings.
- **Global Provider List**: Export list of all vendors in the library.
- **Wedding Financials**: Aggregated report of quotes, invoices, and payments across all clients.
- **Operational Reports**: Checklist status summary across all weddings.

---

### Company Profile (/planner/company-profile)
Configure the planner's brand identity:
- **Branding**: Upload company logo and set the legal company name.
- **Legal details**: Set the tax ID, address, and contact info used in quotes and invoices.
- **Digital Signature**: Save a default signature to be used in automated contract signing.
- **Billing series**: Configure custom prefixes and starting numbers for invoices and proformas.

---

### Alert Settings (/planner/alert-settings)
Manage platform notifications:
- **Guest Alerts**: Be notified when guests open links, submit RSVPs, or send messages.
- **Financial Alerts**: Receive notifications for accepted quotes, signed contracts, or received payments.
- **Email Digest**: Configure daily or real-time email notifications for business activity.
`;

/**
 * Returns role-specific platform documentation.
 * Planners see their CRM/finance/menu tools; admins see the wedding management panel.
 */
export function getPlatformDocs(role: 'admin' | 'planner'): string {
  return role === 'planner'
    ? PLATFORM_DOCS_SHARED + '\n\n' + PLATFORM_DOCS_PLANNER
    : PLATFORM_DOCS_SHARED + '\n\n' + PLATFORM_DOCS_ADMIN;
}

/** Admin-only platform docs */
export const PLATFORM_DOCS_ADMIN_TOTAL = PLATFORM_DOCS_SHARED + '\n\n' + PLATFORM_DOCS_ADMIN;

/** Planner-only platform docs */
export const PLATFORM_DOCS_PLANNER_TOTAL = PLATFORM_DOCS_SHARED + '\n\n' + PLATFORM_DOCS_PLANNER;

/** Full docs (shared + admin + planner) – kept for backward-compat seeding */
export const PLATFORM_DOCS = PLATFORM_DOCS_SHARED + '\n\n' + PLATFORM_DOCS_ADMIN + '\n\n' + PLATFORM_DOCS_PLANNER;
// ============================================================================
// PROMPT BUILDER
// ============================================================================

function buildSystemPrompt(
  language: string,
  role: 'admin' | 'planner' = 'admin',
  userName?: string,
  weddingDate?: string,
  coupleNames?: string,
): string {
  const languageInstructions: Record<string, string> = {
    EN: 'Respond in English.',
    ES: 'Responde siempre en español.',
    FR: 'Réponds siempre en français.',
    IT: 'Rispondi siempre in italiano.',
    DE: 'Antworte immer auf Deutsch.',
  };

  const langInstruction = languageInstructions[language] ?? languageInstructions['EN'];
  const userLine = userName ? `You are talking to ${userName}. Address them by name when appropriate.\n` : '';
  const today = new Date().toISOString().split('T')[0];

  const weddingLine =
    weddingDate && coupleNames
      ? `The wedding for ${coupleNames} is on ${weddingDate}. `
      : '';

  const roleDescription = role === 'planner'
    ? 'You help wedding planners navigate their CRM, client management, finances, and wedding operations tools.'
    : 'You help wedding admins (couples) understand how to use the platform, navigate its features, and get the most out of it.';

  return `You are NupciBot, a friendly and helpful AI assistant for the Nupci wedding management platform. ${roleDescription}
Today's date is ${today}. ${weddingLine}
${userLine}
${langInstruction}


Your knowledge about the platform is based on the following documentation:

${getPlatformDocs(role)}

## Instructions
1. ${langInstruction}
2. Be warm, concise, and helpful. Use 1–3 short paragraphs.
3. Only answer questions about the Nupci platform. If asked something unrelated, politely redirect to platform topics.
4. When mentioning platform pages, refer to them by their feature name naturally in the text (e.g. "the Guest Management page" or "la sección de Invitados"). Do NOT write raw paths like /admin/guests inline in your text.
5. If you don't know the answer based on the documentation, say so honestly rather than guessing.
6. Keep answers focused and actionable.
7. At the very end of your response, if you referenced any specific platform pages, add a block starting with exactly "[LINKS]" on its own line. Under it, list each page on its own line as: /path|Label in the response language. Example for English: /admin/guests|Guest Management. Pages you may reference include: /admin/tasting|Tasting Menu, /admin/templates|Message Templates. Only include pages you actually referenced. Omit the [LINKS] block entirely if no specific pages were mentioned.`;
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

  const ai = new GoogleGenAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

  // Build Gemini chat history (all turns except the last user message)
  const geminiHistory = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat = ai.chats.create({
    model: modelName,
    config: { systemInstruction: systemPrompt },
    history: geminiHistory,
  });
  const result = await chat.sendMessage({ message: userMessage });
  return result.text?.trim() || null;
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
  userName?: string,
  weddingId?: string,
  role: 'admin' | 'planner' = 'admin',
  plannerId?: string,
): Promise<string | null> {
  // Try to find plannerId if not provided
  let effectivePlannerId = plannerId;
  if (!effectivePlannerId && weddingId) {
    try {
      const wedding = await prisma.wedding.findUnique({
        where: { id: weddingId },
        select: { planner_id: true },
      });
      effectivePlannerId = wedding?.planner_id;
    } catch (err) {
      console.warn('[NUPCIBOT] Failed to fetch planner info:', err);
    }
  }

  // Check AI Standard limit if plannerId is known
  if (effectivePlannerId) {
    const result = await checkResourceLimit({
      plannerId: effectivePlannerId,
      type: ResourceType.AI_STANDARD,
    });

    if (!result.allowed) {
      const errorMessage = await formatLimitError({
        resourceType: result.resourceType!,
        limit: result.limit!,
        used: result.used!,
        role: role === 'admin' ? 'wedding_admin' : 'planner',
        language: (language as Language) || 'ES',
      });
      console.warn(`[NUPCIBOT] Limit reached for planner ${effectivePlannerId}: ${errorMessage}`);
      return errorMessage;
    }
  }

  // Fetch wedding info if available
  let weddingDate: string | undefined;
  let coupleNames: string | undefined;

  if (weddingId) {
    try {
      const wedding = await prisma.wedding.findUnique({
        where: { id: weddingId },
        select: { wedding_date: true, couple_names: true },
      });
      if (wedding) {
        weddingDate = wedding.wedding_date.toISOString().split('T')[0];
        coupleNames = wedding.couple_names;
      }
    } catch (err) {
      console.warn('[NUPCIBOT] Failed to fetch wedding info:', err);
    }
  }

  const systemPrompt = buildSystemPrompt(language, role, userName, weddingDate, coupleNames);

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
    let reply: string | null = null;
    if (provider === 'gemini') {
      reply = await generateWithGemini(systemPrompt, history, userMessage);
    } else {
      reply = await generateWithOpenAI(systemPrompt, history, userMessage);
    }

    if (reply && effectivePlannerId) {
      // Record AI Standard usage
      void recordResourceUsage({
        plannerId: effectivePlannerId,
        weddingId: weddingId || null,
        type: ResourceType.AI_STANDARD,
      });
    }

    return reply;
  } catch (error) {
    console.error('[NUPCIBOT] Generation failed:', error);
    return null;
  }
}
