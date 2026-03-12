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
import { getChatModel } from './provider';
import { buildTools } from './tools';
import type { ChatMessage } from './nupcibot';
import { prisma } from '@/lib/db/prisma';

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
  userName?: string,
  weddingDate?: string,
  coupleNames?: string,
): string {
  const langInstruction = LANGUAGE_INSTRUCTIONS[language] ?? LANGUAGE_INSTRUCTIONS['EN'];
  const userLine = userName ? `You are talking to ${userName}. Address them by name when appropriate.\n` : '';
  const today = new Date().toISOString().split('T')[0];

  const weddingLine =
    weddingDate && coupleNames
      ? `The wedding for ${coupleNames} is on ${weddingDate}. `
      : '';

  return `You are NupciBot, a professional wedding assistant for the Nupci platform.
Today's date is ${today}. ${weddingLine}
${userLine}
${langInstruction}

Your role is to help wedding professionals by answering questions based on available documents and data.

## Instructions
1. ${langInstruction}
2. Be warm, concise, and professional. Use 1–3 short paragraphs.
3. ALWAYS call search_knowledge_base before answering any question that could be covered by available documentation. This includes (but is not limited to): platform features, how the Nupci platform works, wedding planning steps, supplier/vendor information, ways of working, contracts, payments, and any other topic where a document or manual might exist. The knowledge base contains wedding-specific documents, planner ways-of-working guides, and platform manuals (SYSTEM_MANUAL) — all are searched automatically on every call. Do NOT skip this tool and answer from general knowledge; always search first.
4. Use get_guest_list and get_rsvp_status tools to answer questions about guests and RSVPs. Use update_family_rsvp to manually change guest attendance when requested.
5. Use add_reminder to add reminders or tasks to the wedding checklist.
   - When a user says "tomorrow", "next week", etc., resolve it to an absolute date (YYYY-MM-DD) based on today's date (${today}).
   - For relative dates like "1 month before the wedding" or "X days before", prefer using the dueDateRelative argument with "WEDDING_DATE-30" (e.g., -30 for 1 month, -60 for 2 months, -7 for 1 week).
   - If the user provides a specific date, use dueDate.
6. If update_family_rsvp returns multiple matching families, list them and ask the user to clarify which one they mean.
7. Only answer questions relevant to wedding management.
8. IMPORTANT — answer specificity:
   - If search_knowledge_base or a data tool returns relevant results, your answer MUST be grounded in that content. Quote or paraphrase specific details from the documents or data — never give a generic answer when specific information is available.
   - If the tools return no relevant results, say explicitly that you do not have documentation or data on that topic. Do not guess or give a generic answer.
9. IMPORTANT — References:
   Only append a References section when your answer directly cites content from one or more documents returned by search_knowledge_base. List only the sources whose content you actually used in your answer — do not list every retrieved chunk, only the ones that informed what you wrote.
   When included, the References section MUST be the very last thing in your response — do not add any text, closing sentence, or blank line after the list items.
   Always use the English word "References" as the heading regardless of the response language — the UI translates it automatically.
   Format exactly as (no colon, no bold, just the heading followed immediately by the items):

References
- filename1.pdf|https://url1.com
- filename2.docx|https://url2.com

   If a source has no URL, use the filename alone. Omit the References section entirely when no document content was cited (e.g. answers from guest data tools or general knowledge).`;
}

// ── Stream RAG Chat ───────────────────────────────────────────────────────────

/**
 * Stream an agentic chat response with RAG tools.
 * Returns a Response with Content-Type: text/event-stream.
 */
export async function streamRagChat(params: RagChatParams): Promise<Response> {
  const { userMessage, history, language, userName, weddingId, plannerId, role } = params;

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
  const system = buildSystemPrompt(language, userName, weddingDate, coupleNames);

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
    stopWhen: stepCountIs(5),
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
  const system = buildSystemPrompt(language, userName, weddingDate, coupleNames);
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
    stopWhen: stepCountIs(5),
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'nupcibot-chat',
      recordInputs: true,
      recordOutputs: true,
    },
  });

  const text = await result.text;
  return text || null;
}
