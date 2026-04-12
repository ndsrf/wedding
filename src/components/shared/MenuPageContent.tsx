/**
 * Shared Menu Page Content
 *
 * Used by both the Wedding Admin (/admin/menu) and Wedding Planner
 * (/planner/weddings/[id]/menu) routes. All API paths and role-specific
 * configuration are injected via props — this component is role-agnostic.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { WeddingMenuSelector } from '@/components/admin/WeddingMenuSelector';
import type { TastingMenu } from '@/components/admin/TastingMenuEditor';

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
   */
  header: React.ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MenuPageContent({ apiPaths, isReadOnly: _isReadOnly, header }: MenuPageContentProps) {
  const [allMenus, setAllMenus] = useState<TastingMenu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMenus() {
      try {
        // Fetch all rounds
        const roundsRes = await fetch(`${apiPaths.apiBase}/rounds`);
        const roundsData = await roundsRes.json();
        const rounds: Array<{ id: string }> = roundsData.success ? (roundsData.data ?? []) : [];

        if (rounds.length === 0) {
          // No rounds yet — fall back to the single menu endpoint
          const res = await fetch(apiPaths.apiBase);
          const data = await res.json();
          if (data.success && data.data) {
            setAllMenus([data.data]);
          }
          return;
        }

        // Fetch full data for every round in parallel
        const menus = await Promise.all(
          rounds.map(async (r) => {
            const res = await fetch(`${apiPaths.apiBase}?menuId=${r.id}`);
            const data = await res.json();
            return data.success ? data.data : null;
          })
        );
        setAllMenus(menus.filter(Boolean));
      } catch (err) {
        console.error('Failed to fetch menus:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMenus();
  }, [apiPaths.apiBase]);

  // The primary menu (first round) is used for mutation operations
  const primaryMenu = allMenus[0] ?? null;

  const handleMenuChange = (updated: TastingMenu) => {
    setAllMenus(prev => prev.map(m => m.id === updated.id ? updated : m));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {header}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WeddingMenuSelector
          allMenus={allMenus}
          primaryMenu={primaryMenu}
          apiBase={apiPaths.apiBase}
          onMenuChange={handleMenuChange}
          isLoading={loading}
          pdfUrl={primaryMenu ? `${apiPaths.apiBase}/menu/pdf` : undefined}
        />
      </main>
    </div>
  );
}
