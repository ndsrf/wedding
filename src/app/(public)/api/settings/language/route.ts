import { NextRequest, NextResponse } from 'next/server';
import { isValidLanguage } from '@/lib/i18n/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { language } = body;

    if (!language || !isValidLanguage(language)) {
      return NextResponse.json(
        { success: false, error: 'Invalid language' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true, language });

    // Set the cookie
    // httpOnly: true - next-intl reads NEXT_LOCALE server-side only; no client JS needs direct cookie access
    // secure: true in production - ensures cookie is only sent over HTTPS
    response.cookies.set('NEXT_LOCALE', language, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('Error setting language:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
