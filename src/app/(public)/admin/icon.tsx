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

function renderIcon(initials: string, background: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background,
          color: 'white',
          borderRadius: '50%',
          fontSize: 14,
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}
      >
        {initials}
      </div>
    ),
    { ...size }
  )
}

export default async function Icon() {
  let initials = 'W'; // Default

  try {
    const session = await auth()

    if (session?.user?.wedding_id) {
      const weddingId = session.user.wedding_id;
      const cacheKey = CACHE_KEYS.adminIcon(weddingId);
      const cached = await getCached<string>(cacheKey);

      if (cached) {
        return new Response(Buffer.from(cached, 'base64'), {
          headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=604800' },
        });
      }

      const wedding = await prisma.wedding.findUnique({
        where: { id: weddingId },
        select: { couple_names: true }
      });

      if (wedding?.couple_names) {
        const names = wedding.couple_names;
        const words = names
          .replace(/\s+(&|and|y|et)\s+/i, ' ')
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 0);

        if (words.length >= 2) {
          initials = (words[0][0] + words[1][0]).toUpperCase();
        } else if (words.length === 1) {
          initials = words[0].substring(0, 2).toUpperCase();
        }
      }

      const imageResponse = renderIcon(initials, '#4f46e5');
      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      await setCached(cacheKey, buffer.toString('base64'), CACHE_TTL.ICON);

      return new Response(buffer, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=604800' },
      });
    }

    return renderIcon(initials, '#4f46e5');
  } catch (e) {
    console.error('Error generating admin icon:', e)
  }

  // Fallback
  return renderIcon(initials, '#9ca3af');
}
