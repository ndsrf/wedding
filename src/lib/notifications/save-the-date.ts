/**
 * Save the Date Service
 * Handles sending save the date messages to guests before formal invitations
 */

import { prisma } from "@/lib/db";
import {
  renderTemplate,
  type TemplateVariables,
} from "@/lib/templates";
import { getTemplateForSending } from "@/lib/templates/crud";
import { sendDynamicEmail } from "@/lib/email/resend";
import { sendDynamicMessage, MessageType } from "@/lib/sms/twilio";
import { trackEvent } from "@/lib/tracking/events";
import type { Language as I18nLanguage } from "@/lib/i18n/config";
import type { Channel } from "@prisma/client";
import { formatDateByLanguage } from "@/lib/date-formatter";
import { buildWhatsAppLink } from "@/lib/notifications/whatsapp-links";
import { getShortUrlPath } from "@/lib/short-url";
import { toAbsoluteUrl } from "@/lib/images/processor";

export interface SendSaveTheDateOptions {
  family_id: string;
  wedding_id: string;
  admin_id: string;
  channel?: Channel | "PREFERRED";
}

/**
 * Send save the date message to a family
 * Fetches template from database and renders with family/wedding data
 */
export async function sendSaveTheDate(
  options: SendSaveTheDateOptions
): Promise<{
  success: boolean;
  error?: string;
  messageId?: string;
  waLink?: string;
}> {
  const { family_id, wedding_id, admin_id, channel: requestedChannel } = options;

  try {
    // Fetch family with members
    const family = await prisma.family.findUnique({
      where: { id: family_id },
      include: {
        wedding: true,
        members: {
          orderBy: { created_at: "asc" },
        },
      },
    });

    if (!family) {
      console.error(`[SAVE_THE_DATE] Family not found: ${family_id}`);
      return { success: false, error: "Family not found" };
    }

    // Check if save the date is enabled for this wedding
    if (!family.wedding.save_the_date_enabled) {
      console.error(`[SAVE_THE_DATE] Save the date not enabled for wedding: ${wedding_id}`);
      return { success: false, error: "Save the date feature is not enabled for this wedding" };
    }

    // Check if save the date was already sent
    if (family.save_the_date_sent) {
      console.warn(`[SAVE_THE_DATE] Save the date already sent to family: ${family_id}`);
      return { success: false, error: "Save the date already sent to this family" };
    }

    // Determine channel based on request or family preference or fallback to EMAIL
    let channel: Channel;
    
    if (requestedChannel && requestedChannel !== "PREFERRED") {
      channel = requestedChannel;
    } else {
      channel = family.channel_preference || "EMAIL";
    }

    // Validate that family has the required contact info for the channel
    if (channel === "EMAIL" && !family.email) {
      console.error(`[SAVE_THE_DATE] Family has no email: ${family_id}`);
      return { success: false, error: "Family has no email address" };
    }

    if (channel === "SMS" && !family.phone) {
      console.warn(`[SAVE_THE_DATE] Family has no phone, falling back to EMAIL: ${family_id}`);
      channel = "EMAIL";
      if (!family.email) {
        return { success: false, error: "Family has no phone or email address" };
      }
    }

    if (channel === "WHATSAPP" && !family.whatsapp_number) {
      console.warn(`[SAVE_THE_DATE] Family has no WhatsApp, falling back to EMAIL: ${family_id}`);
      channel = "EMAIL";
      if (!family.email) {
        return { success: false, error: "Family has no WhatsApp or email address" };
      }
    }

    // Fetch save the date template in family's preferred language and channel
    const template = await getTemplateForSending(
      wedding_id,
      "SAVE_THE_DATE",
      family.preferred_language,
      channel
    );

    if (!template) {
      console.error(
        `[SAVE_THE_DATE] No template found for wedding ${wedding_id}, language ${family.preferred_language}`
      );
      return { success: false, error: "Template not found" };
    }

    // Build template variables
    const familyLanguage = family.preferred_language.toLowerCase() as I18nLanguage;
    const weddingDate = formatDateByLanguage(
      family.wedding.wedding_date,
      familyLanguage
    );

    const rsvpCutoffDate = formatDateByLanguage(
      family.wedding.rsvp_cutoff_date,
      familyLanguage
    );

    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const shortPath = await getShortUrlPath(family.id);

    const variables: TemplateVariables = {
      familyName: family.name,
      coupleNames: family.wedding.couple_names,
      weddingDate,
      weddingTime: family.wedding.wedding_time,
      location: family.wedding.location,
      magicLink: `${baseUrl}${shortPath}`,
      rsvpCutoffDate,
      ...(family.reference_code && { referenceCode: family.reference_code }),
    };

    // Render template
    const renderedSubject = renderTemplate(template.subject, variables);
    const renderedBody = renderTemplate(template.body, variables);

    // Convert relative image URL to absolute URL
    const absoluteImageUrl = toAbsoluteUrl(template.image_url);

    // Send message based on channel
    let messageResult: { success: boolean; messageId?: string; error?: string };

    if (channel === "EMAIL") {
      messageResult = await sendDynamicEmail(
        family.email!,
        renderedSubject,
        renderedBody,
        family.preferred_language.toLowerCase() as I18nLanguage,
        family.wedding.couple_names,
        absoluteImageUrl || null
      );
    } else if (channel === "SMS") {
      messageResult = await sendDynamicMessage(
        family.phone!,
        renderedBody,
        MessageType.SMS
      );
    } else if (channel === "WHATSAPP") {
      // LINKS mode: return wa.me URL instead of sending via Twilio
      if (family.wedding.whatsapp_mode === "LINKS") {
        const waLink = buildWhatsAppLink(family.whatsapp_number!, renderedBody);
        console.log(`[SAVE_THE_DATE] LINKS mode – wa.me link generated for ${family.name}`);

        // Still mark save_the_date_sent and track the event
        await prisma.family.update({
          where: { id: family_id },
          data: { save_the_date_sent: new Date() },
        });

        // Track save the date sent event (fire-and-forget for better performance)
        void trackEvent({
          family_id,
          wedding_id,
          event_type: "SAVE_THE_DATE_SENT",
          channel: "WHATSAPP",
          metadata: {
            template_id: template.id,
            template_type: "SAVE_THE_DATE",
            language: family.preferred_language,
            channel: "WHATSAPP",
            contact: family.whatsapp_number,
            admin_id,
            whatsapp_mode: "LINKS",
          },
          admin_triggered: true,
        });

        return { success: true, waLink };
      }

      // Check if using content template
      const contentTemplateId = (template as unknown as { content_template_id?: string }).content_template_id;
      if (contentTemplateId) {
        const { mapToWhatsAppVariables } = await import("@/lib/templates/whatsapp-mapper");
        const { sendWhatsAppWithContentTemplate } = await import("@/lib/sms/twilio");

        const whatsappVars = mapToWhatsAppVariables(variables, absoluteImageUrl);
        messageResult = await sendWhatsAppWithContentTemplate(
          family.whatsapp_number!,
          contentTemplateId,
          whatsappVars
        );
      } else {
        messageResult = await sendDynamicMessage(
          family.whatsapp_number!,
          renderedBody,
          MessageType.WHATSAPP,
          absoluteImageUrl
        );
      }
    } else {
      return {
        success: false,
        error: `Unsupported channel: ${channel}`,
      };
    }

    if (!messageResult.success) {
      console.error(
        `[SAVE_THE_DATE] Failed to send ${channel} to ${family.name}:`,
        messageResult.error
      );
      return {
        success: false,
        error: `Failed to send ${channel}: ${messageResult.error}`,
      };
    }

    // Update family with save_the_date_sent timestamp
    await prisma.family.update({
      where: { id: family_id },
      data: {
        save_the_date_sent: new Date(),
      },
    });

    // Track save the date sent event (fire-and-forget for better performance)
    void trackEvent({
      family_id,
      wedding_id,
      event_type: "SAVE_THE_DATE_SENT",
      channel,
      metadata: {
        template_id: template.id,
        template_type: "SAVE_THE_DATE",
        template_name: "Save the Date",
        language: family.preferred_language,
        channel,
        contact: channel === "EMAIL" ? family.email : channel === "SMS" ? family.phone : family.whatsapp_number,
        admin_id,
        ...(messageResult.messageId && { message_sid: messageResult.messageId }),
      },
      admin_triggered: true,
    });

    const contactInfo = channel === "EMAIL" ? family.email : channel === "SMS" ? family.phone : family.whatsapp_number;
    console.log(
      `[SAVE_THE_DATE] Save the date sent to ${family.name} via ${channel} (${contactInfo})`
    );

    return {
      success: true,
      messageId: messageResult.messageId,
    };
  } catch (error) {
    console.error("[SAVE_THE_DATE] Error sending save the date:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Send save the date to multiple families
 * Useful for bulk operations
 */
export async function sendSaveTheDateBulk(
  options: SendSaveTheDateOptions[]
): Promise<{
  total: number;
  successful: number;
  failed: number;
  errors: { family_id: string; error: string }[];
  waLinks: { family_id: string; waLink: string }[];
}> {
  const errors: { family_id: string; error: string }[] = [];
  const waLinks: { family_id: string; waLink: string }[] = [];
  let successful = 0;

  console.log(
    `[SAVE_THE_DATE] Sending save the date to ${options.length} families...`
  );

  for (const option of options) {
    const result = await sendSaveTheDate(option);
    if (result.success) {
      successful++;
      if (result.waLink) {
        waLinks.push({ family_id: option.family_id, waLink: result.waLink });
      }
    } else {
      errors.push({
        family_id: option.family_id,
        error: result.error || "Unknown error",
      });
    }
  }

  return {
    total: options.length,
    successful,
    failed: errors.length,
    errors,
    waLinks,
  };
}
