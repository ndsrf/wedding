/**
 * Reminder Modal Component
 *
 * Modal for previewing and sending reminders to families without RSVP
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Language, Channel } from '@/types/models';
import type { ValidateRemindersResult } from '@/types/api';

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
  onSendReminders: (channel: Channel | 'PREFERRED', validFamilyIds?: string[]) => Promise<void>;
  loading?: boolean;
  weddingGiftIban?: string | null;
}

export function ReminderModal({
  isOpen,
  onClose,
  eligibleFamilies,
  onSendReminders,
  loading,
  weddingGiftIban,
}: ReminderModalProps) {
  const t = useTranslations();
  const [selectedChannel, setSelectedChannel] = useState<Channel | 'PREFERRED'>('PREFERRED');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showIbanWarning, setShowIbanWarning] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidateRemindersResult | null>(null);
  const [showValidationWarning, setShowValidationWarning] = useState(false);

  if (!isOpen) return null;

  const validateChannel = async () => {
    setError(null);
    try {
      const response = await fetch('/api/admin/reminders/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: selectedChannel,
          family_ids: eligibleFamilies.map(f => f.id),
        }),
      });
      const data = await response.json();
      console.log('[ReminderModal] Validation response:', data);

      if (data.success) {
        console.log('[ReminderModal] Invalid families:', data.data.invalid_families);
        setValidationResult(data.data);
        if (data.data.invalid_families.length > 0) {
          setShowValidationWarning(true);
          return false; // Validation failed
        }
        return true; // Validation passed
      }
      throw new Error(data.error?.message || t('common.errors.generic'));
    } catch (err) {
      console.error('[ReminderModal] Validation error:', err);
      setError(err instanceof Error ? err.message : t('common.errors.generic'));
      return false;
    }
  };

  const handleSend = async () => {
    // Check if IBAN is empty and warning hasn't been shown yet
    if (!weddingGiftIban && !showIbanWarning) {
      setShowIbanWarning(true);
      return;
    }

    // Validate channel before sending
    const isValid = await validateChannel();
    if (!isValid) {
      return; // Show validation warning, wait for user action
    }

    setSending(true);
    setError(null);
    try {
      await onSendReminders(selectedChannel);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setShowIbanWarning(false);
        setShowValidationWarning(false);
        setValidationResult(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errors.generic'));
    } finally {
      setSending(false);
    }
  };

  const handleContinueWithInvalidFamilies = async () => {
    if (!validationResult) return;
    setShowValidationWarning(false);
    setSending(true);
    setError(null);
    try {
      // Send only to valid families
      const validFamilyIds = validationResult.valid_families.map(f => f.id);
      await onSendReminders(selectedChannel, validFamilyIds);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setShowValidationWarning(false);
        setValidationResult(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errors.generic'));
    } finally {
      setSending(false);
    }
  };

  const handleCancelWarning = () => {
    setShowIbanWarning(false);
    onClose();
  };

  const handleContinueWithoutIban = () => {
    setShowIbanWarning(false);
    // Proceed with sending
    handleSend();
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
            <h3 className="text-lg font-medium text-gray-900">{t('admin.reminders.send')}</h3>
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
              <p className="mt-4 text-gray-500">{t('admin.reminders.loadingPreview')}</p>
            </div>
          ) : success ? (
            <div className="py-8 text-center">
              <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('admin.reminders.sendSuccess')}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {t('admin.reminders.sendSuccessDesc', { count: eligibleFamilies.length })}
              </p>
            </div>
          ) : eligibleFamilies.length === 0 ? (
            <div className="py-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('admin.reminders.allCaughtUp')}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {t('admin.reminders.allCaughtUpDesc')}
              </p>
            </div>
          ) : showValidationWarning && validationResult ? (
            <>
              {/* Validation Warning */}
              <div className="py-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900 text-center">{t('admin.reminders.validationWarning.title')}</h3>
                  <p className="mt-2 text-sm text-gray-500 text-center">
                    {t('admin.reminders.validationWarning.message')}
                  </p>

                  {/* Summary count */}
                  <div className="mt-4 text-center text-sm font-medium text-red-700">
                    {validationResult.invalid_families.length} {validationResult.invalid_families.length === 1 ? 'family' : 'families'} missing required information
                  </div>

                  {/* List of families with missing info */}
                  {validationResult.invalid_families.length > 0 && (
                    <div className="mt-4 max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-4 border border-red-200">
                      <ul className="space-y-3">
                        {validationResult.invalid_families.map((family) => (
                          <li key={family.id} className="text-sm border-l-4 border-red-400 pl-3 py-2">
                            <div className="font-semibold text-gray-900 text-base">{family.name || `Family ${family.id}`}</div>
                            <div className="flex flex-col gap-1 mt-1">
                              <span className="text-red-600 font-medium text-sm">
                                {t(`admin.reminders.validationWarning.missing_${family.missing_info}`)}
                              </span>
                              {selectedChannel === 'PREFERRED' && family.expected_channel && (
                                <span className="text-gray-600 text-xs">
                                  Expected channel: {t(`common.channels.${family.expected_channel}`)}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Warning Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowValidationWarning(false);
                    setValidationResult(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {t('common.buttons.cancel')}
                </button>
                <button
                  onClick={handleContinueWithInvalidFamilies}
                  disabled={sending}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? t('admin.reminders.sending') : t('admin.reminders.sendToValidOnly', { count: validationResult.summary.valid })}
                </button>
              </div>
            </>
          ) : showIbanWarning ? (
            <>
              {/* IBAN Warning */}
              <div className="py-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="mt-4 text-center">
                  <h3 className="text-lg font-medium text-gray-900">{t('admin.reminders.ibanWarning.title')}</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {t('admin.reminders.ibanWarning.message')}
                  </p>
                </div>
              </div>

              {/* Warning Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancelWarning}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {t('common.buttons.cancel')}
                </button>
                <button
                  onClick={handleContinueWithoutIban}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700"
                >
                  {t('common.buttons.continue')}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Preview Summary */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  {t.rich('admin.reminders.summary', {
                    count: eligibleFamilies.length,
                    strong: (chunks) => <span className="font-medium text-purple-600">{chunks}</span>
                  })}
                </p>

                {/* Language breakdown */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                    {t('admin.reminders.byLanguage')}
                  </p>
                  <div className="space-y-1">
                    {Object.entries(familiesByLanguage).map(([lang, families]) => (
                      <div key={lang} className="flex justify-between text-sm">
                        <span className="text-gray-600">{t(`common.languages.${lang}`)}</span>
                        <span className="font-medium text-gray-900">{families.length}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Channel Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.reminders.sendVia')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['PREFERRED', 'EMAIL', 'WHATSAPP', 'SMS'] as (Channel | 'PREFERRED')[]).map((channel) => (
                    <button
                      key={channel}
                      onClick={() => setSelectedChannel(channel)}
                      className={`px-4 py-2 text-sm font-medium rounded-md border ${
                        selectedChannel === channel
                          ? channel === 'PREFERRED'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                            : 'border-purple-600 bg-purple-50 text-purple-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {t(`common.channels.${channel}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Family Preview (collapsible) */}
              <details className="mb-6">
                <summary className="text-sm text-purple-600 cursor-pointer hover:text-purple-800">
                  {t('admin.reminders.viewAll', { count: eligibleFamilies.length })}
                </summary>
                <div className="mt-2 max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-3">
                  <ul className="space-y-1">
                    {eligibleFamilies.map((family) => (
                      <li key={family.id} className="text-sm text-gray-600">
                        {family.name}
                        <span className="text-gray-400 ml-2">
                          ({t(`common.languages.${family.preferred_language}`)})
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
                  {t('common.buttons.cancel')}
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? t('admin.reminders.sending') : t('admin.reminders.sendAction', { count: eligibleFamilies.length })}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
