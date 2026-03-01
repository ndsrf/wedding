/**
 * NupciBot – Message Planner API Route
 *
 * POST /api/admin/nupcibot/message-planner
 * Body: { topic: string, message: string }
 *
 * Sends an email to the wedding planner on behalf of the admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { Resend } from 'resend';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' },
      };
      return NextResponse.json(response, { status: 403 });
    }

    const body = await request.json();
    const { topic, message } = body as { topic: string; message: string };

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Topic is required' },
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Message is required' },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get the wedding with the planner's email
    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: {
        couple_names: true,
        planner: { select: { email: true, name: true } },
      },
    });

    if (!wedding || !wedding.planner) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Wedding or planner not found' },
      };
      return NextResponse.json(response, { status: 404 });
    }

    if (!process.env.RESEND_API_KEY) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Email service not configured' },
      };
      return NextResponse.json(response, { status: 503 });
    }

    const plannerEmail = wedding.planner.email;
    const plannerName = wedding.planner.name;
    const coupleNames = wedding.couple_names;

    const fromEmail = process.env.EMAIL_FROM || 'noreply@nupci.com';
    const fromName = process.env.EMAIL_FROM_NAME?.replace('{{WEDDING_NAME}}', coupleNames) || coupleNames;

    const resend = new Resend(process.env.RESEND_API_KEY!);
    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [plannerEmail],
      subject: `[${coupleNames}] ${topic.trim()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #e11d48;">Message from ${coupleNames}</h2>
          <p style="color: #374151;"><strong>Topic:</strong> ${topic.trim()}</p>
          <div style="background: #f9fafb; border-left: 4px solid #e11d48; padding: 16px; margin: 16px 0; border-radius: 4px;">
            <p style="color: #374151; margin: 0; white-space: pre-wrap;">${message.trim()}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This message was sent via NupciBot by a wedding admin for <strong>${coupleNames}</strong>.</p>
          <p style="color: #6b7280; font-size: 14px;">Hi ${plannerName}, please reply directly to the couple or contact them via your usual channel.</p>
        </div>
      `,
    });

    if (error) {
      console.error('[NUPCIBOT] Failed to send email to planner:', error);
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to send email' },
      };
      return NextResponse.json(response, { status: 500 });
    }

    const response: APIResponse = {
      success: true,
      data: { message: 'Email sent to planner' },
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

    console.error('[NUPCIBOT] Message planner error:', error);
    const response: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to send message' },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
