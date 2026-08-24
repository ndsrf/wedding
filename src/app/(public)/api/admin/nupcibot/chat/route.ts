/**
 * NupciBot Chat API Route (Admin)
 *
 * POST /api/admin/nupcibot/chat
 * Body: { message: string, history: ChatMessage[], language?: string, userName?: string }
 *
 * When VECTOR_DATABASE_URL is set: returns a Vercel AI SDK data stream (text/event-stream).
 * Fallback: returns { success: true, data: { reply: string } } JSON.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { generateNupciBotReply, type ChatMessage } from '@/lib/ai/nupcibot';
import { streamRagChat } from '@/lib/ai/rag-chat';
import { isVectorEnabled } from '@/lib/db/vector-prisma';
import { handleCoupleSongRequest } from '@/lib/ai/song-assistant';
import { prisma } from '@/lib/db/prisma';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');

    const body = await request.json();
    const { message, history = [], language = 'EN', userName } = body as {
      message: string;
      history: ChatMessage[];
      language?: string;
      userName?: string;
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Message is required' },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Cap history at last 20 messages
    const cappedHistory = history.slice(-20);

    // Give the couple the same song-request shortcut guests get over
    // WhatsApp (see handleSongRequest in song-assistant.ts) — if this
    // message looks like a song suggestion, handle it directly and skip
    // NupciBot/RAG for this turn, using the widget's real chat history for
    // multi-turn clarification.
    if (user.wedding_id) {
      try {
        const wedding = await prisma.wedding.findUnique({ where: { id: user.wedding_id } });
        if (wedding) {
          const songResult = await handleCoupleSongRequest({ wedding, message: message.trim(), history: cappedHistory, language });
          if (songResult) {
            const response: APIResponse<{ reply: string }> = { success: true, data: { reply: songResult.replyText } };
            return NextResponse.json(response, { status: 200 });
          }
        }
      } catch (err) {
        console.error('[NUPCIBOT] Couple song assistant failed, falling back to normal reply:', err);
      }
    }

    if (isVectorEnabled()) {
      console.log(`[NUPCIBOT] Starting RAG chat stream for ${user.email} (wedding: ${user.wedding_id})`);
      return streamRagChat({
        userMessage: message.trim(),
        history: cappedHistory,
        language,
        userName,
        weddingId: user.wedding_id,
        plannerId: user.planner_id,
        role: 'wedding_admin',
      });
    }

    // Fallback: non-streaming JSON response
    const reply = await generateNupciBotReply(
      message.trim(),
      cappedHistory,
      language,
      userName,
      user.wedding_id,
      'admin',
      user.planner_id,
    );

    if (!reply) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'AI service unavailable' },
      };
      return NextResponse.json(response, { status: 503 });
    }

    const response: APIResponse<{ reply: string }> = {
      success: true,
      data: { reply },
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '';

    if (errorMessage.includes('UNAUTHORIZED')) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' },
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (errorMessage.includes('FORBIDDEN')) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding admin role required' },
      };
      return NextResponse.json(response, { status: 403 });
    }

    console.error('[NUPCIBOT] Chat error:', error);
    const response: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to generate reply' },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
