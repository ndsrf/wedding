/**
 * Planner Wedding Templates API
 * GET  /api/planner/weddings/[id]/templates - List templates for a specific wedding
 * POST /api/planner/weddings/[id]/templates - Create template for a specific wedding
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { listTemplates, createTemplate } from "@/lib/templates/crud";
import { validateListTemplatesQuery, validateCreateTemplate } from "@/lib/templates";
import { DEFAULT_TEMPLATES } from "@/lib/templates/defaults";
import type { Language, TemplateType, Channel } from "@prisma/client";

export async function GET(
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
      select: { planner_id: true },
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

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryData = {
      wedding_id: weddingId,
      type: searchParams.get("type") || undefined,
      language: searchParams.get("language") || undefined,
      channel: searchParams.get("channel") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "100", // Default to higher limit for templates
    };

    const validation = validateListTemplatesQuery(queryData);
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

    // Fetch templates
    const result = await listTemplates(validation.data);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[GET /api/planner/weddings/[id]/templates] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch templates" } },
      { status: 500 }
    );
  }
}

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

    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { planner_id: true },
    });

    if (!wedding || wedding.planner_id !== user.planner_id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, language, channel } = body;

    const defaults = DEFAULT_TEMPLATES[language as Language]?.[type as TemplateType]?.[channel as Channel];
    const enrichedBody = {
      wedding_id: weddingId,
      type,
      language,
      channel,
      subject: body.subject ?? defaults?.subject ?? `${type} Template`,
      body: body.body ?? defaults?.body ?? '',
    };

    const validation = validateCreateTemplate(enrichedBody);
    if (validation.error) {
      return NextResponse.json(
        { success: false, error: { code: validation.error.code, message: validation.error.message } },
        { status: 400 }
      );
    }

    const template = await createTemplate(validation.data);
    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/planner/weddings/[id]/templates] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create template" } },
      { status: 500 }
    );
  }
}
