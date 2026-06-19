/**
 * Guest Iframe Proxy
 * GET /api/guest/[token]/iframe-proxy?url=<https-url>
 *
 * Fetches an external HTTPS page server-side and returns its HTML so the
 * browser can load it inside an <iframe> on the same origin as Nupci.
 * This bypasses X-Frame-Options restrictions set by external sites (e.g. Lovable).
 *
 * Security:
 * - Requires a valid magic token to prevent open-proxy abuse
 * - Only accepts https:// URLs
 * - 8-second fetch timeout
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateMagicLinkLite } from '@/lib/auth/magic-link';

const FETCH_TIMEOUT_MS = 8000;

function errorHtml(message: string): Response {
  return new Response(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;color:#6b7280;">
      <p>${message}</p>
    </body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const params = await context.params;
  const token = params.token;

  // Validate magic token
  const validation = await validateMagicLinkLite(token);
  if (!validation.valid) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  // Validate the target URL
  const rawUrl = request.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (targetUrl.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only https:// URLs are allowed' }, { status: 400 });
  }

  // Fetch the external page server-side
  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const externalResponse = await fetch(targetUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Nupci/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 300 } as any,
    });

    clearTimeout(timeout);

    if (!externalResponse.ok) {
      return errorHtml('The page could not be loaded.');
    }

    html = await externalResponse.text();
  } catch {
    return errorHtml('The page could not be reached.');
  }

  // Inject <base href="origin/"> so relative URLs (scripts, images, CSS) resolve correctly
  const baseTag = `<base href="${targetUrl.origin}/">`;
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (match) => `${match}${baseTag}`);
  } else {
    html = baseTag + html;
  }

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
