#!/usr/bin/env node
/**
 * One-time helper to obtain a Spotify SPOTIFY_REFRESH_TOKEN for the Nupci
 * service account (see README.md → "Spotify Integration").
 *
 * Does the whole Authorization Code exchange for you — builds the authorize
 * URL with correct encoding, and parses the `code` out of whatever URL you
 * paste back (so it doesn't matter if the landing page appends its own
 * tracking query params, or if you paste the full URL instead of just the
 * code). No manual curl / base64 / URL-encoding required.
 *
 * Usage:
 *   node scripts/spotify-get-refresh-token.mjs
 */

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const SCOPES = 'playlist-modify-public ugc-image-upload';

const rl = createInterface({ input: stdin, output: stdout });
const ask = (question) => rl.question(question);

function extractCode(pasted) {
  const trimmed = pasted.trim();
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get('code');
    if (code) return code;
  } catch {
    // Not a URL — maybe they pasted just the code itself.
  }
  // Fall back to treating it as a raw code, but strip anything from the
  // first "&" onward in case they copied a partial query string.
  return trimmed.split('&')[0].replace(/^code=/, '');
}

async function main() {
  console.log('— Spotify refresh token setup —\n');

  const clientId = (await ask('Spotify Client ID: ')).trim();
  const clientSecret = (await ask('Spotify Client Secret: ')).trim();
  const redirectUri = (
    (await ask('Redirect URI [http://localhost:8888/callback]: ')).trim() ||
    'http://localhost:8888/callback'
  );

  if (!clientId || !clientSecret) {
    console.error('\nClient ID and Client Secret are required.');
    process.exitCode = 1;
    return;
  }

  console.log(
    '\n⚠️  This Redirect URI must be listed exactly (character for character) ' +
    'under "Redirect URIs" in the app\'s Settings on the Spotify Developer Dashboard.\n'
  );

  const authorizeUrl = new URL('https://accounts.spotify.com/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', SCOPES);

  console.log('1. Open this URL in a browser, logged in as the Spotify account');
  console.log('   Nupci should own the wedding playlists with:\n');
  console.log(`   ${authorizeUrl.toString()}\n`);
  console.log('2. Click "Agree".');
  console.log('3. You will be redirected — the page itself may fail to load, that\'s fine.');
  console.log('   Copy the FULL URL from the browser\'s address bar (not just the code).\n');

  const pasted = await ask('Paste the redirected URL here: ');
  const code = extractCode(pasted);

  if (!code) {
    console.error('\nCould not find a "code" in what you pasted. Try again.');
    process.exitCode = 1;
    return;
  }

  console.log('\nExchanging code for tokens...');

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${basicAuth}` },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenBody = await tokenRes.json().catch(() => null);

  if (!tokenRes.ok || !tokenBody?.refresh_token) {
    console.error(`\n❌ Token exchange failed (HTTP ${tokenRes.status}):`);
    console.error(JSON.stringify(tokenBody, null, 2));
    console.error(
      '\nMost common cause: the redirect_uri above does not exactly match ' +
      'what\'s registered in the Spotify app settings, or the code already ' +
      'expired/was used (codes are single-use, ~10 minute lifetime — re-run ' +
      'this script to get a fresh one).'
    );
    process.exitCode = 1;
    return;
  }

  console.log('\n✅ Success. Add this to your .env:\n');
  console.log(`SPOTIFY_CLIENT_ID=${clientId}`);
  console.log(`SPOTIFY_CLIENT_SECRET=${clientSecret}`);
  console.log(`SPOTIFY_REFRESH_TOKEN=${tokenBody.refresh_token}`);

  const meRes = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${tokenBody.access_token}` },
  });
  const me = await meRes.json().catch(() => null);
  if (meRes.ok && me?.id) {
    console.log(`SPOTIFY_USER_ID=${me.id}  # optional, saves one API call per sync run`);
  }

  console.log(
    '\nKeep the client secret and refresh token private — treat them like ' +
    'passwords, and rotate them in the Spotify Dashboard if they ever leak.'
  );
}

main().finally(() => rl.close());
