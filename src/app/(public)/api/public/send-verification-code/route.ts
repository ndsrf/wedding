/**
 * POST /api/public/send-verification-code
 *
 * Sends a 6-digit verification code to an email address as the first step
 * of the trial signup flow. The code is stored in the database with a 15-minute
 * expiry and must be submitted alongside the full signup form.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import { render } from '@react-email/render';
import { EmailVerificationCodeEmail } from '@/lib/email/templates/email-verification-code';
import React from 'react';

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

    // 2. Check email uniqueness
    const existing = await prisma.weddingPlanner.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'EMAIL_EXISTS' },
        { status: 409 }
      );
    }

    // 3. Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // 4. Delete any previous codes for this email, then store new code
    await prisma.emailVerificationCode.deleteMany({ where: { email } });
    await prisma.emailVerificationCode.create({
      data: { email, code, expires_at: expiresAt },
    });

    // 5. Send verification email
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'noreply@weddingapp.com';
    const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

    if (!apiKey) {
      console.error('[send-verification-code] RESEND_API_KEY not set');
      // In development without API key we still return success so the code can be read from DB
      if (!isDev) {
        return NextResponse.json(
          { success: false, error: 'INTERNAL_ERROR' },
          { status: 500 }
        );
      }
    } else {
      const langMap: Record<string, 'es' | 'en' | 'fr' | 'it' | 'de'> = {
        es: 'es', en: 'en', fr: 'fr', it: 'it', de: 'de',
      };
      const emailLang = langMap[locale] ?? 'es';

      const html = await render(
        React.createElement(EmailVerificationCodeEmail, {
          language: emailLang,
          code,
          plannerName: companyName,
        })
      );

      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: `${commercialName} <${fromEmail}>`,
        to: [email],
        subject: emailLang === 'es'
          ? `Tu código de verificación: ${code}`
          : emailLang === 'fr'
            ? `Votre code de vérification : ${code}`
            : emailLang === 'it'
              ? `Il tuo codice di verifica: ${code}`
              : emailLang === 'de'
                ? `Ihr Verifizierungscode: ${code}`
                : `Your verification code: ${code}`,
        html,
      });
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
