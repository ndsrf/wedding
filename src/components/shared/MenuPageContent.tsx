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
