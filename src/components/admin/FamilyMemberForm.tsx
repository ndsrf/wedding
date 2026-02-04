/**
 * Family Member Form Component
 *
 * Form for adding/editing family members within the guest form
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { MemberType } from '@/types/models';

export interface FamilyMemberFormData {
  id?: string;
  name: string;
  type: MemberType;
  age?: number | null;
  attending?: boolean | null; // null = not answered, true = attending, false = not attending
  dietary_restrictions?: string | null;
  accessibility_needs?: string | null;
  _delete?: boolean;
}

interface FamilyMemberFormProps {
  members: FamilyMemberFormData[];
  onChange: (members: FamilyMemberFormData[]) => void;
}

export function FamilyMemberForm({ members, onChange }: FamilyMemberFormProps) {
  const t = useTranslations();

  const addMember = () => {
    onChange([
      ...members,
      {
        name: '',
        type: 'ADULT',
        age: null,
        dietary_restrictions: null,
        accessibility_needs: null,
      },
    ]);
  };

  const updateMember = (index: number, field: keyof FamilyMemberFormData, value: unknown) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeMember = (index: number) => {
    const member = members[index];
    if (member.id) {
      // Mark for deletion if it has an ID (existing member)
      const updated = [...members];
      updated[index] = { ...updated[index], _delete: true };
      onChange(updated);
    } else {
      // Remove from array if it's a new member
      onChange(members.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">{t('guest.members.title')}</label>
        <button
          type="button"
          onClick={addMember}
          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          + {t('guest.members.addMember')}
        </button>
      </div>

      {members.filter((m) => !m._delete).length === 0 && (
        <p className="text-sm text-gray-500 italic">{t('guest.members.noMembers')}</p>
      )}

      {members.map((member, index) => {
        if (member._delete) return null;

        return (
          <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-medium text-gray-900">{t('guest.members.title')} {index + 1}</h4>
              <button
                type="button"
                onClick={() => removeMember(index)}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                {t('common.buttons.delete')}
              </button>
            </div>

            {/* Attendance Status - Three-state selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">{t('admin.guests.attendance')}:</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => updateMember(index, 'attending', null)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-l-md border transition-colors ${
                    member.attending === null || member.attending === undefined
                      ? 'bg-gray-600 text-white border-gray-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t('admin.guests.notAnswered')}
                </button>
                <button
                  type="button"
                  onClick={() => updateMember(index, 'attending', true)}
                  className={`px-3 py-1.5 text-xs font-medium border-t border-b transition-colors ${
                    member.attending === true
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t('guest.rsvp.attending')}
                </button>
                <button
                  type="button"
                  onClick={() => updateMember(index, 'attending', false)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-r-md border transition-colors ${
                    member.attending === false
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t('guest.rsvp.notAttending')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Name */}
              <div>
                <label htmlFor={`member-name-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                  {t('guest.members.name')} <span className="text-red-500">*</span>
                </label>
                <input
                  id={`member-name-${index}`}
                  type="text"
                  value={member.name}
                  onChange={(e) => updateMember(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label htmlFor={`member-type-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                  {t('guest.members.type')} <span className="text-red-500">*</span>
                </label>
                <select
                  id={`member-type-${index}`}
                  value={member.type}
                  onChange={(e) => updateMember(index, 'type', e.target.value as MemberType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                  required
                >
                  <option value="ADULT">{t('guest.members.types.adult')}</option>
                  <option value="CHILD">{t('guest.members.types.child')}</option>
                  <option value="INFANT">{t('guest.members.types.infant')}</option>
                </select>
              </div>

              {/* Age */}
              <div>
                <label htmlFor={`member-age-${index}`} className="block text-sm font-medium text-gray-700 mb-1">{t('guest.members.age')}</label>
                <input
                  id={`member-age-${index}`}
                  type="number"
                  min="0"
                  max="150"
                  value={member.age || ''}
                  onChange={(e) =>
                    updateMember(index, 'age', e.target.value ? parseInt(e.target.value) : null)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                />
              </div>

              {/* Dietary Restrictions */}
              <div>
                <label htmlFor={`member-dietary-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                  {t('guest.rsvp.dietaryRestrictions')}
                </label>
                <input
                  id={`member-dietary-${index}`}
                  type="text"
                  value={member.dietary_restrictions || ''}
                  onChange={(e) =>
                    updateMember(index, 'dietary_restrictions', e.target.value || null)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                  placeholder={t('guest.rsvp.dietaryPlaceholder')}
                />
              </div>
            </div>

            {/* Accessibility Needs */}
            <div>
              <label htmlFor={`member-accessibility-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                {t('guest.rsvp.accessibilityNeeds')}
              </label>
              <input
                id={`member-accessibility-${index}`}
                type="text"
                value={member.accessibility_needs || ''}
                onChange={(e) => updateMember(index, 'accessibility_needs', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                placeholder={t('guest.rsvp.accessibilityPlaceholder')}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
