import { getTranslations } from 'next-intl/server';

export default async function Home() {
  const t = await getTranslations('landing');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {t('title')}
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          {t('subtitle')}
        </p>
        <div className="space-y-4">
          <div className="text-sm text-gray-500">
            <p>{t('description.p1')}</p>
            <p>{t('description.p2')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}