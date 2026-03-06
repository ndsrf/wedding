/**
 * Admin Tasting Section Detail API
 * PUT    /api/admin/tasting/sections/[id]  - Update section
 * DELETE /api/admin/tasting/sections/[id]  - Delete section
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const updateSectionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  order: z.number().int().min(0).optional(),
});

type Params = { params: Promise<{ id: string }> };

async function checkOwnership(sectionId: string, weddingId: string) {
  const section = await prisma.tastingSection.findFirst({
    where: { id: sectionId, menu: { wedding_id: weddingId } },
  });
  return section;
}

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }

  const { id } = await params;
  const section = await checkOwnership(id, user.wedding_id);
  if (!section) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Section not found' } }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });
  }

  const updated = await prisma.tastingSection.update({
    where: { id },
    data: parsed.data,
    include: { dishes: { orderBy: { order: 'asc' } } },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }

  const { id } = await params;
  const section = await checkOwnership(id, user.wedding_id);
  if (!section) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Section not found' } }, { status: 404 });
  }

  await prisma.tastingSection.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
