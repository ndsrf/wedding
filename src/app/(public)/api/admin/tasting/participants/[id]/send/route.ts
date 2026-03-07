/**
 * Admin Tasting - Send Link to Participant
 * POST /api/admin/tasting/participants/[id]/send
 *
 * Sends the unique tasting link via the participant's preferred channel.
 * Returns a wa.me URL for WhatsApp LINKS mode instead of sending via Twilio.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { renderTemplate } from '@/lib/templates';
import { getTemplateForSending } from '@/lib/templates/crud';
import { sendDynamicEmail } from '@/lib/email/resend';
import { sendDynamicMessage, MessageType } from '@/lib/sms/twilio';
import { buildWhatsAppLink } from '@/lib/notifications/whatsapp-links';
import { toAbsoluteUrl } from '@/lib/images/processor';

const sendSchema = z.object({
  channel: z.enum(['WHATSAPP', 'EMAIL', 'SMS']),
  custom_message: z.string().max(2000).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }

  const { id } = await params;

  // Load participant and verify ownership
  const participant = await prisma.tastingParticipant.findFirst({
    where: { id, menu: { wedding_id: user.wedding_id } },
    include: { menu: { include: { wedding: true } } },
  });
  if (!participant) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Participant not found' } }, { status: 404 });
  }

  const body = await request.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });
  }

  const { channel, custom_message } = parsed.data;
  const wedding = participant.menu.wedding;

  // Build tasting link
  const tastingPath = `/tasting/${participant.magic_token}`;
  const tastingLink = toAbsoluteUrl(tastingPath);

  // Template variables
  const variables = {
    tastingParticipantName: participant.name,
    coupleNames: wedding.couple_names,
    tastingLink,
    weddingDate: wedding.wedding_date.toLocaleDateString('en-US'),
  };

  // Get message template (fall back to custom_message or default)
  let messageBody = custom_message ?? '';
  let messageSubject = `Tasting Menu - ${wedding.couple_names}`;
  let contentTemplateId: string | undefined;

  if (!custom_message) {
    try {
      const lang = (wedding.default_language ?? 'ES') as Parameters<typeof getTemplateForSending>[2];
      const tpl = await getTemplateForSending(
        user.wedding_id,
        'TASTING_MENU',
        lang,
        channel as Parameters<typeof getTemplateForSending>[3]
      );
      if (tpl) {
        messageBody = renderTemplate(tpl.body, variables);
        messageSubject = renderTemplate(tpl.subject, variables);
        contentTemplateId = (tpl as unknown as { content_template_id?: string }).content_template_id;
      }
    } catch {
      // Use fallback below
    }
  }

  if (!messageBody) {
    messageBody = `Hi ${participant.name}! You are invited to rate the tasting menu for ${wedding.couple_names}'s wedding: ${tastingLink}`;
  }

  // WhatsApp LINKS mode: return wa.me URL
  if (channel === 'WHATSAPP' && wedding.whatsapp_mode === 'LINKS') {
    const phone = participant.whatsapp_number || participant.phone || '';
    const waUrl = phone ? buildWhatsAppLink(phone, messageBody) : null;
    await prisma.tastingParticipant.update({ where: { id }, data: { invite_sent_at: new Date() } });
    return NextResponse.json({ success: true, data: { mode: 'LINKS', wa_url: waUrl } });
  }

  // Send via appropriate channel
  if (channel === 'EMAIL') {
    const email = participant.email;
    if (!email) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No email address for participant' } }, { status: 400 });
    }
    const result = await sendDynamicEmail(email, messageSubject, messageBody, 'en', wedding.couple_names);
    if (!result.success) {
      return NextResponse.json({ success: false, error: { code: 'SEND_FAILED', message: result.error ?? 'Failed to send email' } }, { status: 500 });
    }
  } else if (channel === 'WHATSAPP') {
    const phone = participant.whatsapp_number || participant.phone;
    if (!phone) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No phone number for participant' } }, { status: 400 });
    }
    if (!contentTemplateId) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No WhatsApp Content Template ID configured for this template' } }, { status: 400 });
    }
    const { mapToWhatsAppVariables } = await import('@/lib/templates/whatsapp-mapper');
    const { sendWhatsAppWithContentTemplate } = await import('@/lib/sms/twilio');
    const whatsappVars = mapToWhatsAppVariables(variables);
    const result = await sendWhatsAppWithContentTemplate(phone, contentTemplateId, whatsappVars);
    if (!result.success) {
      return NextResponse.json({ success: false, error: { code: 'SEND_FAILED', message: result.error ?? 'Failed to send WhatsApp' } }, { status: 500 });
    }
  } else if (channel === 'SMS') {
    const phone = participant.phone || participant.whatsapp_number;
    if (!phone) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No phone number for participant' } }, { status: 400 });
    }
    const result = await sendDynamicMessage(phone, messageBody, MessageType.SMS);
    if (!result.success) {
      return NextResponse.json({ success: false, error: { code: 'SEND_FAILED', message: result.error ?? 'Failed to send SMS' } }, { status: 500 });
    }
  }

  await prisma.tastingParticipant.update({ where: { id }, data: { invite_sent_at: new Date() } });
  return NextResponse.json({ success: true, data: { mode: 'SENT' } });
}
