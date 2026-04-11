/**
 * TastingMenuEditor — Manage tasting menu sections and dishes.
 * Used in both the admin and planner views.
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TastingDish {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_selected?: boolean;
  average_score?: number | null;
  score_count?: number;
  order: number;
}

export interface TastingSection {
  id: string;
  menu_id: string;
  name: string;
  order: number;
  dishes: TastingDish[];
}

export interface TastingMenu {
  id: string;
  round_number: number;
  title: string;
  description: string | null;
  tasting_date: string | null;
  status: 'OPEN' | 'CLOSED';
  effective_status?: 'OPEN' | 'CLOSED';
  sections: TastingSection[];
}

interface ParsedDish {
  name: string;
  description?: string;
}

interface ParsedSection {
  name: string;
  dishes: ParsedDish[];
}

interface ParsedMenu {
  sections: ParsedSection[];
}

interface ImportSelections {
  sections: { checked: boolean; dishes: boolean[] }[];
}

interface Props {
  menu: TastingMenu | null;
  apiBase: string; // e.g. '/api/admin/tasting' or '/api/planner/weddings/[id]/tasting'
  menuId?: string; // ID of the active tasting round (menu); undefined → round 1 / default
  onMenuChange: (menu: TastingMenu) => void;
  readOnly?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Helper to handle fetch responses and parse JSON safely
 */
async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  let data;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    console.error('Failed to parse JSON response:', err);
    data = { success: false, error: { message: 'Invalid server response' } };
  }

  if (!res.ok && data.success !== false) {
    return { success: false, error: { message: data.error?.message ?? `Server error (${res.status})` }, status: res.status };
  }
  return { ...data, status: res.status };
}

export function TastingMenuEditor({ menu, apiBase, menuId, onMenuChange, readOnly = false }: Props) {
  const t = useTranslations('admin.tastingMenu');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Menu title/description/date/status form
  const [editingMenu, setEditingMenu] = useState(false);
  const [menuTitle, setMenuTitle] = useState(menu?.title ?? 'Tasting Menu');
  const [menuDescription, setMenuDescription] = useState(menu?.description ?? '');
  const [menuTastingDate, setMenuTastingDate] = useState(
    menu?.tasting_date ? menu.tasting_date.split('T')[0] : ''
  );
  const [menuStatus, setMenuStatus] = useState<'OPEN' | 'CLOSED'>(menu?.status ?? 'CLOSED');
  const [menuSaving, setMenuSaving] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  // Section add form
  const [addingSectionName, setAddingSectionName] = useState('');
  const [addingSection, setAddingSection] = useState(false);

  // Dish add form: keyed by section id
  const [addingDish, setAddingDish] = useState<Record<string, { name: string; description: string }>>({});
  const [dishSaving, setDishSaving] = useState<Record<string, boolean>>({});

  // Inline edit for section names
  const [editingSection, setEditingSection] = useState<Record<string, string>>({});

  // Inline edit for dishes: keyed by dish id → { name, description }
  const [editingDish, setEditingDish] = useState<Record<string, { name: string; description: string }>>({});
  const [dishEditSaving, setDishEditSaving] = useState<Record<string, boolean>>({});

  // Image upload: keyed by dish id
  const [imageUploading, setImageUploading] = useState<Record<string, boolean>>({});
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Import state
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ParsedMenu | null>(null);
  const [importSelections, setImportSelections] = useState<ImportSelections | null>(null);
  const [applyingImport, setApplyingImport] = useState(false);

  const toggleImportSection = (si: number, checked: boolean) => {
    setImportSelections(prev => {
      if (!prev) return prev;
      return {
        sections: prev.sections.map((s, i) =>
          i === si ? { checked, dishes: s.dishes.map(() => checked) } : s
        ),
      };
    });
  };

  const toggleImportDish = (si: number, di: number, checked: boolean) => {
    setImportSelections(prev => {
      if (!prev) return prev;
      return {
        sections: prev.sections.map((s, i) =>
          i !== si ? s : { ...s, dishes: s.dishes.map((d, j) => (j === di ? checked : d)) }
        ),
      };
    });
  };

  const handleSaveMenu = async () => {
    setMenuSaving(true);
    setMenuError(null);
    try {
      const payload: Record<string, unknown> = {
        title: menuTitle,
        description: menuDescription || undefined,
        status: menuStatus,
        tasting_date: menuTastingDate
          ? new Date(menuTastingDate).toISOString()
          : null,
      };
      const saveUrl = menuId ? `${apiBase}?menuId=${menuId}` : apiBase;
      const data = await fetchJson(saveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!data.success) throw new Error(data.error?.message ?? t('menu.error'));
      onMenuChange({
        ...(menu ?? { id: data.data.id, sections: [] }),
        title: menuTitle,
        description: menuDescription || null,
        tasting_date: menuTastingDate || null,
        status: menuStatus,
        effective_status: data.data.effective_status,
      });
      setEditingMenu(false);
    } catch (err) {
      setMenuError(err instanceof Error ? err.message : t('menu.error'));
    } finally {
      setMenuSaving(false);
    }
  };

  const handleAddSection = async () => {
    if (!addingSectionName.trim()) return;
    setAddingSection(true);
    try {
      const sectionBody: Record<string, string> = { name: addingSectionName.trim() };
      if (menuId) sectionBody.menu_id = menuId;
      const data = await fetchJson(`${apiBase}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sectionBody),
      });
      if (!data.success) throw new Error(data.error?.message ?? 'Failed to add section');
      const current = menu ?? { id: data.data.menu_id, title: menuTitle, description: menuDescription || null, tasting_date: null, status: 'CLOSED' as const, sections: [] };
      onMenuChange({ ...current, sections: [...current.sections, { ...data.data, dishes: [] }] });
      setAddingSectionName('');
    } catch (err) {
      console.error('Error adding section:', err);
      alert(err instanceof Error ? err.message : 'Error adding section');
    } finally {
      setAddingSection(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm(t('sections.deleteConfirm'))) return;
    const data = await fetchJson(`${apiBase}/sections/${sectionId}`, { method: 'DELETE' });
    if (data.success && menu) {
      onMenuChange({ ...menu, sections: menu.sections.filter(s => s.id !== sectionId) });
    } else if (data.error) {
      alert(data.error.message);
    }
  };

  const handleRenameSection = async (sectionId: string) => {
    const name = editingSection[sectionId]?.trim();
    if (!name || !menu) return;
    const data = await fetchJson(`${apiBase}/sections/${sectionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (data.success) {
      onMenuChange({ ...menu, sections: menu.sections.map(s => s.id === sectionId ? { ...s, name } : s) });
      setEditingSection(prev => { const n = { ...prev }; delete n[sectionId]; return n; });
    } else if (data.error) {
      alert(data.error.message);
    }
  };

  const handleAddDish = async (sectionId: string) => {
    const form = addingDish[sectionId];
    if (!form?.name?.trim() || !menu) return;
    setDishSaving(prev => ({ ...prev, [sectionId]: true }));
    try {
      const data = await fetchJson(`${apiBase}/dishes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section_id: sectionId, name: form.name.trim(), description: form.description || undefined }),
      });
      if (!data.success) throw new Error(data.error?.message ?? 'Failed to add dish');
      onMenuChange({
        ...menu,
        sections: menu.sections.map(s =>
          s.id === sectionId ? { ...s, dishes: [...s.dishes, data.data] } : s
        ),
      });
      setAddingDish(prev => ({ ...prev, [sectionId]: { name: '', description: '' } }));
    } catch (err) {
      console.error('Error adding dish:', err);
      alert(err instanceof Error ? err.message : 'Error adding dish');
    } finally {
      setDishSaving(prev => ({ ...prev, [sectionId]: false }));
    }
  };

  const handleDeleteDish = async (sectionId: string, dishId: string) => {
    if (!confirm(t('dishes.deleteConfirm')) || !menu) return;
    const data = await fetchJson(`${apiBase}/dishes/${dishId}`, { method: 'DELETE' });
    if (data.success) {
      onMenuChange({
        ...menu,
        sections: menu.sections.map(s =>
          s.id === sectionId ? { ...s, dishes: s.dishes.filter(d => d.id !== dishId) } : s
        ),
      });
    } else if (data.error) {
      alert(data.error.message);
    }
  };

  const handleStartEditDish = (dish: TastingDish) => {
    setEditingDish(prev => ({
      ...prev,
      [dish.id]: { name: dish.name, description: dish.description ?? '' },
    }));
  };

  const handleCancelEditDish = (dishId: string) => {
    setEditingDish(prev => { const n = { ...prev }; delete n[dishId]; return n; });
  };

  const handleSaveDish = async (sectionId: string, dishId: string) => {
    const form = editingDish[dishId];
    if (!form?.name?.trim() || !menu) return;
    setDishEditSaving(prev => ({ ...prev, [dishId]: true }));
    try {
      const data = await fetchJson(`${apiBase}/dishes/${dishId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), description: form.description || null }),
      });
      if (!data.success) throw new Error(data.error?.message ?? 'Failed to save dish');
      onMenuChange({
        ...menu,
        sections: menu.sections.map(s =>
          s.id === sectionId
            ? { ...s, dishes: s.dishes.map(d => d.id === dishId ? { ...d, ...data.data } : d) }
            : s
        ),
      });
      handleCancelEditDish(dishId);
    } catch (err) {
      console.error('Error saving dish:', err);
      alert(err instanceof Error ? err.message : 'Error saving dish');
    } finally {
      setDishEditSaving(prev => ({ ...prev, [dishId]: false }));
    }
  };

  // ─── Image handlers ─────────────────────────────────────────────────────────

  const handleImageUpload = useCallback(async (sectionId: string, dishId: string, file: File) => {
    if (!menu) return;
    setImageUploading(prev => ({ ...prev, [dishId]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await fetchJson(`${apiBase}/dishes/${dishId}/image`, { method: 'POST', body: formData });
      if (!data.success) throw new Error(data.error?.message ?? 'Failed to upload image');
      onMenuChange({
        ...menu,
        sections: menu.sections.map(s =>
          s.id === sectionId
            ? { ...s, dishes: s.dishes.map(d => d.id === dishId ? { ...d, image_url: data.data.image_url } : d) }
            : s
        ),
      });
    } catch (err) {
      console.error('Error uploading image:', err);
      alert(err instanceof Error ? err.message : 'Error uploading image');
    } finally {
      setImageUploading(prev => ({ ...prev, [dishId]: false }));
    }
  }, [menu, apiBase, onMenuChange]);

  const handleImageRemove = useCallback(async (sectionId: string, dishId: string) => {
    if (!menu) return;
    setImageUploading(prev => ({ ...prev, [dishId]: true }));
    try {
      const data = await fetchJson(`${apiBase}/dishes/${dishId}/image`, { method: 'DELETE' });
      if (!data.success) throw new Error(data.error?.message ?? 'Failed to remove image');
      onMenuChange({
        ...menu,
        sections: menu.sections.map(s =>
          s.id === sectionId
            ? { ...s, dishes: s.dishes.map(d => d.id === dishId ? { ...d, image_url: null } : d) }
            : s
        ),
      });
    } catch (err) {
      console.error('Error removing image:', err);
      alert(err instanceof Error ? err.message : 'Error removing image');
    } finally {
      setImageUploading(prev => ({ ...prev, [dishId]: false }));
    }
  }, [menu, apiBase, onMenuChange]);

  // ─── Import handlers ────────────────────────────────────────────────────────

  const handleImportClick = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected
    e.target.value = '';

    setImporting(true);
    setImportError(null);
    setImportPreview(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await fetchJson(`${apiBase}/import`, { method: 'POST', body: formData });

      if (!data.success) {
        throw new Error(data.error?.message ?? t('import.error'));
      }

      const parsed = data.data as ParsedMenu;
      setImportPreview(parsed);
      setImportSelections({
        sections: parsed.sections.map(s => ({ checked: true, dishes: s.dishes.map(() => true) })),
      });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t('import.error'));
    } finally {
      setImporting(false);
    }
  };

  const handleApplyImport = async () => {
    if (!importPreview) return;

    if (!confirm(t('import.confirmReplace'))) return;

    setApplyingImport(true);
    try {
      let currentMenu: TastingMenu | null = menu;

      for (let si = 0; si < importPreview.sections.length; si++) {
        const sectionSel = importSelections?.sections[si];
        if (!sectionSel?.checked) continue;

        const parsedSection = importPreview.sections[si];

        // Create section
        const importSectionBody: Record<string, string> = { name: parsedSection.name };
        if (menuId) importSectionBody.menu_id = menuId;
        const sectionData = await fetchJson(`${apiBase}/sections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importSectionBody),
        });
        if (!sectionData.success) continue;

        const newSection: TastingSection = { ...sectionData.data, dishes: [] };
        if (!currentMenu) {
          currentMenu = { id: sectionData.data.menu_id, title: menuTitle, description: menuDescription || null, tasting_date: null, status: 'CLOSED' as const, sections: [] };
        }
        currentMenu = { ...currentMenu, sections: [...currentMenu.sections, newSection] };

        // Create dishes
        for (let di = 0; di < parsedSection.dishes.length; di++) {
          if (!sectionSel.dishes[di]) continue;

          const parsedDish = parsedSection.dishes[di];
          const dishData = await fetchJson(`${apiBase}/dishes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              section_id: newSection.id,
              name: parsedDish.name,
              description: parsedDish.description || undefined,
            }),
          });
          if (!dishData.success) continue;

          currentMenu = {
            ...currentMenu,
            sections: currentMenu.sections.map(s =>
              s.id === newSection.id ? { ...s, dishes: [...s.dishes, dishData.data] } : s
            ),
          };
        }
      }

      if (currentMenu) onMenuChange(currentMenu);
      setImportPreview(null);
      setImportSelections(null);
    } catch (err) {
      console.error('Error applying import:', err);
      alert('Error applying import');
    } finally {
      setApplyingImport(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Menu Title & Description */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">{t('menu.title')}</h3>
          {!readOnly && !editingMenu && (
            <button onClick={() => {
              setEditingMenu(true);
              setMenuTitle(menu?.title ?? 'Tasting Menu');
              setMenuDescription(menu?.description ?? '');
              setMenuTastingDate(menu?.tasting_date ? menu.tasting_date.split('T')[0] : '');
              setMenuStatus(menu?.status ?? 'CLOSED');
            }}
              className="text-sm text-rose-600 hover:text-rose-700">Edit</button>
          )}
        </div>
        {editingMenu ? (
          <div className="space-y-3">
            <input
              type="text"
              value={menuTitle}
              onChange={e => setMenuTitle(e.target.value)}
              placeholder={t('menu.menuTitle')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-rose-500 focus:border-rose-500"
            />
            <textarea
              value={menuDescription}
              onChange={e => setMenuDescription(e.target.value)}
              placeholder={t('menu.menuDescription')}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-rose-500 focus:border-rose-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('menu.tastingDate')}</label>
                <input
                  type="date"
                  value={menuTastingDate}
                  onChange={e => setMenuTastingDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('menu.status')}</label>
                <select
                  value={menuStatus}
                  onChange={e => setMenuStatus(e.target.value as 'OPEN' | 'CLOSED')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-rose-500 focus:border-rose-500 bg-white"
                >
                  <option value="CLOSED">{t('menu.statusClosed')}</option>
                  <option value="OPEN">{t('menu.statusOpen')}</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {menuStatus === 'CLOSED'
                    ? t('menu.statusClosedHint')
                    : t('menu.statusOpenHint')}
                </p>
              </div>
            </div>
            {menuError && <p className="text-xs text-red-600">{menuError}</p>}
            <div className="flex gap-2">
              <button onClick={handleSaveMenu} disabled={menuSaving}
                className="px-4 py-2 bg-rose-600 text-white text-sm rounded-md hover:bg-rose-700 disabled:opacity-50">
                {menuSaving ? t('menu.saving') : t('menu.save')}
              </button>
              <button onClick={() => setEditingMenu(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50">
                {t('sections.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-base font-medium text-gray-800">{menu?.title ?? 'Tasting Menu'}</p>
            {menu?.description && <p className="text-sm text-gray-500 mt-1">{menu.description}</p>}
            <div className="flex items-center gap-4 mt-2">
              {menu?.tasting_date && (
                <p className="text-xs text-gray-500">
                  📅 {new Date(menu.tasting_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                (menu?.effective_status ?? menu?.status) === 'OPEN'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${(menu?.effective_status ?? menu?.status) === 'OPEN' ? 'bg-green-500' : 'bg-gray-400'}`} />
                {(menu?.effective_status ?? menu?.status) === 'OPEN' ? t('menu.statusOpen') : t('menu.statusClosed')}
                {menu?.status === 'CLOSED' && (menu?.effective_status === 'OPEN') && (
                  <span className="text-gray-400 font-normal"> {t('menu.statusAuto')}</span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Import from PDF/Image */}
      {!readOnly && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{t('import.title')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t('import.description')}</p>
            </div>
            <button
              onClick={handleImportClick}
              disabled={importing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
            >
              {importing ? (
                <><WeddingSpinner size="sm" />{t('import.processing')}</>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {t('import.button')}
                </>
              )}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {importError && (
            <p className="text-xs text-red-600 mt-2">{importError}</p>
          )}
        </div>
      )}

      {/* Import Preview Modal */}
      {importPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">{t('import.preview')}</h2>
              <button
                onClick={() => { setImportPreview(null); setImportSelections(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {importPreview.sections.length === 0 && (
                <p className="text-sm text-gray-500 italic">{t('sections.empty')}</p>
              )}
              {importPreview.sections.map((section, si) => {
                const sectionSel = importSelections?.sections[si];
                const sectionChecked = sectionSel?.checked ?? true;
                return (
                  <div key={si} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={sectionChecked}
                        onChange={e => toggleImportSection(si, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <h4 className={`text-sm font-semibold ${sectionChecked ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                        {section.name}
                      </h4>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {section.dishes.length === 0 && (
                        <li className="px-3 py-2 text-xs text-gray-400 italic">{t('dishes.empty')}</li>
                      )}
                      {section.dishes.map((dish, di) => {
                        const dishChecked = sectionSel?.dishes[di] ?? true;
                        return (
                          <li key={di} className="px-3 py-2 flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={dishChecked}
                              disabled={!sectionChecked}
                              onChange={e => toggleImportDish(si, di, e.target.checked)}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                            />
                            <div>
                              <p className={`text-sm font-medium ${dishChecked && sectionChecked ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                                {dish.name}
                              </p>
                              {dish.description && (
                                <p className="text-xs text-gray-500 mt-0.5">{dish.description}</p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => { setImportPreview(null); setImportSelections(null); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
              >
                {t('import.cancel')}
              </button>
              <button
                onClick={handleApplyImport}
                disabled={applyingImport}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {applyingImport ? <><WeddingSpinner size="sm" />{t('import.applying')}</> : t('import.apply')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sections + Dishes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{t('sections.title')}</h3>
        </div>

        {(!menu?.sections || menu.sections.length === 0) && (
          <p className="text-sm text-gray-500 italic">{t('sections.empty')}</p>
        )}

        {menu?.sections.map(section => (
          <div key={section.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Section header */}
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
              {editingSection[section.id] !== undefined ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editingSection[section.id]}
                    onChange={e => setEditingSection(prev => ({ ...prev, [section.id]: e.target.value }))}
                    className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 focus:ring-rose-500 focus:border-rose-500"
                    autoFocus
                  />
                  <button onClick={() => handleRenameSection(section.id)}
                    className="text-xs px-2 py-1 bg-rose-600 text-white rounded">{t('sections.save')}</button>
                  <button onClick={() => setEditingSection(prev => { const n = { ...prev }; delete n[section.id]; return n; })}
                    className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-600">{t('sections.cancel')}</button>
                </div>
              ) : (
                <h4 className="font-semibold text-gray-800 text-sm">{section.name}</h4>
              )}
              {!readOnly && editingSection[section.id] === undefined && (
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => setEditingSection(prev => ({ ...prev, [section.id]: section.name }))}
                    className="text-xs text-gray-500 hover:text-gray-700">Edit</button>
                  <button onClick={() => handleDeleteSection(section.id)}
                    className="text-xs text-red-500 hover:text-red-700">{t('sections.delete')}</button>
                </div>
              )}
            </div>

            {/* Dishes */}
            <div className="divide-y divide-gray-100">
              {section.dishes.length === 0 && (
                <p className="text-xs text-gray-400 italic px-4 py-3">{t('dishes.empty')}</p>
              )}
              {section.dishes.map(dish => (
                <div key={dish.id} className="px-4 py-3">
                  {editingDish[dish.id] !== undefined ? (
                    /* Inline edit form for dish */
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingDish[dish.id].name}
                        onChange={e => setEditingDish(prev => ({ ...prev, [dish.id]: { ...prev[dish.id], name: e.target.value } }))}
                        placeholder={t('dishes.namePlaceholder')}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-rose-500 focus:border-rose-500"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editingDish[dish.id].description}
                        onChange={e => setEditingDish(prev => ({ ...prev, [dish.id]: { ...prev[dish.id], description: e.target.value } }))}
                        placeholder={t('dishes.description')}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-rose-500 focus:border-rose-500"
                      />
                      {/* Image controls in edit mode */}
                      <div className="flex items-center gap-2">
                        {dish.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={dish.image_url} alt={dish.name} className="h-12 w-12 rounded object-cover border border-gray-200 shrink-0" />
                        )}
                        <input
                          ref={el => { imageInputRefs.current[dish.id] = el; }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(section.id, dish.id, file);
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          disabled={imageUploading[dish.id]}
                          onClick={() => imageInputRefs.current[dish.id]?.click()}
                          className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                        >
                          {imageUploading[dish.id] ? <WeddingSpinner size="sm" /> : null}
                          {imageUploading[dish.id] ? t('dishes.uploading') : dish.image_url ? t('dishes.changePhoto') : t('dishes.uploadPhoto')}
                        </button>
                        {dish.image_url && !imageUploading[dish.id] && (
                          <button
                            type="button"
                            onClick={() => handleImageRemove(section.id, dish.id)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded text-red-500 hover:bg-red-50"
                          >
                            {t('dishes.removePhoto')}
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveDish(section.id, dish.id)}
                          disabled={dishEditSaving[dish.id]}
                          className="text-xs px-2 py-1 bg-rose-600 text-white rounded disabled:opacity-50 flex items-center gap-1"
                        >
                          {dishEditSaving[dish.id] ? <WeddingSpinner size="sm" /> : null}
                          {t('dishes.save')}
                        </button>
                        <button
                          onClick={() => handleCancelEditDish(dish.id)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-600"
                        >
                          {t('dishes.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Read view for dish */
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {dish.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={dish.image_url} alt={dish.name} className="h-12 w-12 rounded object-cover border border-gray-200 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-800">{dish.name}</p>
                          {dish.description && <p className="text-xs text-gray-500 mt-0.5">{dish.description}</p>}
                        </div>
                      </div>
                      {!readOnly && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleStartEditDish(dish)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            {t('dishes.edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteDish(section.id, dish.id)}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            {t('dishes.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add dish form */}
            {!readOnly && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={addingDish[section.id]?.name ?? ''}
                    onChange={e => setAddingDish(prev => ({ ...prev, [section.id]: { ...prev[section.id], name: e.target.value } }))}
                    placeholder={t('dishes.namePlaceholder')}
                    className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-rose-500 focus:border-rose-500"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddDish(section.id); }}
                  />
                  <button
                    onClick={() => handleAddDish(section.id)}
                    disabled={dishSaving[section.id]}
                    className="px-3 py-1.5 bg-rose-600 text-white text-sm rounded hover:bg-rose-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {dishSaving[section.id] ? <WeddingSpinner size="sm" /> : `+ ${t('dishes.add')}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add section */}
        {!readOnly && (
          <div className="flex gap-2">
            <input
              type="text"
              value={addingSectionName}
              onChange={e => setAddingSectionName(e.target.value)}
              placeholder={t('sections.namePlaceholder')}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-rose-500 focus:border-rose-500"
              onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); }}
            />
            <button
              onClick={handleAddSection}
              disabled={addingSection || !addingSectionName.trim()}
              className="px-4 py-2 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-900 disabled:opacity-50 whitespace-nowrap"
            >
              {addingSection ? <WeddingSpinner size="sm" /> : `+ ${t('sections.add')}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
