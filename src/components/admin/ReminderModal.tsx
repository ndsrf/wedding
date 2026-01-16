/**
 * Reminder Modal Component
 *
 * Modal for previewing and sending reminders to families without RSVP
 */

'use client';

import React, { useState } from 'react';
import type { Language, Channel } from '@/types/models';

interface ReminderFamily {
  id: string;
  name: string;
  preferred_language: Language;
  channel_preference: Channel | null;
}

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  eligibleFamilies: ReminderFamily[];
  onSendReminders: (channel: Channel) => Promise<void>;
  loading?: boolean;
}

const getLanguageLabel = (lang: Language): string => {
  const labels: Record<Language, string> = {
    ES: 'Spanish',
    EN: 'English',
    FR: 'French',
    IT: 'Italian',
    DE: 'German',
  };
  return labels[lang] || lang;
};

export function ReminderModal({
  isOpen,
  onClose,
  eligibleFamilies,
  onSendReminders,
  loading,
}: ReminderModalProps) {
  const [selectedChannel, setSelectedChannel] = useState<Channel>('EMAIL');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      await onSendReminders(selectedChannel);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reminders');
    } finally {
      setSending(false);
    }
  };

  // Group families by language
  const familiesByLanguage = eligibleFamilies.reduce(
    (acc, family) => {
      const lang = family.preferred_language;
      if (!acc[lang]) acc[lang] = [];
      acc[lang].push(family);
      return acc;
    },
    {} as Record<Language, ReminderFamily[]>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Send Reminders</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading preview...</p>
            </div>
          ) : success ? (
            <div className="py-8 text-center">
              <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Reminders sent!</h3>
              <p className="mt-1 text-sm text-gray-500">
                {eligibleFamilies.length} families will receive reminders.
              </p>
            </div>
          ) : eligibleFamilies.length === 0 ? (
            <div className="py-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">All caught up!</h3>
              <p className="mt-1 text-sm text-gray-500">
                All families have already submitted their RSVP.
              </p>
            </div>
          ) : (
            <>
              {/* Preview Summary */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-medium text-purple-600">{eligibleFamilies.length}</span>{' '}
                  families have not yet responded to the RSVP.
                </p>

                {/* Language breakdown */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                    By Language
                  </p>
                  <div className="space-y-1">
                    {Object.entries(familiesByLanguage).map(([lang, families]) => (
                      <div key={lang} className="flex justify-between text-sm">
                        <span className="text-gray-600">{getLanguageLabel(lang as Language)}</span>
                        <span className="font-medium text-gray-900">{families.length}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Channel Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send via
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['EMAIL', 'WHATSAPP', 'SMS'] as Channel[]).map((channel) => (
                    <button
                      key={channel}
                      onClick={() => setSelectedChannel(channel)}
                      className={`px-4 py-2 text-sm font-medium rounded-md border ${
                        selectedChannel === channel
                          ? 'border-purple-600 bg-purple-50 text-purple-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {channel === 'WHATSAPP' ? 'WhatsApp' : channel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Family Preview (collapsible) */}
              <details className="mb-6">
                <summary className="text-sm text-purple-600 cursor-pointer hover:text-purple-800">
                  View all {eligibleFamilies.length} families
                </summary>
                <div className="mt-2 max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-3">
                  <ul className="space-y-1">
                    {eligibleFamilies.map((family) => (
                      <li key={family.id} className="text-sm text-gray-600">
                        {family.name}
                        <span className="text-gray-400 ml-2">
                          ({getLanguageLabel(family.preferred_language)})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending...' : `Send ${eligibleFamilies.length} Reminders`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
