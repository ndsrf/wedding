/**
 * Family Member Card Component
 *
 * Card for displaying and editing a single family member's RSVP details.
 * Shows/hides dietary and accessibility fields based on attending status.
 */

'use client';

import { useTranslations } from 'next-intl';
import type { FamilyMember } from '@/types/models';

export interface InvStyle {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'tile';
  textColor?: string;
  fontFamily?: string;
  rsvpButtonColor?: string;
}

interface FamilyMemberCardProps {
  member: FamilyMember;
  attending: boolean;
  dietaryRestrictions: string;
  accessibilityNeeds: string;
  dietaryRestrictionsEnabled: boolean;
  accessibilityNeedsEnabled: boolean;
  onAttendingChange: (attending: boolean) => void;
  onDietaryChange: (value: string) => void;
  onAccessibilityChange: (value: string) => void;
  invStyle?: InvStyle;
}

export default function FamilyMemberCard({
  member,
  attending,
  dietaryRestrictions,
  accessibilityNeeds,
  dietaryRestrictionsEnabled,
  accessibilityNeedsEnabled,
  onAttendingChange,
  onDietaryChange,
  onAccessibilityChange,
  invStyle,
}: FamilyMemberCardProps) {
  const t = useTranslations();

  const tc = invStyle?.textColor ?? '#111827';
  const bc = invStyle?.rsvpButtonColor ?? '#16a34a';
  const borderCol = tc + '33';

  const inputStyle = {
    borderColor: borderCol,
    color: tc,
    fontFamily: invStyle?.fontFamily,
    backgroundColor: 'transparent',
  };

  return (
    <div
      className="border-2 rounded-lg p-5"
      style={{
        borderColor: borderCol,
        backgroundColor: invStyle?.backgroundColor ? invStyle.backgroundColor + 'cc' : '#ffffff',
        fontFamily: invStyle?.fontFamily,
      }}
    >
      {/* Member Info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="text-xl font-bold" style={{ color: tc }}>{member.name}</h4>
          <p className="text-base" style={{ color: tc + 'bb' }}>
            {member.added_by_guest && (
              <span
                className="ml-2 text-sm px-2 py-1 rounded"
                style={{ backgroundColor: bc + '22', color: bc }}
              >
                {t('guest.members.addedByYou')}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Attending Toggle */}
      <div className="mb-4">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={attending}
            onChange={(e) => onAttendingChange(e.target.checked)}
            className="w-7 h-7 rounded border-2 cursor-pointer"
            style={{ accentColor: bc, borderColor: borderCol }}
          />
          <span className="text-lg font-semibold" style={{ color: tc }}>
            {attending ? `✓ ${t('guest.rsvp.attending')}` : t('guest.rsvp.attend')}
          </span>
        </label>
      </div>

      {/* Dietary Restrictions and Accessibility (only if attending and enabled) */}
      {attending && (dietaryRestrictionsEnabled || accessibilityNeedsEnabled) && (
        <div className="space-y-4">
          {dietaryRestrictionsEnabled && (
            <div>
              <label className="block text-base font-semibold mb-2" style={{ color: tc }}>
                {t('guest.rsvp.dietaryRestrictions')} ({t('common.optional', { defaultValue: 'optional' })})
              </label>
              <input
                type="text"
                value={dietaryRestrictions}
                onChange={(e) => onDietaryChange(e.target.value)}
                placeholder={t('guest.rsvp.dietaryPlaceholder')}
                className="w-full px-4 py-3 text-lg border-2 rounded-lg focus:outline-none"
                style={inputStyle}
              />
            </div>
          )}

          {accessibilityNeedsEnabled && (
            <div>
              <label className="block text-base font-semibold mb-2" style={{ color: tc }}>
                {t('guest.rsvp.accessibilityNeeds')} ({t('common.optional', { defaultValue: 'optional' })})
              </label>
              <input
                type="text"
                value={accessibilityNeeds}
                onChange={(e) => onAccessibilityChange(e.target.value)}
                placeholder={t('guest.rsvp.accessibilityPlaceholder')}
                className="w-full px-4 py-3 text-lg border-2 rounded-lg focus:outline-none"
                style={inputStyle}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
