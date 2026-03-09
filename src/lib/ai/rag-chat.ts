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
3. Use the search_knowledge_base tool to find relevant information before answering document-related questions.
4. Use get_guest_list and get_rsvp_status tools to answer questions about guests and RSVPs. Use update_family_rsvp to manually change guest attendance when requested.
5. Use add_reminder to add reminders or tasks to the wedding checklist. 
   - When a user says "tomorrow", "next week", etc., resolve it to an absolute date (YYYY-MM-DD) based on today's date (${today}).
   - For relative dates like "1 month before the wedding" or "X days before", prefer using the dueDateRelative argument with "WEDDING_DATE-30" (e.g., -30 for 1 month, -60 for 2 months, -7 for 1 week).
   - If the user provides a specific date, use dueDate.
6. If update_family_rsvp returns multiple matching families, list them and ask the user to clarify which one they mean.
6. Only answer questions relevant to wedding management.
7. If you cannot find the answer, say so honestly rather than guessing.
8. IMPORTANT: Every response that uses information from documents MUST end with a "References" section listing the unique source filenames and their URLs used, formatted exactly as:

References
- filename1.pdf|https://url1.com
- filename2.docx|https://url2.com

If a document does not have a URL, just use the filename. Only include the References section when you actually retrieved document chunks via search_knowledge_base. Omit it entirely if no documents were consulted.`;
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
