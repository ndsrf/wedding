import { NextRequest, NextResponse } from 'next/server';
import { resolveShortUrl } from '@/lib/short-url';
import { prisma } from '@/lib/db/prisma';
import { toAbsoluteUrl } from '@/lib/images/url-utils';

const INITIALS_RE = /^[A-Z]{1,3}[a-zA-Z0-9]{1,4}$/;
const CODE_RE     = /^[a-zA-Z0-9]{5,6}$/;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ initials: string; code: string }> },
) {
  const { initials, code } = await params;

  if (!INITIALS_RE.test(initials) || !CODE_RE.test(code)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const token = await resolveShortUrl(initials, code);
  if (!token) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // ?og=1: also return the wedding's invitation image URL for OG meta tags.
  // Only called by the /inv edge route when serving social media crawlers.
  if (req.nextUrl.searchParams.get('og') === '1') {
    const family = await prisma.family.findFirst({
      where: { magic_token: token },
      select: {
        wedding: {
          select: {
            message_templates: {
              where: { image_url: { not: null }, type: 'INVITATION' },
              select: { image_url: true },
              take: 1,
              orderBy: { created_at: 'asc' },
            },
          },
        },
      },
    });
    const imageUrl = family?.wedding?.message_templates?.[0]?.image_url ?? null;
    const ogImageUrl = toAbsoluteUrl(imageUrl) ?? null;
    // Cache for 1 hour — the invitation image almost never changes.
    return NextResponse.json({ token, og_image_url: ogImageUrl }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  }

  return NextResponse.json({ token });
}
