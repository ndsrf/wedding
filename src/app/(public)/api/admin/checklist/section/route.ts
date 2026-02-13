/**
 * Wedding Admin - Checklist Section API Route
 *
 * POST /api/admin/checklist/section - Create section
 * PATCH /api/admin/checklist/section - Update section
 * DELETE /api/admin/checklist/section - Delete section
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAnyRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';
import {
  createSection,
  updateSection,
  deleteSection,
} from '@/lib/checklist/crud';
import { prisma } from '@/lib/db/prisma';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createSectionSchema = z.object({
  wedding_id: z.string().uuid(),
  name: z.string().max(100, 'Name too long'),
  order: z.number().int().min(0),
});

const updateSectionSchema = z.object({
  wedding_id: z.string().uuid(),
  section_id: z.string().uuid(),
  name: z.string().max(100).optional(),
  order: z.number().int().min(0).optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
 * POST /api/admin/checklist/section
 * Create a new section
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAnyRole(['planner', 'wedding_admin']);
    const body = await request.json();
    const validatedData = createSectionSchema.parse(body);

    const hasAccess = await verifyWeddingAccess(user.id, validatedData.wedding_id, user.role);
    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        error: { code: API_ERROR_CODES.FORBIDDEN, message: 'No access to this wedding' },
      }, { status: 403 });
    }

    const section = await createSection(validatedData);

    return NextResponse.json({ success: true, data: section }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating section:', error);
    return NextResponse.json({
      success: false,
      error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to create section' },
    }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/checklist/section
 * Update an existing section
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAnyRole(['planner', 'wedding_admin']);
    const body = await request.json();
    const validatedData = updateSectionSchema.parse(body);

    const hasAccess = await verifyWeddingAccess(user.id, validatedData.wedding_id, user.role);
    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        error: { code: API_ERROR_CODES.FORBIDDEN, message: 'No access to this wedding' },
      }, { status: 403 });
    }

    const { section_id, wedding_id, ...updateData } = validatedData;
    const section = await updateSection(section_id, wedding_id, updateData);

    return NextResponse.json({ success: true, data: section }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error updating section:', error);
    return NextResponse.json({
      success: false,
      error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to update section' },
    }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/checklist/section
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAnyRole(['planner', 'wedding_admin']);
    const { searchParams } = new URL(request.url);
    const weddingId = searchParams.get('wedding_id');
    const sectionId = searchParams.get('section_id');

    if (!weddingId || !sectionId) {
      return NextResponse.json({
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'wedding_id and section_id are required' },
      }, { status: 400 });
    }

    const hasAccess = await verifyWeddingAccess(user.id, weddingId, user.role);
    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        error: { code: API_ERROR_CODES.FORBIDDEN, message: 'No access to this wedding' },
      }, { status: 403 });
    }

    await deleteSection(sectionId, weddingId);

    return NextResponse.json({ success: true, data: { message: 'Section deleted successfully' } }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error deleting section:', error);
    return NextResponse.json({
      success: false,
      error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to delete section' },
    }, { status: 500 });
  }
}
