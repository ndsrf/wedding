/**
 * Admin Tasting Section Detail API
 * PUT    /api/admin/tasting/sections/[id]  - Update section
 * DELETE /api/admin/tasting/sections/[id]  - Delete section
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { updateSectionHandler, deleteSectionHandler } from '@/lib/tasting/api-handlers';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }
  const { id } = await params;
  return updateSectionHandler(id, user.wedding_id, request);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }
  const { id } = await params;
  return deleteSectionHandler(id, user.wedding_id);
}
