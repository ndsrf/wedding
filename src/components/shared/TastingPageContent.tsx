'use client';

/**
 * Shared Tasting Page Content
 *
 * Renders the full tasting management UI (menu editor + participant manager)
 * for both the admin (/admin/tasting) and planner (/planner/weddings/[id]/tasting) views.
 *
 * The only differences between contexts are passed as props:
 *   - apiBase   : the API root for this session (admin vs planner URL)
 *   - backHref  : where the ← back link points
 *   - subtitle  : text shown beneath the title (admin: description, planner: couple names)
 *   - isReadOnly: whether mutations are disabled (admin context only)
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Language } from '@prisma/client';
import PrivateHeader from '@/components/PrivateHeader';
import { TastingMenuEditor, type TastingMenu } from '@/components/admin/TastingMenuEditor';
import { TastingParticipantManager, type TastingParticipant } from '@/components/admin/TastingParticipantManager';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TastingRound {
  id: string;
  round_number: number;
  title: string;
  tasting_date: string | null;
  status: 'OPEN' | 'CLOSED';
}

// ─── PDF Download Button ──────────────────────────────────────────────────────

function PdfDownloadButton({
  url,
  label,
  filename,
}: {
  url: string;
  label: string;
  filename: string;
}) {
  const t = useTranslations('admin.tastingMenu');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
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
        {label}
      </button>
      {error && (
        <p className="text-xs text-red-500">{t('pdf.error')}</p>
      )}
    </div>
  );
}

type Tab = 'menu' | 'participants';

interface TastingPageContentProps {
  apiBase: string;
  backHref: string;
  subtitle?: string;
  isReadOnly?: boolean;
}

export function TastingPageContent({
  apiBase,
  backHref,
  subtitle,
  isReadOnly = false,
}: TastingPageContentProps) {
  const t = useTranslations('admin.tastingMenu');

  const [activeTab, setActiveTab] = useState<Tab>('menu');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rounds
  const [rounds, setRounds] = useState<TastingRound[]>([]);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [addingRound, setAddingRound] = useState(false);

  const [menu, setMenu] = useState<TastingMenu | null>(null);
  const [participants, setParticipants] = useState<TastingParticipant[]>([]);
  const [weddingLanguage, setWeddingLanguage] = useState<Language>('ES');
  const [whatsappMode, setWhatsappMode] = useState<'BUSINESS' | 'LINKS'>('BUSINESS');

  // Fetch the data for a specific round (or the first round if no menuId)
  const fetchRoundData = useCallback(async (menuId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const url = menuId ? `${apiBase}?menuId=${menuId}` : apiBase;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const { sections, participants: p, ...rest } = data.data;
          setMenu({ ...rest, sections: sections ?? [] });
          setParticipants(p ?? []);
          if (!menuId) setActiveRoundId(data.data.id ?? null);
        }
        if (data.wedding_language) setWeddingLanguage(data.wedding_language as Language);
        if (data.whatsapp_mode === 'BUSINESS' || data.whatsapp_mode === 'LINKS') setWhatsappMode(data.whatsapp_mode);
      }
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }, [apiBase, t]);

  // Fetch rounds list
  const fetchRounds = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/rounds`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setRounds(data.data ?? []);
      }
    } catch {
      // Non-critical — rounds list is supplemental
    }
  }, [apiBase]);

  // Initial load
  useEffect(() => {
    async function init() {
      await Promise.all([fetchRoundData(), fetchRounds()]);
    }
    init();
  }, [fetchRoundData, fetchRounds]);

  const handleRoundChange = async (menuId: string) => {
    setActiveRoundId(menuId);
    await fetchRoundData(menuId);
  };

  const handleAddRound = async () => {
    setAddingRound(true);
    try {
      const res = await fetch(`${apiBase}/rounds`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const newRound = data.data;
          setRounds(prev => [...prev, {
            id: newRound.id,
            round_number: newRound.round_number,
            title: newRound.title,
            tasting_date: newRound.tasting_date ?? null,
            status: newRound.status,
          }]);
          setActiveRoundId(newRound.id);
          const { sections, participants: p, ...rest } = newRound;
          setMenu({ ...rest, sections: sections ?? [] });
          setParticipants(p ?? []);
        }
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setAddingRound(false);
    }
  };

  // Keep rounds list in sync when the active menu changes (e.g. title/date update)
  const handleMenuChange = (updated: TastingMenu) => {
    setMenu(updated);
    setRounds(prev => prev.map(r => r.id === updated.id ? {
      ...r,
      title: updated.title,
      tasting_date: updated.tasting_date,
      status: updated.status,
    } : r));
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'menu', label: t('tabs.menu') },
    { id: 'participants', label: `${t('tabs.participants')} (${participants.length})` },
  ];

  const reportUrl = activeRoundId
    ? `${apiBase}/report?menuId=${activeRoundId}`
    : `${apiBase}/report`;

  return (
    <div className="min-h-screen bg-gray-50">
      <PrivateHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="flex items-center">
            <Link href={backHref} className="text-gray-500 hover:text-gray-700 mr-3">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🍽️ {t('title')}</h1>
              {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
          {!loading && (
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
              {menu && (
                <PdfDownloadButton
                  url={reportUrl}
                  label={t('pdf.tastingReport')}
                  filename="tasting-report.pdf"
                />
              )}
              {!isReadOnly && (
                <button
                  onClick={handleAddRound}
                  disabled={addingRound}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rose-200 bg-rose-50 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {addingRound ? (
                    <WeddingSpinner size="sm" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                  {t('rounds.addRound')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Round selector */}
        {rounds.length > 1 && (
          <div className="mb-5 flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 shrink-0">
              {t('rounds.selectRound')}
            </label>
            <select
              value={activeRoundId ?? ''}
              onChange={e => handleRoundChange(e.target.value)}
              className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
            >
              {rounds.map(r => (
                <option key={r.id} value={r.id}>
                  {t('rounds.roundLabel', { number: r.round_number })}
                  {r.tasting_date ? ` — ${new Date(r.tasting_date).toLocaleDateString()}` : ''}
                  {r.title && r.title !== `Tasting Round ${r.round_number}` && r.title !== 'Tasting Menu'
                    ? ` (${r.title})`
                    : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
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
          <div className="flex justify-center py-12">
            <WeddingSpinner />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button onClick={() => fetchRoundData(activeRoundId ?? undefined)} className="mt-4 text-sm text-rose-600 underline">
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'menu' && (
              <TastingMenuEditor
                menu={menu}
                apiBase={apiBase}
                menuId={activeRoundId ?? undefined}
                onMenuChange={handleMenuChange}
                readOnly={isReadOnly}
              />
            )}
            {activeTab === 'participants' && (
              <TastingParticipantManager
                participants={participants}
                apiBase={apiBase}
                menuId={activeRoundId ?? undefined}
                onParticipantsChange={setParticipants}
                readOnly={isReadOnly}
                weddingLanguage={weddingLanguage}
                whatsappMode={whatsappMode}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
