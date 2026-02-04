/**
 * Invitation Service
 * Handles sending first-time invitations when guests are added to a wedding
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

export interface SendInvitationOptions {
  family_id: string;
  wedding_id: string;
  admin_id: string;
}

/**
 * Send invitation email to a family when they're added to a wedding
 * Fetches template from database and renders with family/wedding data
 */
export async function sendInvitation(
  options: SendInvitationOptions
): Promise<{
  success: boolean;
  error?: string;
  messageId?: string;
}> {
  const { family_id, wedding_id, admin_id } = options;

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
      console.error(`[INVITATION] Family not found: ${family_id}`);
      return { success: false, error: "Family not found" };
    }

    // Determine channel based on family preference or fallback to EMAIL
    let channel: Channel = family.channel_preference || "EMAIL";

    // Validate that family has the required contact info for the channel
    if (channel === "EMAIL" && !family.email) {
      console.error(`[INVITATION] Family has no email: ${family_id}`);
      return { success: false, error: "Family has no email address" };
    }

    if (channel === "SMS" && !family.phone) {
      console.warn(`[INVITATION] Family has no phone, falling back to EMAIL: ${family_id}`);
      channel = "EMAIL";
      if (!family.email) {
        return { success: false, error: "Family has no phone or email address" };
      }
    }

    if (channel === "WHATSAPP" && !family.whatsapp_number) {
      console.warn(`[INVITATION] Family has no WhatsApp, falling back to EMAIL: ${family_id}`);
      channel = "EMAIL";
      if (!family.email) {
        return { success: false, error: "Family has no WhatsApp or email address" };
      }
    }

    // Fetch invitation template in family's preferred language and channel
    const template = await getTemplateForSending(
      wedding_id,
      "INVITATION",
      family.preferred_language,
      channel
    );

    if (!template) {
      console.error(
        `[INVITATION] No template found for wedding ${wedding_id}, language ${family.preferred_language}`
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
    const absoluteImageUrl = template.image_url
      ? `${process.env.APP_URL || "http://localhost:3000"}${template.image_url}`
      : undefined;

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
        `[INVITATION] Failed to send ${channel} to ${family.name}:`,
        messageResult.error
      );
      return {
        success: false,
        error: `Failed to send ${channel}: ${messageResult.error}`,
      };
    }

    // Track invitation sent event
    try {
      await trackEvent({
        family_id,
        wedding_id,
        event_type: "INVITATION_SENT",
        channel,
        metadata: {
          template_id: template.id,
          template_type: "INVITATION",
          language: family.preferred_language,
          channel,
          contact: channel === "EMAIL" ? family.email : channel === "SMS" ? family.phone : family.whatsapp_number,
          admin_id,
          ...(messageResult.messageId && { message_sid: messageResult.messageId }),
        },
        admin_triggered: true,
      });
    } catch (error) {
      console.error("[INVITATION] Failed to track event:", error);
      // Don't fail the whole operation if tracking fails
    }

    const contactInfo = channel === "EMAIL" ? family.email : channel === "SMS" ? family.phone : family.whatsapp_number;
    console.log(
      `[INVITATION] Invitation sent to ${family.name} via ${channel} (${contactInfo})`
    );

    return {
      success: true,
      messageId: messageResult.messageId,
    };
  } catch (error) {
    console.error("[INVITATION] Error sending invitation:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Send invitations to multiple families
 * Useful for bulk operations like importing guests
 */
export async function sendInvitationsBulk(
  options: SendInvitationOptions[]
): Promise<{
  total: number;
  successful: number;
  failed: number;
  errors: { family_id: string; error: string }[];
}> {
  const errors: { family_id: string; error: string }[] = [];
  let successful = 0;

  console.log(
    `[INVITATION] Sending invitations to ${options.length} families...`
  );

  for (const option of options) {
    const result = await sendInvitation(option);
    if (result.success) {
      successful++;
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
  };
}
