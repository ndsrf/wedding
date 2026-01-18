import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { validateMagicLink } from '@/lib/auth/magic-link'

type Props = {
  children: React.ReactNode
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const validation = await validateMagicLink(token)

  if (!validation.valid || !validation.wedding) {
    return {
      title: 'Wedding RSVP',
    }
  }

  return {
    title: `${validation.wedding.couple_names} - RSVP`,
    description: `RSVP for the wedding of ${validation.wedding.couple_names}`,
  }
}

export default async function RSVPLayout({ children, params }: Props) {
  const { token } = await params
  const validation = await validateMagicLink(token)

  if (!validation.valid) {
    notFound()
  }

  // We could potentially set the locale here if we had a way to influence the request context,
  // but for now we rely on the client-side sync or URL param which is handled by next-intl.
  
  return (
    <div className="rsvp-layout">
      {children}
    </div>
  )
}
