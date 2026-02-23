import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidLanguage } from '@/lib/i18n/config';

export async function POST(request: NextRequest) {
  try {
    const { locale } = await request.json();

    if (!locale || !isValidLanguage(locale)) {
      return NextResponse.json(
        { error: 'Invalid locale' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set('NEXT_LOCALE', locale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting locale:', error);
    return NextResponse.json(
      { error: 'Failed to set locale' },
      { status: 500 }
    );
  }
}
