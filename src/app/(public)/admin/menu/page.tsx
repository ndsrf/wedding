/**
 * Admin Wedding Menu Selection Page
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { WeddingMenuSelector } from '@/components/admin/WeddingMenuSelector';
import type { TastingMenu } from '@/components/admin/TastingMenuEditor';
import Link from 'next/link';
import PrivateHeader from '@/components/PrivateHeader';

export default function AdminMenuPage() {
  const t = useTranslations('admin.menu');
  
  const [menu, setMenu] = useState<TastingMenu | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch('/api/admin/tasting');
        const data = await res.json();
        if (data.success) {
          setMenu(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch menu:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <PrivateHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700 mr-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🍽️ {t('title')}</h1>
            <p className="mt-1 text-sm text-gray-500">{t('description')}</p>
          </div>
        </div>

        <WeddingMenuSelector
          menu={menu}
          apiBase="/api/admin/tasting"
          onMenuChange={setMenu}
          isLoading={loading}
        />
      </main>
    </div>
  );
}
