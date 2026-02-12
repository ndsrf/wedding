/**
 * Single Planner Template API endpoints
 * GET /api/planner/templates/:id - Get single template
 * PATCH /api/planner/templates/:id - Update template
 * DELETE /api/planner/templates/:id - Delete template
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const updateTemplateSchema = z.object({
  subject: z.string().optional(),
  body: z.string().optional(),
  image_url: z.string().optional().nullable(),
  content_template_id: z.string().optional().nullable(),
});

/**
 * GET /api/planner/templates/:id
 */
export async function GET(
  _request: NextRequest,
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

    const resolvedParams = await params;

    const template = await prisma.plannerMessageTemplate.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
        { status: 404 }
      );
    }

    // Verify ownership
    if (template.planner_id !== user.planner_id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error("[GET /api/planner/templates/:id] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch template" } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/planner/templates/:id
 */
export async function PATCH(
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

    const resolvedParams = await params;

    // Check template exists and belongs to planner
    const existingTemplate = await prisma.plannerMessageTemplate.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
        { status: 404 }
      );
    }

    if (existingTemplate.planner_id !== user.planner_id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateTemplateSchema.safeParse(body);

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

    // Update template
    const template = await prisma.plannerMessageTemplate.update({
      where: { id: resolvedParams.id },
      data: validation.data,
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error("[PATCH /api/planner/templates/:id] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update template" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/planner/templates/:id
 */
export async function DELETE(
  _request: NextRequest,
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

    const resolvedParams = await params;

    // Check template exists and belongs to planner
    const existingTemplate = await prisma.plannerMessageTemplate.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
        { status: 404 }
      );
    }

    if (existingTemplate.planner_id !== user.planner_id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Delete template
    await prisma.plannerMessageTemplate.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/planner/templates/:id] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete template" } },
      { status: 500 }
    );
  }
}
