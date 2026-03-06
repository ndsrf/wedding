/**
 * TastingMenuEditor — Manage tasting menu sections and dishes.
 * Used in both the admin and planner views.
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TastingDish {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
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
  title: string;
  description: string | null;
  sections: TastingSection[];
}

interface Props {
  menu: TastingMenu | null;
  apiBase: string; // e.g. '/api/admin/tasting' or '/api/planner/weddings/[id]/tasting'
  onMenuChange: (menu: TastingMenu) => void;
  readOnly?: boolean;
}

// ─── Star Rating Helper ───────────────────────────────────────────────────────

// ─── Component ───────────────────────────────────────────────────────────────

export function TastingMenuEditor({ menu, apiBase, onMenuChange, readOnly = false }: Props) {
  const t = useTranslations('admin.tastingMenu');

  // Menu title/description form
  const [editingMenu, setEditingMenu] = useState(false);
  const [menuTitle, setMenuTitle] = useState(menu?.title ?? 'Tasting Menu');
  const [menuDescription, setMenuDescription] = useState(menu?.description ?? '');
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

  const handleSaveMenu = async () => {
    setMenuSaving(true);
    setMenuError(null);
    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: menuTitle, description: menuDescription || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? t('menu.error'));
      onMenuChange({ ...(menu ?? { id: data.data.id, sections: [] }), title: menuTitle, description: menuDescription || null });
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
      const res = await fetch(`${apiBase}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addingSectionName.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      const current = menu ?? { id: data.data.menu_id, title: menuTitle, description: menuDescription || null, sections: [] };
      onMenuChange({ ...current, sections: [...current.sections, { ...data.data, dishes: [] }] });
      setAddingSectionName('');
    } finally {
      setAddingSection(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm(t('sections.deleteConfirm'))) return;
    const res = await fetch(`${apiBase}/sections/${sectionId}`, { method: 'DELETE' });
    if (res.ok && menu) {
      onMenuChange({ ...menu, sections: menu.sections.filter(s => s.id !== sectionId) });
    }
  };

  const handleRenameSection = async (sectionId: string) => {
    const name = editingSection[sectionId]?.trim();
    if (!name || !menu) return;
    const res = await fetch(`${apiBase}/sections/${sectionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      onMenuChange({ ...menu, sections: menu.sections.map(s => s.id === sectionId ? { ...s, name } : s) });
      setEditingSection(prev => { const n = { ...prev }; delete n[sectionId]; return n; });
    }
  };

  const handleAddDish = async (sectionId: string) => {
    const form = addingDish[sectionId];
    if (!form?.name?.trim() || !menu) return;
    setDishSaving(prev => ({ ...prev, [sectionId]: true }));
    try {
      const res = await fetch(`${apiBase}/dishes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section_id: sectionId, name: form.name.trim(), description: form.description || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      onMenuChange({
        ...menu,
        sections: menu.sections.map(s =>
          s.id === sectionId ? { ...s, dishes: [...s.dishes, data.data] } : s
        ),
      });
      setAddingDish(prev => ({ ...prev, [sectionId]: { name: '', description: '' } }));
    } finally {
      setDishSaving(prev => ({ ...prev, [sectionId]: false }));
    }
  };

  const handleDeleteDish = async (sectionId: string, dishId: string) => {
    if (!confirm(t('dishes.deleteConfirm')) || !menu) return;
    const res = await fetch(`${apiBase}/dishes/${dishId}`, { method: 'DELETE' });
    if (res.ok) {
      onMenuChange({
        ...menu,
        sections: menu.sections.map(s =>
          s.id === sectionId ? { ...s, dishes: s.dishes.filter(d => d.id !== dishId) } : s
        ),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Menu Title & Description */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">{t('menu.title')}</h3>
          {!readOnly && !editingMenu && (
            <button onClick={() => { setEditingMenu(true); setMenuTitle(menu?.title ?? 'Tasting Menu'); setMenuDescription(menu?.description ?? ''); }}
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
          </div>
        )}
      </div>

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
                <div key={dish.id} className="px-4 py-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{dish.name}</p>
                    {dish.description && <p className="text-xs text-gray-500 mt-0.5">{dish.description}</p>}
                  </div>
                  {!readOnly && (
                    <button onClick={() => handleDeleteDish(section.id, dish.id)}
                      className="text-xs text-red-400 hover:text-red-600 ml-4 shrink-0">{t('dishes.delete')}</button>
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
