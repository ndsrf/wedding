/**
 * Confirmation Service
 * Handles sending RSVP confirmations when guests submit their RSVP
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
import { toAbsoluteUrl } from "@/lib/images/processor";

export interface SendConfirmationOptions {
  family_id: string;
  wedding_id: string;
}

/**
 * Send RSVP confirmation to a family when they submit their RSVP
 * Uses CONFIRMATION template type and sends via family's preferred channel
 */
export async function sendConfirmation(
  options: SendConfirmationOptions
): Promise<{
  success: boolean;
  error?: string;
  messageId?: string;
}> {
  const { family_id, wedding_id } = options;

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
      console.error(`[CONFIRMATION] Family not found: ${family_id}`);
      return { success: false, error: "Family not found" };
    }

    // Determine channel based on family preference or fallback to EMAIL
    let channel: Channel = family.channel_preference || "EMAIL";

    // Validate that family has the required contact info for the channel
    if (channel === "EMAIL" && !family.email) {
      console.error(`[CONFIRMATION] Family has no email: ${family_id}`);
      return { success: false, error: "Family has no email address" };
    }

    if (channel === "SMS" && !family.phone) {
      console.warn(`[CONFIRMATION] Family has no phone, falling back to EMAIL: ${family_id}`);
      channel = "EMAIL";
      if (!family.email) {
        return { success: false, error: "Family has no phone or email address" };
      }
    }

    if (channel === "WHATSAPP" && !family.whatsapp_number) {
      console.warn(`[CONFIRMATION] Family has no WhatsApp, falling back to EMAIL: ${family_id}`);
      channel = "EMAIL";
      if (!family.email) {
        return { success: false, error: "Family has no WhatsApp or email address" };
      }
    }

    // Fetch confirmation template in family's preferred language and channel
    const template = await getTemplateForSending(
      wedding_id,
      "CONFIRMATION",
      family.preferred_language,
      channel
    );

    if (!template) {
      console.error(
        `[CONFIRMATION] No template found for wedding ${wedding_id}, language ${family.preferred_language}, channel ${channel}`
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

    const variables: TemplateVariables = {
      familyName: family.name,
      coupleNames: family.wedding.couple_names,
      weddingDate,
      weddingTime: family.wedding.wedding_time,
      location: family.wedding.location,
      magicLink: `${process.env.APP_URL || "http://localhost:3000"}/rsvp/${family.magic_token}`,
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
      // LINKS mode: skip auto-send (confirmation is server-triggered, no browser context)
      if (family.wedding.whatsapp_mode === "LINKS") {
        console.log(`[CONFIRMATION] LINKS mode – skipping auto-send for ${family.name}. Admin can send manually.`);
        return { success: true };
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
        `[CONFIRMATION] Failed to send ${channel} to ${family.name}:`,
        messageResult.error
      );
      return {
        success: false,
        error: `Failed to send ${channel}: ${messageResult.error}`,
      };
    }

    // Track confirmation sent event (fire-and-forget for better performance)
    void trackEvent({
      family_id,
      wedding_id,
      event_type: "REMINDER_SENT",
      channel,
      metadata: {
        template_id: template.id,
        template_type: "CONFIRMATION",
        language: family.preferred_language,
        channel,
        contact: channel === "EMAIL" ? family.email : channel === "SMS" ? family.phone : family.whatsapp_number,
        ...(messageResult.messageId && { message_sid: messageResult.messageId }),
      },
      admin_triggered: false,
    });

    const contactInfo = channel === "EMAIL" ? family.email : channel === "SMS" ? family.phone : family.whatsapp_number;
    console.log(
      `[CONFIRMATION] Confirmation sent to ${family.name} via ${channel} (${contactInfo})`
    );

    return {
      success: true,
      messageId: messageResult.messageId,
    };
  } catch (error) {
    console.error("[CONFIRMATION] Error sending confirmation:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
