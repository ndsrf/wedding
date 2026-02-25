/**
 * Google Photos OAuth Callback
 *
 * GET /api/admin/gallery/google-photos/callback
 *
 * Exchanges the authorization code for tokens, creates a shared Google Photos
 * album for the wedding, and redirects back to the configure page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  exchangeCodeForTokens,
  createAlbum,
  shareAlbum,
} from '@/lib/google-photos/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const configureUrl = `${appUrl}/admin/configure`;

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateRaw = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.warn('[GOOGLE_PHOTOS_CALLBACK] OAuth error:', error);
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=google_photos_denied`);
    }

    if (!code || !stateRaw) {
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=invalid_callback`);
    }

    // Decode state to get wedding_id
    let weddingId: string;
    try {
      const decoded = JSON.parse(Buffer.from(stateRaw, 'base64').toString('utf-8'));
      weddingId = decoded.wedding_id;
    } catch {
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=invalid_state`);
    }

    if (!weddingId) {
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=invalid_state`);
    }

    const redirectUri = `${appUrl}/api/admin/gallery/google-photos/callback`;

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if (!tokens.refresh_token) {
      // Shouldn't happen if we used prompt=consent, but guard anyway
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=no_refresh_token`);
    }

    // Fetch wedding to get couple names for album title
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { couple_names: true, google_photos_album_id: true },
    });

    if (!wedding) {
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=wedding_not_found`);
    }

    let albumId = wedding.google_photos_album_id;
    let albumUrl: string | undefined;
    let shareUrl: string | undefined;

    if (!albumId) {
      // Create a new shared album
      const albumTitle = `Boda ${wedding.couple_names}`;
      const album = await createAlbum(tokens.access_token, albumTitle);
      albumId = album.id;
      albumUrl = album.productUrl;

      // Share the album so anyone with the link can contribute
      const shareInfo = await shareAlbum(tokens.access_token, albumId);
      shareUrl = shareInfo?.shareableUrl;
    }

    // Persist tokens and album data
    await prisma.wedding.update({
      where: { id: weddingId },
      data: {
        google_photos_refresh_token: tokens.refresh_token,
        google_photos_access_token: tokens.access_token,
        google_photos_token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        google_photos_album_id: albumId,
        ...(albumUrl ? { google_photos_album_url: albumUrl } : {}),
        ...(shareUrl ? { google_photos_share_url: shareUrl } : {}),
      },
    });

    return NextResponse.redirect(`${configureUrl}?tab=gallery&success=google_photos_connected`);
  } catch (err) {
    console.error('[GOOGLE_PHOTOS_CALLBACK] Error:', err);
    return NextResponse.redirect(`${configureUrl}?tab=gallery&error=connection_failed`);
  }
}
