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
import { trackEvent } from "@/lib/tracking/events";
import type { Language as I18nLanguage } from "@/lib/i18n/config";

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

    if (!family.email) {
      console.error(`[INVITATION] Family has no email: ${family_id}`);
      return { success: false, error: "Family has no email address" };
    }

    // Fetch invitation template in family's preferred language
    const template = await getTemplateForSending(
      wedding_id,
      "INVITATION",
      family.preferred_language,
      "EMAIL"
    );

    if (!template) {
      console.error(
        `[INVITATION] No template found for wedding ${wedding_id}, language ${family.preferred_language}`
      );
      return { success: false, error: "Template not found" };
    }

    // Build template variables
    const weddingDate = family.wedding.wedding_date
      .toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    const rsvpCutoffDate = family.wedding.rsvp_cutoff_date
      .toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

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

    // Convert relative image URL to absolute URL for email clients
    const absoluteImageUrl = template.image_url
      ? `${process.env.APP_URL || "http://localhost:3000"}${template.image_url}`
      : null;

    // Send email
    const emailResult = await sendDynamicEmail(
      family.email,
      renderedSubject,
      renderedBody,
      family.preferred_language.toLowerCase() as I18nLanguage,
      family.wedding.couple_names,
      absoluteImageUrl
    );

    if (!emailResult.success) {
      console.error(
        `[INVITATION] Failed to send email to ${family.email}:`,
        emailResult.error
      );
      return {
        success: false,
        error: `Failed to send email: ${emailResult.error}`,
      };
    }

    // Track invitation sent event
    try {
      await trackEvent({
        family_id,
        wedding_id,
        event_type: "INVITATION_SENT",
        channel: "EMAIL",
        metadata: {
          template_id: template.id,
          template_type: "INVITATION",
          language: family.preferred_language,
          email: family.email,
          admin_id,
        },
        admin_triggered: true,
      });
    } catch (error) {
      console.error("[INVITATION] Failed to track event:", error);
      // Don't fail the whole operation if tracking fails
    }

    console.log(
      `[INVITATION] Invitation sent to ${family.name} (${family.email})`
    );

    return {
      success: true,
      messageId: emailResult.messageId,
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
