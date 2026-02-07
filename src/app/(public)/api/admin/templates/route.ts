/**
 * Template API endpoints
 * GET /api/admin/templates - List templates
 * POST /api/admin/templates - Create template
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import {
  validateListTemplatesQuery,
  validateCreateTemplate,
} from "@/lib/templates";
import { listTemplates, createTemplate } from "@/lib/templates/crud";

/**
 * GET /api/admin/templates
 * List templates with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const user = await requireRole("wedding_admin");
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryData = {
      wedding_id: user.wedding_id,
      type: searchParams.get("type") || undefined,
      language: searchParams.get("language") || undefined,
      channel: searchParams.get("channel") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "50",
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
    console.error("[GET /api/admin/templates] Error:", error);
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
 * POST /api/admin/templates
 * Create a new template (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const user = await requireRole("wedding_admin");
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Ensure wedding_id matches the user's wedding
    if (body.wedding_id !== user.wedding_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Cannot create templates for other weddings",
          },
        },
        { status: 403 }
      );
    }

    // Validate request
    const validation = validateCreateTemplate(body);
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

    // Create template
    const template = await createTemplate(validation.data);

    return NextResponse.json(
      {
        success: true,
        data: template,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/admin/templates] Error:", error);
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
