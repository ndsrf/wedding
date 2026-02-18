/**
 * Wedding Planner - Send Reminders API Route
 *
 * POST /api/planner/weddings/:id/reminders - Send manual reminders to families without RSVP
 *
 * Features:
 * - Identifies families with no RSVP response (all members have attending=null)
 * - Prepares personalized messages with magic links in family's preferred language
 * - Creates TrackingEvents with event_type='REMINDER_SENT' and admin_triggered=true
 * - Validates channel selection (WHATSAPP, EMAIL, SMS)
 * - Respects RSVP cutoff date
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { sendRSVPReminder, sendDynamicEmail } from '@/lib/email/resend';
import { sendDynamicMessage, MessageType } from '@/lib/sms/twilio';
import { renderTemplate } from '@/lib/templates';
import { getTemplateForSending } from '@/lib/templates/crud';
import { sendInvitation } from '@/lib/notifications/invitation';
import type { Language as I18nLanguage } from '@/lib/i18n/config';
import type { APIResponse, SendRemindersResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import type { Channel } from '@prisma/client';
import { formatDateByLanguage } from '@/lib/date-formatter';
import { buildWhatsAppLink } from '@/lib/notifications/whatsapp-links';
import { getShortUrlPath } from '@/lib/short-url';
import { toAbsoluteUrl } from '@/lib/images/processor';

// Validation schema for send reminders request
const sendRemindersSchema = z.object({
  channel: z.enum(['WHATSAPP', 'EMAIL', 'SMS', 'PREFERRED']),
  message_template: z.string().optional(),
  family_ids: z.array(z.string()).optional(),
});

// Personalized reminder messages in all supported languages
const REMINDER_MESSAGES: Record<I18nLanguage, {
  subject: string;
  greeting: (familyName: string) => string;
  body: (coupleNames: string, weddingDate: string, cutoffDate: string) => string;
  cta: string;
}> = {
  es: {
    subject: 'Recordatorio: Confirma tu asistencia',
    greeting: (familyName) => `Hola, Familia ${familyName}!`,
    body: (coupleNames, weddingDate, cutoffDate) =>
      `Te recordamos que aún no hemos recibido tu confirmación de asistencia para la boda de ${coupleNames} el ${weddingDate}. Por favor, confirma antes del ${cutoffDate}.`,
    cta: 'Confirmar asistencia',
  },
  en: {
    subject: 'Reminder: Please confirm your attendance',
    greeting: (familyName) => `Hello, ${familyName} Family!`,
    body: (coupleNames, weddingDate, cutoffDate) =>
      `This is a friendly reminder that we haven't received your RSVP for ${coupleNames}'s wedding on ${weddingDate}. Please confirm by ${cutoffDate}.`,
    cta: 'Confirm attendance',
  },
  fr: {
    subject: 'Rappel: Confirmez votre présence',
    greeting: (familyName) => `Bonjour, Famille ${familyName}!`,
    body: (coupleNames, weddingDate, cutoffDate) =>
      `Nous vous rappelons que nous n'avons pas encore reçu votre confirmation de présence pour le mariage de ${coupleNames} le ${weddingDate}. Merci de confirmer avant le ${cutoffDate}.`,
    cta: 'Confirmer la présence',
  },
  it: {
    subject: 'Promemoria: Conferma la tua partecipazione',
    greeting: (familyName) => `Ciao, Famiglia ${familyName}!`,
    body: (coupleNames, weddingDate, cutoffDate) =>
      `Ti ricordiamo che non abbiamo ancora ricevuto la tua conferma di partecipazione al matrimonio di ${coupleNames} il ${weddingDate}. Per favore, conferma entro il ${cutoffDate}.`,
    cta: 'Conferma partecipazione',
  },
  de: {
    subject: 'Erinnerung: Bitte bestätigen Sie Ihre Teilnahme',
    greeting: (familyName) => `Hallo, Familie ${familyName}!`,
    body: (coupleNames, weddingDate, cutoffDate) =>
      `Wir möchten Sie daran erinnern, dass wir noch keine Rückmeldung zu Ihrer Teilnahme an der Hochzeit von ${coupleNames} am ${weddingDate} erhalten haben. Bitte bestätigen Sie bis zum ${cutoffDate}.`,
    cta: 'Teilnahme bestätigen',
  },
};

/**
 * Helper to validate planner access to wedding
 */
async function validatePlannerAccess(plannerId: string, weddingId: string) {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { planner_id: true },
  });

  if (!wedding) {
    return { valid: false, error: 'Wedding not found', status: 404 };
  }

  if (wedding.planner_id !== plannerId) {
    return { valid: false, error: 'You do not have access to this wedding', status: 403 };
  }

  return { valid: true };
}

/**
 * POST /api/planner/weddings/:id/reminders
 * Send manual reminders to families without RSVP response
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and require planner role
    const user = await requireRole('planner');

    if (!user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner ID not found in session',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    const { id: weddingId } = await params;

    // Validate planner access to wedding
    const accessCheck = await validatePlannerAccess(user.planner_id, weddingId);
    if (!accessCheck.valid) {
      const response: APIResponse = {
        success: false,
        error: {
          code: accessCheck.status === 404 ? API_ERROR_CODES.NOT_FOUND : API_ERROR_CODES.FORBIDDEN,
          message: accessCheck.error!,
        },
      };
      return NextResponse.json(response, { status: accessCheck.status });
    }

    // Parse and validate request body
    const body = await request.json();
    const { channel, message_template, family_ids } = sendRemindersSchema.parse(body);

    // Get wedding details for magic link generation and message content
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: {
        id: true,
        couple_names: true,
        wedding_date: true,
        wedding_time: true,
        location: true,
        rsvp_cutoff_date: true,
        default_language: true,
        whatsapp_mode: true,
      },
    });

    if (!wedding) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Wedding not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if RSVP cutoff has passed
    if (new Date() > new Date(wedding.rsvp_cutoff_date)) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.RSVP_CUTOFF_PASSED,
          message: 'RSVP cutoff date has passed',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Find families - filter by family_ids if provided, otherwise get all without RSVP response
    const familiesWithoutRsvp = await prisma.family.findMany({
      where: {
        wedding_id: weddingId,
        ...(family_ids && family_ids.length > 0 ? { id: { in: family_ids } } : {}),
      },
      include: {
        members: {
          select: {
            attending: true,
          },
        },
      },
    });

    // Filter families where no member has responded (skip this check if specific family_ids are provided)
    const eligibleFamilies = family_ids && family_ids.length > 0
      ? familiesWithoutRsvp // When specific families are requested, send to them regardless
      : familiesWithoutRsvp.filter(
          (family) => family.members.every((member) => member.attending === null)
        );

    if (eligibleFamilies.length === 0) {
      const response: SendRemindersResponse = {
        success: true,
        data: {
          sent_count: 0,
          failed_count: 0,
          recipient_families: [],
        },
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Prepare personalized messages for each family in their preferred language
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';

    // Send reminders
    let sentCount = 0;
    let failedCount = 0;
    const waLinks: { family_name: string; wa_link: string }[] = [];

    // Helper function to send email reminder to a family
    const sendEmailReminder = async (family: typeof eligibleFamilies[0]): Promise<boolean> => {
      if (!family.email) {
        console.log('[PLANNER REMINDER DEBUG] Family', family.name, 'has no email, skipping');
        return false;
      }

      console.log('[PLANNER REMINDER DEBUG] Processing family', family.name);

      try {
        // Check if INVITATION_SENT event exists for this family
        const invitationSent = await prisma.trackingEvent.findFirst({
          where: {
            family_id: family.id,
            event_type: 'INVITATION_SENT',
          },
        });

        let result;
        let isInvitation = false;

        if (!invitationSent) {
          // No invitation sent yet, send invitation email
          console.log('[PLANNER REMINDER DEBUG] No invitation sent yet for', family.name, ', sending invitation');
          isInvitation = true;
          result = await sendInvitation({
            family_id: family.id,
            wedding_id: weddingId,
            admin_id: user.id,
          });
        } else {
          // Invitation already sent, send reminder email
          console.log('[PLANNER REMINDER DEBUG] Invitation already sent for', family.name, ', sending reminder');

          const familyLanguage = family.preferred_language || wedding.default_language;
          const language = (familyLanguage).toLowerCase() as I18nLanguage;
          const weddingDate = formatDateByLanguage(wedding.wedding_date, language);
          const cutoffDate = formatDateByLanguage(wedding.rsvp_cutoff_date, language);
          const shortPath = await getShortUrlPath(family.id);
          const magicLink = `${baseUrl}${shortPath}`;

          // Try to fetch template from database
          const template = await getTemplateForSending(
            weddingId,
            'REMINDER',
            familyLanguage,
            'EMAIL'
          );

          if (template) {
            console.log('[PLANNER REMINDER DEBUG] Using database template for', familyLanguage);

            const variables = {
              familyName: family.name,
              coupleNames: wedding.couple_names,
              weddingDate,
              weddingTime: wedding.wedding_time || '',
              location: wedding.location || '',
              magicLink,
              rsvpCutoffDate: cutoffDate,
            };

            const renderedSubject = renderTemplate(template.subject, variables);
            const renderedBody = renderTemplate(template.body, variables);

            const absoluteImageUrl = toAbsoluteUrl(template.image_url, baseUrl) ?? null;

            result = await sendDynamicEmail(
              family.email,
              renderedSubject,
              renderedBody,
              language,
              wedding.couple_names,
              absoluteImageUrl
            );
          } else {
            console.log('[PLANNER REMINDER DEBUG] Using hardcoded template for', familyLanguage);
            result = await sendRSVPReminder(
              family.email,
              language,
              family.name,
              wedding.couple_names,
              weddingDate,
              magicLink,
              wedding.wedding_time || undefined,
              wedding.location || undefined
            );
          }
        }

        if (result.success) {
          console.log('[PLANNER REMINDER DEBUG] Email sent successfully to', family.email);

          if (!isInvitation) {
            const rawLanguage = family.preferred_language || wedding.default_language;
            const language = rawLanguage.toLowerCase() as I18nLanguage;
            const messages = REMINDER_MESSAGES[language];
            const weddingDate = formatDateByLanguage(wedding.wedding_date, language);
            const cutoffDate = formatDateByLanguage(wedding.rsvp_cutoff_date, language);
            const trackShortPath = await getShortUrlPath(family.id);
            const trackMagicLink = `${baseUrl}${trackShortPath}?channel=email`;

            const personalizedMessage = {
              language,
              subject: messages.subject,
              greeting: messages.greeting(family.name),
              body: message_template || messages.body(wedding.couple_names, weddingDate, cutoffDate),
              cta: messages.cta,
              magic_link: trackMagicLink,
            };

            await prisma.trackingEvent.create({
              data: {
                family_id: family.id,
                wedding_id: weddingId,
                event_type: 'REMINDER_SENT',
                channel: 'EMAIL' as Channel,
                metadata: {
                  admin_id: user.id,
                  admin_triggered: true,
                  reminder_type: 'manual',
                  personalized_message: personalizedMessage,
                  family_language: language,
                  channel_used: 'EMAIL',
                  ...(result.messageId && { message_sid: result.messageId }),
                },
                admin_triggered: true,
              },
            });
          }

          return true;
        } else {
          console.error('[PLANNER REMINDER DEBUG] Failed to send email to', family.email, ':', result.error);
          return false;
        }
      } catch (error) {
        console.error('[PLANNER REMINDER DEBUG] Error sending email to', family.email, ':', error);
        return false;
      }
    };

    // Helper function to send SMS/WhatsApp reminder to a family
    const sendSmsOrWhatsappReminder = async (family: typeof eligibleFamilies[0], targetChannel: Channel): Promise<boolean> => {
      const contactInfo = targetChannel === 'SMS' ? family.phone : family.whatsapp_number;

      if (!contactInfo) {
        console.log('[PLANNER REMINDER DEBUG] Family', family.name, 'has no', targetChannel, 'contact, skipping');
        return false;
      }

      console.log('[PLANNER REMINDER DEBUG] Processing family', family.name);

      try {
        // Check if INVITATION_SENT event exists for this family
        const invitationSent = await prisma.trackingEvent.findFirst({
          where: {
            family_id: family.id,
            event_type: 'INVITATION_SENT',
          },
        });

        let result;
        let isInvitation = false;

        if (!invitationSent) {
          console.log('[PLANNER REMINDER DEBUG] No invitation sent yet for', family.name, ', sending invitation');
          isInvitation = true;
          result = await sendInvitation({
            family_id: family.id,
            wedding_id: weddingId,
            admin_id: user.id,
          });
          if (result.waLink) {
            waLinks.push({ family_name: family.name, wa_link: result.waLink });
          }
        } else {
          console.log('[PLANNER REMINDER DEBUG] Invitation already sent for', family.name, ', sending reminder');

          const familyLanguage = family.preferred_language || wedding.default_language;
          const language = familyLanguage.toLowerCase() as I18nLanguage;
          const weddingDate = formatDateByLanguage(wedding.wedding_date, language);
          const cutoffDate = formatDateByLanguage(wedding.rsvp_cutoff_date, language);
          const smsShortPath = await getShortUrlPath(family.id);
          const magicLink = `${baseUrl}${smsShortPath}`;

          const template = await getTemplateForSending(
            weddingId,
            'REMINDER',
            familyLanguage,
            targetChannel
          );

          let renderedBody: string;

          if (template) {
            console.log('[PLANNER REMINDER DEBUG] Using database template for', familyLanguage, targetChannel);
            const variables = {
              familyName: family.name,
              coupleNames: wedding.couple_names,
              weddingDate,
              weddingTime: wedding.wedding_time || '',
              location: wedding.location || '',
              magicLink,
              rsvpCutoffDate: cutoffDate,
            };
            renderedBody = renderTemplate(template.body, variables);
          } else {
            console.log('[PLANNER REMINDER DEBUG] No template found, using fallback message');
            const messages = REMINDER_MESSAGES[language];
            renderedBody = `${messages.greeting(family.name)}\n\n${messages.body(wedding.couple_names, weddingDate, cutoffDate)}\n\n${messages.cta}: ${magicLink}`;
          }

          if (targetChannel === 'WHATSAPP' && wedding.whatsapp_mode === 'LINKS') {
            const waLink = buildWhatsAppLink(family.whatsapp_number!, renderedBody);
            waLinks.push({ family_name: family.name, wa_link: waLink });
            console.log('[PLANNER REMINDER DEBUG] LINKS mode – wa.me link generated for', family.name);
            result = { success: true };
          } else if (template) {
            const absoluteImageUrl = targetChannel === 'WHATSAPP'
              ? toAbsoluteUrl(template.image_url, baseUrl)
              : undefined;
            result = await sendDynamicMessage(
              contactInfo,
              renderedBody,
              targetChannel === 'SMS' ? MessageType.SMS : MessageType.WHATSAPP,
              absoluteImageUrl
            );
          } else {
            result = await sendDynamicMessage(
              contactInfo,
              renderedBody,
              targetChannel === 'SMS' ? MessageType.SMS : MessageType.WHATSAPP
            );
          }
        }

        if (result.success) {
          console.log('[PLANNER REMINDER DEBUG] Message sent successfully to', contactInfo);

          if (!isInvitation) {
            const rawLanguage = family.preferred_language || wedding.default_language;
            const language = rawLanguage.toLowerCase() as I18nLanguage;
            const messages = REMINDER_MESSAGES[language];
            const weddingDate = formatDateByLanguage(wedding.wedding_date, language);
            const cutoffDate = formatDateByLanguage(wedding.rsvp_cutoff_date, language);
            const smsTrackShortPath = await getShortUrlPath(family.id);
            const smsTrackMagicLink = `${baseUrl}${smsTrackShortPath}?channel=${targetChannel.toLowerCase()}`;

            const personalizedMessage = {
              language,
              subject: messages.subject,
              greeting: messages.greeting(family.name),
              body: message_template || messages.body(wedding.couple_names, weddingDate, cutoffDate),
              cta: messages.cta,
              magic_link: smsTrackMagicLink,
            };

            await prisma.trackingEvent.create({
              data: {
                family_id: family.id,
                wedding_id: weddingId,
                event_type: 'REMINDER_SENT',
                channel: targetChannel,
                metadata: {
                  admin_id: user.id,
                  admin_triggered: true,
                  reminder_type: 'manual',
                  personalized_message: personalizedMessage,
                  family_language: language,
                  channel_used: targetChannel,
                  ...(result.messageId && { message_sid: result.messageId }),
                },
                admin_triggered: true,
              },
            });
          }

          return true;
        } else {
          console.error('[PLANNER REMINDER DEBUG] Failed to send message to', contactInfo, ':', result.error);
          return false;
        }
      } catch (error) {
        console.error('[PLANNER REMINDER DEBUG] Error sending message to', contactInfo, ':', error);
        return false;
      }
    };

    // Handle PREFERRED mode: send via each family's preferred channel
    if (channel === 'PREFERRED') {
      console.log('[PLANNER REMINDER DEBUG] Sending via PREFERRED channel to', eligibleFamilies.length, 'families');

      for (const family of eligibleFamilies) {
        const familyChannel = (family.channel_preference || 'EMAIL') as Channel;

        let success = false;
        if (familyChannel === 'EMAIL') {
          success = await sendEmailReminder(family);
        } else {
          success = await sendSmsOrWhatsappReminder(family, familyChannel);
        }

        if (success) {
          sentCount++;
        } else {
          failedCount++;
        }
      }
    } else if (channel === 'EMAIL') {
      console.log('[PLANNER REMINDER DEBUG] Sending emails to', eligibleFamilies.length, 'families');

      for (const family of eligibleFamilies) {
        const success = await sendEmailReminder(family);
        if (success) {
          sentCount++;
        } else {
          failedCount++;
        }
      }
    } else {
      console.log('[PLANNER REMINDER DEBUG] Sending', channel, 'messages to', eligibleFamilies.length, 'families');

      for (const family of eligibleFamilies) {
        const success = await sendSmsOrWhatsappReminder(family, channel as Channel);
        if (success) {
          sentCount++;
        } else {
          failedCount++;
        }
      }
    }

    const response = {
      success: true,
      data: {
        sent_count: sentCount,
        failed_count: failedCount,
        recipient_families: eligibleFamilies.map((f) => f.id),
        ...(waLinks.length > 0 && { wa_links: waLinks }),
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('UNAUTHORIZED')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required',
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (errorMessage.includes('FORBIDDEN')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    if (error instanceof z.ZodError) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid request data',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.error('Error sending reminders:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to send reminders',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
