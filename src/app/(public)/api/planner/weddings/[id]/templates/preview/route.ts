/**
 * Planner Template preview endpoint
 * POST /api/planner/weddings/[id]/templates/preview - Preview rendered template
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import {
  renderTemplate,
  validatePreviewTemplate,
} from "@/lib/templates";
import {
  getTemplateById,
  getTemplateForSending,
} from "@/lib/templates/crud";
import { prisma } from "@/lib/db/prisma";
import { formatDateByLanguage } from "@/lib/date-formatter";
import type { Language } from "@/lib/i18n/config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("planner");
    if (!user || !user.planner_id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { id: weddingId } = await params;

    // Verify wedding belongs to planner
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
    });

    if (!wedding) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Wedding not found" } },
        { status: 404 }
      );
    }

    if (wedding.planner_id !== user.planner_id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = validatePreviewTemplate(body);
    if (validation.error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: validation.error.code,
            message: validation.error.message,
            details: validation.error.details,
          },
        },
        { status: 400 }
      );
    }

    const { template_id, type, language, channel, subject, body: bodyText, sampleData } = validation.data;

    // Determine which template to preview
    let templateContent: { subject: string; body: string; image_url: string | null; channel: string } | null = null;

    if (template_id) {
      // Preview existing template by ID
      const template = await getTemplateById(template_id);
      if (!template) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
          { status: 404 }
        );
      }
      if (template.wedding_id !== weddingId) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Forbidden" } },
          { status: 403 }
        );
      }
      templateContent = {
        subject: template.subject,
        body: template.body,
        image_url: template.image_url,
        channel: template.channel
      };
    } else if (type && language && channel) {
      // Preview template by type/language/channel
      const template = await getTemplateForSending(
        weddingId,
        type,
        language,
        channel
      );
      if (!template) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
          { status: 404 }
        );
      }
      templateContent = {
        subject: template.subject,
        body: template.body,
        image_url: template.image_url,
        channel: template.channel
      };
    } else if (subject || bodyText) {
      // Preview custom template content (for editing)
      templateContent = {
        subject: subject || "",
        body: bodyText || "",
        image_url: null,
        channel: channel || "EMAIL"
      };
    }

    if (!templateContent) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Must provide either template_id, type/language/channel, or subject/body",
          },
        },
        { status: 400 }
      );
    }

    // Build sample variables with wedding data
    const dateLanguage: Language = (language as Language) || 'en';

    const formattedDate = formatDateByLanguage(wedding.wedding_date, dateLanguage);
    const cutoffDate = formatDateByLanguage(wedding.rsvp_cutoff_date, dateLanguage);

    const variables = {
      familyName: sampleData?.familyName || "Smith",
      coupleNames: wedding.couple_names || sampleData?.coupleNames || "John & Jane",
      weddingDate: formattedDate,
      weddingTime: wedding.wedding_time || sampleData?.weddingTime || "4:00 PM",
      location: wedding.location || sampleData?.location || "Grand Ballroom",
      magicLink: sampleData?.magicLink || "https://wedding.com/rsvp/example",
      rsvpCutoffDate: cutoffDate,
      referenceCode: sampleData?.referenceCode || "REF-12345-67890",
    };

    // Render template
    const renderedSubject = renderTemplate(templateContent.subject, variables);
    const renderedBody = renderTemplate(templateContent.body, variables);

    return NextResponse.json({
      success: true,
      data: {
        subject: renderedSubject,
        body: renderedBody,
        image_url: templateContent.image_url,
        channel: templateContent.channel,
        variables,
        raw: {
          subject: templateContent.subject,
          body: templateContent.body,
        },
      },
    });
  } catch (error) {
    console.error("[POST /api/planner/weddings/[id]/templates/preview] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to preview template",
        },
      },
      { status: 500 }
    );
  }
}
