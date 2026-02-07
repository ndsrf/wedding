/**
 * Checklist Template API Routes
 *
 * GET /api/planner/checklist-template - Fetch planner's template
 * POST /api/planner/checklist-template - Save template
 * DELETE /api/planner/checklist-template - Remove template
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import {
  getTemplate,
  saveTemplate,
  deleteTemplate,
} from '@/lib/checklist/template';
import type {
  CreateTemplateSectionData,
  SaveTemplateRequest,
} from '@/types/checklist';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { TaskAssignment } from '@prisma/client';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Task data validation schema
const templateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').nullable(),
  assigned_to: z.nativeEnum(TaskAssignment),
  due_date_relative: z
    .string()
    .regex(
      /^WEDDING_DATE([+-]\d+)?$/,
      'Invalid relative date format (use WEDDING_DATE, WEDDING_DATE-90, etc.)'
    )
    .nullable(),
  order: z.number().int().min(0),
});

// Section data validation schema
const templateSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required').max(100, 'Name too long'),
  order: z.number().int().min(0),
  tasks: z.array(templateTaskSchema).min(1, 'Section must have at least one task'),
});

// Complete template save request schema
const saveTemplateSchema = z.object({
  sections: z
    .array(templateSectionSchema)
    .min(1, 'Template must have at least one section')
    .max(50, 'Too many sections (max 50)'),
});

// ============================================================================
// GET /api/planner/checklist-template
// ============================================================================

/**
 * GET /api/planner/checklist-template
 * Fetch the authenticated planner's checklist template
 */
export async function GET() {
  try {
    // Check authentication and require planner role
    const user = await requireRole('planner');

    if (!user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner ID not found in session',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Fetch template
    const template = await getTemplate(user.planner_id);

    if (!template) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Template not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: APIResponse = {
      success: true,
      data: template,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    // Handle authentication errors
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('UNAUTHORIZED')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required',
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (errorMessage.includes('FORBIDDEN')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle unexpected errors
    console.error('Error fetching template:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch template',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// ============================================================================
// POST /api/planner/checklist-template
// ============================================================================

/**
 * POST /api/planner/checklist-template
 * Save (create or update) a planner's checklist template
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and require planner role
    const user = await requireRole('planner');

    if (!user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner ID not found in session',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Parse and validate request body
    const body: SaveTemplateRequest = await request.json();
    const validationResult = saveTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid template data',
          details: validationResult.error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { sections } = validationResult.data;

    // Validate total task count
    const totalTasks = sections.reduce((sum, section) => sum + section.tasks.length, 0);
    if (totalTasks > 200) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: `Too many tasks (${totalTasks}). Maximum allowed is 200.`,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Save template
    const template = await saveTemplate(user.planner_id, {
      planner_id: user.planner_id,
      sections: sections as CreateTemplateSectionData[],
    });

    const response: APIResponse = {
      success: true,
      data: template,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    // Handle authentication errors
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('UNAUTHORIZED')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required',
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (errorMessage.includes('FORBIDDEN')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid template data',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error saving template:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Failed to save template',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/planner/checklist-template
// ============================================================================

/**
 * DELETE /api/planner/checklist-template
 * Delete the authenticated planner's checklist template
 */
export async function DELETE() {
  try {
    // Check authentication and require planner role
    const user = await requireRole('planner');

    if (!user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner ID not found in session',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Delete template
    const deleted = await deleteTemplate(user.planner_id);

    if (!deleted) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Template not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: APIResponse = {
      success: true,
      data: { message: 'Template deleted successfully' },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    // Handle authentication errors
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('UNAUTHORIZED')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required',
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (errorMessage.includes('FORBIDDEN')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle unexpected errors
    console.error('Error deleting template:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to delete template',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
