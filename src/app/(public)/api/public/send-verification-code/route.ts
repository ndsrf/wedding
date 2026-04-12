/**
 * POST /api/public/send-verification-code
 *
 * Sends a 6-digit verification code to an email address as the first step
 * of the trial signup flow. The code is stored in the database with a 15-minute
 * expiry and must be submitted alongside the full signup form.
 *
 * Rate limited to one code per email per 60 seconds (enforced server-side).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomInt } from 'node:crypto';
import { prisma } from '@/lib/db';
import { sendEmailVerificationCode } from '@/lib/email/resend';

// ============================================================================
// VALIDATION
// ============================================================================

const sendCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  companyName: z.string().min(1).max(200),
  recaptchaToken: z.string().min(1),
  locale: z.string().default('es'),
});

// ============================================================================
// reCAPTCHA VERIFICATION
// ============================================================================

async function verifyRecaptcha(token: string): Promise<boolean> {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) return false;

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();
    return data.success && data.score >= 0.5;
  } catch {
    return false;
  }
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

const RESEND_COOLDOWN_SECONDS = 60;
const CODE_TTL_MINUTES = 15;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    let validated: z.infer<typeof sendCodeSchema>;

    try {
      validated = sendCodeSchema.parse(body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'VALIDATION_ERROR', details: err.issues },
          { status: 400 }
        );
      }
      throw err;
    }

    const { email, companyName, recaptchaToken, locale } = validated;

    // 1. Verify reCAPTCHA (skip in development)
    const isDev = process.env.NODE_ENV === 'development';
    const recaptchaOk = isDev || await verifyRecaptcha(recaptchaToken);
    if (!recaptchaOk) {
      return NextResponse.json(
        { success: false, error: 'RECAPTCHA_FAILED' },
        { status: 400 }
      );
    }

    // 2. Check email uniqueness (account must not already exist)
    const existing = await prisma.weddingPlanner.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'EMAIL_EXISTS' },
        { status: 409 }
      );
    }

    // 3. Server-side rate limiting — one code per email per 60 seconds
    const previousCode = await prisma.emailVerificationCode.findUnique({ where: { email } });
    if (previousCode) {
      const secondsSinceLast = (Date.now() - previousCode.last_sent_at.getTime()) / 1000;
      if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
        const retryAfter = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLast);
        return NextResponse.json(
          { success: false, error: 'RATE_LIMITED', retryAfter },
          { status: 429 }
        );
      }
    }

    // 4. Generate cryptographically secure 6-digit code and upsert into DB
    const code = String(randomInt(100000, 1000000));
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000);

    await prisma.emailVerificationCode.upsert({
      where: { email },
      create: { email, code, expires_at: expiresAt, last_sent_at: now },
      update: { code, expires_at: expiresAt, last_sent_at: now },
    });

    // 5. Send verification email via the centralised email service
    const langMap: Record<string, 'es' | 'en' | 'fr' | 'it' | 'de'> = {
      es: 'es', en: 'en', fr: 'fr', it: 'it', de: 'de',
    };
    const emailLang = langMap[locale] ?? 'es';

    const emailResult = await sendEmailVerificationCode(email, emailLang, companyName, code);

    if (!emailResult.success) {
      console.error('[send-verification-code] Failed to send email:', emailResult.error);
      // In development without a Resend key, allow the flow to continue so the
      // code can be retrieved directly from the database during testing.
      if (!isDev) {
        return NextResponse.json(
          { success: false, error: 'INTERNAL_ERROR' },
          { status: 500 }
        );
      }
    }

    console.log(`[send-verification-code] Code sent to: ${email}`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[send-verification-code] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
