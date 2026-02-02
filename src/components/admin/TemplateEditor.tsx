/**
 * Template Editor Component
 * Allows editing of template subject and body with live character count
 */

'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { MessageTemplate } from '@prisma/client';

interface TemplateEditorProps {
  template: MessageTemplate;
  channel?: 'EMAIL' | 'WHATSAPP' | 'SMS';
  onSave: (subject: string, body: string, contentTemplateId?: string | null) => Promise<void>;
  onPreview: () => void;
  onImageUpdate?: () => void;
}

export function TemplateEditor({
  template,
  channel = 'EMAIL',
  onSave,
  onPreview,
  onImageUpdate,
}: TemplateEditorProps) {
  const t = useTranslations('admin.templates.editor');
  const tChannel = useTranslations('admin.templates.channel');
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [contentTemplateId, setContentTemplateId] = useState((template as any).content_template_id || null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [imageUrl, setImageUrl] = useState(template.image_url);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmationData, setConfirmationData] = useState<{
    requiresConfirmation: boolean;
    message: string;
    templatesWithImages: Array<{ id: string; language: string; channel: string }>;
    imageUrl: string;
    processedImage: { width: number; height: number; aspectRatio: string };
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleContentTemplateIdChange = (value: string) => {
    setContentTemplateId(value || null);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(subject, body, contentTemplateId);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSubject(template.subject);
    setBody(template.body);
    setContentTemplateId((template as any).content_template_id || null);
    setHasChanges(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setUploadError(null);
    setConfirmationData(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('applyToAll', applyToAll.toString());

      const response = await fetch(`/api/admin/templates/${template.id}/image`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        setUploadError(result.error?.message || 'Failed to upload image');
        return;
      }

      // Check if confirmation is required
      if (result.requiresConfirmation) {
        setConfirmationData(result);
        return;
      }

      // Update local state
      setImageUrl(result.data?.imageUrl || result.imageUrl);
      onImageUpdate?.();
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmApplyToAll = async () => {
    if (!confirmationData) return;

    setIsUploadingImage(true);
    try {
      const response = await fetch(`/api/admin/templates/${template.id}/image`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: confirmationData.imageUrl,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setImageUrl(confirmationData.imageUrl);
        setConfirmationData(null);
        onImageUpdate?.();
      } else {
        setUploadError(result.error?.message || 'Failed to apply image to all templates');
      }
    } catch (error) {
      console.error('Error confirming image upload:', error);
      setUploadError('Failed to apply image to all templates');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCancelConfirmation = () => {
    setConfirmationData(null);
  };

  const handleDeleteImage = async () => {
    if (!imageUrl) return;

    const confirmDelete = window.confirm(
      applyToAll
        ? 'Are you sure you want to remove this image from all templates?'
        : 'Are you sure you want to remove this image?'
    );

    if (!confirmDelete) return;

    setIsUploadingImage(true);
    setUploadError(null);

    try {
      const queryParams = applyToAll ? '?removeFromAll=true' : '';
      const response = await fetch(`/api/admin/templates/${template.id}/image${queryParams}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setImageUrl(null);
        onImageUpdate?.();
      } else {
        setUploadError(result.error?.message || 'Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      setUploadError('Failed to delete image');
    } finally {
      setIsUploadingImage(false);
    }
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

      {/* WhatsApp Template Warning */}
      {channel === 'WHATSAPP' && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900 mb-1">
                WhatsApp Template Approval Required
              </h4>
              <p className="text-sm text-amber-800">
                WhatsApp templates must be approved by Meta before they can be used. Changes made in this editor will not take effect until the template is submitted to and approved by Meta through the Twilio Console. Use this editor for reference only.
              </p>
              <a
                href="https://console.twilio.com/us1/develop/sms/content-editor"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center mt-2 text-sm font-medium text-amber-700 hover:text-amber-900 underline"
              >
                Manage WhatsApp Templates in Twilio Console
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Content Template ID - Only for WhatsApp */}
      {channel === 'WHATSAPP' && (
        <div>
          <label htmlFor="contentTemplateId" className="block text-sm font-medium text-gray-700 mb-2">
            Content Template ID (optional)
          </label>
          <input
            type="text"
            id="contentTemplateId"
            value={contentTemplateId || ''}
            onChange={(e) => handleContentTemplateIdChange(e.target.value)}
            placeholder="e.g., HXXXXXXXXXXXXXXXXXXXXXXXXXX"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
            maxLength={100}
          />
          <p className="mt-1 text-sm text-gray-500">
            Enter the Content SID from Twilio Console for Meta-approved template variables
          </p>
        </div>
      )}

      {/* WhatsApp Variable Mapping - Only for WhatsApp */}
      {channel === 'WHATSAPP' && (
        <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
          <h3 className="text-sm font-semibold text-purple-900 mb-3">
            WhatsApp Variable Mapping
          </h3>
          <p className="text-xs text-purple-800 mb-3">
            If you use a Content Template ID, variables will be mapped as follows:
          </p>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 mb-2 pb-2 border-b border-purple-200">
              <div className="text-xs font-semibold text-purple-900">App Variable</div>
              <div className="text-xs font-semibold text-purple-900">WhatsApp Var</div>
              <div className="text-xs font-semibold text-purple-900">Description</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs text-purple-800 font-mono">familyName</div>
              <div className="text-xs text-purple-800 font-mono">{'{{1}}'}</div>
              <div className="text-xs text-purple-700">Family name</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs text-purple-800 font-mono">coupleNames</div>
              <div className="text-xs text-purple-800 font-mono">{'{{2}}'}</div>
              <div className="text-xs text-purple-700">Couple names</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs text-purple-800 font-mono">weddingDate</div>
              <div className="text-xs text-purple-800 font-mono">{'{{3}}'}</div>
              <div className="text-xs text-purple-700">Wedding date</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs text-purple-800 font-mono">weddingTime</div>
              <div className="text-xs text-purple-800 font-mono">{'{{4}}'}</div>
              <div className="text-xs text-purple-700">Wedding time</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs text-purple-800 font-mono">inviteImageName</div>
              <div className="text-xs text-purple-800 font-mono">{'{{5}}'}</div>
              <div className="text-xs text-purple-700">Image filename</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs text-purple-800 font-mono">magicLink</div>
              <div className="text-xs text-purple-800 font-mono">{'{{6}}'}</div>
              <div className="text-xs text-purple-700">RSVP link</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs text-purple-800 font-mono">rsvpCutoffDate</div>
              <div className="text-xs text-purple-800 font-mono">{'{{7}}'}</div>
              <div className="text-xs text-purple-700">Cutoff date</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs text-purple-800 font-mono">referenceCode</div>
              <div className="text-xs text-purple-800 font-mono">{'{{8}}'}</div>
              <div className="text-xs text-purple-700">Reference code</div>
            </div>
          </div>
          <p className="text-xs text-purple-700 mt-3 italic">
            Note: The body field above is for reference only. When using a Content Template ID, the actual message content comes from Meta&apos;s approved template.
          </p>
        </div>
      )}

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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
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
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm bg-white text-gray-900"
          maxLength={5000}
        />
        <p className="mt-1 text-sm text-gray-500">
           {t('chars', { current: body.length, max: 5000 })}
        </p>
      </div>

      {/* Image Upload Section - Only for Email and WhatsApp */}
      {(channel === 'EMAIL' || channel === 'WHATSAPP') && (
        <div className="border border-gray-300 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Template Image
            </label>
            {imageUrl && (
              <button
                onClick={handleDeleteImage}
                disabled={isUploadingImage}
                className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                Remove Image
              </button>
            )}
          </div>

          {imageUrl && (
            <div className="relative w-full max-w-md aspect-video">
              <Image
                src={imageUrl}
                alt="Template"
                fill
                sizes="(max-width: 768px) 100vw, 448px"
                className="object-contain rounded-lg border border-gray-200"
              />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="applyToAll"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="applyToAll" className="text-sm text-gray-700">
                Apply to all templates (Invitations, Reminders & Confirmations, all channels and languages)
              </label>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                disabled={isUploadingImage}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              <p className="mt-2 text-xs text-gray-500">
                Supported formats: JPG, PNG, WebP, GIF. Required aspect ratio: 1:1 (square) or 16:9 (wide).
                Images will be automatically converted to PNG and resized.
              </p>
            </div>

            {isUploadingImage && (
              <p className="text-sm text-blue-600">Uploading image...</p>
            )}

            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{uploadError}</p>
              </div>
            )}

            {confirmationData && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <p className="text-sm text-yellow-800 font-medium">
                  {confirmationData.message}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmApplyToAll}
                    disabled={isUploadingImage}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50"
                  >
                    Yes, Replace All
                  </button>
                  <button
                    onClick={handleCancelConfirmation}
                    disabled={isUploadingImage}
                    className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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