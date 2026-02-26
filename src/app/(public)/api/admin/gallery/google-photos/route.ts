/**
 * Google Photos Album Link API
 *
 * GET    /api/admin/gallery/google-photos  - Get current album link
 * POST   /api/admin/gallery/google-photos  - Save album share link
 * DELETE /api/admin/gallery/google-photos  - Remove album link
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAnyRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';

export const runtime = 'nodejs';

// ============================================================================
// GET – current album link
// ============================================================================

export async function GET() {
  try {
    const user = await requireAnyRole(['wedding_admin', 'planner', 'master_admin']);

    if (!user.wedding_id) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No wedding associated with this account' },
      }, { status: 403 });
    }

    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: { google_photos_share_url: true },
    });

    if (!wedding) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Wedding not found' },
      }, { status: 404 });
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        connected: !!wedding.google_photos_share_url,
        share_url: wedding.google_photos_share_url,
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
    console.error('[GOOGLE_PHOTOS_GET]', err);
    return NextResponse.json<APIResponse>({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get Google Photos status' },
    }, { status: 500 });
  }
}

// ============================================================================
// POST – save album share link
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

    const body = await request.json();
    const shareUrl = (body?.share_url ?? '').trim();

    if (!shareUrl) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'share_url is required' },
      }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(shareUrl);
    } catch {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid URL' },
      }, { status: 400 });
    }

    await prisma.wedding.update({
      where: { id: user.wedding_id },
      data: { google_photos_share_url: shareUrl },
    });

    return NextResponse.json<APIResponse>({
      success: true,
      data: { connected: true, share_url: shareUrl },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith('UNAUTHORIZED') || message.startsWith('FORBIDDEN')) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'UNAUTHORIZED', message },
      }, { status: 401 });
    }
    console.error('[GOOGLE_PHOTOS_POST]', err);
    return NextResponse.json<APIResponse>({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to save album link' },
    }, { status: 500 });
  }
}

// ============================================================================
// DELETE – remove album link
// ============================================================================

export async function DELETE() {
  try {
    const user = await requireAnyRole(['wedding_admin', 'planner', 'master_admin']);

    if (!user.wedding_id) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No wedding associated with this account' },
      }, { status: 403 });
    }

    await prisma.wedding.update({
      where: { id: user.wedding_id },
      data: { google_photos_share_url: null },
    });

    return NextResponse.json<APIResponse>({ success: true, data: { connected: false } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith('UNAUTHORIZED') || message.startsWith('FORBIDDEN')) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'UNAUTHORIZED', message },
      }, { status: 401 });
    }
    console.error('[GOOGLE_PHOTOS_DELETE]', err);
    return NextResponse.json<APIResponse>({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to remove album link' },
    }, { status: 500 });
  }
}
