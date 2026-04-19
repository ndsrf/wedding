/**
 * POST /api/planner/nupcibot/contact-support
 * Body: { topic: string, message: string }
 * Sends a support email to the Nupci support address on behalf of the planner.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { Resend } from 'resend';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? 'support@nupci.com';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('planner');

    const body = await request.json();
    const { topic, message } = body as { topic?: string; message?: string };

    if (!topic?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Topic and message are required' } },
        { status: 400 },
      );
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('[NUPCIBOT] RESEND_API_KEY is not configured');
      return NextResponse.json(
        { success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Email service not configured' } },
        { status: 500 },
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'NupciBot <noreply@nupci.com>',
      to: SUPPORT_EMAIL,
      subject: `[Planner Support] ${topic.trim()}`,
      text: `From: ${user.email}\nName: ${user.name}\n\n${message.trim()}`,
    });

    const response: APIResponse = { success: true };
    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) {
      return NextResponse.json(
        { success: false, error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' } },
        { status: 401 },
      );
    }
    if (msg.includes('FORBIDDEN')) {
      return NextResponse.json(
        { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner role required' } },
        { status: 403 },
      );
    }
    console.error('[NUPCIBOT] Contact support error:', error);
    return NextResponse.json(
      { success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to send message' } },
      { status: 500 },
    );
  }
}
