/**
 * Planner Wedding Template API (Individual)
 * PATCH /api/planner/weddings/[id]/templates/[templateId] - Update template
 * DELETE /api/planner/weddings/[id]/templates/[templateId] - Delete template
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import {
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} from "@/lib/templates/crud";
import { validateUpdateTemplate } from "@/lib/templates";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  try {
    const user = await requireRole("planner");
    if (!user || !user.planner_id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { id: weddingId, templateId } = await params;

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

    // Verify template belongs to this wedding
    const template = await getTemplateById(templateId);
    if (!template || template.wedding_id !== weddingId) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = validateUpdateTemplate(body);
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

    // Update template
    const updated = await updateTemplate(templateId, validation.data);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[PATCH /api/planner/weddings/[id]/templates/[templateId]] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update template" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  try {
    const user = await requireRole("planner");
    if (!user || !user.planner_id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { id: weddingId, templateId } = await params;

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

    // Verify template belongs to this wedding
    const template = await getTemplateById(templateId);
    if (!template || template.wedding_id !== weddingId) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
        { status: 404 }
      );
    }

    // Delete template
    await deleteTemplate(templateId);

    return NextResponse.json({
      success: true,
      data: { id: templateId },
    });
  } catch (error) {
    console.error("[DELETE /api/planner/weddings/[id]/templates/[templateId]] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete template" } },
      { status: 500 }
    );
  }
}
