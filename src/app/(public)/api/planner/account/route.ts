/**
 * Wedding Planner - Account API Route
 *
 * GET /api/planner/account - Returns subscription status, license limits, and usage
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const user = await requireRole('planner');

    if (!user.planner_id) {
      return NextResponse.json({ error: 'Planner ID not found' }, { status: 403 });
    }

    const [planner, activeWeddings, subAccountCount] = await Promise.all([
      prisma.weddingPlanner.findUnique({
        where: { id: user.planner_id },
        select: {
          id: true,
          name: true,
          email: true,
          subscription_status: true,
          license: {
            select: {
              max_weddings: true,
              max_sub_planners: true,
            },
          },
        },
      }),
      prisma.wedding.count({
        where: { planner_id: user.planner_id, status: 'ACTIVE', deleted_at: null, is_disabled: false },
      }),
      prisma.plannerSubAccount.count({
        where: { company_planner_id: user.planner_id, enabled: true },
      }),
    ]);

    if (!planner) {
      return NextResponse.json({ error: 'Planner not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        name: planner.name,
        email: planner.email,
        subscription_status: planner.subscription_status,
        limits: {
          max_weddings: planner.license?.max_weddings ?? null,
          max_sub_planners: planner.license?.max_sub_planners ?? null,
          // Placeholders — to be implemented in future
          ai_calls_basic: null as number | null,
          ai_calls_premium: null as number | null,
          whatsapp_messages: null as number | null,
        },
        usage: {
          active_weddings: activeWeddings,
          active_sub_planners: subAccountCount,
          // Placeholders — to be implemented in future
          ai_calls_basic_used: null as number | null,
          ai_calls_premium_used: null as number | null,
          whatsapp_messages_used: null as number | null,
        },
      },
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
