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
    response.cookies.set('NEXT_LOCALE', language, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
      // We don't set httpOnly to true because client-side might need to read it 
      // (though our LanguageSwitcher uses useLocale() so it doesn't strictly need to read the cookie).
      // But keeping it accessible is safer for now unless we confirm otherwise.
      // Actually, let's make it httpOnly: false explicitly to match previous behavior attempt.
      httpOnly: false, 
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
