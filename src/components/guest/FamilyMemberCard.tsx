'use client';

import { useTranslations } from 'next-intl';
import type { FamilyMember } from '@/types/models';

interface FamilyMemberCardProps {
  member: FamilyMember;
  attending: boolean;
  dietaryRestrictions: string;
  accessibilityNeeds: string;
  onAttendingChange: (attending: boolean) => void;
  onDietaryChange: (value: string) => void;
  onAccessibilityChange: (value: string) => void;
}

export default function FamilyMemberCard({
  member,
  attending,
  dietaryRestrictions,
  accessibilityNeeds,
  onAttendingChange,
  onDietaryChange,
  onAccessibilityChange,
}: FamilyMemberCardProps) {
  const t = useTranslations();

  const getMemberTypeLabel = (type: string) => {
    const key = type.toLowerCase() as 'adult' | 'child' | 'infant';
    return t(`guest.members.types.${key}`);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      {/* Member Info */}
      <div className="mb-3">
        <h4 className="text-base font-bold text-gray-900">{member.name}</h4>
        <p className="text-sm text-gray-500">
          {getMemberTypeLabel(member.type)}
          {member.age && ` • ${t('guest.members.yearsOld', { count: member.age })}`}
          {member.added_by_guest && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
              {t('guest.members.addedByYou')}
            </span>
          )}
        </p>
      </div>

      {/* Attending Toggle */}
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={attending}
            onChange={(e) => onAttendingChange(e.target.checked)}
            className="w-5 h-5 rounded border-2 border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500 cursor-pointer flex-shrink-0"
          />
          <span className="text-sm font-semibold text-gray-900">
            {attending ? `✓ ${t('guest.rsvp.attending')}` : t('guest.rsvp.attend')}
          </span>
        </label>
      </div>

      {/* Dietary & Accessibility (only if attending) */}
      {attending && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {t('guest.rsvp.dietaryRestrictions')} ({t('common.optional', { defaultValue: 'opcional' })})
            </label>
            <input
              type="text"
              value={dietaryRestrictions}
              onChange={(e) => onDietaryChange(e.target.value)}
              placeholder={t('guest.rsvp.dietaryPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {t('guest.rsvp.accessibilityNeeds')} ({t('common.optional', { defaultValue: 'opcional' })})
            </label>
            <input
              type="text"
              value={accessibilityNeeds}
              onChange={(e) => onAccessibilityChange(e.target.value)}
              placeholder={t('guest.rsvp.accessibilityPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
