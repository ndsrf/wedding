'use client';

import { signOut } from 'next-auth/react';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function SignOutPage() {
  const t = useTranslations();

  useEffect(() => {
    signOut({ callbackUrl: '/auth/signin', redirect: true });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
          <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('auth.signout.title')}
        </h1>
        <p className="text-gray-600">
          {t('auth.signout.subtitle')}
        </p>
      </div>
    </div>
  );
}