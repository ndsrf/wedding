/**
 * Planner - Tasting Menu Page
 * /planner/weddings/[id]/tasting
 *
 * Planner view of the tasting menu management for a specific wedding.
 */

'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Language } from '@prisma/client';
import PrivateHeader from '@/components/PrivateHeader';
import { TastingMenuEditor, type TastingMenu } from '@/components/admin/TastingMenuEditor';
import { TastingParticipantManager, type TastingParticipant } from '@/components/admin/TastingParticipantManager';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

type Tab = 'menu' | 'participants';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PlannerTastingPage({ params }: PageProps) {
  const { id: weddingId } = use(params);
  const t = useTranslations('admin.tastingMenu');
  const { status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('menu');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weddingName, setWeddingName] = useState('');

  const [menu, setMenu] = useState<TastingMenu | null>(null);
  const [participants, setParticipants] = useState<TastingParticipant[]>([]);
  const [weddingLanguage, setWeddingLanguage] = useState<Language>('ES');

  const apiBase = `/api/planner/weddings/${weddingId}/tasting`;

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [menuRes, weddingRes] = await Promise.all([
        fetch(apiBase),
        fetch(`/api/planner/weddings/${weddingId}`),
      ]);

      if (menuRes.ok) {
        const menuData = await menuRes.json();
        if (menuData.success && menuData.data) {
          const { sections, participants: p, ...rest } = menuData.data;
          setMenu({ ...rest, sections: sections ?? [] });
          setParticipants(p ?? []);
        }
        if (menuData.wedding_language) setWeddingLanguage(menuData.wedding_language as Language);
      }

      if (weddingRes.ok) {
        const weddingData = await weddingRes.json();
        if (weddingData.success) {
          setWeddingName(weddingData.data?.couple_names ?? '');
        }
      }
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }, [apiBase, weddingId, t]);

  useEffect(() => {
    if (status === 'authenticated') fetchData();
  }, [status, fetchData]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'menu', label: t('tabs.menu') },
    { id: 'participants', label: `${t('tabs.participants')} (${participants.length})` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <PrivateHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href={`/planner/weddings/${weddingId}`} className="text-gray-500 hover:text-gray-700 mr-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🍽️ {t('title')}</h1>
            {weddingName && <p className="mt-0.5 text-sm text-gray-500">{weddingName}</p>}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-rose-500 text-rose-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><WeddingSpinner /></div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button onClick={fetchData} className="mt-4 text-sm text-rose-600 underline">Retry</button>
          </div>
        ) : (
          <>
            {activeTab === 'menu' && (
              <TastingMenuEditor
                menu={menu}
                apiBase={apiBase}
                onMenuChange={setMenu}
              />
            )}

            {activeTab === 'participants' && (
              <TastingParticipantManager
                participants={participants}
                apiBase={apiBase}
                onParticipantsChange={setParticipants}
                weddingLanguage={weddingLanguage}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
