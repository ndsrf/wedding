/**
 * Planner Wedding Menu Selection Page
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { WeddingMenuSelector } from '@/components/admin/WeddingMenuSelector';
import type { TastingMenu } from '@/components/admin/TastingMenuEditor';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PrivateHeader from '@/components/PrivateHeader';

export default function PlannerMenuPage() {
  const params = useParams();
  const weddingId = params.id as string;
  const t = useTranslations('admin.menu');
  
  const [menu, setMenu] = useState<TastingMenu | null>(null);
  const [weddingName, setWeddingName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [menuRes, weddingRes] = await Promise.all([
          fetch(`/api/planner/weddings/${weddingId}/tasting`),
          fetch(`/api/planner/weddings/${weddingId}`)
        ]);
        
        const menuData = await menuRes.json();
        if (menuData.success) {
          setMenu(menuData.data);
        }

        const weddingData = await weddingRes.json();
        if (weddingData.success) {
          setWeddingName(weddingData.data?.couple_names ?? '');
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [weddingId]);

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

        <WeddingMenuSelector
          menu={menu}
          apiBase={`/api/planner/weddings/${weddingId}/tasting`}
          onMenuChange={setMenu}
          isLoading={loading}
        />
      </main>
    </div>
  );
}
