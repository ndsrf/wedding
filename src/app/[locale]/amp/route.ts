import { NextRequest, NextResponse } from 'next/server';
import { isValidLanguage } from '@/lib/i18n/config';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;

  if (!isValidLanguage(locale)) {
    return new NextResponse('Invalid language', { status: 404 });
  }

  return NextResponse.redirect(new URL(`/${locale}`, _request.url), 301);
}
