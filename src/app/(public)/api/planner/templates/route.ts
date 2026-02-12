/**
 * Planner Template API endpoints
 * GET /api/planner/templates - List planner's default templates
 * POST /api/planner/templates - Create template
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { Language, TemplateType, Channel } from "@prisma/client";

// Validation schema for query parameters
const listTemplatesQuerySchema = z.object({
  type: z.nativeEnum(TemplateType).optional(),
  language: z.nativeEnum(Language).optional(),
  channel: z.nativeEnum(Channel).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(100),
});

/**
 * GET /api/planner/templates
 * List planner's templates with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Verify planner access
    const user = await requireRole("planner");
    if (!user || !user.planner_id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Planner authentication required" } },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryData = {
      type: searchParams.get("type") || undefined,
      language: searchParams.get("language") || undefined,
      channel: searchParams.get("channel") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "100",
    };

    const validation = listTemplatesQuerySchema.safeParse(queryData);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { type, language, channel, page, limit } = validation.data;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      planner_id: string;
      type?: TemplateType;
      language?: Language;
      channel?: Channel;
    } = {
      planner_id: user.planner_id,
    };

    if (type) where.type = type;
    if (language) where.language = language;
    if (channel) where.channel = channel;

    // Get total count
    const total = await prisma.plannerMessageTemplate.count({ where });

    // Fetch templates
    const templates = await prisma.plannerMessageTemplate.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ type: "asc" }, { language: "asc" }, { channel: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: {
        items: templates,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/planner/templates] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch templates",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/planner/templates
 * Create a new planner template
 */
const createTemplateSchema = z.object({
  type: z.nativeEnum(TemplateType),
  language: z.nativeEnum(Language),
  channel: z.nativeEnum(Channel),
  subject: z.string(),
  body: z.string(),
  image_url: z.string().optional().nullable(),
  content_template_id: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify planner access
    const user = await requireRole("planner");
    if (!user || !user.planner_id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Planner authentication required" } },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate request
    const validation = createTemplateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    // Create template
    const template = await prisma.plannerMessageTemplate.create({
      data: {
        planner_id: user.planner_id,
        ...validation.data,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: template,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/planner/templates] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create template",
        },
      },
      { status: 500 }
    );
  }
}
