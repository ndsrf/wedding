import { ImageResponse } from 'next/og'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default async function Icon() {
  try {
    const session = await auth()
    
    let logoUrl: string | null = null;

    if (session?.user?.planner_id) {
      const planner = await prisma.weddingPlanner.findUnique({
        where: { id: session.user.planner_id },
        select: { logo_url: true }
      });
      logoUrl = planner?.logo_url || null;
    }

    if (logoUrl) {
      // Ensure URL is absolute for ImageResponse
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const fullLogoUrl = logoUrl.startsWith('http') ? logoUrl : `${appUrl}${logoUrl}`;

      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'white',
              borderRadius: '20%', // Slight rounding
              overflow: 'hidden',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
      )
    }
  } catch (e) {
    console.error('Error generating planner icon:', e)
  }

  // Fallback
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
