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
      console.warn('[GOOGLE_PHOTOS_CALLBACK] OAuth error from Google:', error);
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=google_photos_denied`);
    }

    if (!code || !stateRaw) {
      console.warn('[GOOGLE_PHOTOS_CALLBACK] Missing code or state in callback');
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=invalid_callback`);
    }

    // Decode state to get wedding_id
    let weddingId: string;
    try {
      const decoded = JSON.parse(Buffer.from(stateRaw, 'base64').toString('utf-8'));
      weddingId = decoded.wedding_id;
    } catch {
      console.warn('[GOOGLE_PHOTOS_CALLBACK] Failed to decode state parameter');
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=invalid_state`);
    }

    if (!weddingId) {
      console.warn('[GOOGLE_PHOTOS_CALLBACK] No wedding_id in state');
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=invalid_state`);
    }

    const redirectUri = `${appUrl}/api/admin/gallery/google-photos/callback`;
    console.log('[GOOGLE_PHOTOS_CALLBACK] Exchanging code for tokens, redirectUri:', redirectUri);

    // Exchange code for tokens
    let tokens;
    try {
      tokens = await exchangeCodeForTokens(code, redirectUri);
    } catch (tokenErr) {
      console.error('[GOOGLE_PHOTOS_CALLBACK] Token exchange failed:', tokenErr);
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=token_exchange_failed`);
    }

    if (!tokens.refresh_token) {
      // Shouldn't happen if we used prompt=consent, but guard anyway
      console.warn('[GOOGLE_PHOTOS_CALLBACK] No refresh_token in response');
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=no_refresh_token`);
    }

    // Fetch wedding to get couple names for album title
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { couple_names: true, google_photos_album_id: true },
    });

    if (!wedding) {
      console.warn('[GOOGLE_PHOTOS_CALLBACK] Wedding not found:', weddingId);
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=wedding_not_found`);
    }

    let albumId = wedding.google_photos_album_id;
    let albumUrl: string | undefined;
    let shareUrl: string | undefined;

    if (!albumId) {
      // Attempt to create a shared album. The Google Photos Library API was
      // deprecated and shut down on March 31 2025, so these calls may fail.
      // We treat album creation as non-fatal: tokens are saved regardless so
      // the account is considered connected even without an album.
      try {
        const albumTitle = `Boda ${wedding.couple_names}`;
        console.log('[GOOGLE_PHOTOS_CALLBACK] Creating album:', albumTitle);
        const album = await createAlbum(tokens.access_token, albumTitle);
        albumId = album.id;
        albumUrl = album.productUrl;

        // Share the album so anyone with the link can contribute
        const shareInfo = await shareAlbum(tokens.access_token, albumId);
        shareUrl = shareInfo?.shareableUrl;
        console.log('[GOOGLE_PHOTOS_CALLBACK] Album created and shared:', albumId);
      } catch (albumErr) {
        console.warn(
          '[GOOGLE_PHOTOS_CALLBACK] Album creation/sharing failed (Google Photos Library API may be deprecated):',
          albumErr
        );
        // Continue — tokens are still valid and will be persisted
      }
    }

    // Persist tokens and album data (album fields may be null if creation failed)
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

    console.log('[GOOGLE_PHOTOS_CALLBACK] Successfully connected Google Photos for wedding:', weddingId);
    return NextResponse.redirect(`${configureUrl}?tab=gallery&success=google_photos_connected`);
  } catch (err) {
    console.error('[GOOGLE_PHOTOS_CALLBACK] Unexpected error:', err);
    return NextResponse.redirect(`${configureUrl}?tab=gallery&error=connection_failed`);
  }
}
