/**
 * Public Tasting Menu Page
 * /tasting/[token]
 *
 * Participant page for rating dishes and viewing collective scores.
 * Three tabs:
 *   1. My Ratings  – rate each dish 1-5 + add notes
 *   2. Everyone's Ratings – all participants' scores
 *   3. Average Scores – computed averages, sortable
 */

'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useTranslations } from 'next-intl';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Score {
  id: string;
  participant_id: string;
  dish_id: string;
  score: number;
  notes: string | null;
  participant: { id: string; name: string };
}

interface Dish {
  id: string;
  name: string;
  description: string | null;
  order: number;
  scores: Score[];
  average_score: number | null;
  score_count: number;
}

interface Section {
  id: string;
  name: string;
  order: number;
  dishes: Dish[];
}

interface TastingData {
  participant: { id: string; name: string };
  menu: {
    id: string;
    title: string;
    description: string | null;
    wedding: { couple_names: string };
    sections: Section[];
    participants: { id: string; name: string }[];
  };
  my_scores: Record<string, { score: number; notes: string | null }>;
}

type Tab = 'my' | 'all' | 'avg';
type SortKey = 'score' | 'name';

interface PageProps {
  params: Promise<{ token: string }>;
}

// ─── Star component ───────────────────────────────────────────────────────────

function Stars({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onMouseEnter={() => !readonly && setHover(i)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => onChange?.(i)}
          className={`text-2xl transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} ${i <= display ? 'text-yellow-400' : 'text-gray-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ─── My Scores Tab ───────────────────────────────────────────────────────────

function MyScoresTab({ data, token, onScoreUpdate }: {
  data: TastingData;
  token: string;
  onScoreUpdate: (dishId: string, score: number, notes: string | null) => void;
}) {
  const t = useTranslations('guest.tasting');
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [localScores, setLocalScores] = useState<Record<string, { score: number; notes: string }>>(
    Object.fromEntries(
      Object.entries(data.my_scores).map(([dishId, s]) => [dishId, { score: s.score, notes: s.notes ?? '' }])
    )
  );

  const handleSave = async (dishId: string) => {
    const local = localScores[dishId];
    if (!local?.score) return;
    setSaving(prev => ({ ...prev, [dishId]: true }));
    setErrors(prev => ({ ...prev, [dishId]: '' }));
    try {
      const res = await fetch(`/api/tasting/${token}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dish_id: dishId, score: local.score, notes: local.notes || null }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message ?? t('score.error'));
      onScoreUpdate(dishId, local.score, local.notes || null);
      setSaved(prev => ({ ...prev, [dishId]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [dishId]: false })), 2000);
    } catch (err) {
      setErrors(prev => ({ ...prev, [dishId]: err instanceof Error ? err.message : t('score.error') }));
    } finally {
      setSaving(prev => ({ ...prev, [dishId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {data.menu.sections.map(section => (
        <div key={section.id}>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-200">{section.name}</h2>
          <div className="space-y-4">
            {section.dishes.map(dish => {
              const local = localScores[dish.id] ?? { score: 0, notes: '' };
              return (
                <div key={dish.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <h3 className="font-medium text-gray-900">{dish.name}</h3>
                  {dish.description && <p className="text-sm text-gray-500 mt-0.5">{dish.description}</p>}
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-1">{t('score.rate')}</p>
                    <Stars
                      value={local.score}
                      onChange={v => setLocalScores(prev => ({ ...prev, [dish.id]: { ...prev[dish.id] ?? { notes: '' }, score: v } }))}
                    />
                  </div>
                  <div className="mt-3">
                    <textarea
                      value={local.notes}
                      onChange={e => setLocalScores(prev => ({ ...prev, [dish.id]: { ...prev[dish.id] ?? { score: 0 }, notes: e.target.value } }))}
                      placeholder={t('score.notesPlaceholder')}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-rose-500 focus:border-rose-500 resize-none"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      onClick={() => handleSave(dish.id)}
                      disabled={!local.score || saving[dish.id]}
                      className="px-4 py-1.5 bg-rose-600 text-white text-sm rounded-lg hover:bg-rose-700 disabled:opacity-40"
                    >
                      {saving[dish.id] ? t('score.saving') : t('score.save')}
                    </button>
                    {saved[dish.id] && <span className="text-sm text-green-600">✓ {t('score.saved')}</span>}
                    {errors[dish.id] && <span className="text-sm text-red-600">{errors[dish.id]}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── All Scores Tab ──────────────────────────────────────────────────────────

function AllScoresTab({ data }: { data: TastingData }) {
  const t = useTranslations('guest.tasting');
  return (
    <div className="space-y-6">
      {data.menu.sections.map(section => (
        <div key={section.id}>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-200">{section.name}</h2>
          <div className="space-y-4">
            {section.dishes.map(dish => (
              <div key={dish.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h3 className="font-medium text-gray-900">{dish.name}</h3>
                {dish.description && <p className="text-sm text-gray-500 mt-0.5">{dish.description}</p>}
                {dish.scores.length === 0 ? (
                  <p className="text-sm text-gray-400 italic mt-3">{t('allScores.empty')}</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {dish.scores.map(score => (
                      <div key={score.id} className="flex items-start gap-3 py-2 border-t border-gray-50">
                        <div className="shrink-0">
                          <Stars value={score.score} readonly />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700">{t('allScores.by', { name: score.participant.name })}</p>
                          {score.notes ? (
                            <p className="text-sm text-gray-600 mt-0.5">{score.notes}</p>
                          ) : (
                            <p className="text-xs text-gray-400 italic">{t('allScores.noNotes')}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Average Scores Tab ──────────────────────────────────────────────────────

function AverageScoresTab({ data }: { data: TastingData }) {
  const t = useTranslations('guest.tasting');
  const [sortBy, setSortBy] = useState<SortKey>('score');

  return (
    <div className="space-y-6">
      {/* Sort controls */}
      <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3">
        <span className="text-sm text-gray-600">{t('averages.sortBy')}:</span>
        <button
          onClick={() => setSortBy('score')}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${sortBy === 'score' ? 'bg-rose-600 text-white border-rose-600' : 'border-gray-300 text-gray-600'}`}
        >
          {t('averages.sortByScore')}
        </button>
        <button
          onClick={() => setSortBy('name')}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${sortBy === 'name' ? 'bg-rose-600 text-white border-rose-600' : 'border-gray-300 text-gray-600'}`}
        >
          {t('averages.sortByName')}
        </button>
      </div>

      {data.menu.sections.map(section => {
        const sortedDishes = [...section.dishes].sort((a, b) => {
          if (sortBy === 'score') {
            const aScore = a.average_score ?? -1;
            const bScore = b.average_score ?? -1;
            return bScore - aScore; // descending
          }
          return a.name.localeCompare(b.name);
        });

        return (
          <div key={section.id}>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-200">{section.name}</h2>
            <div className="space-y-3">
              {sortedDishes.map(dish => (
                <div key={dish.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">{dish.name}</h3>
                    {dish.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{dish.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {dish.score_count > 0 ? t('averages.ratings', { count: dish.score_count }) : t('averages.noRatings')}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {dish.average_score !== null ? (
                      <>
                        <p className="text-2xl font-bold text-rose-600">{dish.average_score.toFixed(1)}</p>
                        <Stars value={Math.round(dish.average_score)} readonly />
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">—</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TastingPage({ params }: PageProps) {
  const { token } = use(params);
  const t = useTranslations('guest.tasting');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TastingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('my');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tasting/${token}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? t('error'));
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleScoreUpdate = useCallback((dishId: string, score: number, notes: string | null) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        my_scores: { ...prev.my_scores, [dishId]: { score, notes } },
        menu: {
          ...prev.menu,
          sections: prev.menu.sections.map(section => ({
            ...section,
            dishes: section.dishes.map(dish => {
              if (dish.id !== dishId) return dish;
              const existingScore = dish.scores.find(s => s.participant_id === prev.participant.id);
              const newScores = existingScore
                ? dish.scores.map(s => s.participant_id === prev.participant.id ? { ...s, score, notes } : s)
                : [...dish.scores, { id: 'local', participant_id: prev.participant.id, dish_id: dishId, score, notes, participant: prev.participant }];
              const avg = newScores.reduce((sum, s) => sum + s.score, 0) / newScores.length;
              return { ...dish, scores: newScores, average_score: Math.round(avg * 10) / 10, score_count: newScores.length };
            }),
          })),
        },
      };
    });
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'my', label: t('tabs.myScores') },
    { id: 'all', label: t('tabs.allScores') },
    { id: 'avg', label: t('tabs.averages') },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center">
        <WeddingSpinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-4xl mb-4">🍽️</p>
          <p className="text-gray-600">{error ?? t('notFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <p className="text-xs text-gray-500 mb-0.5">{data.menu.wedding.couple_names}</p>
          <h1 className="text-xl font-bold text-gray-900">🍽️ {data.menu.title}</h1>
          <p className="text-sm text-gray-600 mt-0.5">{t('welcome', { name: data.participant.name })}</p>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-100">
          <div className="max-w-2xl mx-auto px-4">
            <nav className="-mb-px flex">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors text-center ${
                    activeTab === tab.id
                      ? 'border-rose-500 text-rose-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {data.menu.description && activeTab === 'my' && (
          <p className="text-sm text-gray-600 mb-6 bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
            {data.menu.description}
          </p>
        )}

        {activeTab === 'my' && (
          <MyScoresTab data={data} token={token} onScoreUpdate={handleScoreUpdate} />
        )}
        {activeTab === 'all' && <AllScoresTab data={data} />}
        {activeTab === 'avg' && <AverageScoresTab data={data} />}
      </div>
    </div>
  );
}
