'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import LanguageSelector from '@/components/LanguageSelector';

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const t = useTranslations();
  const isE2E = process.env.NEXT_PUBLIC_IS_E2E === 'true';
  const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'Unauthorized':
        return t('auth.error.unauthorized');
      case 'PlannerDisabled':
        return t('auth.error.planner_disabled');
      case 'AccessDenied':
        return t('auth.error.access_denied');
      case 'Configuration':
        return t('auth.error.configuration');
      case 'Verification':
        return t('auth.error.verification');
      case 'OAuthSignin':
      case 'OAuthCallback':
      case 'OAuthCreateAccount':
      case 'EmailCreateAccount':
      case 'Callback':
      case 'OAuthAccountNotLinked':
      case 'EmailSignin':
      case 'CredentialsSignin':
      case 'SessionRequired':
        return t('auth.error.default');
      default:
        return error;
    }
  };

  const handleSignIn = async (provider: string) => {
    setIsLoading(provider);
    try {
      if (provider === 'e2e-bypass') {
        await signIn('e2e-bypass', { email, callbackUrl });
      } else {
        await signIn(provider, { callbackUrl });
      }
    } catch (error) {
      console.error('Sign-in error:', error);
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Image src="/images/nupci.webp" alt={commercialName} width={400} height={160} className="h-32 w-auto" />
            </Link>
            <div className="flex items-center gap-4">
              <LanguageSelector />
              <Link
                href="/"
                className="px-6 py-2 bg-white text-rose-600 rounded-full border-2 border-rose-300 hover:border-rose-500 transition-all shadow-md hover:shadow-lg font-semibold"
              >
                {t('common.navigation.home')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Sign In Form */}
      <div className="flex items-center justify-center min-h-screen pt-16">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('auth.signin.subtitle')}
            </h2>
          </div>

        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
            <span className="font-medium">{t('common.error')}:</span> {getErrorMessage(error)}
          </div>
        )}

        <div className="space-y-4">
          {isE2E && (
            <div className="p-4 border-2 border-dashed border-amber-300 rounded-lg bg-amber-50 mb-6">
              <h2 className="text-sm font-semibold text-amber-800 mb-3 uppercase tracking-wider">
                E2E Testing Bypass
              </h2>
              <div className="space-y-3">
                <div>
                  <label htmlFor="e2e-email" className="block text-xs font-medium text-amber-700 mb-1">
                    Enter Email for E2E Login
                  </label>
                  <input
                    id="e2e-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="planner@example.com"
                    className="w-full px-3 py-2 border border-amber-300 rounded text-sm focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <button
                  onClick={() => handleSignIn('e2e-bypass')}
                  disabled={isLoading !== null || !email}
                  className="w-full py-2 bg-amber-600 text-white rounded font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {isLoading === 'e2e-bypass' ? 'Authenticating...' : 'Sign In as E2E User'}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => handleSignIn('google')}
            disabled={isLoading !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading === 'google' ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span className="text-gray-700 font-medium">
              {t('auth.signin.google')}
            </span>
          </button>

          <button
            onClick={() => handleSignIn('facebook')}
            disabled={isLoading !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading === 'facebook' ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            )}
            <span className="text-gray-700 font-medium">
              {t('auth.signin.facebook')}
            </span>
          </button>

          <button
            onClick={() => handleSignIn('apple')}
            disabled={isLoading !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading === 'apple' ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
            )}
            <span className="text-gray-700 font-medium">
              {t('auth.signin.apple')}
            </span>
          </button>
        </div>

          <div className="text-center text-sm text-gray-500">
            <p>{t('auth.signin.footer')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  const t = useTranslations();
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-pink-50">
        <div className="text-gray-600">{t('common.loading')}</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}