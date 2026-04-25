/**
 * RAG Chat Orchestration Service
 *
 * Agentic streaming chat using Vercel AI SDK streamText with tools,
 * language-aware system prompt, and citation handling.
 *
 * Returns a streaming Response suitable for Next.js route handlers.
 *
 * Depends on: provider.ts, tools.ts, nupcibot.ts (ChatMessage type)
 */

import { streamText, stepCountIs } from 'ai';
import { ResourceType, Language } from '@prisma/client';
import { getChatModel } from './provider';
import { buildTools } from './tools';
import type { ChatMessage } from './nupcibot';
import { prisma } from '@/lib/db/prisma';
import { checkResourceLimit, recordResourceUsage, formatLimitError } from '@/lib/license/usage';

export interface RagChatParams {
  userMessage: string;
  history: ChatMessage[];
  language: string;
  userName?: string;
  weddingId?: string;
  plannerId?: string;
  role: 'wedding_admin' | 'planner';
}

// ── Input Sanitization ────────────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/gi,
  /system\s*:/gi,
  /\[SYSTEM\]/gi,
  /you\s+are\s+now/gi,
  /disregard\s+(all\s+)?previous/gi,
];

function sanitizeMessage(message: string): string {
  let sanitized = message;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[removed]');
  }
  return sanitized.trim();
}

// ── System Prompt ─────────────────────────────────────────────────────────────

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  EN: 'Respond in English.',
  ES: 'Responde siempre en español.',
  FR: 'Réponds toujours en français.',
  IT: 'Rispondi sempre in italiano.',
  DE: 'Antworte immer auf Deutsch.',
};

function buildSystemPrompt(
  language: string,
  role: 'wedding_admin' | 'planner',
  userName?: string,
  weddingDate?: string,
  coupleNames?: string,
): string {
  const langInstruction = LANGUAGE_INSTRUCTIONS[language] ?? LANGUAGE_INSTRUCTIONS['EN'];
  const userLine = userName ? `You are talking to ${userName}. Address them by name when appropriate.\n` : '';
  const today = new Date().toISOString().split('T')[0];

  const bootstrapKnowledge = `
## Platform Overview (Bootstrap Knowledge / Resumen de la Plataforma)
Nupci has several core sections. ALWAYS call search_knowledge_base with a specific query in English or Spanish to get the full details and deep links.
- **Planner Dashboard / Panel**: Metrics and business overview (/planner).
- **Wedding Management / Mis Bodas**: Manage specific weddings (/planner/weddings).
- **Client Management (CRM) / Clientes**: Manage couples and their history (/planner/clients).
- **Quotes & Finances / Presupuestos y Finanzas**: Create itemized quotes (presupuestos), manage invoices (facturas), and track payments (/planner/quotes-finances).
- **Contracts / Contratos**: Legal agreements with digital signatures via DocuSeal (/planner/quotes-finances → Contracts tab).
- **Provider Library / Proveedores**: Reusable directory of vendors (/planner/providers).
- **Checklist Templates / Plantillas de Tareas**: Standardize workflows for all weddings (/planner/checklist-template).
- **Admin Section / Panel de Boda**: Every wedding has its own admin panel for guests, seating, invitations, etc. (/admin).
`;

  const commonInstructions = `
## Key Concept — Guest Count, Labels & Ambiguity
Guests are organized into "families" (contact groups with one contact point each), but a family contains one or more individual people. When users ask "how many people / guests are coming / attending / invited", they mean the count of individual people within families, NOT the count of families. Users say "guests" or "people" — they never say "members" or "family members".

Labels (etiquetas) are color-coded tags assigned to families to categorize them (e.g. "Bus", "Hotel"). A label is attached to the family, but when users ask "how many people have label X", they mean the count of individuals belonging to families with that label. Label name matching is always case-insensitive — use get_guests_by_label for these queries.

**Ambiguity rule — confirmed vs. total**: When a user asks "how many guests/people are coming / cuántos invitados hay / cuánta gente viene" without specifying whether they mean confirmed attendees or everyone invited, always provide BOTH numbers: total people invited and confirmed attending. Only answer with a single number when the user explicitly qualifies (e.g. "confirmed", "han confirmado", "attending", "van a venir").

## Instructions
1. ${langInstruction}
2. Be warm, concise, and professional. Use 1–3 short paragraphs.
3. ALWAYS call search_knowledge_base before answering any question about platform features, how-to guides, or business workflows. The "Bootstrap Knowledge" above is just an index; you MUST search the knowledge base to get the actual instructions and deep links.
4. If search_knowledge_base returns results, you MUST ground your answer EXCLUSIVELY in that content. If it returns nothing, try one more time with a different, broader search query (e.g., instead of "how to create a specific quote" try "quotes" or "finances").
5. Only answer questions based on the documentation or data retrieved from tools. NEVER rely on your internal training data for platform help. If you still can't find info after two searches, say: "I don't have detailed documentation on that specific topic yet, but you can explore the [Section Name] section."
6. When referencing platform pages, use the [LINKS] format at the end.
7. IMPORTANT — Links:
   If you mention specific platform pages, you MUST add a block at the very end of your response starting with exactly "[LINKS]" on its own line.
   Format:
   [LINKS]
   /path|Label in the response language

   Example:
   [LINKS]
   /planner/quotes-finances|Quotes & Finances

8. IMPORTANT — References: (only append when citing external documents returned by search_knowledge_base)
    Format exactly as:

References
- filename.pdf|https://url.com

    Omit the References section entirely when no document content was cited.`;

  if (role === 'planner') {
    const weddingLine =
      weddingDate && coupleNames
        ? `You are currently viewing the wedding for ${coupleNames} (date: ${weddingDate}). `
        : 'No specific wedding is in context — you can answer general planner questions or help navigate the platform. ';

    return `You are NupciBot, a professional assistant for wedding planners on the Nupci platform.
Today's date is ${today}. ${weddingLine}
${userLine}
${langInstruction}

Your role is to help wedding planners manage their business: weddings, clients, invoices, contracts, providers, locations, and the Nupci platform itself.

${bootstrapKnowledge}

${commonInstructions}
10. Use get_guest_list and get_rsvp_status to answer questions about guests and RSVPs for the current wedding (when weddingId is available). get_rsvp_status returns totalPeople (individual people) and totalFamilies (contact groups) — always use totalPeople when the user asks about "guests" or "people".
11. Use get_guests_by_label whenever the user asks about people or counts related to a specific label/etiqueta. Label matching is case-insensitive — pass the name as the user said it.
12. Use update_family_rsvp to manually change guest attendance when requested.
13. Use get_planner_weddings to get an overview of all weddings you manage.
14. Use get_wedding_invoices to look up invoice and payment information for the current wedding.
15. Use get_wedding_providers to look up providers assigned to the current wedding.
16. Use add_reminder to add reminders or tasks to the wedding checklist.
   - Resolve relative dates (tomorrow, next week, 1 month before the wedding) to absolute YYYY-MM-DD using today (${today}).
   - For dates relative to the wedding date, use dueDateRelative with format "WEDDING_DATE-30".
17. If update_family_rsvp returns multiple matching families, list them and ask which one to update.
18. Guest management — add, update, remove individual people:
   - Use add_person to add a new person to a group.
   - Use update_person to change a person's name, type, age, dietary restrictions, or accessibility needs.
   - Use remove_person to delete a person from the guest list.
19. Label management — ALWAYS follow this order:
   a. Call list_labels FIRST to see all defined labels for the wedding.
   b. Check whether the concept the user mentioned (e.g. "bus", "autobús") matches an existing label name.
   c. If it matches, call update_group_labels to add or remove that label from the group.
   d. If it does NOT match any label, ask the user whether they mean a label or something else (e.g. an RSVP question answer). Do NOT create new labels.
20. When calling an action tool (update_group_labels, add_person, update_person, remove_person, update_family_rsvp), include a SHORT text sentence in the same response BEFORE the tool call (e.g. "Quito la etiqueta Bus de Adelina..." or "Añado a María al grupo García..."). This gives the user immediate feedback.
21. After a tool returns status 'success', output a confirmation sentence and stop. Do NOT call any tool again.
22. If any tool returns status 'ambiguous', STOP calling tools immediately. Present the listed options to the user as a question and wait for their reply. Do NOT retry with different names on your own.`;
  }

  // ── Admin prompt ────────────────────────────────────────────────────────
  const weddingLine =
    weddingDate && coupleNames
      ? `The wedding for ${coupleNames} is on ${weddingDate}. `
      : '';

  return `You are NupciBot, a professional wedding assistant for the Nupci platform.
Today's date is ${today}. ${weddingLine}
${userLine}
${langInstruction}

Your role is to help wedding professionals by answering questions based on available documents and data.
${commonInstructions}
9. Use get_guest_list and get_rsvp_status tools to answer questions about guests and RSVPs. get_rsvp_status returns totalPeople (individual people) and totalFamilies (contact groups) — always use totalPeople when the user asks about "guests" or "people". Use update_family_rsvp to manually change guest attendance when requested.
10. Use get_guests_by_label whenever the user asks about people or counts related to a specific label/etiqueta. Label matching is case-insensitive — pass the name as the user said it.
11. Use add_reminder to add reminders or tasks to the wedding checklist.
   - When a user says "tomorrow", "next week", etc., resolve it to an absolute date (YYYY-MM-DD) based on today's date (${today}).
   - For relative dates like "1 month before the wedding" or "X days before", prefer using the dueDateRelative argument with "WEDDING_DATE-30" (e.g., -30 for 1 month, -60 for 2 months, -7 for 1 week).
   - If the user provides a specific date, use dueDate.
12. If update_family_rsvp returns multiple matching families, list them and ask the user to clarify which one they mean.
13. Guest management — add, update, remove individual people:
   - Use add_person to add a new person to a group.
   - Use update_person to change a person's name, type, age, dietary restrictions, or accessibility needs.
   - Use remove_person to delete a person from the guest list.
14. Label management — ALWAYS follow this order:
   a. Call list_labels FIRST to see all defined labels for the wedding.
   b. Check whether the concept the user mentioned (e.g. "bus", "autobús") matches an existing label name.
   c. If it matches, call update_group_labels to add or remove that label from the group.
   d. If it does NOT match any label, ask the user whether they mean a label or something else (e.g. an RSVP question answer). Do NOT create new labels.
15. When calling an action tool (update_group_labels, add_person, update_person, remove_person, update_family_rsvp), include a SHORT text sentence in the same response BEFORE the tool call (e.g. "Quito la etiqueta Bus de Adelina..." or "Añado a María al grupo García..."). This gives the user immediate feedback.
16. After a tool returns status 'success', output a confirmation sentence and stop. Do NOT call any tool again.
17. If any tool returns status 'ambiguous', STOP calling tools immediately. Present the listed options to the user as a question and wait for their reply. Do NOT retry with different names on your own.`;
}

// ── Stream RAG Chat ───────────────────────────────────────────────────────────

/**
 * Stream an agentic chat response with RAG tools.
 * Returns a Response with Content-Type: text/event-stream.
 */
export async function streamRagChat(params: RagChatParams): Promise<Response> {
  const { userMessage, history, language, userName, weddingId, plannerId, role } = params;

  // Check AI Standard limit if plannerId is known
  if (plannerId) {
    const result = await checkResourceLimit({
      plannerId,
      type: ResourceType.AI_STANDARD,
    });

    if (!result.allowed) {
      const errorMessage = await formatLimitError({
        resourceType: result.resourceType!,
        limit: result.limit!,
        used: result.used!,
        role: role || 'planner',
        language: (language as Language) || 'ES',
      });

      console.warn(`[RAG-CHAT] Limit reached for planner ${plannerId}: ${errorMessage}`);
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'LIMIT_REACHED', message: errorMessage }
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
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
      console.warn('[RAG-CHAT] Failed to fetch wedding info:', err);
    }
  }

  const sanitizedMessage = sanitizeMessage(userMessage);
  const system = buildSystemPrompt(language, role, userName, weddingDate, coupleNames);

  // Cap history to last 20 messages
  const cappedHistory = history.slice(-20);

  const messages = [
    ...cappedHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: sanitizedMessage },
  ];

  const result = streamText({
    model: getChatModel(),
    system,
    messages,
    tools: buildTools({ weddingId, plannerId, role }),
    stopWhen: stepCountIs(10),
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'nupcibot-chat',
      recordInputs: true,
      recordOutputs: true,
    },
    onStepFinish: (step) => {
      console.log(`[RAG-CHAT] Step finished. toolCalls: ${step.toolCalls?.length ?? 0}`);
      if (step.toolResults && step.toolResults.length > 0) {
        console.log(`[RAG-CHAT] Tool results: ${step.toolResults.map(r => r.toolName).join(', ')}`);
        // Log the first result content length as a hint
        const firstResult = step.toolResults[0].output;
        const resultCount = Array.isArray(firstResult) ? (firstResult as unknown[]).length : 'unknown';
        console.log(`[RAG-CHAT] First tool result (${step.toolResults[0].toolName}) count/type: ${resultCount}`);
      }
      if (step.text) {
        console.log(`[RAG-CHAT] Partial text generated in step: ${step.text.length} chars`);
      }
    },
    onFinish: (res) => {
      console.log(`[RAG-CHAT] Final response finished. text length: ${res.text.length}`);
      if (res.text.length === 0) {
        console.warn(`[RAG-CHAT] WARNING: Response text is empty!`);
      }

      // Record usage if successful
      if (plannerId && res.text.length > 0) {
        void recordResourceUsage({
          plannerId,
          weddingId: weddingId || null,
          type: ResourceType.AI_STANDARD,
        });
      }
    },
  });

  return result.toTextStreamResponse();
}

/**
 * Non-streaming RAG chat reply.
 * Uses the same agentic pipeline as streamRagChat but awaits the full text,
 * suitable for contexts that need a plain string (e.g. WhatsApp TwiML replies).
 */
export async function generateRagReply(params: RagChatParams): Promise<string | null> {
  const { userMessage, history, language, userName, weddingId, plannerId, role } = params;

  // Check AI Standard limit if plannerId is known
  if (plannerId) {
    const result = await checkResourceLimit({
      plannerId,
      type: ResourceType.AI_STANDARD,
    });

    if (!result.allowed) {
      const errorMessage = await formatLimitError({
        resourceType: result.resourceType!,
        limit: result.limit!,
        used: result.used!,
        role: role || 'planner',
        language: (language as Language) || 'ES',
      });
      console.warn(`[RAG-CHAT] Limit reached for planner ${plannerId}: ${errorMessage}`);
      return errorMessage;
    }
  }

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
      console.warn('[RAG-CHAT] Failed to fetch wedding info:', err);
    }
  }

  const sanitizedMessage = sanitizeMessage(userMessage);
  const system = buildSystemPrompt(language, role, userName, weddingDate, coupleNames);
  const cappedHistory = history.slice(-20);

  const messages = [
    ...cappedHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: sanitizedMessage },
  ];

  const result = streamText({
    model: getChatModel(),
    system,
    messages,
    tools: buildTools({ weddingId, plannerId, role }),
    stopWhen: stepCountIs(10),
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'nupcibot-chat',
      recordInputs: true,
      recordOutputs: true,
    },
  });

  const text = await result.text;

  // Record usage if successful
  if (text && plannerId) {
    void recordResourceUsage({
      plannerId,
      weddingId: weddingId || null,
      type: ResourceType.AI_STANDARD,
    });
  }

  return text || null;
}
