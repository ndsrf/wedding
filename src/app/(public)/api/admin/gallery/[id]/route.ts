/**
 * Admin Gallery - Single Photo API
 *
 * PATCH  /api/admin/gallery/[id]  - Update photo (approve/hide, caption)
 * DELETE /api/admin/gallery/[id]  - Delete a photo
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAnyRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAnyRole(['wedding_admin', 'planner', 'master_admin']);

    if (!user.wedding_id) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No wedding associated with this account' },
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { approved, caption } = body as { approved?: boolean; caption?: string };

    const photo = await prisma.weddingPhoto.findFirst({
      where: { id, wedding_id: user.wedding_id },
    });

    if (!photo) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Photo not found' },
      }, { status: 404 });
    }

    const updated = await prisma.weddingPhoto.update({
      where: { id },
      data: {
        ...(approved !== undefined ? { approved } : {}),
        ...(caption !== undefined ? { caption } : {}),
      },
    });

    return NextResponse.json<APIResponse>({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith('UNAUTHORIZED') || message.startsWith('FORBIDDEN')) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'UNAUTHORIZED', message },
      }, { status: 401 });
    }
    console.error('[GALLERY_PATCH]', err);
    return NextResponse.json<APIResponse>({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update photo' },
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAnyRole(['wedding_admin', 'planner', 'master_admin']);

    if (!user.wedding_id) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No wedding associated with this account' },
      }, { status: 403 });
    }

    const { id } = await params;

    const photo = await prisma.weddingPhoto.findFirst({
      where: { id, wedding_id: user.wedding_id },
    });

    if (!photo) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Photo not found' },
      }, { status: 404 });
    }

    await prisma.weddingPhoto.delete({ where: { id } });

    return NextResponse.json<APIResponse>({ success: true, data: { id } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith('UNAUTHORIZED') || message.startsWith('FORBIDDEN')) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'UNAUTHORIZED', message },
      }, { status: 401 });
    }
    console.error('[GALLERY_DELETE]', err);
    return NextResponse.json<APIResponse>({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete photo' },
    }, { status: 500 });
  }
}
