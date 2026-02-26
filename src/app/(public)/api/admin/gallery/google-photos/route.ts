/**
 * Google Photos Settings API
 *
 * GET    – return connection status + share URL
 * POST   – initiate OAuth flow (returns auth_url to redirect to)
 * PATCH  – save / update the manual share URL
 * DELETE – disconnect Google Photos (clear all tokens, album ID, share URL)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAnyRole } from '@/lib/auth/middleware';
import { buildGooglePhotosAuthUrl } from '@/lib/google-photos/client';
import type { APIResponse } from '@/types/api';

export const runtime = 'nodejs';

// Shared error handler
function authError(message: string) {
  return NextResponse.json<APIResponse>({ success: false, error: { code: 'UNAUTHORIZED', message } }, { status: 401 });
}

// ============================================================================
// GET – connection status
// ============================================================================

export async function GET() {
  try {
    const user = await requireAnyRole(['wedding_admin', 'planner', 'master_admin']);
    if (!user.wedding_id) return NextResponse.json<APIResponse>({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding associated' } }, { status: 403 });

    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: { google_photos_album_id: true, google_photos_share_url: true },
    });
    if (!wedding) return NextResponse.json<APIResponse>({ success: false, error: { code: 'NOT_FOUND', message: 'Wedding not found' } }, { status: 404 });

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        connected: !!wedding.google_photos_album_id,
        album_id: wedding.google_photos_album_id,
        share_url: wedding.google_photos_share_url,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.startsWith('UNAUTHORIZED') || msg.startsWith('FORBIDDEN')) return authError(msg);
    console.error('[GOOGLE_PHOTOS_GET]', err);
    return NextResponse.json<APIResponse>({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get status' } }, { status: 500 });
  }
}

// ============================================================================
// POST – initiate OAuth flow
// ============================================================================

export async function POST(_request: NextRequest) {
  try {
    const user = await requireAnyRole(['wedding_admin', 'planner', 'master_admin']);
    if (!user.wedding_id) return NextResponse.json<APIResponse>({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding associated' } }, { status: 403 });

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/admin/gallery/google-photos/callback`;
    const state = Buffer.from(JSON.stringify({ wedding_id: user.wedding_id })).toString('base64');
    const authUrl = buildGooglePhotosAuthUrl(redirectUri, state);

    return NextResponse.json<APIResponse>({ success: true, data: { auth_url: authUrl } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.startsWith('UNAUTHORIZED') || msg.startsWith('FORBIDDEN')) return authError(msg);
    console.error('[GOOGLE_PHOTOS_POST]', err);
    return NextResponse.json<APIResponse>({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to start OAuth' } }, { status: 500 });
  }
}

// ============================================================================
// PATCH – save / update manual share URL
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAnyRole(['wedding_admin', 'planner', 'master_admin']);
    if (!user.wedding_id) return NextResponse.json<APIResponse>({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding associated' } }, { status: 403 });

    const body = await request.json();
    const shareUrl = (body?.share_url ?? '').trim();

    if (!shareUrl) return NextResponse.json<APIResponse>({ success: false, error: { code: 'VALIDATION_ERROR', message: 'share_url is required' } }, { status: 400 });

    try { new URL(shareUrl); } catch {
      return NextResponse.json<APIResponse>({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid URL' } }, { status: 400 });
    }

    await prisma.wedding.update({ where: { id: user.wedding_id }, data: { google_photos_share_url: shareUrl } });
    return NextResponse.json<APIResponse>({ success: true, data: { share_url: shareUrl } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.startsWith('UNAUTHORIZED') || msg.startsWith('FORBIDDEN')) return authError(msg);
    console.error('[GOOGLE_PHOTOS_PATCH]', err);
    return NextResponse.json<APIResponse>({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to save share URL' } }, { status: 500 });
  }
}

// ============================================================================
// DELETE – disconnect (clear all tokens + album + share URL)
// ============================================================================

export async function DELETE() {
  try {
    const user = await requireAnyRole(['wedding_admin', 'planner', 'master_admin']);
    if (!user.wedding_id) return NextResponse.json<APIResponse>({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding associated' } }, { status: 403 });

    await prisma.wedding.update({
      where: { id: user.wedding_id },
      data: {
        google_photos_album_id: null,
        google_photos_access_token: null,
        google_photos_refresh_token: null,
        google_photos_token_expiry: null,
        google_photos_share_url: null,
      },
    });

    return NextResponse.json<APIResponse>({ success: true, data: { connected: false } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.startsWith('UNAUTHORIZED') || msg.startsWith('FORBIDDEN')) return authError(msg);
    console.error('[GOOGLE_PHOTOS_DELETE]', err);
    return NextResponse.json<APIResponse>({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to disconnect' } }, { status: 500 });
  }
}
