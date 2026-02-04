/**
 * Confirmation Message Component
 *
 * Displays confirmation message after RSVP submission.
 * Shows option to edit RSVP if cutoff date hasn't passed.
 */

'use client';

import { useTranslations, useLocale } from 'next-intl';

interface ConfirmationMessageProps {
  familyName: string;
  canEdit: boolean;
  cutoffDate: string;
  onEdit: () => void;
}

export default function ConfirmationMessage({
  familyName,
  canEdit,
  cutoffDate,
  onEdit,
}: ConfirmationMessageProps) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Success Icon */}
      <div className="text-center mb-6">
        <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
          <svg
            className="w-16 h-16 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-3xl font-bold text-gray-900 mb-2">
          {t('guest.rsvp.submitted')} {familyName} 🎉
        </h3>
        <p className="text-xl text-gray-600">
          {t('guest.rsvp.confirmationMessage')}
        </p>
      </div>

      {/* Confirmation Details */}
      <div className="bg-green-50 border-2 border-green-400 rounded-lg p-6 mb-6">
        <p className="text-lg text-green-900 text-center">
          {t('guest.rsvp.confirmationMessage')}
        </p>
      </div>

      {/* Edit Option */}
      {canEdit && (
        <div className="text-center">
          <p className="text-base text-gray-600 mb-4">
            {t('guest.edit.canEdit', { date: new Date(cutoffDate).toLocaleDateString(locale) })}
          </p>
          <button
            onClick={onEdit}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            {t('guest.edit.title')}
          </button>
        </div>
      )}

      {/* Read-Only Notice */}
      {!canEdit && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
          <p className="text-base text-yellow-900 text-center">
            {t('guest.rsvp.cutoffPassed')}
          </p>
        </div>
      )}
    </div>
  );
}
