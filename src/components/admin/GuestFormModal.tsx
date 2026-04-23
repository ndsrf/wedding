/**
 * Guest Form Modal Component
 *
 * Modal for adding/editing guest families with members
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { FamilyMemberForm, type FamilyMemberFormData } from './FamilyMemberForm';
import type { Language, Channel, GuestLabel } from '@/types/models';

interface GuestFormData {
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  channel_preference?: Channel | null;
  preferred_language: Language;
  invited_by_admin_id?: string | null;
  private_notes?: string | null;
  label_ids?: string[];
  members: FamilyMemberFormData[];
  // RSVP Question Answers
  transportation_answer?: boolean | null;
  extra_question_1_answer?: boolean | null;
  extra_question_2_answer?: boolean | null;
  extra_question_3_answer?: boolean | null;
  extra_info_1_value?: string | null;
  extra_info_2_value?: string | null;
  extra_info_3_value?: string | null;
}

interface WeddingQuestionConfig {
  transportation_question_enabled: boolean;
  transportation_question_text: string | null;
  extra_question_1_enabled: boolean;
  extra_question_1_text: string | null;
  extra_question_2_enabled: boolean;
  extra_question_2_text: string | null;
  extra_question_3_enabled: boolean;
  extra_question_3_text: string | null;
  extra_info_1_enabled: boolean;
  extra_info_1_label: string | null;
  extra_info_2_enabled: boolean;
  extra_info_2_label: string | null;
  extra_info_3_enabled: boolean;
  extra_info_3_label: string | null;
}

interface GuestFormModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialData?: GuestFormData;
  admins: Array<{ id: string; name: string; email: string }>;
  labels?: GuestLabel[];
  onCreateLabel?: (name: string) => Promise<GuestLabel>;
  weddingConfig?: WeddingQuestionConfig;
  onSubmit: (data: GuestFormData) => Promise<void>;
  onCancel: () => void;
}

const defaultFormData: GuestFormData = {
  name: '',
  email: null,
  phone: null,
  whatsapp_number: null,
  channel_preference: null,
  preferred_language: 'ES',
  invited_by_admin_id: null,
  private_notes: null,
  label_ids: [],
  members: [],
  // RSVP Question Answers
  transportation_answer: null,
  extra_question_1_answer: null,
  extra_question_2_answer: null,
  extra_question_3_answer: null,
  extra_info_1_value: null,
  extra_info_2_value: null,
  extra_info_3_value: null,
};

export function GuestFormModal({
  isOpen,
  mode,
  initialData,
  admins,
  labels = [],
  onCreateLabel,
  weddingConfig,
  onSubmit,
  onCancel,
}: GuestFormModalProps) {
  const t = useTranslations();
  const [formData, setFormData] = useState<GuestFormData>(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newLabelInput, setNewLabelInput] = useState('');
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [localLabels, setLocalLabels] = useState<GuestLabel[]>([]);

  // Sync localLabels when the prop changes (parent fetches new labels)
  useEffect(() => {
    setLocalLabels(labels);
  }, [labels]);

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      const data = initialData || defaultFormData;
      // In add mode, default invited_by_admin_id to first admin
      if (mode === 'add' && !data.invited_by_admin_id && admins.length > 0) {
        setFormData({ ...data, invited_by_admin_id: admins[0].id });
      } else {
        setFormData(data);
      }
      setError(null);
      setNewLabelInput('');
    }
  }, [isOpen, initialData, mode, admins]);

  const handleCreateLabel = async () => {
    const name = newLabelInput.trim();
    if (!name || !onCreateLabel) return;
    setCreatingLabel(true);
    try {
      const newLabel = await onCreateLabel(name);
      setLocalLabels((prev) => [...prev, newLabel]);
      setFormData((prev) => ({ ...prev, label_ids: [...(prev.label_ids || []), newLabel.id] }));
      setNewLabelInput('');
    } catch {
      // silently ignore; parent can show a toast if needed
    } finally {
      setCreatingLabel(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!formData.name.trim()) {
      setError(t('admin.guests.form.familyNameRequired'));
      return;
    }

    // Validate members
    const activeMembers = formData.members.filter((m) => !m._delete);
    for (const member of activeMembers) {
      if (!member.name.trim()) {
        setError(t('admin.guests.form.memberNameRequired'));
        return;
      }
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      // Success - parent will close modal
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.guests.form.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-start justify-center p-4">
      {/* Backdrop (clickable area outside modal) */}
      <div className="fixed inset-0" onClick={onCancel} aria-hidden="true" />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
        <form onSubmit={handleSubmit} className="p-6" noValidate>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'add' ? t('admin.guests.form.addTitle') : t('admin.guests.form.editTitle')}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Family Name */}
            <div>
              <label htmlFor="guest-family-name" className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.guests.familyName')} <span className="text-red-500">*</span>
              </label>
              <input
                id="guest-family-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                required
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="guest-email" className="block text-sm font-medium text-gray-700 mb-1">{t('admin.guests.email')}</label>
                <input
                  id="guest-email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value || null })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="guest-phone" className="block text-sm font-medium text-gray-700 mb-1">{t('admin.guests.phone')}</label>
                <input
                  id="guest-phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value || null })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="guest-whatsapp" className="block text-sm font-medium text-gray-700 mb-1">{t('admin.guests.whatsapp')}</label>
                <input
                  id="guest-whatsapp"
                  type="tel"
                  value={formData.whatsapp_number || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsapp_number: e.target.value || null })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="guest-channel" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.guests.form.preferredChannel')}
                </label>
                <select
                  id="guest-channel"
                  value={formData.channel_preference || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      channel_preference: (e.target.value as Channel) || null,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                >
                  <option value="">{t('common.channels.none')}</option>
                  <option value="WHATSAPP">{t('common.channels.WHATSAPP')}</option>
                  <option value="EMAIL">{t('common.channels.EMAIL')}</option>
                  <option value="SMS">{t('common.channels.SMS')}</option>
                </select>
              </div>
            </div>

            {/* Language Preference */}
            <div>
              <label htmlFor="guest-language" className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.guests.form.languagePreference')}
              </label>
              <select
                id="guest-language"
                value={formData.preferred_language}
                onChange={(e) =>
                  setFormData({ ...formData, preferred_language: e.target.value as Language })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                required
              >
                <option value="ES">{t('common.languages.ES')}</option>
                <option value="EN">{t('common.languages.EN')}</option>
                <option value="FR">{t('common.languages.FR')}</option>
                <option value="IT">{t('common.languages.IT')}</option>
                <option value="DE">{t('common.languages.DE')}</option>
              </select>
            </div>

            {/* Invited By */}
            {admins.length > 0 && (
              <div>
                <label htmlFor="guest-invited-by" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.guests.invitedBy')}
                </label>
                <select
                  id="guest-invited-by"
                  value={formData.invited_by_admin_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, invited_by_admin_id: e.target.value || null })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                >
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name || admin.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Labels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.guests.labels.title')}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {localLabels.map((label) => {
                  const isSelected = (formData.label_ids || []).includes(label.id);
                  const style = label.color
                    ? {
                        backgroundColor: isSelected ? label.color + '33' : 'transparent',
                        color: label.color,
                        borderColor: label.color + (isSelected ? 'aa' : '55'),
                      }
                    : undefined;
                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => {
                        const current = formData.label_ids || [];
                        setFormData({
                          ...formData,
                          label_ids: isSelected
                            ? current.filter((id) => id !== label.id)
                            : [...current, label.id],
                        });
                      }}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                        !label.color
                          ? isSelected
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                          : ''
                      }`}
                      style={style}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 mr-1.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {label.name}
                    </button>
                  );
                })}
              </div>
              {onCreateLabel && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLabelInput}
                    onChange={(e) => setNewLabelInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        await handleCreateLabel();
                      }
                    }}
                    placeholder={t('admin.guests.labels.createNew')}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                    disabled={creatingLabel}
                  />
                  <button
                    type="button"
                    onClick={handleCreateLabel}
                    disabled={creatingLabel || !newLabelInput.trim()}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingLabel ? '…' : '+'}
                  </button>
                </div>
              )}
            </div>

            {/* Private Notes */}
            <div>
              <label htmlFor="guest-private-notes" className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.guests.form.privateNotes')}
              </label>
              <textarea
                id="guest-private-notes"
                rows={3}
                value={formData.private_notes || ''}
                onChange={(e) =>
                  setFormData({ ...formData, private_notes: e.target.value || null })
                }
                placeholder={t('admin.guests.form.privateNotesPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('admin.guests.form.privateNotesHelp')}
              </p>
            </div>

            {/* RSVP Question Answers - Only show in edit mode when questions are configured */}
            {mode === 'edit' && weddingConfig && (
              weddingConfig.transportation_question_enabled ||
              weddingConfig.extra_question_1_enabled ||
              weddingConfig.extra_question_2_enabled ||
              weddingConfig.extra_question_3_enabled ||
              weddingConfig.extra_info_1_enabled ||
              weddingConfig.extra_info_2_enabled ||
              weddingConfig.extra_info_3_enabled
            ) && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  {t('admin.guests.form.rsvpAnswers')}
                </h3>
                <div className="space-y-3">
                  {/* Transportation Question */}
                  {weddingConfig.transportation_question_enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {weddingConfig.transportation_question_text || t('guest.rsvp.defaultTransportationQuestion')}
                      </label>
                      <select
                        value={formData.transportation_answer === null ? '' : formData.transportation_answer ? 'yes' : 'no'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            transportation_answer: e.target.value === '' ? null : e.target.value === 'yes',
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      >
                        <option value="">-</option>
                        <option value="yes">{t('common.yes')}</option>
                        <option value="no">{t('common.no')}</option>
                      </select>
                    </div>
                  )}

                  {/* Extra Question 1 */}
                  {weddingConfig.extra_question_1_enabled && weddingConfig.extra_question_1_text && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {weddingConfig.extra_question_1_text}
                      </label>
                      <select
                        value={formData.extra_question_1_answer === null ? '' : formData.extra_question_1_answer ? 'yes' : 'no'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            extra_question_1_answer: e.target.value === '' ? null : e.target.value === 'yes',
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      >
                        <option value="">-</option>
                        <option value="yes">{t('common.yes')}</option>
                        <option value="no">{t('common.no')}</option>
                      </select>
                    </div>
                  )}

                  {/* Extra Question 2 */}
                  {weddingConfig.extra_question_2_enabled && weddingConfig.extra_question_2_text && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {weddingConfig.extra_question_2_text}
                      </label>
                      <select
                        value={formData.extra_question_2_answer === null ? '' : formData.extra_question_2_answer ? 'yes' : 'no'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            extra_question_2_answer: e.target.value === '' ? null : e.target.value === 'yes',
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      >
                        <option value="">-</option>
                        <option value="yes">{t('common.yes')}</option>
                        <option value="no">{t('common.no')}</option>
                      </select>
                    </div>
                  )}

                  {/* Extra Question 3 */}
                  {weddingConfig.extra_question_3_enabled && weddingConfig.extra_question_3_text && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {weddingConfig.extra_question_3_text}
                      </label>
                      <select
                        value={formData.extra_question_3_answer === null ? '' : formData.extra_question_3_answer ? 'yes' : 'no'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            extra_question_3_answer: e.target.value === '' ? null : e.target.value === 'yes',
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      >
                        <option value="">-</option>
                        <option value="yes">{t('common.yes')}</option>
                        <option value="no">{t('common.no')}</option>
                      </select>
                    </div>
                  )}

                  {/* Extra Info 1 */}
                  {weddingConfig.extra_info_1_enabled && weddingConfig.extra_info_1_label && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {weddingConfig.extra_info_1_label}
                      </label>
                      <input
                        type="text"
                        value={formData.extra_info_1_value || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, extra_info_1_value: e.target.value || null })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      />
                    </div>
                  )}

                  {/* Extra Info 2 */}
                  {weddingConfig.extra_info_2_enabled && weddingConfig.extra_info_2_label && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {weddingConfig.extra_info_2_label}
                      </label>
                      <input
                        type="text"
                        value={formData.extra_info_2_value || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, extra_info_2_value: e.target.value || null })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      />
                    </div>
                  )}

                  {/* Extra Info 3 */}
                  {weddingConfig.extra_info_3_enabled && weddingConfig.extra_info_3_label && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {weddingConfig.extra_info_3_label}
                      </label>
                      <input
                        type="text"
                        value={formData.extra_info_3_value || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, extra_info_3_value: e.target.value || null })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Family Members */}
            <div className="border-t border-gray-200 pt-4">
              <FamilyMemberForm
                members={formData.members}
                onChange={(members) => setFormData({ ...formData, members })}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {t('common.buttons.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {loading ? t('admin.guests.form.saving') : mode === 'add' ? t('admin.guests.form.addGuest') : t('admin.guests.form.saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
