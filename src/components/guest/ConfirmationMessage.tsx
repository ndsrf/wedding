/**
 * Confirmation Message Component
 *
 * Displays confirmation message after RSVP submission.
 * Shows option to edit RSVP if cutoff date hasn't passed.
 */

'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { InvStyle } from './FamilyMemberCard';

interface ConfirmationMessageProps {
  familyName: string;
  canEdit: boolean;
  cutoffDate: string;
  onEdit: () => void;
  invStyle?: InvStyle;
  attendingCount?: number;
}

export default function ConfirmationMessage({
  familyName,
  canEdit,
  cutoffDate,
  onEdit,
  invStyle,
  attendingCount = 0,
}: ConfirmationMessageProps) {
  const t = useTranslations();
  const locale = useLocale();

  // Style helpers derived from invStyle
  const tc = invStyle?.textColor ?? '#111827';       // text color
  const bc = invStyle?.rsvpButtonColor ?? '#2563eb'; // button / accent color (default blue-600)
  const ff = invStyle?.fontFamily;
  const borderCol = tc + '33';

  const sectionBg: React.CSSProperties = {
    backgroundColor: invStyle?.backgroundColor ? invStyle.backgroundColor + '66' : 'rgba(255, 255, 255, 0.4)',
    borderColor: borderCol,
    borderRadius: '0.5rem',
  };

  return (
    <div 
      className="rounded-lg shadow-md p-6"
      style={{ 
        backgroundColor: invStyle?.backgroundColor ? invStyle.backgroundColor + 'aa' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(4px)',
        color: tc, 
        fontFamily: ff 
      }}
    >
      {/* Success Icon */}
      <div className="text-center mb-6">
        <div 
          className="inline-block p-4 rounded-full mb-4"
          style={{ backgroundColor: bc + '22' }}
        >
          <svg
            className="w-16 h-16"
            style={{ color: bc }}
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
        <h3 className="text-3xl font-bold mb-2" style={{ color: tc }}>
          {t('guest.rsvp.submitted')} {familyName} 🎉
        </h3>
      </div>

      {/* Confirmation Details */}
      <div className="border-2 p-6 mb-6" style={sectionBg}>
        <p className="text-lg text-center" style={{ color: tc }}>
          {attendingCount > 0 
            ? t('guest.rsvp.confirmationMessage') 
            : t('guest.rsvp.confirmationMessageEmpty')}
        </p>
      </div>

      {/* Edit Option */}
      {canEdit && (
        <div className="text-center">
          <p className="text-base mb-4" style={{ color: tc + 'aa' }}>
            {t('guest.edit.canEdit', { date: new Date(cutoffDate).toLocaleDateString(locale) })}
          </p>
          <button
            onClick={onEdit}
            className="px-8 py-3 text-white rounded-lg text-lg font-semibold transition-colors"
            style={{ backgroundColor: bc }}
          >
            {t('guest.edit.title')}
          </button>
        </div>
      )}

      {/* Read-Only Notice */}
      {!canEdit && (
        <div 
          className="border-2 rounded-lg p-4" 
          style={{ 
            backgroundColor: invStyle?.backgroundColor ? invStyle.backgroundColor + 'cc' : '#fffbeb',
            borderColor: invStyle?.backgroundColor ? borderCol : '#fbbf24'
          }}
        >
          <p className="text-base text-center" style={{ color: tc }}>
            {t('guest.rsvp.cutoffPassed')}
          </p>
        </div>
      )}
    </div>
  );
}
