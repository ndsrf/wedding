/**
 * Individual template API endpoints
 * GET /api/admin/templates/[id] - Get template
 * PATCH /api/admin/templates/[id] - Update template
 * DELETE /api/admin/templates/[id] - Delete template
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import {
  validateUpdateTemplate,
} from "@/lib/templates";
import {
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  verifyTemplateOwnership,
} from "@/lib/templates/crud";

/**
 * GET /api/admin/templates/[id]
 * Get a specific template by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const user = await requireRole("wedding_admin");
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    // Get template
    const resolvedParams = await params;
    const template = await getTemplateById(resolvedParams.id);
    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Template not found" },
        },
        { status: 404 }
      );
    }

    // Verify ownership
    if (template.wedding_id !== user.wedding_id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Forbidden" } },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("[GET /api/admin/templates/[id]] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch template",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/templates/[id]
 * Update a template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const user = await requireRole("wedding_admin");
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    // Verify ownership
    const resolvedParams = await params;
    const isOwner = await verifyTemplateOwnership(resolvedParams.id, user.wedding_id!);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Forbidden" } },
        { status: 403 }
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
    const updated = await updateTemplate(resolvedParams.id, validation.data);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[PATCH /api/admin/templates/[id]] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update template",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/templates/[id]
 * Delete a template
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const user = await requireRole("wedding_admin");
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    // Verify ownership
    const resolvedParams = await params;
    const isOwner = await verifyTemplateOwnership(resolvedParams.id, user.wedding_id!);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Forbidden" } },
        { status: 403 }
      );
    }

    // Delete template
    await deleteTemplate(resolvedParams.id);

    return NextResponse.json({
      success: true,
      data: { id: resolvedParams.id },
    });
  } catch (error) {
    console.error("[DELETE /api/admin/templates/[id]] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to delete template",
        },
      },
      { status: 500 }
    );
  }
}
