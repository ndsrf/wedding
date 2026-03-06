/**
 * WeddingMenuSelector — Select dishes for the final wedding menu.
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

interface Props {
  menu: TastingMenu | null;
  apiBase: string; // e.g. '/api/admin/tasting' or '/api/planner/weddings/[id]/tasting'
  onMenuChange: (menu: TastingMenu) => void;
  isLoading?: boolean;
}

export function WeddingMenuSelector({ menu, apiBase, onMenuChange, isLoading = false }: Props) {
  const t = useTranslations('admin.menu');
  const tCommon = useTranslations('common');
  
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Local state for checkboxes
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialize selectedIds from menu
  useEffect(() => {
    if (menu) {
      const ids = new Set<string>();
      menu.sections.forEach(s => {
        s.dishes.forEach(d => {
          if (d.is_selected) ids.add(d.id);
        });
      });
      setSelectedIds(ids);
    }
  }, [menu]);

  const availableDishes = useMemo(() => {
    if (!menu) return [];
    return menu.sections.map(s => ({
      ...s,
      dishes: s.dishes.filter(d => !selectedIds.has(d.id))
    })).filter(s => s.dishes.length > 0);
  }, [menu, selectedIds]);

  const selectedDishes = useMemo(() => {
    if (!menu) return [];
    return menu.sections.map(s => ({
      ...s,
      dishes: s.dishes.filter(d => selectedIds.has(d.id))
    })).filter(s => s.dishes.length > 0);
  }, [menu, selectedIds]);

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

  const handleToggleSection = (section: TastingSection, list: 'available' | 'selected') => {
    const setter = list === 'available' ? setAvailableChecked : setSelectedChecked;
    const dishIds = section.dishes.map((d: TastingDish) => d.id);
    setter(prev => {
      const next = new Set(prev);
      const allChecked = dishIds.every((id: string) => next.has(id));
      if (allChecked) {
        dishIds.forEach((id: string) => next.delete(id));
      } else {
        dishIds.forEach((id: string) => next.add(id));
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
      if (menu) {
        onMenuChange({
          ...menu,
          sections: menu.sections.map(s => ({
            ...s,
            dishes: s.dishes.map(d => ({
              ...d,
              is_selected: new Set(dishIds).has(d.id)
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <WeddingSpinner size="lg" />
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
        <p className="text-gray-500">{t('noDishes')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

          <button
            onClick={handleExport}
            disabled={exporting || selectedIds.size === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting ? <WeddingSpinner size="sm" /> : <span>📄</span>}
            {t('generatePrintable')}
          </button>
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
            {availableDishes.length === 0 && (
              <p className="text-sm text-gray-400 italic text-center py-8">No more available dishes</p>
            )}
            {availableDishes.map(section => (
              <div key={section.id} className="space-y-2">
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <input
                    type="checkbox"
                    checked={section.dishes.every((d: TastingDish) => availableChecked.has(d.id))}
                    onChange={() => handleToggleSection(section as TastingSection, 'available')}
                    className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">{section.name}</span>
                </div>
                <div className="pl-6 space-y-2">
                  {section.dishes.map((dish: TastingDish) => (
                    <div key={dish.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                      <input
                        type="checkbox"
                        checked={availableChecked.has(dish.id)}
                        onChange={() => handleToggleDish(dish.id, 'available')}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="flex gap-3 flex-1 min-w-0">
                        {dish.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={dish.image_url} alt={dish.name} className="h-12 w-12 rounded object-cover border border-gray-200 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{dish.name}</p>
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
            {selectedDishes.length === 0 && (
              <p className="text-sm text-gray-400 italic text-center py-8">No dishes selected yet</p>
            )}
            {selectedDishes.map(section => (
              <div key={section.id} className="space-y-2">
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <input
                    type="checkbox"
                    checked={section.dishes.every((d: TastingDish) => selectedChecked.has(d.id))}
                    onChange={() => handleToggleSection(section as TastingSection, 'selected')}
                    className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">{section.name}</span>
                </div>
                <div className="pl-6 space-y-2">
                  {section.dishes.map((dish: TastingDish) => (
                    <div key={dish.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                      <input
                        type="checkbox"
                        checked={selectedChecked.has(dish.id)}
                        onChange={() => handleToggleDish(dish.id, 'selected')}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="flex gap-3 flex-1 min-w-0">
                        {dish.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={dish.image_url} alt={dish.name} className="h-12 w-12 rounded object-cover border border-gray-200 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{dish.name}</p>
                          {dish.description && <p className="text-xs text-gray-500 line-clamp-1">{dish.description}</p>}
                        </div>
                      </div>
                    </div>
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
