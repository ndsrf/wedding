/**
 * Bulk Edit Modal Component
 *
 * Modal for editing properties of multiple families at once
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Language, Channel } from '@/types/models';

interface Admin {
  id: string;
  name: string;
  email: string;
}

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  admins: Admin[];
  onSave: (updates: BulkEditUpdates) => Promise<void>;
}

export interface BulkEditUpdates {
  preferred_language?: Language;
  channel_preference?: Channel | null;
  invited_by_admin_id?: string | null;
  set_all_attending?: boolean;
  set_all_not_attending?: boolean;
}

export function BulkEditModal({
  isOpen,
  onClose,
  selectedCount,
  admins,
  onSave,
}: BulkEditModalProps) {
  const t = useTranslations();
  const [language, setLanguage] = useState<Language | ''>('');
  const [channel, setChannel] = useState<Channel | 'none' | ''>('');
  const [invitedBy, setInvitedBy] = useState<string | 'none' | ''>('');
  const [attendance, setAttendance] = useState<'attending' | 'not_attending' | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const updates: BulkEditUpdates = {};

    // Only include fields that have been changed (not empty)
    if (language) {
      updates.preferred_language = language as Language;
    }
    if (channel !== '') {
      updates.channel_preference = channel === 'none' ? null : (channel as Channel);
    }
    if (invitedBy !== '') {
      updates.invited_by_admin_id = invitedBy === 'none' ? null : invitedBy;
    }
    if (attendance === 'attending') {
      updates.set_all_attending = true;
    } else if (attendance === 'not_attending') {
      updates.set_all_not_attending = true;
    }

    // Check if at least one field is selected
    if (Object.keys(updates).length === 0) {
      setError(t('admin.guests.bulkEdit.noChanges'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(updates);
      // Reset form
      setLanguage('');
      setChannel('');
      setInvitedBy('');
      setAttendance('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setLanguage('');
      setChannel('');
      setInvitedBy('');
      setAttendance('');
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                {t('admin.guests.bulkEdit.title')}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {t('admin.guests.bulkEdit.subtitle', { count: selectedCount })}
              </p>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.guests.form.languagePreference')}
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language | '')}
                    disabled={saving}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm disabled:opacity-50"
                  >
                    <option value="">{t('admin.guests.bulkEdit.noChange')}</option>
                    <option value="ES">Español</option>
                    <option value="EN">English</option>
                    <option value="FR">Français</option>
                    <option value="IT">Italiano</option>
                    <option value="DE">Deutsch</option>
                  </select>
                </div>

                {/* Channel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.guests.form.preferredChannel')}
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as Channel | 'none' | '')}
                    disabled={saving}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm disabled:opacity-50"
                  >
                    <option value="">{t('admin.guests.bulkEdit.noChange')}</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="none">{t('admin.guests.bulkEdit.clearValue')}</option>
                  </select>
                </div>

                {/* Invited By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.guests.invitedBy')}
                  </label>
                  <select
                    value={invitedBy}
                    onChange={(e) => setInvitedBy(e.target.value)}
                    disabled={saving}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm disabled:opacity-50"
                  >
                    <option value="">{t('admin.guests.bulkEdit.noChange')}</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name || admin.email}
                      </option>
                    ))}
                    <option value="none">{t('admin.guests.bulkEdit.clearValue')}</option>
                  </select>
                </div>

                {/* Attendance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.guests.bulkEdit.attendanceStatus')}
                  </label>
                  <select
                    value={attendance}
                    onChange={(e) => setAttendance(e.target.value as 'attending' | 'not_attending' | '')}
                    disabled={saving}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm disabled:opacity-50"
                  >
                    <option value="">{t('admin.guests.bulkEdit.noChange')}</option>
                    <option value="attending">{t('admin.guests.bulkEdit.setAllAttending')}</option>
                    <option value="not_attending">{t('admin.guests.bulkEdit.setAllNotAttending')}</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {t('admin.guests.bulkEdit.attendanceNote')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('common.buttons.save') + '...' : t('common.buttons.save')}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.buttons.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
