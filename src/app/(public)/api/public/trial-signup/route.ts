/**
 * POST /api/public/trial-signup
 *
 * Public endpoint for self-service trial account creation.
 * Creates a new WeddingPlanner with a restricted trial license,
 * seeds demo data, and sends login instructions to the new planner.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import { seedTrialPlannerBasics, seedTrialDemoData } from '@/lib/seed/trial-seed';
import { sendPlannerInvitation } from '@/lib/email/resend';

// ============================================================================
// VALIDATION
// ============================================================================

const trialSignupSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
  email: z.string().email('Invalid email address'),
  logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  recaptchaToken: z.string().min(1, 'reCAPTCHA token is required'),
  locale: z.string().default('es'),
  verificationCode: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d{6}$/, 'Invalid code'),
});

// ============================================================================
// reCAPTCHA VERIFICATION
// ============================================================================

async function verifyRecaptcha(token: string): Promise<boolean> {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.error('[trial-signup] RECAPTCHA_SECRET_KEY not set');
      return false;
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();

    if (data.success && data.score >= 0.5) {
      return true;
    }

    console.warn('[trial-signup] reCAPTCHA failed:', {
      success: data.success,
      score: data.score,
      errorCodes: data['error-codes'],
    });

    return false;
  } catch (error) {
    console.error('[trial-signup] reCAPTCHA verification error:', error);
    return false;
  }
}

// ============================================================================
// MASTER ADMIN EMAIL NOTIFICATION
// ============================================================================

async function notifyMasterAdmin(
  plannerName: string,
  plannerEmail: string,
  plannerId: string,
  phone?: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const contactEmail = process.env.EMAIL_CONTACT_FORM;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@weddingapp.com';
  const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

  if (!apiKey || !contactEmail) {
    console.warn('[trial-signup] Master admin notification skipped: missing RESEND_API_KEY or EMAIL_CONTACT_FORM');
    return;
  }

  try {
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: `${commercialName} System <${fromEmail}>`,
      to: [contactEmail],
      subject: `Nueva cuenta de prueba creada - ${plannerName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f43f5e 0%, #ec4899 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🎉 Nueva Cuenta de Prueba Creada</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <div style="margin-bottom: 16px;">
                <div style="font-weight: bold; color: #e11d48; margin-bottom: 5px;">🏢 Empresa:</div>
                <div style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb;">${plannerName}</div>
              </div>
              <div style="margin-bottom: 16px;">
                <div style="font-weight: bold; color: #e11d48; margin-bottom: 5px;">📧 Email:</div>
                <div style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb;"><a href="mailto:${plannerEmail}">${plannerEmail}</a></div>
              </div>
              ${phone ? `
              <div style="margin-bottom: 16px;">
                <div style="font-weight: bold; color: #e11d48; margin-bottom: 5px;">📱 Teléfono:</div>
                <div style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb;">${phone}</div>
              </div>
              ` : ''}
              <div style="margin-bottom: 16px;">
                <div style="font-weight: bold; color: #e11d48; margin-bottom: 5px;">🆔 ID del Planner:</div>
                <div style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 12px;">${plannerId}</div>
              </div>
              <div style="text-align: center; margin-top: 24px; color: #6b7280; font-size: 13px;">
                <p>Registro automático vía formulario de prueba en ${commercialName}.</p>
              </div>
            </div>
          </div>
        </div>
      `,
    });

    console.log('[trial-signup] Master admin notification sent');
  } catch (error) {
    console.error('[trial-signup] Failed to notify master admin:', error);
    // Non-fatal — don't throw
  }
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Parse + validate body
    const body = await request.json();
    let validated: z.infer<typeof trialSignupSchema>;
    try {
      validated = trialSignupSchema.parse(body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'VALIDATION_ERROR', details: err.issues },
          { status: 400 }
        );
      }
      throw err;
    }

    const { companyName, email, logoUrl, phone, recaptchaToken, locale, verificationCode } = validated;

    // 2. Verify reCAPTCHA (skip in development)
    const isDev = process.env.NODE_ENV === 'development';
    const recaptchaOk = isDev || await verifyRecaptcha(recaptchaToken);
    if (!recaptchaOk) {
      return NextResponse.json(
        { success: false, error: 'RECAPTCHA_FAILED' },
        { status: 400 }
      );
    }

    // 3. Validate email verification code
    const storedCode = await prisma.emailVerificationCode.findFirst({
      where: { email },
      orderBy: { created_at: 'desc' },
    });

    if (!storedCode) {
      return NextResponse.json(
        { success: false, error: 'CODE_NOT_FOUND' },
        { status: 400 }
      );
    }

    if (new Date() > storedCode.expires_at) {
      await prisma.emailVerificationCode.deleteMany({ where: { email } });
      return NextResponse.json(
        { success: false, error: 'CODE_EXPIRED' },
        { status: 400 }
      );
    }

    if (storedCode.code !== verificationCode) {
      return NextResponse.json(
        { success: false, error: 'CODE_INVALID' },
        { status: 400 }
      );
    }

    // Code is valid — clean it up before creating the account
    await prisma.emailVerificationCode.deleteMany({ where: { email } });

    // 4. Check email uniqueness
    const existing = await prisma.weddingPlanner.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'EMAIL_EXISTS' },
        { status: 409 }
      );
    }

    // 4. Resolve creator ID (use first master admin, or fallback)
    const masterAdmin = await prisma.masterAdmin.findFirst({ orderBy: { created_at: 'asc' } });
    const createdBy = masterAdmin?.id ?? 'system';

    // 5. Create planner
    const planner = await prisma.weddingPlanner.create({
      data: {
        name: companyName,
        email,
        logo_url: logoUrl || null,
        phone: phone || null,
        enabled: true,
        auth_provider: 'GOOGLE', // Will be updated on first OAuth login
        created_by: createdBy,
        preferred_language: locale.toUpperCase() as 'ES' | 'EN' | 'FR' | 'IT' | 'DE',
      },
    });

    console.log(`[trial-signup] Planner created: ${planner.id} (${email})`);

    // 6. Create trial license (restricted)
    await prisma.plannerLicense.create({
      data: {
        planner_id: planner.id,
        max_weddings: 1,
        max_sub_planners: 0,
        can_delete_weddings: false,
        max_whatsapp_per_month: 0,
        max_whatsapp_per_wedding_per_month: 0,
        max_standard_ai_calls: 0,
        max_premium_ai_calls: 0,
        max_emails_per_month: 0,
        max_contracts_per_month: 0,
      },
    });

    console.log(`[trial-signup] Trial license created for: ${planner.id}`);

    // 7. Seed planner basics (categories, checklist, templates, contracts)
    try {
      await seedTrialPlannerBasics(planner.id);
      console.log(`[trial-signup] Planner basics seeded: ${planner.id}`);
    } catch (err) {
      console.error('[trial-signup] Failed to seed planner basics:', err);
      // Continue — partial setup is better than no account
    }

    // 8. Seed demo data (wedding, guests, etc.)
    try {
      await seedTrialDemoData(planner.id);
      console.log(`[trial-signup] Demo data seeded: ${planner.id}`);
    } catch (err) {
      console.error('[trial-signup] Failed to seed demo data:', err);
      // Continue — planner can still log in even without demo data
    }

    // 9. Send planner invitation email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nupci.com';
    const signinUrl = `${baseUrl}/auth/signin`;
    const langMap: Record<string, 'es' | 'en' | 'fr' | 'it' | 'de'> = {
      es: 'es', en: 'en', fr: 'fr', it: 'it', de: 'de',
    };
    const emailLang = langMap[locale] ?? 'es';

    try {
      const emailResult = await sendPlannerInvitation(email, emailLang, companyName, signinUrl);
      if (!emailResult.success) {
        console.error('[trial-signup] Failed to send invitation email:', emailResult.error);
      } else {
        console.log(`[trial-signup] Invitation email sent to: ${email}`);
      }
    } catch (err) {
      console.error('[trial-signup] Exception sending invitation email:', err);
    }

    // 10. Notify master admin
    await notifyMasterAdmin(companyName, email, planner.id, phone);

    return NextResponse.json({ success: true, plannerId: planner.id }, { status: 201 });
  } catch (error) {
    console.error('[trial-signup] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
