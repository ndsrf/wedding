import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { isValidImageType } from '@/lib/images/processor';
import { uploadFile } from '@/lib/storage';
import { prisma } from '@/lib/db/prisma';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!isValidImageType(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are supported.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resize logo to max 800px wide and convert to PNG
    const processedBuffer = await sharp(buffer)
      .resize(800, null, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 90 })
      .toBuffer();

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `company-profile/${user.planner_id}/logo-${timestamp}-${randomStr}.png`;

    const uploadResult = await uploadFile(filename, processedBuffer, { contentType: 'image/png' });

    await prisma.weddingPlanner.update({
      where: { id: user.planner_id },
      data: { logo_url: uploadResult.url },
    });

    return NextResponse.json({ data: { logo_url: uploadResult.url } });
  } catch (error) {
    console.error('POST /api/planner/company-profile/logo error:', error);
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.weddingPlanner.update({
      where: { id: user.planner_id },
      data: { logo_url: null },
    });

    return NextResponse.json({ data: { logo_url: null } });
  } catch (error) {
    console.error('DELETE /api/planner/company-profile/logo error:', error);
    return NextResponse.json({ error: 'Failed to remove logo' }, { status: 500 });
  }
}
