/**
 * Master Admin - Planner License API Routes
 *
 * GET  /api/master/planners/:id/license  - Get or auto-create planner license
 * PATCH /api/master/planners/:id/license - Update license limits (enforces downgrades)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';
import type { APIResponse } from '@/types/api';
import { WeddingStatus } from '@prisma/client';

const updateLicenseSchema = z.object({
  max_weddings: z.number().int().min(0).optional(),
  max_sub_planners: z.number().int().min(0).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getOrCreateLicense(plannerId: string) {
  const existing = await prisma.plannerLicense.findUnique({
    where: { planner_id: plannerId },
  });
  if (existing) return existing;
  return prisma.plannerLicense.create({
    data: { planner_id: plannerId },
  });
}

/**
 * GET /api/master/planners/:id/license
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

    const license = await getOrCreateLicense(id);
    return NextResponse.json({ success: true, data: license });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' } }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Master admin role required' } }, { status: 403 });
    console.error('Error fetching license:', error);
    return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to fetch license' } }, { status: 500 });
  }
}

/**
 * PATCH /api/master/planners/:id/license
 *
 * Updating limits may trigger enforcement:
 * - Reducing max_weddings: excess active weddings (oldest-last order) are soft-deleted
 *   with license_deleted=true so the planner cannot restore them.
 * - Reducing max_sub_planners: excess sub-accounts (oldest-first) are disabled.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    const body = await request.json();
    const validated = updateLicenseSchema.parse(body);

    const license = await getOrCreateLicense(id);

    const newMaxWeddings = validated.max_weddings ?? license.max_weddings;
    const newMaxSubPlanners = validated.max_sub_planners ?? license.max_sub_planners;

    // Enforce wedding limit if reduced
    if (newMaxWeddings < license.max_weddings) {
      const activeWeddings = await prisma.wedding.findMany({
        where: { planner_id: id, status: { not: WeddingStatus.DELETED } },
        orderBy: { created_at: 'asc' }, // oldest first → keep oldest, delete newest
        select: { id: true },
      });

      if (activeWeddings.length > newMaxWeddings) {
        // Keep the first newMaxWeddings, delete the rest (the newest ones)
        const toDelete = activeWeddings.slice(newMaxWeddings).map((w) => w.id);
        await prisma.wedding.updateMany({
          where: { id: { in: toDelete } },
          data: {
            status: WeddingStatus.DELETED,
            deleted_at: new Date(),
            deleted_by: 'master_license',
            license_deleted: true,
          },
        });
      }
    }

    // Enforce sub-planner limit if reduced
    if (newMaxSubPlanners < license.max_sub_planners) {
      const subAccounts = await prisma.plannerSubAccount.findMany({
        where: { company_planner_id: id, enabled: true },
        orderBy: { created_at: 'asc' }, // oldest first → keep oldest, disable newest
        select: { id: true },
      });

      if (subAccounts.length > newMaxSubPlanners) {
        const toDisable = subAccounts.slice(newMaxSubPlanners).map((s) => s.id);
        await prisma.plannerSubAccount.updateMany({
          where: { id: { in: toDisable } },
          data: { enabled: false },
        });
      }
    }

    const updated = await prisma.plannerLicense.update({
      where: { planner_id: id },
      data: { max_weddings: newMaxWeddings, max_sub_planners: newMaxSubPlanners },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' } }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Master admin role required' } }, { status: 403 });
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Invalid request data', details: error.issues } }, { status: 400 });
    console.error('Error updating license:', error);
    return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to update license' } }, { status: 500 });
  }
}
