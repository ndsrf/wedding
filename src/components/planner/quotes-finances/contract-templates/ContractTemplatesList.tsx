'use client';

import { useState, useEffect } from 'react';
import { ContractTemplateEditor } from './ContractTemplateEditor';

interface ContractTemplate {
  id: string;
  name: string;
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
  const [content, setContent] = useState<object>({ type: 'doc', content: [{ type: 'paragraph' }] });
  const [saving, setSaving] = useState(false);

  async function fetchTemplates() {
    const res = await fetch('/api/planner/contract-templates');
    if (res.ok) {
      const json = await res.json();
      setTemplates(json.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchTemplates(); }, []);

  function startCreate() {
    setEditingId(null);
    setName('');
    setIsDefault(false);
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
          body: JSON.stringify({ name, content: editingContent ?? content, is_default: isDefault }),
        });
      } else {
        await fetch('/api/planner/contract-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, content, is_default: isDefault }),
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
          {templates.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900">{t.name}</h4>
                    {t.is_default && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-medium">Default</span>
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
                  onClick={() => handleDelete(t.id)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
