/**
 * Google Photos OAuth Callback
 *
 * GET /api/admin/gallery/google-photos/callback
 *
 * Handles the redirect from Google after the user grants permission.
 * Exchanges the auth code for tokens, creates a wedding album, and persists
 * everything to the wedding record.
 *
 * Note: the sharing scope was removed by Google on April 1 2025.
 * We use appendonly + readonly.appcreateddata instead.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { exchangeCodeForTokens, createAlbum } from '@/lib/google-photos/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const configureUrl = `${appUrl}/admin/configure`;

  try {
    const { searchParams } = new URL(request.url);
    const error = searchParams.get('error');

    if (error) {
      console.warn('[GOOGLE_PHOTOS_CALLBACK] OAuth error from Google:', error);
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=google_photos_denied`);
    }

    const code = searchParams.get('code');
    const stateRaw = searchParams.get('state');

    if (!code || !stateRaw) {
      console.warn('[GOOGLE_PHOTOS_CALLBACK] Missing code or state');
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=invalid_callback`);
    }

    let weddingId: string | undefined;
    try {
      const decoded = JSON.parse(Buffer.from(stateRaw, 'base64').toString('utf-8'));
      weddingId = decoded.wedding_id;
    } catch {
      console.warn('[GOOGLE_PHOTOS_CALLBACK] Failed to decode state');
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=invalid_state`);
    }

    if (!weddingId) {
      console.warn('[GOOGLE_PHOTOS_CALLBACK] No wedding_id in state');
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=invalid_state`);
    }

    const redirectUri = `${appUrl}/api/admin/gallery/google-photos/callback`;
    console.log('[GOOGLE_PHOTOS_CALLBACK] Exchanging code for tokens');

    let tokens;
    try {
      tokens = await exchangeCodeForTokens(code, redirectUri);
    } catch (err) {
      console.error('[GOOGLE_PHOTOS_CALLBACK] Token exchange failed:', err);
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=token_exchange_failed`);
    }

    if (!tokens.refresh_token) {
      console.warn('[GOOGLE_PHOTOS_CALLBACK] No refresh_token in response');
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=no_refresh_token`);
    }

    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { id: true, couple_names: true, google_photos_album_id: true },
    });

    if (!wedding) {
      console.warn('[GOOGLE_PHOTOS_CALLBACK] Wedding not found:', weddingId);
      return NextResponse.redirect(`${configureUrl}?tab=gallery&error=wedding_not_found`);
    }

    // Reuse existing album if already created; otherwise create a new one
    let albumId = wedding.google_photos_album_id ?? null;

    if (!albumId) {
      try {
        const albumTitle = `Boda ${wedding.couple_names}`;
        console.log('[GOOGLE_PHOTOS_CALLBACK] Creating album:', albumTitle);
        const album = await createAlbum(tokens.access_token, albumTitle);
        albumId = album.id;
        console.log('[GOOGLE_PHOTOS_CALLBACK] Album created:', albumId);
      } catch (albumErr) {
        // Album creation failure is non-fatal — tokens are still valid
        console.warn('[GOOGLE_PHOTOS_CALLBACK] Album creation failed:', albumErr);
      }
    }

    await prisma.wedding.update({
      where: { id: weddingId },
      data: {
        google_photos_access_token: tokens.access_token,
        google_photos_refresh_token: tokens.refresh_token,
        google_photos_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        ...(albumId ? { google_photos_album_id: albumId } : {}),
      },
    });

    console.log('[GOOGLE_PHOTOS_CALLBACK] Connected successfully for wedding:', weddingId);
    return NextResponse.redirect(`${configureUrl}?tab=gallery&connected=true`);
  } catch (err) {
    console.error('[GOOGLE_PHOTOS_CALLBACK] Unexpected error:', err);
    return NextResponse.redirect(`${configureUrl}?tab=gallery&error=connection_failed`);
  }
}
