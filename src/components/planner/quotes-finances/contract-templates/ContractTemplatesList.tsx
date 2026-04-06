'use client';

import { useState, useEffect } from 'react';
import { ContractTemplateEditor } from './ContractTemplateEditor';
import { PaymentScheduleEditor, type ScheduleItem } from '../payment-schedule/PaymentScheduleEditor';

const LANGUAGE_OPTIONS = [
  { value: 'ES', label: 'Español', flag: '🇪🇸' },
  { value: 'EN', label: 'English', flag: '🇬🇧' },
  { value: 'FR', label: 'Français', flag: '🇫🇷' },
  { value: 'IT', label: 'Italiano', flag: '🇮🇹' },
  { value: 'DE', label: 'Deutsch', flag: '🇩🇪' },
] as const;

type TemplateLanguage = typeof LANGUAGE_OPTIONS[number]['value'];

interface ContractTemplate {
  id: string;
  name: string;
  language: TemplateLanguage;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

type View = 'list' | 'create' | 'edit';

export function ContractTemplatesList() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<object | null>(null);
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [language, setLanguage] = useState<TemplateLanguage>('ES');
  const [content, setContent] = useState<object>({ type: 'doc', content: [{ type: 'paragraph' }] });
  const [saving, setSaving] = useState(false);
  const [plannerLanguage, setPlannerLanguage] = useState<TemplateLanguage>('ES');
  // Payment schedule per template: templateId -> { expanded, items, saving }
  const [scheduleState, setScheduleState] = useState<Record<string, { expanded: boolean; items: ScheduleItem[]; loading: boolean; saving: boolean }>>({});

  async function toggleSchedule(templateId: string) {
    const current = scheduleState[templateId];
    if (current?.expanded) {
      setScheduleState((p) => ({ ...p, [templateId]: { ...p[templateId], expanded: false } }));
      return;
    }
    // Load items
    setScheduleState((p) => ({ ...p, [templateId]: { expanded: true, items: p[templateId]?.items ?? [], loading: true, saving: false } }));
    const res = await fetch(`/api/planner/contract-templates/${templateId}/payment-schedule`);
    if (res.ok) {
      const { data } = await res.json();
      setScheduleState((p) => ({
        ...p,
        [templateId]: {
          ...p[templateId],
          items: (data ?? []).map((it: ScheduleItem & { amount_value: unknown }) => ({ ...it, amount_value: Number(it.amount_value) })),
          loading: false,
        },
      }));
    } else {
      setScheduleState((p) => ({ ...p, [templateId]: { ...p[templateId], loading: false } }));
    }
  }

  async function saveSchedule(templateId: string) {
    const state = scheduleState[templateId];
    if (!state) return;
    setScheduleState((p) => ({ ...p, [templateId]: { ...p[templateId], saving: true } }));
    try {
      await fetch(`/api/planner/contract-templates/${templateId}/payment-schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: state.items.map((it, i) => ({
            order: i,
            days_offset: it.days_offset,
            reference_date: it.reference_date,
            fixed_date: it.fixed_date ?? null,
            description: it.description,
            amount_type: it.amount_type,
            amount_value: it.amount_value,
          })),
        }),
      });
    } finally {
      setScheduleState((p) => ({ ...p, [templateId]: { ...p[templateId], saving: false } }));
    }
  }

  async function fetchTemplates() {
    const res = await fetch('/api/planner/contract-templates');
    if (res.ok) {
      const json = await res.json();
      setTemplates(json.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchTemplates();
    // Fetch planner's preferred language to use as default for new templates
    fetch('/api/planner/me').then(async (res) => {
      if (res.ok) {
        const json = await res.json();
        const lang = (json.preferred_language as string | null)?.toUpperCase() as TemplateLanguage | undefined;
        if (lang && LANGUAGE_OPTIONS.some((o) => o.value === lang)) {
          setPlannerLanguage(lang);
        }
      }
    });
  }, []);

  function startCreate() {
    setEditingId(null);
    setName('');
    setIsDefault(false);
    setLanguage(plannerLanguage);
    setContent({ type: 'doc', content: [{ type: 'paragraph' }] });
    setView('create');
  }

  async function startEdit(t: ContractTemplate) {
    const res = await fetch(`/api/planner/contract-templates/${t.id}`);
    if (res.ok) {
      const json = await res.json();
      setEditingId(t.id);
      setName(t.name);
      setIsDefault(t.is_default);
      setLanguage((t.language ?? 'ES') as TemplateLanguage);
      setEditingContent(json.data.content);
      setView('edit');
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/planner/contract-templates/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, content: editingContent ?? content, is_default: isDefault, language }),
        });
      } else {
        await fetch('/api/planner/contract-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, content, is_default: isDefault, language }),
        });
      }
      setView('list');
      fetchTemplates();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;
    await fetch(`/api/planner/contract-templates/${id}`, { method: 'DELETE' });
    fetchTemplates();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="animate-spin w-6 h-6 border-4 border-rose-500 border-t-transparent rounded-full" />
    </div>
  );

  if (view === 'create' || view === 'edit') {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <h3 className="text-base font-semibold text-gray-900">{view === 'edit' ? 'Edit Template' : 'New Contract Template'}</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Template Name *</label>
              <input
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Standard Wedding Planning Contract"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Idioma del contrato</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                value={language}
                onChange={(e) => setLanguage(e.target.value as TemplateLanguage)}
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.flag} {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              <span className="text-sm text-gray-700">Set as default</span>
            </label>
          </div>
          <ContractTemplateEditor
            content={view === 'edit' ? editingContent : undefined}
            onChange={(c) => {
              if (view === 'edit') setEditingContent(c);
              else setContent(c);
            }}
          />
          <div className="flex items-center justify-end gap-3">
            <button onClick={() => setView('list')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 transition-all shadow-sm"
            >
              {saving ? 'Saving…' : 'Save Template'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Contract Templates</h3>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">No contract templates yet</h3>
          <p className="text-xs text-gray-500 mt-1">Create a reusable contract template to use when creating contracts for clients.</p>
          <button onClick={startCreate} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all">
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map((t) => {
            const langOption = LANGUAGE_OPTIONS.find((o) => o.value === t.language);
            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-gray-900">{t.name}</h4>
                      {t.is_default && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-medium">Default</span>
                      )}
                      {langOption && (
                        <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                          {langOption.flag} {langOption.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Updated {new Date(t.updated_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => startEdit(t)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleSchedule(t.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                    title="Calendario de pagos"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Calendario
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>

                {/* Payment schedule editor (expandable) */}
                {scheduleState[t.id]?.expanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Hitos de pago del template</h5>
                      <button
                        onClick={() => saveSchedule(t.id)}
                        disabled={scheduleState[t.id]?.saving}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-60 rounded-lg transition-colors"
                      >
                        {scheduleState[t.id]?.saving && (
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {scheduleState[t.id]?.saving ? 'Guardando…' : 'Guardar'}
                      </button>
                    </div>
                    {scheduleState[t.id]?.loading ? (
                      <div className="flex items-center justify-center h-12">
                        <div className="animate-spin w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full" />
                      </div>
                    ) : (
                      <PaymentScheduleEditor
                        items={scheduleState[t.id]?.items ?? []}
                        onChange={(items) =>
                          setScheduleState((p) => ({ ...p, [t.id]: { ...p[t.id], items } }))
                        }
                        compact
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
