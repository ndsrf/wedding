/**
 * Master Admin - Planner Sub-Accounts API Routes
 *
 * GET  /api/master/planners/:id/sub-accounts - List sub-accounts for a planner company
 * POST /api/master/planners/:id/sub-accounts - Add a new sub-account
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';
import type { APIResponse } from '@/types/api';

const createSubAccountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/master/planners/:id/sub-accounts
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireRole('master_admin');
    const { id } = await context.params;

    const planner = await prisma.weddingPlanner.findUnique({ where: { id } });
    if (!planner) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Planner not found' },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const subAccounts = await prisma.plannerSubAccount.findMany({
      where: { company_planner_id: id },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        enabled: true,
        created_at: true,
        last_login_at: true,
        preferred_language: true,
      },
    });

    return NextResponse.json({ success: true, data: subAccounts });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' } }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Master admin role required' } }, { status: 403 });
    console.error('Error fetching sub-accounts:', error);
    return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to fetch sub-accounts' } }, { status: 500 });
  }
}

/**
 * POST /api/master/planners/:id/sub-accounts
 * Creates a new sub-account, respecting the license max_sub_planners limit.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const adminUser = await requireRole('master_admin');
    const { id } = await context.params;

    const planner = await prisma.weddingPlanner.findUnique({
      where: { id },
      include: { license: true },
    });
    if (!planner) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Planner not found' },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const body = await request.json();
    const validated = createSubAccountSchema.parse(body);

    // Check license limit
    const maxSubPlanners = planner.license?.max_sub_planners ?? 2;
    const currentCount = await prisma.plannerSubAccount.count({
      where: { company_planner_id: id, enabled: true },
    });
    if (currentCount >= maxSubPlanners) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: `Sub-account limit reached (${maxSubPlanners}). Upgrade the license to add more.`,
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Check the email is not already in use by a main planner account or sub-account
    const [existingPlanner, existingSubAccount] = await Promise.all([
      prisma.weddingPlanner.findUnique({ where: { email: validated.email } }),
      prisma.plannerSubAccount.findUnique({ where: { email: validated.email } }),
    ]);

    if (existingPlanner || existingSubAccount) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.ALREADY_EXISTS, message: 'An account with this email already exists' },
      };
      return NextResponse.json(response, { status: 409 });
    }

    const subAccount = await prisma.plannerSubAccount.create({
      data: {
        company_planner_id: id,
        email: validated.email,
        name: validated.name,
        enabled: true,
        created_by: adminUser.id,
      },
    });

    return NextResponse.json({ success: true, data: subAccount }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' } }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Master admin role required' } }, { status: 403 });
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Invalid request data', details: error.issues } }, { status: 400 });
    console.error('Error creating sub-account:', error);
    return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to create sub-account' } }, { status: 500 });
  }
}
