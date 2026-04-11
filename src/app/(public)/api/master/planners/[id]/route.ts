/**
 * Master Admin - Single Planner API Routes
 *
 * GET  /api/master/planners/:id - Get a single wedding planner by ID
 * PATCH /api/master/planners/:id - Update planner email
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';
import type { APIResponse } from '@/types/api';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/master/planners/:id
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireRole('master_admin');
    const { id } = await context.params;

    const planner = await prisma.weddingPlanner.findUnique({
      where: { id },
      include: {
        _count: { select: { weddings: true } },
      },
    });

    if (!planner) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Planner not found' },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const data = {
      id: planner.id,
      email: planner.email,
      name: planner.name,
      google_id: planner.google_id,
      auth_provider: planner.auth_provider,
      last_login_provider: planner.last_login_provider,
      preferred_language: planner.preferred_language,
      logo_url: planner.logo_url,
      enabled: planner.enabled,
      subscription_status: planner.subscription_status,
      created_at: planner.created_at,
      created_by: planner.created_by,
      last_login_at: planner.last_login_at,
      wedding_count: planner._count.weddings,
    };

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' } }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Master admin role required' } }, { status: 403 });
    console.error('Error fetching planner:', error);
    return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to fetch planner' } }, { status: 500 });
  }
}

/**
 * PATCH /api/master/planners/:id
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireRole('master_admin');
    const { id } = await context.params;
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Invalid email' } },
        { status: 400 }
      );
    }

    const planner = await prisma.weddingPlanner.update({
      where: { id },
      data: { email: email.trim().toLowerCase() },
      include: { _count: { select: { weddings: true } } },
    });

    const data = {
      id: planner.id,
      email: planner.email,
      name: planner.name,
      enabled: planner.enabled,
      wedding_count: planner._count.weddings,
    };

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' } }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Master admin role required' } }, { status: 403 });
    if (msg.includes('Unique constraint')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.CONFLICT, message: 'Email already in use' } }, { status: 409 });
    console.error('Error updating planner:', error);
    return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to update planner' } }, { status: 500 });
  }
}
