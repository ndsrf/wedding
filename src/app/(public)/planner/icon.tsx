import { ImageResponse } from 'next/og'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

function fallbackIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: '#fff',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '20%',
          border: '1px solid #e5e7eb',
        }}
      >
        📋
      </div>
    ),
    { ...size }
  )
}

export default async function Icon() {
  try {
    const session = await auth()

    if (session?.user?.planner_id) {
      const plannerId = session.user.planner_id;
      const cacheKey = CACHE_KEYS.plannerIcon(plannerId);
      const cached = await getCached<string>(cacheKey);

      if (cached) {
        return new Response(Buffer.from(cached, 'base64'), {
          headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=3600' },
        });
      }

      const planner = await prisma.weddingPlanner.findUnique({
        where: { id: plannerId },
        select: { logo_url: true }
      });
      const logoUrl = planner?.logo_url || null;

      let imageResponse: ImageResponse;
      if (logoUrl) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const fullLogoUrl = logoUrl.startsWith('http') ? logoUrl : `${appUrl}${logoUrl}`;

        imageResponse = new ImageResponse(
          (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'white',
                borderRadius: '20%',
                overflow: 'hidden',
              }}
            >
              { }
              <img
                src={fullLogoUrl}
                alt="Planner Logo"
                width="32"
                height="32"
                style={{
                  objectFit: 'contain',
                  width: '100%',
                  height: '100%'
                }}
              />
            </div>
          ),
          { ...size }
        );
      } else {
        imageResponse = fallbackIcon();
      }

      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      await setCached(cacheKey, buffer.toString('base64'), CACHE_TTL.ICON_DYNAMIC);

      return new Response(buffer, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=3600' },
      });
    }
  } catch (e) {
    console.error('Error generating planner icon:', e)
  }

  return fallbackIcon();
}
