import { ImageResponse } from 'next/og';
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';

// This icon is for the root landing page and public pages
// Route-specific icons (admin, planner, rsvp, master) will override this

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';
export const runtime = 'nodejs';

const ICON_CACHE_CONTROL = `public, max-age=${CACHE_TTL.ICON}`;

export default async function Icon() {
  const cacheKey = CACHE_KEYS.localeIcon();
  const cached = await getCached<string>(cacheKey);

  if (cached) {
    return new Response(Buffer.from(cached, 'base64'), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': ICON_CACHE_CONTROL },
    });
  }

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
        }}
      >
        {/* Two interlocking rings - rose icon */}
        <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
          <circle cx="24" cy="32" r="14" stroke="#D97D7D" strokeWidth="5" fill="none"/>
          <circle cx="40" cy="32" r="14" stroke="#C98686" strokeWidth="5" fill="none"/>
        </svg>
      </div>
    ),
    { ...size }
  );

  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  await setCached(cacheKey, buffer.toString('base64'), CACHE_TTL.ICON);

  return new Response(buffer, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': ICON_CACHE_CONTROL },
  });
}
