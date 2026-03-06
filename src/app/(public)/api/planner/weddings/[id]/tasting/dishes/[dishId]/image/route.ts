/**
 * Planner Tasting Dish Image API
 * POST   /api/planner/weddings/[id]/tasting/dishes/[dishId]/image  - Upload dish photo
 * DELETE /api/planner/weddings/[id]/tasting/dishes/[dishId]/image  - Remove dish photo
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { uploadFile, deleteFile } from '@/lib/storage';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
type Params = { params: Promise<{ id: string; dishId: string }> };

async function checkOwnership(dishId: string, weddingId: string, plannerId: string) {
  return prisma.tastingDish.findFirst({
    where: { id: dishId, section: { menu: { wedding_id: weddingId, wedding: { planner_id: plannerId } } } },
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  }

  const { id: weddingId, dishId } = await params;
  const dish = await checkOwnership(dishId, weddingId, user.planner_id);
  if (!dish) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Dish not found' } }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No file provided' } }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid image type' } }, { status: 400 });
  }

  if (dish.image_url) {
    await deleteFile(dish.image_url).catch(() => {});
  }

  const ext = file.type.split('/')[1] || 'jpg';
  const filename = `${Date.now()}-${randomUUID().split('-')[0]}.${ext}`;
  const filepath = `uploads/weddings/${weddingId}/tasting/dishes/${dishId}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { url } = await uploadFile(filepath, buffer, { contentType: file.type });

  const updated = await prisma.tastingDish.update({ where: { id: dishId }, data: { image_url: url } });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  }

  const { id: weddingId, dishId } = await params;
  const dish = await checkOwnership(dishId, weddingId, user.planner_id);
  if (!dish) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Dish not found' } }, { status: 404 });
  }

  if (dish.image_url) {
    await deleteFile(dish.image_url).catch(() => {});
  }

  const updated = await prisma.tastingDish.update({ where: { id: dishId }, data: { image_url: null } });
  return NextResponse.json({ success: true, data: updated });
}
