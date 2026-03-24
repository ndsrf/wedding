/**
 * Master Admin - Individual Sub-Account API Routes
 *
 * PATCH  /api/master/planners/:id/sub-accounts/:subId - Enable/disable a sub-account
 * DELETE /api/master/planners/:id/sub-accounts/:subId - Remove a sub-account
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';
import type { APIResponse } from '@/types/api';

const updateSubAccountSchema = z.object({
  enabled: z.boolean(),
});

interface RouteContext {
  params: Promise<{ id: string; subId: string }>;
}

async function findSubAccount(plannerId: string, subId: string) {
  return prisma.plannerSubAccount.findFirst({
    where: { id: subId, company_planner_id: plannerId },
  });
}

/**
 * PATCH /api/master/planners/:id/sub-accounts/:subId
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireRole('master_admin');
    const { id, subId } = await context.params;

    const subAccount = await findSubAccount(id, subId);
    if (!subAccount) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Sub-account not found' },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const body = await request.json();
    const validated = updateSubAccountSchema.parse(body);

    // When re-enabling, the limit check and the update must be atomic to
    // prevent two concurrent requests from both passing the count check when
    // only one slot remains.
    if (validated.enabled && !subAccount.enabled) {
      const planner = await prisma.weddingPlanner.findUnique({
        where: { id },
        include: { license: true },
      });
      const maxSubPlanners = planner?.license?.max_sub_planners ?? 2;

      let updated;
      try {
        updated = await prisma.$transaction(async (tx) => {
          const currentCount = await tx.plannerSubAccount.count({
            where: { company_planner_id: id, enabled: true },
          });
          if (currentCount >= maxSubPlanners) {
            throw Object.assign(new Error('LIMIT_REACHED'), { maxSubPlanners });
          }
          return tx.plannerSubAccount.update({
            where: { id: subId },
            data: { enabled: true },
          });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (txError) {
        if (txError instanceof Error && txError.message === 'LIMIT_REACHED') {
          const response: APIResponse = {
            success: false,
            error: {
              code: API_ERROR_CODES.FORBIDDEN,
              message: `Sub-account limit reached (${maxSubPlanners}). Upgrade the license first.`,
            },
          };
          return NextResponse.json(response, { status: 403 });
        }
        throw txError;
      }

      return NextResponse.json({ success: true, data: updated });
    }

    const updated = await prisma.plannerSubAccount.update({
      where: { id: subId },
      data: { enabled: validated.enabled },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' } }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Master admin role required' } }, { status: 403 });
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Invalid request data', details: error.issues } }, { status: 400 });
    console.error('Error updating sub-account:', error);
    return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to update sub-account' } }, { status: 500 });
  }
}

/**
 * DELETE /api/master/planners/:id/sub-accounts/:subId
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requireRole('master_admin');
    const { id, subId } = await context.params;

    const subAccount = await findSubAccount(id, subId);
    if (!subAccount) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Sub-account not found' },
      };
      return NextResponse.json(response, { status: 404 });
    }

    await prisma.plannerSubAccount.delete({ where: { id: subId } });

    return NextResponse.json({ success: true, data: null });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' } }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Master admin role required' } }, { status: 403 });
    console.error('Error deleting sub-account:', error);
    return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to delete sub-account' } }, { status: 500 });
  }
}
