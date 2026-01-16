/**
 * Family Member Card Component
 *
 * Card for displaying and editing a single family member's RSVP details.
 * Shows/hides dietary and accessibility fields based on attending status.
 */

'use client';

import type { FamilyMember } from '@/src/types/models';

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
  const getMemberTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ADULT: 'Adult',
      CHILD: 'Child',
      INFANT: 'Infant',
    };
    return labels[type] || type;
  };

  return (
    <div className="border-2 border-gray-200 rounded-lg p-5 bg-white">
      {/* Member Info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="text-xl font-bold text-gray-900">{member.name}</h4>
          <p className="text-base text-gray-600">
            {getMemberTypeLabel(member.type)}
            {member.age && ` • ${member.age} years old`}
            {member.added_by_guest && (
              <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Added by you
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
            className="w-7 h-7 rounded border-2 border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500 cursor-pointer"
          />
          <span className="text-lg font-semibold text-gray-900">
            {attending ? '✓ Will Attend' : 'Will Not Attend'}
          </span>
        </label>
      </div>

      {/* Dietary Restrictions (only if attending) */}
      {attending && (
        <div className="space-y-4">
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">
              Dietary Restrictions (optional)
            </label>
            <input
              type="text"
              value={dietaryRestrictions}
              onChange={(e) => onDietaryChange(e.target.value)}
              placeholder="E.g., vegetarian, allergies, etc."
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">
              Accessibility Needs (optional)
            </label>
            <input
              type="text"
              value={accessibilityNeeds}
              onChange={(e) => onAccessibilityChange(e.target.value)}
              placeholder="E.g., wheelchair, special needs, etc."
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
