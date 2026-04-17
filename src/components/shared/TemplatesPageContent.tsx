/**
 * Templates Page — Shared Content Component
 *
 * Used by both /admin/templates and /planner/weddings/[id]/templates.
 * The thin route pages supply role-specific API paths and the header slot.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { MessageTemplate, Language } from '@prisma/client';
import { TemplateEditor } from '@/components/admin/TemplateEditor';
import { TemplatePreview } from '@/components/admin/TemplatePreview';
import { getAvailablePlaceholders } from '@/lib/templates';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

type TemplateTypeTab = 'INVITATION' | 'REMINDER' | 'CONFIRMATION' | 'SAVE_THE_DATE' | 'TASTING_MENU';
type TemplateChannel = 'EMAIL' | 'WHATSAPP' | 'SMS';

export interface TemplatesApiPaths {
  /** GET for save_the_date_enabled (admin: /api/admin/wedding, planner: /api/planner/weddings/:id) */
  weddingConfig: string;
  /** GET ?limit=100 */
  templates: string;
  /** PATCH for saving a template */
  templateUpdate: (id: string) => string;
  /** apiBaseUrl for TemplateEditor (image upload) and TemplatePreview */
  apiBase: string;
  /** Explicit weddingId for TemplatePreview (admin can pass session-derived value) */
  weddingId: string;
}

export interface TemplatesPageContentProps {
  apiPaths: TemplatesApiPaths;
  header: React.ReactNode;
}

export function TemplatesPageContent({ apiPaths, header }: TemplatesPageContentProps) {
  const router = useRouter();
  const { status } = useSession();
  const t = useTranslations('admin.templates');
  const commonT = useTranslations('common');
  const [placeholders] = useState(getAvailablePlaceholders());

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TemplateTypeTab>('INVITATION');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('ES');
  const [selectedChannel, setSelectedChannel] = useState<TemplateChannel>('EMAIL');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveTheDateEnabled, setSaveTheDateEnabled] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch(apiPaths.weddingConfig)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSaveTheDateEnabled(data.data.save_the_date_enabled);
      })
      .catch((err) => console.error('Failed to fetch wedding config:', err));
  }, [status, apiPaths.weddingConfig]);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${apiPaths.templates}?limit=100`);
      if (!response.ok) throw new Error(t('error'));
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data.items);
      } else {
        setError(data.error?.message || t('error'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setLoading(false);
    }
  }, [t, apiPaths.templates]);

  useEffect(() => {
    if (status === 'authenticated') fetchTemplates();
  }, [status, fetchTemplates]);

  const filteredTemplates = templates.filter(
    (tmpl) => tmpl.type === activeTab && tmpl.language === selectedLanguage && tmpl.channel === selectedChannel
  );
  const currentTemplate = filteredTemplates[0];

  const availableTabs: TemplateTypeTab[] = saveTheDateEnabled
    ? ['SAVE_THE_DATE', 'INVITATION', 'REMINDER', 'CONFIRMATION', 'TASTING_MENU']
    : ['INVITATION', 'REMINDER', 'CONFIRMATION', 'TASTING_MENU'];

  const getTabLabel = (type: TemplateTypeTab) => {
    switch (type) {
      case 'INVITATION': return t('type.invitation');
      case 'REMINDER': return t('type.reminder');
      case 'CONFIRMATION': return t('type.confirmation');
      case 'SAVE_THE_DATE': return t('type.saveTheDate');
      case 'TASTING_MENU': return t('type.tastingMenu');
      default: return type;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <WeddingSpinner size="lg" className="mb-4" />
          <p className="mt-4 text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {header}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => { setError(null); fetchTemplates(); }}
              className="mt-2 px-4 py-3 text-red-600 hover:text-red-800 font-medium"
            >
              {t('tryAgain')}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('type.title')}</h2>
              <div className="flex flex-col gap-2">
                {availableTabs.map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveTab(type)}
                    className={`px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                      activeTab === type
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-900 border-2 border-gray-300 hover:bg-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {getTabLabel(type)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('language.title')}</h2>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as Language)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
              >
                <option value="ES">🇪🇸 {commonT('languages.ES')} (Español)</option>
                <option value="EN">🇺🇸 {commonT('languages.EN')}</option>
                <option value="FR">🇫🇷 {commonT('languages.FR')} (Français)</option>
                <option value="IT">🇮🇹 {commonT('languages.IT')} (Italiano)</option>
                <option value="DE">🇩🇪 {commonT('languages.DE')} (Deutsch)</option>
              </select>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('channel.title')}</h2>
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value as TemplateChannel)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
              >
                <option value="EMAIL">{t('channel.email')}</option>
                <option value="WHATSAPP">{t('channel.whatsapp')}</option>
                <option value="SMS">{t('channel.sms')}</option>
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">{t('placeholders.title')}</h3>
              <div className="space-y-2">
                {placeholders.map((placeholder) => (
                  <div key={placeholder.key} className="text-sm">
                    <code className="block bg-white px-2 py-2 rounded border border-blue-200 font-mono text-blue-900">
                      {`{{${placeholder.key}}}`}
                    </code>
                    <p className="text-blue-600 text-xs mt-1">{placeholder.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Template Editor */}
          <div className="lg:col-span-2">
            {currentTemplate ? (
              <TemplateEditor
                key={currentTemplate.id}
                template={currentTemplate}
                channel={selectedChannel}
                apiBaseUrl={apiPaths.apiBase}
                onSave={async (subject, body, contentTemplateId) => {
                  try {
                    const response = await fetch(apiPaths.templateUpdate(currentTemplate.id), {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ subject, body, content_template_id: contentTemplateId }),
                    });
                    if (!response.ok) throw new Error(t('editor.error'));
                    setTemplates(templates.map((tmpl) =>
                      tmpl.id === currentTemplate.id
                        ? { ...tmpl, subject, body, content_template_id: contentTemplateId || null }
                        : tmpl
                    ));
                    alert(t('editor.success'));
                  } catch (err) {
                    alert(err instanceof Error ? err.message : t('editor.error'));
                  }
                }}
                onPreview={() => setPreviewOpen(true)}
                onImageUpdate={fetchTemplates}
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-600 text-sm">
                  {t('editor.notFound', {
                    type: getTabLabel(activeTab),
                    language: commonT(`languages.${selectedLanguage}`),
                    channel: t(`channel.${selectedChannel.toLowerCase()}`),
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {previewOpen && currentTemplate && (
        <TemplatePreview
          templateId={currentTemplate.id}
          language={selectedLanguage}
          apiBaseUrl={apiPaths.apiBase}
          weddingId={apiPaths.weddingId}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
