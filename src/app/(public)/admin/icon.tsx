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
  let initials = 'W'; // Default
  
  try {
    const session = await auth()
    
    if (session?.user?.wedding_id) {
      const wedding = await prisma.wedding.findUnique({
        where: { id: session.user.wedding_id },
        select: { couple_names: true }
      });
      
      if (wedding?.couple_names) {
        const names = wedding.couple_names;
        // Clean up
        const words = names
          .replace(/\s+(&|and|y|et)\s+/i, ' ') // replace connector words with space
          .replace(/[^a-zA-Z0-9\s]/g, '') // remove special chars
          .split(/\s+/)
          .filter(w => w.length > 0);
          
        if (words.length >= 2) {
          initials = (words[0][0] + words[1][0]).toUpperCase();
        } else if (words.length === 1) {
          initials = words[0].substring(0, 2).toUpperCase();
        }
      }
    }
    
    // If we have a session but no wedding_id (e.g. planner accessing admin routes? unlikely given the structure),
    // or if we found the wedding, we return the custom icon.
    
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#4f46e5', // Indigo-600
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

  } catch (e) {
    console.error('Error generating admin icon:', e)
  }

  // Fallback
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#9ca3af', // gray-400
          color: 'white',
          borderRadius: '50%',
          fontSize: 16,
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
