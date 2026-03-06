/**
 * Public Tasting Score Image API
 * POST   /api/tasting/[token]/score/image  - Upload photo for a dish rating
 * DELETE /api/tasting/[token]/score/image  - Remove photo from a dish rating
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { uploadFile, deleteFile } from '@/lib/storage';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
type Params = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;

  const participant = await prisma.tastingParticipant.findUnique({
    where: { magic_token: token },
    include: { menu: { select: { wedding_id: true } } },
  });
  if (!participant) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Invalid tasting link' } }, { status: 404 });
  }

  const formData = await request.formData();
  const dishId = formData.get('dish_id') as string | null;
  const file = formData.get('file') as File | null;

  if (!dishId || !file) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'dish_id and file are required' } }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid image type' } }, { status: 400 });
  }

  // Verify dish belongs to this participant's menu
  const dish = await prisma.tastingDish.findFirst({
    where: { id: dishId, section: { menu_id: participant.menu_id } },
  });
  if (!dish) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Dish not found' } }, { status: 404 });
  }

  // Remove old image if the score already has one
  const existing = await prisma.tastingScore.findUnique({
    where: { participant_id_dish_id: { participant_id: participant.id, dish_id: dishId } },
    select: { image_url: true },
  });
  if (existing?.image_url) {
    await deleteFile(existing.image_url).catch(() => {});
  }

  const ext = file.type.split('/')[1] || 'jpg';
  const filename = `${Date.now()}-${randomUUID().split('-')[0]}.${ext}`;
  const filepath = `uploads/weddings/${participant.menu.wedding_id}/tasting/scores/${participant.id}/${dishId}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { url } = await uploadFile(filepath, buffer, { contentType: file.type });

  const score = await prisma.tastingScore.upsert({
    where: { participant_id_dish_id: { participant_id: participant.id, dish_id: dishId } },
    create: { participant_id: participant.id, dish_id: dishId, score: 0, image_url: url },
    update: { image_url: url },
  });

  return NextResponse.json({ success: true, data: score });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { token } = await params;

  const participant = await prisma.tastingParticipant.findUnique({
    where: { magic_token: token },
  });
  if (!participant) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
  }

  const { dish_id: dishId } = await request.json();
  if (!dishId) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'dish_id required' } }, { status: 400 });
  }

  const existing = await prisma.tastingScore.findUnique({
    where: { participant_id_dish_id: { participant_id: participant.id, dish_id: dishId } },
    select: { image_url: true },
  });
  if (existing?.image_url) {
    await deleteFile(existing.image_url).catch(() => {});
    await prisma.tastingScore.update({
      where: { participant_id_dish_id: { participant_id: participant.id, dish_id: dishId } },
      data: { image_url: null },
    });
  }

  return NextResponse.json({ success: true });
}
