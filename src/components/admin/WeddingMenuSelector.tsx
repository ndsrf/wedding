/**
 * WeddingMenuSelector — Select dishes for the final wedding menu.
 * Shows dishes from all tasting rounds, consolidated by section name.
 * Used in both the admin and planner views.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import type { TastingMenu, TastingSection, TastingDish } from '@/components/admin/TastingMenuEditor';

// ─── Stars Component ─────────────────────────────────────────────────────────

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
        <span
          key={i}
          className={`text-sm ${i <= value ? 'text-yellow-400' : 'text-gray-300'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// ─── Extended dish type with round info ──────────────────────────────────────

interface DishWithRound extends TastingDish {
  round_number: number;
  round_title: string;
  menu_id: string;
}

interface SectionWithRoundDishes {
  name: string;
  dishes: DishWithRound[];
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  /** All tasting rounds (menus) for this wedding */
  allMenus: TastingMenu[];
  /** The primary (first) menu used for save/export operations */
  primaryMenu: TastingMenu | null;
  apiBase: string;
  onMenuChange: (menu: TastingMenu) => void;
  isLoading?: boolean;
  pdfUrl?: string;
}

// ─── GenerateMenuPanel ────────────────────────────────────────────────────────

interface GenerateMenuPanelProps {
  apiBase: string;
  onGenerated: (dishIds: string[]) => void;
}

function GenerateMenuPanel({ apiBase, onGenerated }: GenerateMenuPanelProps) {
  const t = useTranslations('admin.menu');
  const [open, setOpen] = useState(false);
  const [quantities, setQuantities] = useState({
    appetizers: 3,
    first_course: 1,
    second_course: 1,
    dessert: 1,
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setReasoning(null);
    try {
      const res = await fetch(`${apiBase}/menu/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quantities),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? t('generateError'));
      setReasoning(data.data.reasoning ?? null);
      onGenerated(data.data.selectedDishIds as string[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('generateError'));
    } finally {
      setGenerating(false);
    }
  };

  const fields: { key: keyof typeof quantities; label: string }[] = [
    { key: 'appetizers', label: t('appetizers') },
    { key: 'first_course', label: t('firstCourse') },
    { key: 'second_course', label: t('secondCourse') },
    { key: 'dessert', label: t('dessert') },
  ];

  return (
    <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-rose-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">✨</span>
          <div>
            <span className="font-semibold text-rose-800">{t('generateMenu')}</span>
            <p className="text-xs text-rose-600 mt-0.5">{t('generateMenuTitle')}</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-rose-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-rose-200">
          <p className="text-sm text-rose-700 pt-4">{t('generateMenuDescription')}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {fields.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={quantities[key]}
                  onChange={e => setQuantities(q => ({ ...q, [key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-white"
                />
              </div>
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}

          {reasoning && (
            <div className="bg-white rounded-lg border border-rose-100 p-3">
              <p className="text-xs font-semibold text-rose-700 mb-1">{t('aiReasoning')}</p>
              <p className="text-xs text-gray-600 leading-relaxed">{reasoning}</p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {generating ? (
              <>
                <WeddingSpinner size="sm" />
                {t('generating')}
              </>
            ) : (
              <>
                <span>✨</span>
                {t('generateMenu')}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Round badge ─────────────────────────────────────────────────────────────

function RoundBadge({ roundNumber }: { roundNumber: number }) {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-amber-100 text-amber-700',
    'bg-teal-100 text-teal-700',
    'bg-pink-100 text-pink-700',
  ];
  const color = colors[(roundNumber - 1) % colors.length];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${color}`}>
      R{roundNumber}
    </span>
  );
}

// ─── DishRow ─────────────────────────────────────────────────────────────────

function DishRow({
  dish,
  checked,
  onToggle,
  showRoundBadge,
}: {
  dish: DishWithRound;
  checked: boolean;
  onToggle: () => void;
  showRoundBadge: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
      />
      <div className="flex gap-3 flex-1 min-w-0">
        {dish.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dish.image_url} alt={dish.name} className="h-12 w-12 rounded object-cover border border-gray-200 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium text-gray-800 truncate">{dish.name}</p>
            {showRoundBadge && <RoundBadge roundNumber={dish.round_number} />}
          </div>
          {dish.description && <p className="text-xs text-gray-500 line-clamp-1">{dish.description}</p>}
          {dish.average_score !== null && (
            <div className="mt-1 flex items-center gap-2">
              <Stars value={Math.round(dish.average_score || 0)} />
              <span className="text-xs font-bold text-rose-600">
                {dish.average_score?.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WeddingMenuSelector({ allMenus, primaryMenu, apiBase, onMenuChange, isLoading = false, pdfUrl }: Props) {
  const t = useTranslations('admin.menu');
  const tCommon = useTranslations('common');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  // Local state for checkboxes (dish id → selected)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Build consolidated sections from all menus
  const hasMultipleRounds = allMenus.length > 1;

  const consolidatedSections = useMemo((): SectionWithRoundDishes[] => {
    const sectionMap = new Map<string, DishWithRound[]>();
    const sectionOrder: string[] = [];

    for (const menu of allMenus) {
      const roundNumber = menu.round_number;
      const roundTitle = menu.title;

      for (const section of menu.sections) {
        if (!sectionMap.has(section.name)) {
          sectionMap.set(section.name, []);
          sectionOrder.push(section.name);
        }
        const dishes = sectionMap.get(section.name)!;
        for (const dish of section.dishes) {
          dishes.push({ ...dish, round_number: roundNumber, round_title: roundTitle, menu_id: menu.id });
        }
      }
    }

    return sectionOrder.map(name => ({ name, dishes: sectionMap.get(name)! }));
  }, [allMenus]);

  // Initialize selectedIds from all menus
  useEffect(() => {
    const ids = new Set<string>();
    for (const menu of allMenus) {
      for (const section of menu.sections) {
        for (const dish of section.dishes) {
          if (dish.is_selected) ids.add(dish.id);
        }
      }
    }
    setSelectedIds(ids);
  }, [allMenus]);

  const availableSections = useMemo(() =>
    consolidatedSections
      .map(s => ({ ...s, dishes: s.dishes.filter(d => !selectedIds.has(d.id)) }))
      .filter(s => s.dishes.length > 0),
    [consolidatedSections, selectedIds]
  );

  const selectedSections = useMemo(() =>
    consolidatedSections
      .map(s => ({ ...s, dishes: s.dishes.filter(d => selectedIds.has(d.id)) }))
      .filter(s => s.dishes.length > 0),
    [consolidatedSections, selectedIds]
  );

  // Checkbox state for "Available" list
  const [availableChecked, setAvailableChecked] = useState<Set<string>>(new Set());
  // Checkbox state for "Selected" list
  const [selectedChecked, setSelectedChecked] = useState<Set<string>>(new Set());

  const handleToggleDish = (dishId: string, list: 'available' | 'selected') => {
    const setter = list === 'available' ? setAvailableChecked : setSelectedChecked;
    setter(prev => {
      const next = new Set(prev);
      if (next.has(dishId)) next.delete(dishId);
      else next.add(dishId);
      return next;
    });
  };

  const handleToggleSection = (sectionDishes: DishWithRound[], list: 'available' | 'selected') => {
    const setter = list === 'available' ? setAvailableChecked : setSelectedChecked;
    const dishIds = sectionDishes.map(d => d.id);
    setter(prev => {
      const next = new Set(prev);
      const allChecked = dishIds.every(id => next.has(id));
      if (allChecked) {
        dishIds.forEach(id => next.delete(id));
      } else {
        dishIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleSave = async (dishIds: string[]) => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`${apiBase}/menu`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedDishIds: dishIds }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? t('saveError'));
      setSaveSuccess(true);
      const selectedSet = new Set(dishIds);
      // Update all menus in state
      for (const menu of allMenus) {
        onMenuChange({
          ...menu,
          sections: menu.sections.map((s: TastingSection) => ({
            ...s,
            dishes: s.dishes.map((d: TastingDish) => ({
              ...d,
              is_selected: selectedSet.has(d.id)
            }))
          }))
        });
      }
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const moveCheckedToSelected = () => {
    const nextIds = new Set(selectedIds);
    availableChecked.forEach(id => nextIds.add(id));
    setSelectedIds(nextIds);
    setAvailableChecked(new Set());
    handleSave(Array.from(nextIds));
  };

  const moveCheckedToAvailable = () => {
    const nextIds = new Set(selectedIds);
    selectedChecked.forEach(id => nextIds.delete(id));
    setSelectedIds(nextIds);
    setSelectedChecked(new Set());
    handleSave(Array.from(nextIds));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${apiBase}/menu/export?format=xlsx`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wedding-menu-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export menu');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!pdfUrl) return;
    setExportingPdf(true);
    setPdfError(false);
    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wedding-menu-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setPdfError(true);
    } finally {
      setExportingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <WeddingSpinner size="lg" />
      </div>
    );
  }

  if (!primaryMenu) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
        <p className="text-gray-500">{t('noDishes')}</p>
      </div>
    );
  }

  const handleGeneratedMenu = (dishIds: string[]) => {
    const nextIds = new Set(dishIds);
    setSelectedIds(nextIds);
    setAvailableChecked(new Set());
    setSelectedChecked(new Set());
    handleSave(dishIds);
  };

  return (
    <div className="space-y-6">
      <GenerateMenuPanel apiBase={apiBase} onGenerated={handleGeneratedMenu} />

      {/* Round legend when multiple rounds */}
      {hasMultipleRounds && (
        <div className="flex items-center gap-3 flex-wrap bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
          <span className="text-xs font-medium text-gray-600">{t('rounds')}</span>
          {allMenus.map((menu, idx) => {
            const roundNumber = (menu as TastingMenu & { round_number?: number }).round_number ?? (idx + 1);
            return (
              <span key={menu.id} className="flex items-center gap-1 text-xs text-gray-600">
                <RoundBadge roundNumber={roundNumber} />
                <span>{menu.title}</span>
                {menu.tasting_date && (
                  <span className="text-gray-400">({new Date(menu.tasting_date).toLocaleDateString()})</span>
                )}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('title')}</h2>
          <p className="text-sm text-gray-500">{t('description')}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Status Indicators */}
          <div className="flex items-center">
            {saving && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <WeddingSpinner size="sm" />
                <span>{tCommon('status.saving')}</span>
              </div>
            )}
            {saveSuccess && (
              <div className="flex items-center gap-1 text-green-600 text-sm animate-fade-out">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{tCommon('status.saved')}</span>
              </div>
            )}
            {saveError && (
              <div className="flex items-center gap-1 text-red-600 text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="max-w-[200px] truncate" title={saveError}>{saveError}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting || selectedIds.size === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors shadow-sm"
            >
              {exporting ? (
                <WeddingSpinner size="sm" />
              ) : (
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              {t('exportXlsx')}
            </button>
            {pdfUrl && (
              <div className="flex flex-col items-end gap-0.5">
                <button
                  onClick={handleExportPdf}
                  disabled={exportingPdf || selectedIds.size === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {exportingPdf ? (
                    <WeddingSpinner size="sm" />
                  ) : (
                    <svg className="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                  )}
                  {t('exportPdf')}
                </button>
                {pdfError && (
                  <p className="text-xs text-red-500">{tCommon('errors.generic')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
        {/* Available List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-[600px]">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{t('available')}</h3>
            <span className="text-xs text-gray-500">{availableChecked.size} {tCommon('selection.selectedCount', { count: availableChecked.size })}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {availableSections.length === 0 && (
              <p className="text-sm text-gray-400 italic text-center py-8">No more available dishes</p>
            )}
            {availableSections.map(section => (
              <div key={section.name} className="space-y-2">
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <input
                    type="checkbox"
                    checked={section.dishes.every(d => availableChecked.has(d.id))}
                    onChange={() => handleToggleSection(section.dishes, 'available')}
                    className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">{section.name}</span>
                </div>
                <div className="pl-6 space-y-2">
                  {section.dishes.map(dish => (
                    <DishRow
                      key={dish.id}
                      dish={dish}
                      checked={availableChecked.has(dish.id)}
                      onToggle={() => handleToggleDish(dish.id, 'available')}
                      showRoundBadge={hasMultipleRounds}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 p-2">
          <button
            onClick={moveCheckedToSelected}
            disabled={availableChecked.size === 0}
            className="p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 text-gray-600"
            title={t('moveToSelected')}
          >
            <svg className="w-6 h-6 rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={moveCheckedToAvailable}
            disabled={selectedChecked.size === 0}
            className="p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 text-gray-600"
            title={t('moveToAvailable')}
          >
            <svg className="w-6 h-6 rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Selected List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-[600px]">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{t('selected')}</h3>
            <span className="text-xs text-gray-500">{selectedChecked.size} {tCommon('selection.selectedCount', { count: selectedChecked.size })}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedSections.length === 0 && (
              <p className="text-sm text-gray-400 italic text-center py-8">No dishes selected yet</p>
            )}
            {selectedSections.map(section => (
              <div key={section.name} className="space-y-2">
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <input
                    type="checkbox"
                    checked={section.dishes.every(d => selectedChecked.has(d.id))}
                    onChange={() => handleToggleSection(section.dishes, 'selected')}
                    className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">{section.name}</span>
                </div>
                <div className="pl-6 space-y-2">
                  {section.dishes.map(dish => (
                    <DishRow
                      key={dish.id}
                      dish={dish}
                      checked={selectedChecked.has(dish.id)}
                      onToggle={() => handleToggleDish(dish.id, 'selected')}
                      showRoundBadge={hasMultipleRounds}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
