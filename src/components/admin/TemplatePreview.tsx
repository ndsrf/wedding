/**
 * Template Preview Component
 * Modal for previewing rendered templates with sample data
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

interface TemplatePreviewProps {
  templateId: string;
  onClose: () => void;
}

export function TemplatePreview({
  templateId,
  onClose,
}: TemplatePreviewProps) {
  const { data: session } = useSession();
  const t = useTranslations('admin.templates.preview');
  const [preview, setPreview] = useState<{
    subject: string;
    body: string;
    image_url: string | null;
    channel: string;
    variables: Record<string, string>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!session?.user?.wedding_id) {
        setError('Wedding ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/admin/templates/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_id: templateId,
            wedding_id: session.user.wedding_id,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate preview');
        }

        const data = await response.json();
        if (data.success) {
          setPreview(data.data);
        } else {
          setError(data.error?.message || 'Failed to generate preview');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [templateId, session?.user?.wedding_id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 p-6 bg-white">
          <h2 className="text-xl font-bold text-gray-900">{t('title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-gray-600">{t('loading')}</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {preview && (
            <div className="space-y-6">
              {/* Variables Used */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">{t('variables')}</h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 grid grid-cols-2 gap-4">
                  {Object.entries(preview.variables).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs font-mono text-blue-900">
                        {`{{${key}}}`}
                      </p>
                      <p className="text-sm text-blue-700 mt-1">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Channel-Specific Preview */}
              {preview.channel === 'EMAIL' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Email Preview</h3>
                  <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg">
                    {/* Email Client Header */}
                    <div className="bg-gray-100 p-3 border-b border-gray-300">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                          W
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Wedding Invitation</p>
                          <p className="text-xs text-gray-600">wedding@example.com</p>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-2">{preview.subject}</p>
                    </div>

                    {/* Email Body */}
                    <div className="p-6 bg-white">
                      {preview.image_url && (
                        <div className="mb-4">
                          <img
                            src={preview.image_url}
                            alt="Template"
                            className="w-full rounded-lg"
                          />
                        </div>
                      )}
                      <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
                        {preview.body}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {preview.channel === 'WHATSAPP' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">WhatsApp Preview</h3>
                  <div className="mx-auto max-w-sm">
                    {/* Phone Mockup */}
                    <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                      <div className="bg-white rounded-[2.5rem] overflow-hidden">
                        {/* Phone Header */}
                        <div className="bg-[#075E54] text-white p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                            <div>
                              <p className="font-semibold text-sm">Wedding Invitation</p>
                              <p className="text-xs opacity-80">Online</p>
                            </div>
                          </div>
                        </div>

                        {/* Chat Area */}
                        <div className="bg-[#E5DDD5] p-4 min-h-[400px]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23E5DDD5\'/%3E%3Cpath d=\'M50 0L0 50M100 0L50 50M100 50L50 100M50 50L0 100\' stroke=\'%23D1C7B8\' stroke-width=\'0.5\' opacity=\'0.1\'/%3E%3C/svg%3E")' }}>
                          {/* Message Bubble */}
                          <div className="flex justify-start mb-2">
                            <div className="bg-white rounded-lg p-3 max-w-[85%] shadow-sm">
                              {preview.image_url && (
                                <div className="mb-2 -m-3 mb-3">
                                  <img
                                    src={preview.image_url}
                                    alt="Template"
                                    className="w-full rounded-t-lg"
                                  />
                                </div>
                              )}
                              <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                                {preview.body}
                              </p>
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-[10px] text-gray-500">
                                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Phone Footer */}
                        <div className="bg-[#F0F0F0] p-2 border-t border-gray-300">
                          <div className="bg-white rounded-full px-4 py-2 flex items-center gap-2">
                            <span className="text-gray-400 text-xs">Type a message</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {preview.channel === 'SMS' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">SMS Preview</h3>
                  <div className="mx-auto max-w-sm">
                    {/* Phone Mockup */}
                    <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                      <div className="bg-white rounded-[2.5rem] overflow-hidden">
                        {/* Phone Header */}
                        <div className="bg-gray-50 border-b border-gray-200 p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                              W
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-gray-900">Wedding Invitation</p>
                              <p className="text-xs text-gray-500">SMS Message</p>
                            </div>
                          </div>
                        </div>

                        {/* SMS Area */}
                        <div className="bg-white p-4 min-h-[400px]">
                          {/* Message Bubble */}
                          <div className="flex justify-start mb-2">
                            <div className="bg-gray-200 rounded-2xl rounded-tl-sm p-3 max-w-[85%]">
                              <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                                {preview.body}
                              </p>
                              <div className="flex items-center justify-end mt-1">
                                <span className="text-[10px] text-gray-500">
                                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Phone Footer */}
                        <div className="bg-gray-50 p-2 border-t border-gray-200">
                          <div className="bg-white rounded-full px-4 py-2 border border-gray-300">
                            <span className="text-gray-400 text-xs">Text Message</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}