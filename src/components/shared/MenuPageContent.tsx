/**
 * Shared Menu Page Content
 *
 * Used by both the Wedding Admin (/admin/menu) and Wedding Planner
 * (/planner/weddings/[id]/menu) routes. All API paths and role-specific
 * configuration are injected via props — this component is role-agnostic.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { WeddingMenuSelector } from '@/components/admin/WeddingMenuSelector';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import type { TastingMenu } from '@/components/admin/TastingMenuEditor';

// ─── PDF Download Button ──────────────────────────────────────────────────────

function MenuPdfButton({ url }: { url: string }) {
  const t = useTranslations('admin.tastingMenu');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('failed');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = 'wedding-menu.pdf';
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors shadow-sm"
      >
        {loading ? (
          <WeddingSpinner size="sm" />
        ) : (
          <svg className="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
        )}
        {t('pdf.weddingMenu')}
      </button>
      {error && <p className="text-xs text-red-500">{t('pdf.error')}</p>}
    </div>
  );
}

// ============================================================================
// TYPES
// ============================================================================

interface MenuApiPaths {
  /**
   * Base URL for the tasting API.
   * Admin:   '/api/admin/tasting'
   * Planner: '/api/planner/weddings/:id/tasting'
   */
  apiBase: string;
}

interface MenuPageContentProps {
  apiPaths: MenuApiPaths;
  isReadOnly: boolean;
  /**
   * Role-specific page header (navigation + title).
   * Admin: <PrivateHeader> | Planner: breadcrumb back to wedding detail.
   */
  header: React.ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MenuPageContent({ apiPaths, isReadOnly: _isReadOnly, header }: MenuPageContentProps) {
  const [menu, setMenu] = useState<TastingMenu | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch(apiPaths.apiBase);
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
  }, [apiPaths.apiBase]);

  return (
    <div className="min-h-screen bg-gray-50">
      {header}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!loading && menu && (
          <div className="flex justify-end mb-4">
            <MenuPdfButton url={`${apiPaths.apiBase}/menu/pdf`} />
          </div>
        )}
        <WeddingMenuSelector
          menu={menu}
          apiBase={apiPaths.apiBase}
          onMenuChange={setMenu}
          isLoading={loading}
        />
      </main>
    </div>
  );
}
