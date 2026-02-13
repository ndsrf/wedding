/**
 * Wedding Admin - Checklist API Route
 *
 * GET /api/admin/checklist - Fetch wedding checklist
 * POST /api/admin/checklist - Create task
 * PATCH /api/admin/checklist - Update task
 * DELETE /api/admin/checklist - Delete task
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAnyRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import {
  getChecklist,
  createTask,
  updateTask,
  deleteTask,
} from '@/lib/checklist/crud';
import {
  createTaskAssignedNotification,
  createTaskCompletedNotification,
} from '@/lib/checklist/notifications';
import type { TaskAssignment, TaskStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

// Lazy load DOMPurify to avoid ESM import issues
let DOMPurify: typeof import('isomorphic-dompurify').default | null = null;
const getDOMPurify = async () => {
  if (!DOMPurify) {
    const dompurifyModule = await import('isomorphic-dompurify');
    DOMPurify = dompurifyModule.default;
  }
  return DOMPurify;
};

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createTaskSchema = z.object({
  section_id: z.string().uuid().nullable(),
  title: z.string().max(200, 'Title too long'),
  description: z
    .string()
    .max(2000, 'Description too long')
    .nullable()
    .optional(),
  assigned_to: z.enum(['WEDDING_PLANNER', 'COUPLE', 'OTHER']),
  due_date: z.string().datetime().nullable().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).default('PENDING'),
  order: z.number().int().min(0),
});

const updateTaskSchema = z.object({
  task_id: z.string().uuid(),
  section_id: z.string().uuid().nullable().optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  assigned_to: z.enum(['WEDDING_PLANNER', 'COUPLE', 'OTHER']).optional(),
  due_date: z.string().datetime().nullable().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
  completed: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

const deleteTaskSchema = z.object({
  task_id: z.string().uuid(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sanitize rich text description to prevent XSS attacks
 * Strips all potentially dangerous HTML tags and attributes
 */
async function sanitizeDescription(description: string | null | undefined): Promise<string | null> {
  if (!description) return null;

  const purify = await getDOMPurify();

  // Allow only safe HTML tags for rich text
  const clean = purify.sanitize(description, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'a',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  return clean;
}

/**
 * Verify user has access to the specified wedding
 */
async function verifyWeddingAccess(
  userId: string,
  weddingId: string,
  userRole: string
): Promise<boolean> {
  // Wedding admins must match the wedding_id
  if (userRole === 'wedding_admin') {
    const admin = await prisma.weddingAdmin.findFirst({
      where: {
        id: userId,
        wedding_id: weddingId,
      },
    });
    return !!admin;
  }

  // Planners must be the planner for this wedding
  if (userRole === 'planner') {
    const planner = await prisma.weddingPlanner.findFirst({
      where: { id: userId },
    });

    if (!planner) return false;

    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        planner_id: planner.id,
      },
    });

    return !!wedding;
  }

  return false;
}

// ============================================================================
// API ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/admin/checklist
 * Fetch wedding checklist with all sections and tasks
 */
export async function GET(request: NextRequest) {
  try {
    // Require planner or wedding_admin role
    const user = await requireAnyRole(['planner', 'wedding_admin']);

    // Get wedding_id from query params
    const { searchParams } = new URL(request.url);
    const weddingId = searchParams.get('wedding_id');

    if (!weddingId) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'wedding_id query parameter is required',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Verify user has access to this wedding
    const hasAccess = await verifyWeddingAccess(user.id, weddingId, user.role);
    if (!hasAccess) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'No access to this wedding',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Fetch checklist
    const checklist = await getChecklist(weddingId);

    const response: APIResponse = {
      success: true,
      data: checklist,
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
          message: 'Planner or wedding admin role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle unexpected errors
    console.error('Error fetching checklist:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch checklist',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/admin/checklist
 * Create a new task
 */
export async function POST(request: NextRequest) {
  try {
    // Require planner or wedding_admin role
    const user = await requireAnyRole(['planner', 'wedding_admin']);

    // Parse and validate request body
    const body = await request.json();

    // Extract wedding_id from body
    const weddingId = body.wedding_id;
    if (!weddingId) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'wedding_id is required',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Verify user has access to this wedding
    const hasAccess = await verifyWeddingAccess(user.id, weddingId, user.role);
    if (!hasAccess) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'No access to this wedding',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Validate request data
    const validatedData = createTaskSchema.parse(body);

    // Sanitize description
    const sanitizedDescription = await sanitizeDescription(validatedData.description);

    // Create task
    const task = await createTask({
      wedding_id: weddingId,
      section_id: validatedData.section_id,
      title: validatedData.title,
      description: sanitizedDescription,
      assigned_to: validatedData.assigned_to as TaskAssignment,
      due_date: validatedData.due_date ? new Date(validatedData.due_date) : null,
      status: validatedData.status as TaskStatus,
      completed: validatedData.status === 'COMPLETED',
      order: validatedData.order,
    });

    // Trigger notification for task assignment
    const section = task.section_id
      ? await prisma.checklistSection.findUnique({
          where: { id: task.section_id },
          select: { name: true },
        })
      : null;

    await createTaskAssignedNotification({
      wedding_id: weddingId,
      task_id: task.id,
      task_title: task.title,
      assigned_to: task.assigned_to,
      due_date: task.due_date,
      event_type: 'TASK_ASSIGNED',
      admin_id: user.id,
      section_name: section?.name,
    });

    const response: APIResponse = {
      success: true,
      data: task,
    };

    return NextResponse.json(response, { status: 201 });
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
          message: 'Planner or wedding admin role required',
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
          message: 'Invalid request data',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error creating task:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to create task',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * PATCH /api/admin/checklist
 * Update an existing task
 */
export async function PATCH(request: NextRequest) {
  try {
    // Require planner or wedding_admin role
    const user = await requireAnyRole(['planner', 'wedding_admin']);

    // Parse and validate request body
    const body = await request.json();

    // Extract wedding_id from body
    const weddingId = body.wedding_id;
    if (!weddingId) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'wedding_id is required',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Verify user has access to this wedding
    const hasAccess = await verifyWeddingAccess(user.id, weddingId, user.role);
    if (!hasAccess) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'No access to this wedding',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Validate request data
    const validatedData = updateTaskSchema.parse(body);

    // Get the existing task to check for assignment and completion changes
    const existingTask = await prisma.checklistTask.findFirst({
      where: {
        id: validatedData.task_id,
        wedding_id: weddingId,
        template_id: null,
      },
    });

    if (!existingTask) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Task not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (validatedData.section_id !== undefined) {
      updateData.section_id = validatedData.section_id;
    }
    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title;
    }
    if (validatedData.description !== undefined) {
      updateData.description = await sanitizeDescription(validatedData.description);
    }
    if (validatedData.assigned_to !== undefined) {
      updateData.assigned_to = validatedData.assigned_to;
    }
    if (validatedData.due_date !== undefined) {
      updateData.due_date = validatedData.due_date ? new Date(validatedData.due_date) : null;
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }
    if (validatedData.completed !== undefined) {
      updateData.completed = validatedData.completed;
    }
    if (validatedData.order !== undefined) {
      updateData.order = validatedData.order;
    }

    // Update task
    const task = await updateTask(
      validatedData.task_id,
      weddingId,
      updateData
    );

    // Get section name for notifications
    const section = task.section_id
      ? await prisma.checklistSection.findUnique({
          where: { id: task.section_id },
          select: { name: true },
        })
      : null;

    // Trigger notification for assignment change
    if (
      validatedData.assigned_to !== undefined &&
      validatedData.assigned_to !== existingTask.assigned_to
    ) {
      await createTaskAssignedNotification({
        wedding_id: weddingId,
        task_id: task.id,
        task_title: task.title,
        assigned_to: task.assigned_to,
        due_date: task.due_date,
        event_type: 'TASK_ASSIGNED',
        admin_id: user.id,
        section_name: section?.name,
      });
    }

    // Trigger notification for completion
    if (
      (validatedData.completed === true && !existingTask.completed) ||
      (validatedData.status === 'COMPLETED' && existingTask.status !== 'COMPLETED')
    ) {
      await createTaskCompletedNotification({
        wedding_id: weddingId,
        task_id: task.id,
        task_title: task.title,
        assigned_to: task.assigned_to,
        due_date: task.due_date,
        event_type: 'TASK_COMPLETED',
        admin_id: user.id,
        completed_by: user.id,
        section_name: section?.name,
      });
    }

    const response: APIResponse = {
      success: true,
      data: task,
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
          message: 'Planner or wedding admin role required',
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
          message: 'Invalid request data',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error updating task:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to update task',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * DELETE /api/admin/checklist
 * Delete a task
 */
export async function DELETE(request: NextRequest) {
  try {
    // Require planner or wedding_admin role
    const user = await requireAnyRole(['planner', 'wedding_admin']);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const weddingId = searchParams.get('wedding_id');
    const taskId = searchParams.get('task_id');

    // Validate parameters
    if (!weddingId || !taskId) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'wedding_id and task_id query parameters are required',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate with schema
    const validatedData = deleteTaskSchema.parse({ task_id: taskId });

    // Verify user has access to this wedding
    const hasAccess = await verifyWeddingAccess(user.id, weddingId, user.role);
    if (!hasAccess) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'No access to this wedding',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Delete task
    await deleteTask(validatedData.task_id, weddingId);

    const response: APIResponse = {
      success: true,
      data: { message: 'Task deleted successfully' },
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
          message: 'Planner or wedding admin role required',
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
          message: 'Invalid request parameters',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle task not found errors
    if (errorMessage.includes('not found')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Task not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Handle unexpected errors
    console.error('Error deleting task:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to delete task',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
