import { NextRequest, NextResponse } from 'next/server';
import { resolveShortUrl } from '@/lib/short-url';

const INITIALS_RE = /^[A-Z]{1,3}[a-zA-Z0-9]{1,4}$/;
const CODE_RE     = /^[a-zA-Z0-9]{5,6}$/;

export async function GET(
  _req: NextRequest,
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

  return NextResponse.json({ token });
}
