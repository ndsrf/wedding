/**
 * Public Tasting Menu Page
 * /tasting/[token]
 *
 * Auto-saves scores and notes as the user enters them.
 * On reload, the server returns the latest saved scores so the user
 * can continue exactly where they left off.
 *
 * Three tabs:
 *   1. My Ratings  – star rating (1-5) + notes, auto-saved
 *   2. Everyone's Ratings – all participants' scores
 *   3. Average Scores – computed averages, sortable
 */

'use client';

import { useState, useEffect, useCallback, useRef, use } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import Footer from '@/components/Footer';

const LANGUAGES = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'it', label: 'IT' },
  { code: 'de', label: 'DE' },
];

function LanguageSelector() {
  const locale = useLocale();
  const switchLocale = (code: string) => {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };
  return (
    <div className="flex gap-1">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchLocale(code)}
          className={`text-xs px-2 py-0.5 rounded border transition-colors ${
            locale === code
              ? 'bg-rose-600 text-white border-rose-600'
              : 'border-gray-300 text-gray-500 hover:bg-gray-100'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Score {
  id: string;
  participant_id: string;
  dish_id: string;
  score: number;
  notes: string | null;
  image_url: string | null;
  participant: { id: string; name: string };
}

interface Dish {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
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
  my_scores: Record<string, { score: number; notes: string | null; image_url: string | null }>;
}

type Tab = 'my' | 'all' | 'avg';
type SortKey = 'score' | 'name';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface PageProps {
  params: Promise<{ token: string }>;
}

// ─── Star component ───────────────────────────────────────────────────────────

function Stars({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <div className="flex gap-0.5 flex-wrap">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onMouseEnter={() => !readonly && setHover(i)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => onChange?.(i === value ? 0 : i)}
          className={`text-xl transition-transform ${readonly ? 'cursor-default' : 'cursor-pointer active:scale-125'} ${i <= display ? 'text-yellow-400' : 'text-gray-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ─── Save-status badge ────────────────────────────────────────────────────────

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  const map: Record<Exclude<SaveStatus, 'idle'>, { text: string; className: string }> = {
    saving: { text: '…', className: 'text-gray-400' },
    saved:  { text: '✓ Saved', className: 'text-green-500' },
    error:  { text: '⚠ Retry', className: 'text-red-400' },
  };
  const { text, className } = map[status as Exclude<SaveStatus, 'idle'>];
  return <span className={`text-xs transition-opacity ${className}`}>{text}</span>;
}

// ─── Filter helper ───────────────────────────────────────────────────────────

function filterSections(sections: Section[], query: string): Section[] {
  if (!query.trim()) return sections;
  const q = query.toLowerCase();
  return sections
    .map(section => ({
      ...section,
      dishes: section.dishes.filter(d => d.name.toLowerCase().includes(q)),
    }))
    .filter(section => section.dishes.length > 0);
}

// ─── My Scores Tab ───────────────────────────────────────────────────────────

function MyScoresTab({ data, token, onScoreUpdate, onImageUpdate, searchQuery }: {
  data: TastingData;
  token: string;
  onScoreUpdate: (dishId: string, score: number, notes: string | null) => void;
  onImageUpdate: (dishId: string, imageUrl: string | null) => void;
  searchQuery: string;
}) {
  const t = useTranslations('guest.tasting');

  // Per-dish local state
  const [localScores, setLocalScores] = useState<Record<string, { score: number; notes: string }>>(
    () => Object.fromEntries(
      Object.entries(data.my_scores).map(([dishId, s]) => [dishId, { score: s.score, notes: s.notes ?? '' }])
    )
  );
  const [localImages, setLocalImages] = useState<Record<string, string | null>>(
    () => Object.fromEntries(
      Object.entries(data.my_scores).map(([dishId, s]) => [dishId, s.image_url])
    )
  );
  const [status, setStatus] = useState<Record<string, SaveStatus>>({});
  const [imageUploading, setImageUploading] = useState<Record<string, boolean>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const triggerFileInput = (dishId: string, useCamera: boolean) => {
    const input = fileInputRefs.current[dishId];
    if (!input) return;
    if (useCamera) {
      input.setAttribute('capture', 'environment');
    } else {
      input.removeAttribute('capture');
    }
    input.click();
  };

  // Debounce timers per dish
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const deleteScore = useCallback(async (dishId: string) => {
    setStatus(prev => ({ ...prev, [dishId]: 'saving' }));
    try {
      const res = await fetch(`/api/tasting/${token}/score`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dish_id: dishId }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message);
      onScoreUpdate(dishId, 0, null);
      setStatus(prev => ({ ...prev, [dishId]: 'saved' }));
      setTimeout(() => setStatus(prev => ({ ...prev, [dishId]: 'idle' })), 2000);
    } catch {
      setStatus(prev => ({ ...prev, [dishId]: 'error' }));
    }
  }, [token, onScoreUpdate]);

  const save = useCallback(async (dishId: string, score: number, notes: string) => {
    if (!score) return;
    setStatus(prev => ({ ...prev, [dishId]: 'saving' }));
    try {
      const res = await fetch(`/api/tasting/${token}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dish_id: dishId, score, notes: notes || null }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message);
      onScoreUpdate(dishId, score, notes || null);
      setStatus(prev => ({ ...prev, [dishId]: 'saved' }));
      setTimeout(() => setStatus(prev => ({ ...prev, [dishId]: 'idle' })), 2000);
    } catch {
      setStatus(prev => ({ ...prev, [dishId]: 'error' }));
    }
  }, [token, onScoreUpdate]);

  const scheduleNoteSave = useCallback((dishId: string, score: number, notes: string) => {
    clearTimeout(timers.current[dishId]);
    setStatus(prev => ({ ...prev, [dishId]: 'idle' }));
    timers.current[dishId] = setTimeout(() => save(dishId, score, notes), 1200);
  }, [save]);

  const handleStarChange = useCallback((dishId: string, currentNotes: string, newScore: number) => {
    clearTimeout(timers.current[dishId]);
    setLocalScores(prev => ({ ...prev, [dishId]: { score: newScore, notes: prev[dishId]?.notes ?? currentNotes } }));
    if (newScore === 0) {
      deleteScore(dishId);
    } else {
      save(dishId, newScore, currentNotes);
    }
  }, [save, deleteScore]);

  const handleNotesChange = useCallback((dishId: string, currentScore: number, notes: string) => {
    setLocalScores(prev => ({ ...prev, [dishId]: { score: currentScore, notes } }));
    scheduleNoteSave(dishId, currentScore, notes);
  }, [scheduleNoteSave]);

  const handleImageUpload = useCallback(async (dishId: string, file: File) => {
    setImageUploading(prev => ({ ...prev, [dishId]: true }));
    try {
      const formData = new FormData();
      formData.append('dish_id', dishId);
      formData.append('file', file);
      const res = await fetch(`/api/tasting/${token}/score/image`, { method: 'POST', body: formData });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message);
      setLocalImages(prev => ({ ...prev, [dishId]: d.data.image_url }));
      onImageUpdate(dishId, d.data.image_url);
    } finally {
      setImageUploading(prev => ({ ...prev, [dishId]: false }));
    }
  }, [token, onImageUpdate]);

  const handleImageRemove = useCallback(async (dishId: string) => {
    setImageUploading(prev => ({ ...prev, [dishId]: true }));
    try {
      const res = await fetch(`/api/tasting/${token}/score/image`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dish_id: dishId }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message);
      setLocalImages(prev => ({ ...prev, [dishId]: null }));
      onImageUpdate(dishId, null);
    } finally {
      setImageUploading(prev => ({ ...prev, [dishId]: false }));
    }
  }, [token, onImageUpdate]);

  useEffect(() => {
    const t = timers.current;
    return () => { Object.values(t).forEach(clearTimeout); };
  }, []);

  const visibleSections = filterSections(data.menu.sections, searchQuery);

  return (
    <>
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightboxUrl(null)}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {visibleSections.length === 0 && searchQuery.trim() && (
        <p className="text-sm text-gray-500 italic text-center py-8">{t('search.noResults')}</p>
      )}

      <div className="space-y-4">
        {visibleSections.map(section => {
          const collapsed = collapsedSections.has(section.id);
          return (
            <div key={section.id}>
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between gap-2 pb-1 border-b border-gray-200 text-left"
              >
                <h2 className="text-lg font-semibold text-gray-800">{section.name}</h2>
                <svg
                  className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {!collapsed && (
                <div className="mt-3 space-y-4">
                  {section.dishes.map(dish => {
                    const local = localScores[dish.id] ?? { score: 0, notes: '' };
                    const dishStatus = status[dish.id] ?? 'idle';
                    const imageUrl = localImages[dish.id] ?? null;
                    const uploading = imageUploading[dish.id] ?? false;
                    return (
                      <div key={dish.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900">{dish.name}</h3>
                            {dish.description && <p className="text-sm text-gray-500 mt-0.5">{dish.description}</p>}
                          </div>
                          <SaveBadge status={dishStatus} />
                        </div>

                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1.5">{t('score.rate')}</p>
                          <Stars value={local.score} onChange={v => handleStarChange(dish.id, local.notes, v)} />
                        </div>

                        <div className="mt-3">
                          <textarea
                            value={local.notes}
                            onChange={e => handleNotesChange(dish.id, local.score, e.target.value)}
                            placeholder={t('score.notesPlaceholder')}
                            rows={2}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-rose-500 focus:border-rose-500 resize-none"
                          />
                        </div>

                        {/* Photo upload */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          {imageUrl && (
                            <button type="button" onClick={() => setLightboxUrl(imageUrl)} className="shrink-0 focus:outline-none">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={imageUrl} alt={dish.name} className="h-14 w-14 rounded-lg object-cover border border-gray-200 hover:opacity-90 transition-opacity" />
                            </button>
                          )}
                          <input
                            ref={el => { fileInputRefs.current[dish.id] = el; }}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(dish.id, file);
                              e.target.value = '';
                            }}
                          />
                          {uploading ? (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400">
                              <WeddingSpinner size="sm" />{t('score.uploadingPhoto')}
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => triggerFileInput(dish.id, true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {t('score.takePhoto')}
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerFileInput(dish.id, false)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {t('score.chooseGallery')}
                              </button>
                              {imageUrl && (
                                <button
                                  type="button"
                                  onClick={() => handleImageRemove(dish.id)}
                                  className="text-sm text-red-400 hover:text-red-600 transition-colors"
                                >
                                  {t('score.removePhoto')}
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {dishStatus === 'error' && (
                          <button onClick={() => save(dish.id, local.score, local.notes)} className="mt-1 text-xs text-red-500 underline">
                            {t('score.error')} — tap to retry
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── All Scores Tab ──────────────────────────────────────────────────────────

function AllScoresTab({ data, searchQuery }: { data: TastingData; searchQuery: string }) {
  const t = useTranslations('guest.tasting');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const visibleSections = filterSections(data.menu.sections, searchQuery);

  return (
    <>
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxUrl(null)}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {visibleSections.length === 0 && searchQuery.trim() && (
        <p className="text-sm text-gray-500 italic text-center py-8">{t('search.noResults')}</p>
      )}

      <div className="space-y-4">
        {visibleSections.map(section => {
          const collapsed = collapsedSections.has(section.id);
          return (
            <div key={section.id}>
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between gap-2 pb-1 border-b border-gray-200 text-left"
              >
                <h2 className="text-lg font-semibold text-gray-800">{section.name}</h2>
                <svg
                  className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {!collapsed && (
                <div className="mt-3 space-y-4">
                  {section.dishes.map(dish => (
                    <div key={dish.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        {dish.image_url && (
                          <button
                            type="button"
                            onClick={() => setLightboxUrl(dish.image_url!)}
                            className="shrink-0 focus:outline-none"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={dish.image_url}
                              alt={dish.name}
                              className="h-16 w-16 rounded-lg object-cover border border-gray-200 hover:opacity-90 transition-opacity"
                            />
                          </button>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900">{dish.name}</h3>
                          {dish.description && <p className="text-sm text-gray-500 mt-0.5">{dish.description}</p>}
                        </div>
                      </div>
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
                              {score.image_url && (
                                <button type="button" onClick={() => setLightboxUrl(score.image_url!)} className="shrink-0 focus:outline-none">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={score.image_url} alt="" className="h-14 w-14 rounded-lg object-cover border border-gray-200 hover:opacity-90 transition-opacity" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Average Scores Tab ──────────────────────────────────────────────────────

function AverageScoresTab({ data, searchQuery }: { data: TastingData; searchQuery: string }) {
  const t = useTranslations('guest.tasting');
  const [sortBy, setSortBy] = useState<SortKey>('score');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const visibleSections = filterSections(data.menu.sections, searchQuery);

  return (
    <>
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxUrl(null)}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="space-y-6">
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

        {visibleSections.length === 0 && searchQuery.trim() && (
          <p className="text-sm text-gray-500 italic text-center py-8">{t('search.noResults')}</p>
        )}

        {visibleSections.map(section => {
          const collapsed = collapsedSections.has(section.id);
          const sortedDishes = [...section.dishes].sort((a, b) =>
            sortBy === 'score'
              ? (b.average_score ?? -1) - (a.average_score ?? -1)
              : a.name.localeCompare(b.name)
          );
          return (
            <div key={section.id}>
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between gap-2 pb-1 border-b border-gray-200 text-left"
              >
                <h2 className="text-lg font-semibold text-gray-800">{section.name}</h2>
                <svg
                  className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {!collapsed && (
                <div className="mt-3 space-y-3">
                  {sortedDishes.map(dish => {
                    const photos = dish.scores.filter(s => s.image_url);
                    return (
                      <div key={dish.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-3">
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
                        {photos.length > 0 && (
                          <div className="mt-2 flex gap-1.5 flex-wrap">
                            {photos.map(s => (
                              <button key={s.id} type="button" onClick={() => setLightboxUrl(s.image_url!)} className="focus:outline-none">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={s.image_url!} alt="" className="h-9 w-9 rounded-md object-cover border border-gray-200 hover:opacity-90 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
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

  // Re-fetch when the page becomes visible again (phone wake-up / tab switch)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchData();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchData]);

  const handleScoreUpdate = useCallback((dishId: string, score: number, notes: string | null) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        my_scores: score === 0
          ? Object.fromEntries(Object.entries(prev.my_scores).filter(([k]) => k !== dishId))
          : { ...prev.my_scores, [dishId]: { ...prev.my_scores[dishId], score, notes } },
        menu: {
          ...prev.menu,
          sections: prev.menu.sections.map(section => ({
            ...section,
            dishes: section.dishes.map(dish => {
              if (dish.id !== dishId) return dish;
              const newScores = score === 0
                ? dish.scores.filter(s => s.participant_id !== prev.participant.id)
                : (() => {
                    const existingScore = dish.scores.find(s => s.participant_id === prev.participant.id);
                    return existingScore
                      ? dish.scores.map(s => s.participant_id === prev.participant.id ? { ...s, score, notes } : s)
                      : [...dish.scores, { id: 'local', participant_id: prev.participant.id, dish_id: dishId, score, notes, image_url: null, participant: prev.participant }];
                  })();
              const avg = newScores.length > 0 ? newScores.reduce((sum, s) => sum + s.score, 0) / newScores.length : null;
              return { ...dish, scores: newScores, average_score: avg !== null ? Math.round(avg * 10) / 10 : null, score_count: newScores.length };
            }),
          })),
        },
      };
    });
  }, []);

  const handleImageUpdate = useCallback((dishId: string, imageUrl: string | null) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        my_scores: { ...prev.my_scores, [dishId]: { ...prev.my_scores[dishId], image_url: imageUrl } },
        menu: {
          ...prev.menu,
          sections: prev.menu.sections.map(section => ({
            ...section,
            dishes: section.dishes.map(dish => {
              if (dish.id !== dishId) return dish;
              return {
                ...dish,
                scores: dish.scores.map(s =>
                  s.participant_id === prev.participant.id ? { ...s, image_url: imageUrl } : s
                ),
              };
            }),
          })),
        },
      };
    });
  }, []);

  const [searchQuery, setSearchQuery] = useState('');

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
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">{data.menu.wedding.couple_names}</p>
              <h1 className="text-xl font-bold text-gray-900">🍽️ {data.menu.title}</h1>
              <p className="text-sm text-gray-600 mt-0.5">{t('welcome', { name: data.participant.name })}</p>
            </div>
            <div className="shrink-0 mt-1">
              <LanguageSelector />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-rose-500 focus:border-rose-500 bg-gray-50"
            />
          </div>
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
          <MyScoresTab data={data} token={token} onScoreUpdate={handleScoreUpdate} onImageUpdate={handleImageUpdate} searchQuery={searchQuery} />
        )}
        {activeTab === 'all' && <AllScoresTab data={data} searchQuery={searchQuery} />}
        {activeTab === 'avg' && <AverageScoresTab data={data} searchQuery={searchQuery} />}
      </div>

      <Footer />
    </div>
  );
}
