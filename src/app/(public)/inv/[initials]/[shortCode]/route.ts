/**
 * /inv/[initials]/[shortCode] — invitation short-URL gateway
 *
 * Runs at the edge (zero cold start, ~50 ms globally).
 * Returns a self-contained HTML page with a pure-CSS spinner.
 * A tiny inline script fetches /api/inv/[initials]/[code] (serverless)
 * and redirects to /rsvp/TOKEN as soon as the token resolves.
 *
 * For social media crawlers (WhatsApp, Facebook, etc.) that need OG tags
 * to generate link previews, OG meta tags are fetched from the API and
 * embedded before returning. Crawlers don't care about latency.
 *
 * No React, no Next.js component tree — the edge bundle is tiny (<100 KB).
 */

export const runtime = 'edge';

const INITIALS_RE = /^[A-Z]{1,3}[a-zA-Z0-9]{1,4}$/;
const CODE_RE     = /^[a-zA-Z0-9]{5,6}$/;

// User-agent patterns for social media link-preview crawlers.
const CRAWLER_RE = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Applebot/i;

// Escape characters that are special inside an HTML attribute value.
function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/>/g, '&gt;');
}

// Pure-CSS replica of WeddingSpinner (lg variant) + rose gradient background.
// Kept inline so the page renders with zero external requests.
const HTML = (initials: string, code: string, ogImage?: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Loading…</title>${ogImage ? `
  <meta property="og:image" content="${escapeAttr(ogImage)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${escapeAttr(ogImage)}">` : ''}
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      min-height:100vh;
      display:flex;align-items:center;justify-content:center;
      background:linear-gradient(135deg,#fdf2f8 0%,#ffffff 50%,#fff1f2 100%);
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    }
    .wrap{text-align:center}
    .ring-wrap{
      position:relative;display:inline-flex;
      align-items:center;justify-content:center;
      margin-bottom:2rem;
    }
    .ring{
      width:64px;height:64px;border-radius:50%;
      border:4px solid #e5e7eb;border-top-color:#4b5563;
      animation:spin .8s linear infinite;
    }
    .initials{
      position:absolute;
      font-size:1rem;font-weight:600;
      color:#4b5563;letter-spacing:.1em;
    }
    @keyframes spin{to{transform:rotate(360deg)}}
    .msg{color:#9ca3af;font-size:1rem;font-weight:300}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="ring-wrap">
      <div class="ring"></div>
      <span class="initials">${initials}</span>
    </div>
    <p class="msg">Loading / Cargando / Caricamento / Laden / Chargement…</p>
  </div>
  <script>
    (function(){
      var i=${JSON.stringify(initials)}, c=${JSON.stringify(code)};
      fetch('/api/inv/'+encodeURIComponent(i)+'/'+encodeURIComponent(c))
        .then(function(r){return r.ok?r.json():Promise.reject(r.status)})
        .then(function(d){location.replace('/rsvp/'+d.token+location.search)})
        .catch(function(){location.replace('/')});
    })();
  </script>
</body>
</html>`;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ initials: string; shortCode: string }> },
) {
  const { initials, shortCode } = await params;

  if (!INITIALS_RE.test(initials) || !CODE_RE.test(shortCode)) {
    return new Response('Not found', { status: 404 });
  }

  // For social media crawlers, fetch the OG image URL so the preview renders.
  // Regular users get the spinner immediately without any extra round-trip.
  let ogImage: string | undefined;
  const ua = req.headers.get('user-agent') ?? '';
  if (CRAWLER_RE.test(ua)) {
    try {
      const apiUrl = new URL(
        `/api/inv/${encodeURIComponent(initials)}/${encodeURIComponent(shortCode)}?og=1`,
        req.url,
      );
      // 3-second timeout so a slow DB call never stalls the crawler indefinitely.
      const res = await fetch(apiUrl.toString(), { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json() as { og_image_url?: string };
        ogImage = data.og_image_url ?? undefined;
      }
    } catch {
      // OG image is best-effort — don't block the response
    }
  }

  return new Response(HTML(initials, shortCode, ogImage), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
