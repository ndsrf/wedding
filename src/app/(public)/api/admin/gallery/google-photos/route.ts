/**
 * Google Photos Integration API
 *
 * GET    /api/admin/gallery/google-photos  - Get current Google Photos connection status
 * DELETE /api/admin/gallery/google-photos  - Disconnect Google Photos
 * POST   /api/admin/gallery/google-photos  - Start OAuth flow (returns redirect URL)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAnyRole } from '@/lib/auth/middleware';
import { buildGooglePhotosAuthUrl } from '@/lib/google-photos/client';
import type { APIResponse } from '@/types/api';

export const runtime = 'nodejs';

// ============================================================================
// GET – connection status
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
      select: {
        google_photos_album_id: true,
        google_photos_album_url: true,
        google_photos_share_url: true,
        google_photos_token_expiry: true,
      },
    });

    if (!wedding) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Wedding not found' },
      }, { status: 404 });
    }

    const connected = !!wedding.google_photos_album_id;

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        connected,
        album_id: wedding.google_photos_album_id,
        album_url: wedding.google_photos_album_url,
        share_url: wedding.google_photos_share_url,
        token_expiry: wedding.google_photos_token_expiry,
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
// POST – start OAuth flow
// ============================================================================

export async function POST(_request: NextRequest) {
  try {
    const user = await requireAnyRole(['wedding_admin', 'planner', 'master_admin']);

    if (!user.wedding_id) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No wedding associated with this account' },
      }, { status: 403 });
    }

    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const redirectUri = `${appUrl}/api/admin/gallery/google-photos/callback`;

    // State encodes the wedding_id so the callback knows which wedding to update
    const state = Buffer.from(JSON.stringify({ wedding_id: user.wedding_id })).toString('base64');

    const authUrl = buildGooglePhotosAuthUrl(redirectUri, state);

    return NextResponse.json<APIResponse>({ success: true, data: { auth_url: authUrl } });
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
      error: { code: 'INTERNAL_ERROR', message: 'Failed to start Google Photos OAuth flow' },
    }, { status: 500 });
  }
}

// ============================================================================
// DELETE – disconnect Google Photos
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
      data: {
        google_photos_album_id: null,
        google_photos_album_url: null,
        google_photos_share_url: null,
        google_photos_refresh_token: null,
        google_photos_access_token: null,
        google_photos_token_expiry: null,
      },
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
      error: { code: 'INTERNAL_ERROR', message: 'Failed to disconnect Google Photos' },
    }, { status: 500 });
  }
}
