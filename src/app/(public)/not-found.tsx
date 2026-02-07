// src/app/not-found.tsx
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('common.errors');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-red-600 text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {t('notFound')}
        </h1>
      </div>
    </div>
  );
}
