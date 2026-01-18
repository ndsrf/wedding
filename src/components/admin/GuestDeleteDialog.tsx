/**
 * Guest Delete Dialog Component
 *
 * Confirmation dialog for deleting a guest family with RSVP warning
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface GuestDeleteDialogProps {
  isOpen: boolean;
  familyName: string;
  memberCount: number;
  hasRsvp: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function GuestDeleteDialog({
  isOpen,
  familyName,
  memberCount,
  hasRsvp,
  onConfirm,
  onCancel,
  loading = false,
}: GuestDeleteDialogProps) {
  const t = useTranslations();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onCancel} />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Icon */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Content */}
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">{t('admin.deleteDialog.title')}</h3>
            <div className="mt-2 space-y-2">
              <p className="text-sm text-gray-500">
                {t.rich('admin.deleteDialog.confirmTitle', {
                  name: familyName,
                  strong: (chunks) => <strong>{chunks}</strong>
                })}
              </p>
              <p className="text-sm text-gray-500">
                {t('admin.deleteDialog.confirmDesc', { count: memberCount, plural: memberCount !== 1 ? 's' : '' })}
              </p>

              {/* RSVP Warning */}
              {hasRsvp && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-start">
                    <svg
                      className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div className="text-left">
                      <p className="text-sm font-medium text-yellow-800">{t('admin.deleteDialog.rsvpWarning')}</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        {t('admin.deleteDialog.rsvpWarningDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? t('admin.deleteDialog.deleting') : t('common.buttons.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
