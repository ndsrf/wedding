/**
 * Admin Template Management Page
 * /admin/templates
 *
 * Allows wedding admins to view, edit, and preview message templates
 * for invitations and reminders in all supported languages
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import type { MessageTemplate, Language } from '@prisma/client';
import { TemplateEditor } from '@/components/admin/TemplateEditor';
import { TemplatePreview } from '@/components/admin/TemplatePreview';
import { getAvailablePlaceholders } from '@/lib/templates';

type TemplateTypeTab = 'INVITATION' | 'REMINDER' | 'CONFIRMATION';
type TemplateChannel = 'EMAIL' | 'WHATSAPP' | 'SMS';

export default function TemplatesPage() {
  const router = useRouter();
  const { status } = useSession();
  const t = useTranslations('admin.templates');
  const commonT = useTranslations('common');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TemplateTypeTab>('INVITATION');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('ES');
  const [selectedChannel, setSelectedChannel] = useState<TemplateChannel>('EMAIL');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [placeholders] = useState(getAvailablePlaceholders());

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/templates?limit=100');

      if (!response.ok) {
        throw new Error(t('error'));
      }

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
  }, [t]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTemplates();
    }
  }, [status, fetchTemplates, selectedLanguage, selectedChannel, activeTab]);

  // Get templates for current filter
  const filteredTemplates = templates.filter(
    (t) => t.type === activeTab && t.language === selectedLanguage && t.channel === selectedChannel
  );

  // Get single template for editing
  const currentTemplate = filteredTemplates[0];

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <Link href="/admin" className="text-gray-600 hover:text-gray-700 mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
              <p className="mt-1 text-sm text-gray-600">
                {t('description')}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fetchTemplates();
              }}
              className="mt-2 px-4 py-3 text-red-600 hover:text-red-800 font-medium"
            >
              {t('tryAgain')}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Template Selection */}
          <div className="lg:col-span-1">
            {/* Template Type Tabs */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('type.title')}</h2>
              <div className="flex flex-col gap-2">
                {(['INVITATION', 'REMINDER', 'CONFIRMATION'] as TemplateTypeTab[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveTab(type)}
                    className={`px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                      activeTab === type
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-900 border-2 border-gray-300 hover:bg-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {type === 'INVITATION' ? t('type.invitation') : type === 'REMINDER' ? t('type.reminder') : t('type.confirmation')}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selector */}
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

            {/* Channel Selector */}
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

            {/* Placeholders Guide */}
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
                template={currentTemplate}
                channel={selectedChannel}
                onSave={async (subject, body) => {
                  try {
                    const response = await fetch(
                      `/api/admin/templates/${currentTemplate.id}`,
                      {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ subject, body }),
                      }
                    );

                    if (!response.ok) {
                      throw new Error(t('editor.error'));
                    }

                    // Update local state
                    setTemplates(
                      templates.map((tmpl) =>
                        tmpl.id === currentTemplate.id
                          ? { ...tmpl, subject, body }
                          : tmpl
                      )
                    );

                    // Show success
                    alert(t('editor.success'));
                  } catch (err) {
                    alert(
                      err instanceof Error
                        ? err.message
                        : t('editor.error')
                    );
                  }
                }}
                onPreview={() => setPreviewOpen(true)}
                onImageUpdate={() => {
                  // Refetch templates to get updated image URLs
                  fetchTemplates();
                }}
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-600 text-sm">
                  {t('editor.notFound', {
                    type: activeTab === 'INVITATION' ? t('type.invitation') : activeTab === 'REMINDER' ? t('type.reminder') : t('type.confirmation'),
                    language: commonT(`languages.${selectedLanguage}`),
                    channel: t(`channel.${selectedChannel.toLowerCase()}`)
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewOpen && currentTemplate && (
        <TemplatePreview
          templateId={currentTemplate.id}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}