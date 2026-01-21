/**
 * Template Editor Component
 * Allows editing of template subject and body with live character count
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MessageTemplate } from '@prisma/client';

interface TemplateEditorProps {
  template: MessageTemplate;
  channel?: 'EMAIL' | 'WHATSAPP' | 'SMS';
  onSave: (subject: string, body: string) => Promise<void>;
  onPreview: () => void;
}

export function TemplateEditor({
  template,
  channel = 'EMAIL',
  onSave,
  onPreview,
}: TemplateEditorProps) {
  const t = useTranslations('admin.templates.editor');
  const tChannel = useTranslations('admin.templates.channel');
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Get channel-specific labels
  const getChannelLabel = () => {
    switch (channel) {
      case 'WHATSAPP':
        return tChannel('whatsapp');
      case 'SMS':
        return tChannel('sms');
      default:
        return tChannel('email');
    }
  };

  const channelLabel = getChannelLabel();

  const handleSubjectChange = (value: string) => {
    setSubject(value);
    setHasChanges(true);
  };

  const handleBodyChange = (value: string) => {
    setBody(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(subject, body);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSubject(template.subject);
    setBody(template.body);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Channel Info Badge */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900">
          {t.rich('channelInfo', {
            channel: channelLabel,
            strong: (chunks) => <strong>{chunks}</strong>
          })}
        </p>
      </div>

      {/* Subject Field - Only for Email */}
      {channel === 'EMAIL' && (
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
            {t('subject')}
          </label>
          <input
            type="text"
            id="subject"
            value={subject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            maxLength={200}
          />
          <p className="mt-1 text-sm text-gray-500">
            {t('chars', { current: subject.length, max: 200 })}
          </p>
        </div>
      )}

      {/* Body Field */}
      <div>
        <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-2">
          {t('body', { channel: channelLabel })}
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => handleBodyChange(e.target.value)}
          rows={12}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
          maxLength={5000}
        />
        <p className="mt-1 text-sm text-gray-500">
           {t('chars', { current: body.length, max: 5000 })}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSaving ? t('saving') : t('save')}
        </button>
        <button
          onClick={onPreview}
          className="flex-1 px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          {t('preview')}
        </button>
        {hasChanges && (
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            {t('reset')}
          </button>
        )}
      </div>

      {/* Information Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          {t.rich('tip', {
            code: (chunks) => <code className="bg-white px-1 rounded">{chunks}</code>
          })}
        </p>
      </div>
    </div>
  );
}