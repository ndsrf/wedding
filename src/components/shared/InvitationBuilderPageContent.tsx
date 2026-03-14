/**
 * Shared Invitation Builder Page Content
 *
 * Used by both the Wedding Admin (/admin/invitation-builder) and Wedding
 * Planner (/planner/weddings/[id]/invitation-builder) routes.  All API paths
 * and role-specific navigation are injected via props — this component is
 * role-agnostic.
 *
 * Three views:
 * 1. Template List   — shows existing templates
 * 2. Template Picker — choose a system template or start from scratch
 * 3. Editor          — edit template design
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { InvitationTemplateEditor } from '@/components/admin/InvitationTemplateEditor';
import { ChevronLeftIcon } from '@/components/shared/NavIcons';
import type {
  SystemTemplateSeed,
  TemplateDesign,
} from '@/types/invitation-template';

// ============================================================================
// TYPES
// ============================================================================

interface UserTemplate {
  id: string;
  wedding_id: string;
  name: string;
  is_system_template: boolean;
  based_on_preset: string | null;
  design: TemplateDesign;
  created_at: string;
  updated_at: string;
}

interface WeddingData {
  id: string;
  couple_names: string;
  wedding_date: Date;
  wedding_time: string;
  location: string;
}

type ViewType = 'list' | 'picker' | 'editor';

interface InvitationBuilderApiPaths {
  /**
   * Base URL for all invitation-template endpoints.
   * Admin:   '/api/admin'
   * Planner: '/api/planner/weddings/:id'
   *
   * Template list:      `${apiBase}/invitation-template`
   * Template detail:    `${apiBase}/invitation-template/:templateId`
   * Template duplicate: `${apiBase}/invitation-template/:templateId/duplicate`
   * Template export:    `${apiBase}/invitation-template/:templateId/export`
   * Template import:    `${apiBase}/invitation-template/import`
   * Images:             `${apiBase}/invitation-template/images`
   */
  apiBase: string;

  /**
   * URL to fetch wedding data.
   * Admin:   '/api/admin/wedding'
   * Planner: '/api/planner/weddings/:id'   (same as apiBase)
   */
  weddingApi: string;
}

interface InvitationBuilderPageContentProps {
  apiPaths: InvitationBuilderApiPaths;
  /** URL for the back chevron in the list header. */
  backHref: string;
  /** URL to open the full-screen preview window. */
  previewUrl: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InvitationBuilderPageContent({
  apiPaths,
  backHref,
  previewUrl,
}: InvitationBuilderPageContentProps) {
  const t = useTranslations('admin.invitationBuilder');
  const tCommon = useTranslations('common');

  const [view, setView] = useState<ViewType>('list');
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [systemSeeds, setSystemSeeds] = useState<SystemTemplateSeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor state
  const [currentTemplate, setCurrentTemplate] = useState<UserTemplate | null>(null);
  const [weddingData, setWeddingData] = useState<WeddingData | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedSeed, setSelectedSeed] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const templateApi = `${apiPaths.apiBase}/invitation-template`;

  const seedById = useMemo(
    () => new Map(systemSeeds.map((s) => [s.id, s])),
    [systemSeeds],
  );

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [templatesRes, weddingRes] = await Promise.all([
        fetch(templateApi),
        fetch(apiPaths.weddingApi),
      ]);

      if (!templatesRes.ok) throw new Error('Failed to load templates');
      if (!weddingRes.ok) throw new Error('Failed to load wedding data');

      const templatesData = await templatesRes.json();
      const weddingResponse = await weddingRes.json();

      setUserTemplates(templatesData.userTemplates);
      setSystemSeeds(templatesData.systemSeeds);

      // Unwrap response (may have { success, data } shape or flat shape)
      const wedding = weddingResponse.data || weddingResponse;

      const weddingDate = new Date(wedding.wedding_date);
      if (isNaN(weddingDate.getTime())) {
        throw new Error('Invalid wedding date from server');
      }
      setWeddingData({
        id: wedding.id,
        couple_names: wedding.couple_names,
        wedding_date: weddingDate,
        wedding_time: wedding.wedding_time,
        location: wedding.location,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim() || !weddingData) {
      setError('Template name is required');
      return;
    }

    try {
      setIsSavingTemplate(true);

      let design: TemplateDesign;
      if (selectedSeed) {
        const seed = seedById.get(selectedSeed);
        if (!seed) throw new Error('Selected template not found');
        design = seed.design;
      } else {
        design = { globalStyle: { backgroundColor: '#FFFFFF' }, blocks: [] };
      }

      const res = await fetch(templateApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          design,
          based_on_preset: selectedSeed || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to create template');
      }

      const template = await res.json();
      setCurrentTemplate(template);
      setUserTemplates((prev) => [template, ...prev]);
      setView('editor');
      setNewTemplateName('');
      setSelectedSeed(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleEditTemplate = (template: UserTemplate) => {
    setCurrentTemplate(template);
    setView('editor');
  };

  const handleSaveTemplate = async (design: TemplateDesign) => {
    if (!currentTemplate) return;

    try {
      const res = await fetch(`${templateApi}/${currentTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to save template');
      }

      const updated = await res.json();
      setCurrentTemplate(updated);
      setUserTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm(t('confirmDeleteTemplate'))) return;

    try {
      const res = await fetch(`${templateApi}/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to delete template');
      }
      setUserTemplates((prev) => prev.filter((t) => t.id !== id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (id: string) => {
    try {
      const res = await fetch(`${templateApi}/${id}/duplicate`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to duplicate template');
      }
      const duplicate = await res.json();
      setUserTemplates((prev) => [duplicate, ...prev]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate template');
    }
  };

  const handlePreviewTemplate = (template: UserTemplate) => {
    if (!weddingData) return;
    try {
      const previewData = {
        design: template.design,
        weddingData,
        language: 'en',
      };
      sessionStorage.setItem('invitation-preview-data', JSON.stringify(previewData));
      window.open(previewUrl, '_blank', 'width=1200,height=800');
    } catch (err) {
      console.error('Failed to open preview:', err);
    }
  };

  const handleRenameTemplate = async (id: string) => {
    const name = renameValue.trim();
    if (!name) return;

    try {
      const res = await fetch(`${templateApi}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to rename template');
      }

      const updated = (await res.json()) as UserTemplate;
      setUserTemplates((prev) => prev.map((tpl) => (tpl.id === id ? updated : tpl)));
      setRenamingId(null);
      setRenameValue('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename template');
    }
  };

  const handleCancelPicker = () => {
    setView('list');
    setNewTemplateName('');
    setSelectedSeed(null);
  };

  const handleExportTemplate = async (template: UserTemplate) => {
    try {
      const res = await fetch(`${templateApi}/${template.id}/export`);
      if (!res.ok) throw new Error('Failed to export template');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/[^a-z0-9_\-\s]/gi, '_').trim() || 'invitation'}.nupcinv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('exportError'));
    }
  };

  const handleImportFile = async (file: File) => {
    setIsImporting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${templateApi}/import`, { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || t('importError'));
      }
      const body = await res.json();
      const imported = body.template as UserTemplate;
      setUserTemplates((prev) => [imported, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('importError'));
    } finally {
      setIsImporting(false);
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  // ---- Loading / error guards ----

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{tCommon('loading')}</p>
      </div>
    );
  }

  if (!weddingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Failed to load wedding data</p>
      </div>
    );
  }

  // ---- View: List ----

  if (view === 'list') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center">
                <Link href={backHref} className="text-gray-600 hover:text-gray-700 mr-4">
                  <ChevronLeftIcon className="h-6 w-6" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                  <p className="mt-1 text-sm text-gray-600">{t('description')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".nupcinv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportFile(file);
                  }}
                />
                <button
                  onClick={() => importFileRef.current?.click()}
                  disabled={isImporting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  {isImporting ? t('importingTemplate') : t('importTemplate')}
                </button>
                <button
                  onClick={() => setView('picker')}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md hover:bg-amber-700"
                >
                  {t('createNew')}
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {userTemplates.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <h2 className="text-xl font-medium text-gray-900 mb-2">{t('noTemplatesYet')}</h2>
              <p className="text-gray-600 mb-6">{t('noTemplatesDescription')}</p>
              <button
                onClick={() => setView('picker')}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium"
              >
                {t('createFirstTemplate')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
                >
                  {/* Colour preview strip */}
                  <div
                    className="h-32"
                    style={{
                      backgroundColor: template.design.globalStyle.backgroundColor || '#FFFFFF',
                    }}
                  />

                  <div className="p-6">
                    {renamingId === template.id ? (
                      <div className="flex gap-2 mb-4">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameTemplate(template.id);
                            if (e.key === 'Escape') {
                              setRenamingId(null);
                              setRenameValue('');
                            }
                          }}
                          placeholder={t('renameTemplatePlaceholder')}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenameTemplate(template.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                        >
                          {t('confirmRename')}
                        </button>
                        <button
                          onClick={() => { setRenamingId(null); setRenameValue(''); }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
                        >
                          {tCommon('buttons.cancel')}
                        </button>
                      </div>
                    ) : (
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                    )}

                    {template.based_on_preset && (
                      <p className="text-sm text-gray-600 mb-4">
                        {t('basedOn')}:{' '}
                        {seedById.get(template.based_on_preset!)?.name}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium"
                      >
                        {t('editTemplate')}
                      </button>
                      <button
                        onClick={() => handlePreviewTemplate(template)}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-sm font-medium"
                        title={t('previewTemplate')}
                      >
                        {t('previewTemplate')}
                      </button>
                      <button
                        onClick={() => { setRenamingId(template.id); setRenameValue(template.name); }}
                        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition text-sm font-medium"
                        title={t('renameTemplate')}
                      >
                        {t('renameTemplate')}
                      </button>
                      <button
                        onClick={() => handleDuplicateTemplate(template.id)}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-sm font-medium"
                        title={t('duplicateTemplate')}
                      >
                        {t('duplicateTemplate')}
                      </button>
                      <button
                        onClick={() => handleExportTemplate(template)}
                        className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition text-sm font-medium"
                        title={t('exportTemplate')}
                      >
                        {t('exportTemplate')}
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-medium"
                      >
                        {t('deleteTemplate')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ---- View: Picker ----

  if (view === 'picker') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <button
                onClick={handleCancelPicker}
                className="text-gray-600 hover:text-gray-700 mr-4"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{t('createTemplate')}</h1>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <label className="block text-lg font-semibold mb-2 text-gray-900">
              {t('templateName')}
            </label>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="e.g., Spring Wedding"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-amber-600 text-lg"
              disabled={isSavingTemplate}
            />
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <button
              onClick={() => setSelectedSeed(null)}
              className={`w-full p-6 text-center rounded-lg border-2 transition ${
                selectedSeed === null
                  ? 'border-amber-600 bg-amber-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="text-lg font-semibold text-gray-900">{t('startFromScratch')}</p>
              <p className="text-sm text-gray-600 mt-2">{t('description')}</p>
            </button>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('startFromTemplate')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {systemSeeds.map((seed) => (
                <button
                  key={seed.id}
                  onClick={() => setSelectedSeed(seed.id)}
                  className={`p-6 text-left rounded-lg border-2 transition ${
                    selectedSeed === seed.id
                      ? 'border-amber-600 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex gap-2 mb-3">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: seed.primaryColor }} />
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: seed.accentColor }} />
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{seed.name}</p>
                  <p className="text-sm text-gray-600 mt-2">{seed.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancelPicker}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition font-medium"
              disabled={isSavingTemplate}
            >
              {tCommon('buttons.cancel')}
            </button>
            <button
              onClick={handleCreateTemplate}
              disabled={!newTemplateName.trim() || isSavingTemplate}
              className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingTemplate ? t('creating') : t('createTemplate')}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ---- View: Editor ----

  if (view === 'editor' && currentTemplate) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <button
                onClick={() => { setView('list'); setCurrentTemplate(null); }}
                className="text-gray-600 hover:text-gray-700 mr-4"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{currentTemplate.name}</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <InvitationTemplateEditor
            template={currentTemplate}
            weddingData={weddingData}
            onSave={handleSaveTemplate}
            apiBase={apiPaths.apiBase}
            previewUrl={previewUrl}
          />
        </main>
      </div>
    );
  }

  return null;
}
