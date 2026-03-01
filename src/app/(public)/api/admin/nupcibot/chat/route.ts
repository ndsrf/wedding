/**
 * NupciBot Chat API Route
 *
 * POST /api/admin/nupcibot/chat
 * Body: { message: string, history: { role: 'user'|'assistant', content: string }[], language?: string }
 * Returns: { reply: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { generateNupciBotReply, ChatMessage } from '@/lib/ai/nupcibot';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    await requireRole('wedding_admin');

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

    const reply = await generateNupciBotReply(message.trim(), history, language, userName);

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
