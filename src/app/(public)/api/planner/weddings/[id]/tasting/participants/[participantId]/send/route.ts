/**
 * Planner - Send Tasting Link to Participant
 * POST /api/planner/weddings/[id]/tasting/participants/[participantId]/send
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

type Params = { params: Promise<{ id: string; participantId: string }> };

const sendSchema = z.object({
  channel: z.enum(['WHATSAPP', 'EMAIL', 'SMS']),
  custom_message: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });

  const { id: weddingId, participantId } = await params;

  const participant = await prisma.tastingParticipant.findFirst({
    where: { id: participantId, menu: { wedding_id: weddingId, wedding: { planner_id: user.planner_id } } },
    include: { menu: { include: { wedding: true } } },
  });
  if (!participant) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

  const body = await request.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });

  const { channel, custom_message } = parsed.data;
  const wedding = participant.menu.wedding;

  const tastingLink = toAbsoluteUrl(`/tasting/${participant.magic_token}`) ?? '';

  const variables = {
    participantName: participant.name,
    coupleNames: wedding.couple_names,
    tastingLink,
    weddingDate: wedding.wedding_date.toLocaleDateString('en-US'),
  };

  let messageBody = custom_message ?? '';
  let messageSubject = `Tasting Menu - ${wedding.couple_names}`;

  if (!custom_message) {
    try {
      const lang = (wedding.default_language ?? 'ES') as Parameters<typeof getTemplateForSending>[1];
      const tpl = await getTemplateForSending(
        weddingId,
        'TASTING_MENU',
        lang,
        channel as Parameters<typeof getTemplateForSending>[3]
      );
      if (tpl) {
        messageBody = renderTemplate(tpl.body, variables);
        messageSubject = renderTemplate(tpl.subject, variables);
      }
    } catch { /* use fallback */ }
  }

  if (!messageBody) {
    messageBody = `Hi ${participant.name}! You are invited to rate the tasting menu for ${wedding.couple_names}'s wedding: ${tastingLink}`;
  }

  if (channel === 'WHATSAPP' && wedding.whatsapp_mode === 'LINKS') {
    const phone = participant.whatsapp_number || participant.phone || '';
    const waUrl = phone ? buildWhatsAppLink(phone, messageBody) : null;
    await prisma.tastingParticipant.update({ where: { id: participantId }, data: { invite_sent_at: new Date() } });
    return NextResponse.json({ success: true, data: { mode: 'LINKS', wa_url: waUrl } });
  }

  if (channel === 'EMAIL') {
    if (!participant.email) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No email' } }, { status: 400 });
    const result = await sendDynamicEmail(participant.email, messageSubject, messageBody, 'en', wedding.couple_names);
    if (!result.success) return NextResponse.json({ success: false, error: { code: 'SEND_FAILED', message: result.error ?? 'Failed' } }, { status: 500 });
  } else if (channel === 'WHATSAPP') {
    const phone = participant.whatsapp_number || participant.phone;
    if (!phone) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No phone' } }, { status: 400 });
    const result = await sendDynamicMessage(phone, messageBody, MessageType.WHATSAPP);
    if (!result.success) return NextResponse.json({ success: false, error: { code: 'SEND_FAILED', message: result.error ?? 'Failed' } }, { status: 500 });
  } else {
    const phone = participant.phone || participant.whatsapp_number;
    if (!phone) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No phone' } }, { status: 400 });
    const result = await sendDynamicMessage(phone, messageBody, MessageType.SMS);
    if (!result.success) return NextResponse.json({ success: false, error: { code: 'SEND_FAILED', message: result.error ?? 'Failed' } }, { status: 500 });
  }

  await prisma.tastingParticipant.update({ where: { id: participantId }, data: { invite_sent_at: new Date() } });
  return NextResponse.json({ success: true, data: { mode: 'SENT' } });
}
