/**
 * Admin Tasting Dish Image API
 * POST   /api/admin/tasting/dishes/[id]/image  - Upload dish photo
 * DELETE /api/admin/tasting/dishes/[id]/image  - Remove dish photo
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { uploadDishImageHandler, deleteDishImageHandler } from '@/lib/tasting/api-handlers';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }
  const { id } = await params;
  return uploadDishImageHandler(id, user.wedding_id, request);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }
  const { id } = await params;
  return deleteDishImageHandler(id, user.wedding_id);
}
