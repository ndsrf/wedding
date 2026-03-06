/**
 * Planner - Tasting Menu Page
 * /planner/weddings/[id]/tasting
 *
 * Planner view of the tasting menu management for a specific wedding.
 */

'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { MessageTemplate, Language } from '@prisma/client';
import PrivateHeader from '@/components/PrivateHeader';
import { TastingMenuEditor, type TastingMenu } from '@/components/admin/TastingMenuEditor';
import { TastingParticipantManager, type TastingParticipant } from '@/components/admin/TastingParticipantManager';
import { TemplateEditor } from '@/components/admin/TemplateEditor';
import { TemplatePreview } from '@/components/admin/TemplatePreview';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

type Tab = 'menu' | 'participants' | 'template';
type TemplateChannel = 'EMAIL' | 'WHATSAPP' | 'SMS';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PlannerTastingPage({ params }: PageProps) {
  const { id: weddingId } = use(params);
  const t = useTranslations('admin.tastingMenu');
  const templateT = useTranslations('admin.templates');
  const { status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('menu');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weddingName, setWeddingName] = useState('');

  const [menu, setMenu] = useState<TastingMenu | null>(null);
  const [participants, setParticipants] = useState<TastingParticipant[]>([]);

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('ES');
  const [selectedChannel, setSelectedChannel] = useState<TemplateChannel>('WHATSAPP');
  const [previewOpen, setPreviewOpen] = useState(false);

  const apiBase = `/api/planner/weddings/${weddingId}/tasting`;
  const templateApiBase = `/api/planner/weddings/${weddingId}`;

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [menuRes, weddingRes, templatesRes] = await Promise.all([
        fetch(apiBase),
        fetch(`/api/planner/weddings/${weddingId}`),
        fetch(`${templateApiBase}/templates?type=TASTING_MENU&limit=50`),
      ]);

      if (menuRes.ok) {
        const menuData = await menuRes.json();
        if (menuData.success && menuData.data) {
          const { sections, participants: p, ...rest } = menuData.data;
          setMenu({ ...rest, sections: sections ?? [] });
          setParticipants(p ?? []);
        }
      }

      if (weddingRes.ok) {
        const weddingData = await weddingRes.json();
        if (weddingData.success) {
          setWeddingName(weddingData.data?.couple_names ?? '');
        }
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        if (templatesData.success) setTemplates(templatesData.data?.items ?? []);
      }
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }, [apiBase, templateApiBase, weddingId, t]);

  useEffect(() => {
    if (status === 'authenticated') fetchData();
  }, [status, fetchData]);

  const currentTemplate = templates.find(
    tp => tp.type === 'TASTING_MENU' && tp.language === selectedLanguage && tp.channel === selectedChannel
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: 'menu', label: t('tabs.menu') },
    { id: 'participants', label: `${t('tabs.participants')} (${participants.length})` },
    { id: 'template', label: t('tabs.template') },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <PrivateHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href={`/planner/weddings/${weddingId}`} className="text-gray-500 hover:text-gray-700 mr-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🍽️ {t('title')}</h1>
            {weddingName && <p className="mt-0.5 text-sm text-gray-500">{weddingName}</p>}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-rose-500 text-rose-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><WeddingSpinner /></div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button onClick={fetchData} className="mt-4 text-sm text-rose-600 underline">Retry</button>
          </div>
        ) : (
          <>
            {activeTab === 'menu' && (
              <TastingMenuEditor
                menu={menu}
                apiBase={apiBase}
                onMenuChange={setMenu}
              />
            )}

            {activeTab === 'participants' && (
              <TastingParticipantManager
                participants={participants}
                apiBase={apiBase}
                whatsappMode={whatsappMode}
                onParticipantsChange={setParticipants}
              />
            )}

            {activeTab === 'template' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">{templateT('language.title')}</p>
                    <div className="flex gap-2 flex-wrap">
                      {(['ES', 'EN', 'FR', 'IT', 'DE'] as Language[]).map(lang => (
                        <button key={lang} onClick={() => setSelectedLanguage(lang)}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedLanguage === lang ? 'bg-rose-600 text-white border-rose-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">{templateT('channel.title')}</p>
                    <div className="flex gap-2">
                      {(['WHATSAPP', 'EMAIL', 'SMS'] as TemplateChannel[]).map(ch => (
                        <button key={ch} onClick={() => setSelectedChannel(ch)}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedChannel === ch ? 'bg-rose-600 text-white border-rose-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                          {ch === 'WHATSAPP' ? '💬 WhatsApp' : ch === 'EMAIL' ? '✉️ Email' : '📱 SMS'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {currentTemplate ? (
                  <TemplateEditor
                    key={currentTemplate.id}
                    template={currentTemplate}
                    channel={selectedChannel}
                    onSave={async (subject, body, contentTemplateId) => {
                      const res = await fetch(`${templateApiBase}/templates/${currentTemplate.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ subject, body, content_template_id: contentTemplateId }),
                      });
                      if (!res.ok) throw new Error(templateT('editor.error'));
                      setTemplates(prev => prev.map(tp =>
                        tp.id === currentTemplate.id ? { ...tp, subject, body } : tp
                      ));
                    }}
                    onPreview={() => setPreviewOpen(true)}
                    onImageUpdate={fetchData}
                    apiBaseUrl={templateApiBase}
                  />
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <p className="text-gray-500 text-sm mb-4">
                      {templateT('editor.notFound', { type: 'Tasting Menu', language: selectedLanguage, channel: selectedChannel })}
                    </p>
                    <button
                      onClick={async () => {
                        const res = await fetch(`${templateApiBase}/templates`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ type: 'TASTING_MENU', language: selectedLanguage, channel: selectedChannel }),
                        });
                        if (res.ok) fetchData();
                      }}
                      className="px-4 py-2 bg-rose-600 text-white text-sm rounded-md hover:bg-rose-700"
                    >
                      Create Template
                    </button>
                  </div>
                )}

                {previewOpen && currentTemplate && (
                  <TemplatePreview
                    templateId={currentTemplate.id}
                    language={selectedLanguage}
                    onClose={() => setPreviewOpen(false)}
                    apiBaseUrl={templateApiBase}
                  />
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
