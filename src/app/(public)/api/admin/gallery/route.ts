/**
 * Admin Gallery API
 *
 * GET  /api/admin/gallery        - List all photos for the wedding (paginated)
 * POST /api/admin/gallery        - Upload a photo to the gallery
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAnyRole } from '@/lib/auth/middleware';
import { uploadFile, generateUniqueFilename } from '@/lib/storage';
import type { APIResponse } from '@/types/api';

export const runtime = 'nodejs';

// ============================================================================
// GET – list photos
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAnyRole(['wedding_admin', 'planner', 'master_admin']);

    if (!user.wedding_id) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No wedding associated with this account' },
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));
    const approved = searchParams.get('approved');

    const where = {
      wedding_id: user.wedding_id,
      ...(approved !== null ? { approved: approved === 'true' } : {}),
    };

    const [photos, total] = await Promise.all([
      prisma.weddingPhoto.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.weddingPhoto.count({ where }),
    ]);

    return NextResponse.json<APIResponse>({
      success: true,
      data: photos,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith('UNAUTHORIZED') || message.startsWith('FORBIDDEN')) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'UNAUTHORIZED', message },
      }, { status: 401 });
    }
    console.error('[GALLERY_GET]', err);
    return NextResponse.json<APIResponse>({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch photos' },
    }, { status: 500 });
  }
}

// ============================================================================
// POST – upload a photo
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAnyRole(['wedding_admin', 'planner', 'master_admin']);

    if (!user.wedding_id) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No wedding associated with this account' },
      }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caption = (formData.get('caption') as string | null) ?? undefined;

    if (!file) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file provided' },
      }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Only image files are allowed' },
      }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = generateUniqueFilename(file.name);
    const storagePath = `gallery/${user.wedding_id}/${filename}`;

    const { url } = await uploadFile(storagePath, buffer, { contentType: file.type });

    const photo = await prisma.weddingPhoto.create({
      data: {
        wedding_id: user.wedding_id,
        url,
        source: 'UPLOAD',
        sender_name: user.name,
        caption: caption ?? null,
        approved: true,
      },
    });

    return NextResponse.json<APIResponse>({ success: true, data: photo }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith('UNAUTHORIZED') || message.startsWith('FORBIDDEN')) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'UNAUTHORIZED', message },
      }, { status: 401 });
    }
    console.error('[GALLERY_POST]', err);
    return NextResponse.json<APIResponse>({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to upload photo' },
    }, { status: 500 });
  }
}
