import { Metadata } from 'next';
import { generateAMPMetadata } from '@/lib/amp';
import { getTranslations } from '@/lib/i18n/server';
import { Language } from '@/lib/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await getTranslations(locale as Language);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nupci.com';

  return generateAMPMetadata({
    canonical: `${baseUrl}/${locale}/contact`,
    title: t('contact.title'),
    description: t('contact.subtitle'),
    type: 'website',
  });
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}