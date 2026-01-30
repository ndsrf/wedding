/**
 * Wedding Admin - Send Reminders API Route
 *
 * POST /api/admin/reminders - Send manual reminders to families without RSVP
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
import type { Language, Channel } from '@prisma/client';

// Validation schema for send reminders request
const sendRemindersSchema = z.object({
  channel: z.enum(['WHATSAPP', 'EMAIL', 'SMS', 'PREFERRED']),
  message_template: z.string().optional(),
  family_ids: z.array(z.string()).optional(),
});

// Personalized reminder messages in all supported languages
const REMINDER_MESSAGES: Record<Language, {
  subject: string;
  greeting: (familyName: string) => string;
  body: (coupleNames: string, weddingDate: string, cutoffDate: string) => string;
  cta: string;
}> = {
  ES: {
    subject: 'Recordatorio: Confirma tu asistencia',
    greeting: (familyName) => `Hola, Familia ${familyName}!`,
    body: (coupleNames, weddingDate, cutoffDate) =>
      `Te recordamos que aún no hemos recibido tu confirmación de asistencia para la boda de ${coupleNames} el ${weddingDate}. Por favor, confirma antes del ${cutoffDate}.`,
    cta: 'Confirmar asistencia',
  },
  EN: {
    subject: 'Reminder: Please confirm your attendance',
    greeting: (familyName) => `Hello, ${familyName} Family!`,
    body: (coupleNames, weddingDate, cutoffDate) =>
      `This is a friendly reminder that we haven't received your RSVP for ${coupleNames}'s wedding on ${weddingDate}. Please confirm by ${cutoffDate}.`,
    cta: 'Confirm attendance',
  },
  FR: {
    subject: 'Rappel: Confirmez votre présence',
    greeting: (familyName) => `Bonjour, Famille ${familyName}!`,
    body: (coupleNames, weddingDate, cutoffDate) =>
      `Nous vous rappelons que nous n'avons pas encore reçu votre confirmation de présence pour le mariage de ${coupleNames} le ${weddingDate}. Merci de confirmer avant le ${cutoffDate}.`,
    cta: 'Confirmer la présence',
  },
  IT: {
    subject: 'Promemoria: Conferma la tua partecipazione',
    greeting: (familyName) => `Ciao, Famiglia ${familyName}!`,
    body: (coupleNames, weddingDate, cutoffDate) =>
      `Ti ricordiamo che non abbiamo ancora ricevuto la tua conferma di partecipazione al matrimonio di ${coupleNames} il ${weddingDate}. Per favore, conferma entro il ${cutoffDate}.`,
    cta: 'Conferma partecipazione',
  },
  DE: {
    subject: 'Erinnerung: Bitte bestätigen Sie Ihre Teilnahme',
    greeting: (familyName) => `Hallo, Familie ${familyName}!`,
    body: (coupleNames, weddingDate, cutoffDate) =>
      `Wir möchten Sie daran erinnern, dass wir noch keine Rückmeldung zu Ihrer Teilnahme an der Hochzeit von ${coupleNames} am ${weddingDate} erhalten haben. Bitte bestätigen Sie bis zum ${cutoffDate}.`,
    cta: 'Teilnahme bestätigen',
  },
};

// Format date based on language
function formatDate(date: Date, language: Language): string {
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  const localeMap: Record<Language, string> = {
    ES: 'es-ES',
    EN: 'en-US',
    FR: 'fr-FR',
    IT: 'it-IT',
    DE: 'de-DE',
  };
  return date.toLocaleDateString(localeMap[language], options);
}

/**
 * POST /api/admin/reminders
 * Send manual reminders to families without RSVP response
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and require wedding_admin role
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Wedding ID not found in session',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { channel, message_template, family_ids } = sendRemindersSchema.parse(body);

    // Get wedding details for magic link generation and message content
    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: {
        id: true,
        couple_names: true,
        wedding_date: true,
        wedding_time: true,
        location: true,
        rsvp_cutoff_date: true,
        default_language: true,
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
        wedding_id: user.wedding_id,
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

    // Helper function to send email reminder to a family
    const sendEmailReminder = async (family: typeof eligibleFamilies[0]): Promise<boolean> => {
      // Only send if family has an email
      if (!family.email) {
        console.log('[REMINDER DEBUG] Family', family.name, 'has no email, skipping');
        return false;
      }

      console.log('[REMINDER DEBUG] Processing family', family.name);

      try {
        // Check if INVITATION_SENT event exists for this family
        const invitationSent = await prisma.trackingEvent.findFirst({
          where: {
            family_id: family.id,
            event_type: 'INVITATION_SENT',
          },
        });

        let result;

        if (!invitationSent) {
          // No invitation sent yet, send invitation email
          console.log('[REMINDER DEBUG] No invitation sent yet for', family.name, ', sending invitation');
          result = await sendInvitation({
            family_id: family.id,
            wedding_id: user.wedding_id!,
            admin_id: user.id,
          });
        } else {
          // Invitation already sent, send reminder email
          console.log('[REMINDER DEBUG] Invitation already sent for', family.name, ', sending reminder');

          const familyLanguage = family.preferred_language || wedding.default_language;
          const language = (familyLanguage).toLowerCase() as I18nLanguage;
          const weddingDate = formatDate(wedding.wedding_date, familyLanguage);
          const cutoffDate = formatDate(wedding.rsvp_cutoff_date, familyLanguage);
          const magicLink = `${baseUrl}/rsvp/${family.magic_token}`;

          // Try to fetch template from database
          const template = await getTemplateForSending(
            user.wedding_id!,
            'REMINDER',
            familyLanguage,
            'EMAIL'
          );

          if (template) {
            // Use database template
            console.log('[REMINDER DEBUG] Using database template for', familyLanguage);
            console.log('[REMINDER DEBUG] Template image_url:', template.image_url);

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

            // Convert relative image URL to absolute URL for email clients
            const absoluteImageUrl = template.image_url
              ? `${baseUrl}${template.image_url}`
              : null;
            console.log('[REMINDER DEBUG] Absolute image URL:', absoluteImageUrl);

            result = await sendDynamicEmail(
              family.email,
              renderedSubject,
              renderedBody,
              language,
              wedding.couple_names,
              absoluteImageUrl
            );
          } else {
            // Fallback to hardcoded template
            console.log('[REMINDER DEBUG] Using hardcoded template for', familyLanguage);
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
          console.log('[REMINDER DEBUG] Email sent successfully to', family.email);

          // Create tracking event with message_sid if available
          const language = family.preferred_language || wedding.default_language;
          const messages = REMINDER_MESSAGES[language];
          const weddingDate = formatDate(wedding.wedding_date, language);
          const cutoffDate = formatDate(wedding.rsvp_cutoff_date, language);
          const magicLink = `${baseUrl}/rsvp/${family.magic_token}?channel=email`;

          const personalizedMessage = {
            language,
            subject: messages.subject,
            greeting: messages.greeting(family.name),
            body: message_template || messages.body(wedding.couple_names, weddingDate, cutoffDate),
            cta: messages.cta,
            magic_link: magicLink,
          };

          await prisma.trackingEvent.create({
            data: {
              family_id: family.id,
              wedding_id: user.wedding_id!,
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

          return true;
        } else {
          console.error('[REMINDER DEBUG] Failed to send email to', family.email, ':', result.error);
          return false;
        }
      } catch (error) {
        console.error('[REMINDER DEBUG] Error sending email to', family.email, ':', error);
        return false;
      }
    };

    // Helper function to send SMS/WhatsApp reminder to a family
    const sendSmsOrWhatsappReminder = async (family: typeof eligibleFamilies[0], targetChannel: Channel): Promise<boolean> => {
      // Validate family has required contact info
      const contactInfo = targetChannel === 'SMS' ? family.phone : family.whatsapp_number;

      if (!contactInfo) {
        console.log('[REMINDER DEBUG] Family', family.name, 'has no', targetChannel, 'contact, skipping');
        return false;
      }

      console.log('[REMINDER DEBUG] Processing family', family.name);

      try {
        // Check if INVITATION_SENT event exists for this family
        const invitationSent = await prisma.trackingEvent.findFirst({
          where: {
            family_id: family.id,
            event_type: 'INVITATION_SENT',
          },
        });

        let result;

        if (!invitationSent) {
          // No invitation sent yet, send invitation
          console.log('[REMINDER DEBUG] No invitation sent yet for', family.name, ', sending invitation');
          result = await sendInvitation({
            family_id: family.id,
            wedding_id: user.wedding_id!,
            admin_id: user.id,
          });
        } else {
          // Invitation already sent, send reminder
          console.log('[REMINDER DEBUG] Invitation already sent for', family.name, ', sending reminder');

          const familyLanguage = family.preferred_language || wedding.default_language;
          const weddingDate = formatDate(wedding.wedding_date, familyLanguage);
          const cutoffDate = formatDate(wedding.rsvp_cutoff_date, familyLanguage);
          const magicLink = `${baseUrl}/rsvp/${family.magic_token}`;

          // Fetch template from database
          const template = await getTemplateForSending(
            user.wedding_id!,
            'REMINDER',
            familyLanguage,
            targetChannel
          );

          if (template) {
            // Use database template
            console.log('[REMINDER DEBUG] Using database template for', familyLanguage, targetChannel);

            const variables = {
              familyName: family.name,
              coupleNames: wedding.couple_names,
              weddingDate,
              weddingTime: wedding.wedding_time || '',
              location: wedding.location || '',
              magicLink,
              rsvpCutoffDate: cutoffDate,
            };

            const renderedBody = renderTemplate(template.body, variables);

            // Convert relative image URL to absolute URL (for WhatsApp)
            const absoluteImageUrl = template.image_url && targetChannel === 'WHATSAPP'
              ? `${baseUrl}${template.image_url}`
              : undefined;

            result = await sendDynamicMessage(
              contactInfo,
              renderedBody,
              targetChannel === 'SMS' ? MessageType.SMS : MessageType.WHATSAPP,
              absoluteImageUrl
            );
          } else {
            // Fallback to hardcoded message
            console.log('[REMINDER DEBUG] No template found, using fallback message');
            const messages = REMINDER_MESSAGES[familyLanguage];
            const fallbackBody = `${messages.greeting(family.name)}\n\n${messages.body(wedding.couple_names, weddingDate, cutoffDate)}\n\n${messages.cta}: ${magicLink}`;

            result = await sendDynamicMessage(
              contactInfo,
              fallbackBody,
              targetChannel === 'SMS' ? MessageType.SMS : MessageType.WHATSAPP
            );
          }
        }

        if (result.success) {
          console.log('[REMINDER DEBUG] Message sent successfully to', contactInfo);

          // Create tracking event with message_sid
          const language = family.preferred_language || wedding.default_language;
          const messages = REMINDER_MESSAGES[language];
          const weddingDate = formatDate(wedding.wedding_date, language);
          const cutoffDate = formatDate(wedding.rsvp_cutoff_date, language);
          const magicLink = `${baseUrl}/rsvp/${family.magic_token}?channel=${targetChannel.toLowerCase()}`;

          const personalizedMessage = {
            language,
            subject: messages.subject,
            greeting: messages.greeting(family.name),
            body: message_template || messages.body(wedding.couple_names, weddingDate, cutoffDate),
            cta: messages.cta,
            magic_link: magicLink,
          };

          await prisma.trackingEvent.create({
            data: {
              family_id: family.id,
              wedding_id: user.wedding_id!,
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

          return true;
        } else {
          console.error('[REMINDER DEBUG] Failed to send message to', contactInfo, ':', result.error);
          return false;
        }
      } catch (error) {
        console.error('[REMINDER DEBUG] Error sending message to', contactInfo, ':', error);
        return false;
      }
    };

    // Handle PREFERRED mode: send via each family's preferred channel
    if (channel === 'PREFERRED') {
      console.log('[REMINDER DEBUG] Sending via PREFERRED channel to', eligibleFamilies.length, 'families');

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
      console.log('[REMINDER DEBUG] Sending emails to', eligibleFamilies.length, 'families');

      for (const family of eligibleFamilies) {
        const success = await sendEmailReminder(family);
        if (success) {
          sentCount++;
        } else {
          failedCount++;
        }
      }
    } else {
      // For WhatsApp and SMS, send via Twilio
      console.log('[REMINDER DEBUG] Sending', channel, 'messages to', eligibleFamilies.length, 'families');

      for (const family of eligibleFamilies) {
        const success = await sendSmsOrWhatsappReminder(family, channel as Channel);
        if (success) {
          sentCount++;
        } else {
          failedCount++;
        }
      }
    }

    const response: SendRemindersResponse = {
      success: true,
      data: {
        sent_count: sentCount,
        failed_count: failedCount,
        recipient_families: eligibleFamilies.map((f) => f.id),
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    // Handle authentication errors
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
          message: 'Wedding admin role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle validation errors
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

    // Handle unexpected errors
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
