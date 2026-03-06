/**
 * Admin Tasting Dish Image API
 * POST   /api/admin/tasting/dishes/[id]/image  - Upload dish photo
 * DELETE /api/admin/tasting/dishes/[id]/image  - Remove dish photo
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { uploadFile, deleteFile } from '@/lib/storage';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
type Params = { params: Promise<{ id: string }> };

async function checkOwnership(dishId: string, weddingId: string) {
  return prisma.tastingDish.findFirst({
    where: { id: dishId, section: { menu: { wedding_id: weddingId } } },
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }

  const { id } = await params;
  const dish = await checkOwnership(id, user.wedding_id);
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

  // Remove old image if present
  if (dish.image_url) {
    await deleteFile(dish.image_url).catch(() => {});
  }

  const ext = file.type.split('/')[1] || 'jpg';
  const filename = `${Date.now()}-${randomUUID().split('-')[0]}.${ext}`;
  const filepath = `uploads/weddings/${user.wedding_id}/tasting/dishes/${id}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { url } = await uploadFile(filepath, buffer, { contentType: file.type });

  const updated = await prisma.tastingDish.update({ where: { id }, data: { image_url: url } });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }

  const { id } = await params;
  const dish = await checkOwnership(id, user.wedding_id);
  if (!dish) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Dish not found' } }, { status: 404 });
  }

  if (dish.image_url) {
    await deleteFile(dish.image_url).catch(() => {});
  }

  const updated = await prisma.tastingDish.update({ where: { id }, data: { image_url: null } });
  return NextResponse.json({ success: true, data: updated });
}
