/**
 * Public Gallery API
 *
 * GET /api/public/gallery/[weddingId]
 *
 * Returns approved photos for a wedding.
 * Used by the GalleryBlock in the invitation (no auth required).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { APIResponse } from '@/types/api';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ weddingId: string }> }
) {
  try {
    const { weddingId } = await params;

    const photos = await prisma.weddingPhoto.findMany({
      where: { wedding_id: weddingId, approved: true },
      orderBy: { created_at: 'desc' },
      take: 100,
      select: {
        id: true,
        url: true,
        thumbnail_url: true,
        source: true,
        sender_name: true,
        caption: true,
        created_at: true,
      },
    });

    return NextResponse.json<APIResponse>({ success: true, data: photos });
  } catch (err) {
    console.error('[PUBLIC_GALLERY_GET]', err);
    return NextResponse.json<APIResponse>({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch photos' },
    }, { status: 500 });
  }
}
