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
              {/* Subject Preview */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">{t('subject')}</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-900 font-medium">{preview.subject}</p>
                </div>
              </div>

              {/* Body Preview */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">{t('body')}</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap text-gray-900 text-sm leading-relaxed">
                  {preview.body}
                </div>
              </div>

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

              {/* Email Client Preview */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">{t('emailClient')}</h3>
                <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm">
                  {/* Email Header */}
                  <div className="bg-gray-100 p-3 border-b border-gray-300 text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{t('from')}</p>
                        <p className="text-gray-600 text-xs">{t('subject')}: {preview.subject}</p>
                      </div>
                    </div>
                  </div>

                  {/* Email Body */}
                  <div className="p-6 bg-white">
                    <div className="max-w-md whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
                      {preview.body}
                    </div>
                  </div>
                </div>
              </div>
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