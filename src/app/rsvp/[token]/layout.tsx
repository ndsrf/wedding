import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { validateMagicLink } from '@/lib/auth/magic-link'
import { prisma } from '@/lib/db/prisma'
import './fonts.css'

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

  const title = `${validation.wedding.couple_names} - RSVP`
  const description = `RSVP for the wedding of ${validation.wedding.couple_names}`

  // Fetch the first MessageTemplate with an image for this wedding (prefer INVITATION)
  const template = await prisma.messageTemplate.findFirst({
    where: {
      wedding_id: validation.wedding.id,
      image_url: { not: null },
      type: 'INVITATION',
    },
    select: { image_url: true },
  }) ?? await prisma.messageTemplate.findFirst({
    where: {
      wedding_id: validation.wedding.id,
      image_url: { not: null },
    },
    select: { image_url: true },
  })

  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  const ogImage = template?.image_url ? `${appUrl}${template.image_url}` : undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
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
