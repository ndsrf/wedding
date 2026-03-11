/**
 * Admin Tasting Dish Detail API
 * PUT    /api/admin/tasting/dishes/[id]  - Update dish
 * DELETE /api/admin/tasting/dishes/[id]  - Delete dish
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { updateDishHandler, deleteDishHandler } from '@/lib/tasting/api-handlers';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }
  const { id } = await params;
  return updateDishHandler(id, user.wedding_id, request);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }
  const { id } = await params;
  return deleteDishHandler(id, user.wedding_id);
}
