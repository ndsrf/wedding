/**
 * Checklist Page — Shared Content Component
 *
 * Used by both /admin/checklist and /planner/weddings/[id]/checklist.
 * ChecklistEditor uses /api/admin/checklist which is accessible by both roles
 * via the SHARED_ROUTES middleware mechanism.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import { ChecklistEditor } from '@/components/admin/ChecklistEditor';

export interface ChecklistPageContentProps {
  weddingId: string;
  isReadOnly: boolean;
  header: React.ReactNode;
}

export function ChecklistPageContent({ weddingId, isReadOnly, header }: ChecklistPageContentProps) {
  return (
    <div className="min-h-screen">
      {header}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ChecklistEditor weddingId={weddingId} readOnly={isReadOnly} />
      </main>
    </div>
  );
}
