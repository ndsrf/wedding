/**
 * Family Member Form Component
 *
 * Form for adding/editing family members within the guest form
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
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
  guest_yn_question_1_answer?: boolean | null;
  guest_yn_question_2_answer?: boolean | null;
  guest_yn_question_3_answer?: boolean | null;
  guest_dropdown_question_1_answer?: string | null;
  guest_dropdown_question_2_answer?: string | null;
  guest_dropdown_question_3_answer?: string | null;
  guest_text_question_1_answer?: string | null;
  guest_text_question_2_answer?: string | null;
  guest_text_question_3_answer?: string | null;
}

interface FamilyMemberFormProps {
  members: FamilyMemberFormData[];
  onChange: (members: FamilyMemberFormData[]) => void;
  weddingConfig?: any;
}

function resolveLabel(map: Record<string, string> | null | any, locale: string): string {
  if (!map) return '';
  if (typeof map === 'string') return map;
  return map?.[locale] || map?.['en'] || map?.['es'] || '';
}

function resolveOptions(map: Record<string, string[]> | null | any, locale: string): string[] {
  if (!map) return [];
  return map?.[locale] || map?.['en'] || map?.['es'] || [];
}

function parseOption(raw: string): { label: string; value: string } {
  const idx = raw.indexOf('||');
  return idx === -1 ? { label: raw, value: raw } : { label: raw.slice(0, idx), value: raw.slice(idx + 2) };
}

export function FamilyMemberForm({ members, onChange, weddingConfig }: FamilyMemberFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [expandedGuests, setExpandedGuests] = useState<Record<number, boolean>>({});

  // Initialize expanded state for members who have already answered the RSVP
  useEffect(() => {
    const initial: Record<number, boolean> = {};
    members.forEach((m, idx) => {
      if (m.attending !== null && m.attending !== undefined) {
        initial[idx] = true;
      }
    });
    setExpandedGuests((prev) => ({ ...initial, ...prev }));
  }, [members]);

  const toggleGuestExpanded = (index: number) => {
    setExpandedGuests((prev) => ({ ...prev, [index]: !prev[index] }));
  };

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
      <label className="block text-sm font-medium text-gray-700">{t('guest.members.title')}</label>

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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Name */}
              <div className="md:col-span-2">
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
              <div className="md:col-span-1">
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
              <div className="md:col-span-1">
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
            </div>

            {/* Guest RSVP Questions (Collapsable) */}
            {(() => {
              const hasGuestQuestions = weddingConfig && (
                weddingConfig.dietary_restrictions_enabled ||
                weddingConfig.accessibility_needs_enabled ||
                weddingConfig.guest_yn_question_1_enabled ||
                weddingConfig.guest_yn_question_2_enabled ||
                weddingConfig.guest_yn_question_3_enabled ||
                weddingConfig.guest_dropdown_question_1_enabled ||
                weddingConfig.guest_dropdown_question_2_enabled ||
                weddingConfig.guest_dropdown_question_3_enabled ||
                weddingConfig.guest_text_question_1_enabled ||
                weddingConfig.guest_text_question_2_enabled ||
                weddingConfig.guest_text_question_3_enabled
              );

              if (!hasGuestQuestions) return null;

              const isExpanded = expandedGuests[index] || false;

              return (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <button
                    type="button"
                    onClick={() => toggleGuestExpanded(index)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded transition-colors"
                  >
                    <span>{t('admin.guests.form.rsvpAnswers')}</span>
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 pl-1">
                      {/* Dietary Restrictions */}
                      {weddingConfig.dietary_restrictions_enabled && (
                        <div>
                          <label htmlFor={`member-dietary-${index}`} className="block text-xs font-medium text-gray-600 mb-1">
                            {t('guest.rsvp.dietaryRestrictions')}
                          </label>
                          <input
                            id={`member-dietary-${index}`}
                            type="text"
                            value={member.dietary_restrictions || ''}
                            onChange={(e) =>
                              updateMember(index, 'dietary_restrictions', e.target.value || null)
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                            placeholder={t('guest.rsvp.dietaryPlaceholder')}
                          />
                        </div>
                      )}

                      {/* Accessibility Needs */}
                      {weddingConfig.accessibility_needs_enabled && (
                        <div>
                          <label htmlFor={`member-accessibility-${index}`} className="block text-xs font-medium text-gray-600 mb-1">
                            {t('guest.rsvp.accessibilityNeeds')}
                          </label>
                          <input
                            id={`member-accessibility-${index}`}
                            type="text"
                            value={member.accessibility_needs || ''}
                            onChange={(e) => updateMember(index, 'accessibility_needs', e.target.value || null)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                            placeholder={t('guest.rsvp.accessibilityPlaceholder')}
                          />
                        </div>
                      )}

                      {/* Guest YN 1 */}
                      {weddingConfig.guest_yn_question_1_enabled && weddingConfig.guest_yn_question_1_text && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {resolveLabel(weddingConfig.guest_yn_question_1_text, locale)}
                          </label>
                          <select
                            value={member.guest_yn_question_1_answer === null ? '' : member.guest_yn_question_1_answer ? 'yes' : 'no'}
                            onChange={(e) =>
                              updateMember(index, 'guest_yn_question_1_answer', e.target.value === '' ? null : e.target.value === 'yes')
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                          >
                            <option value="">-</option>
                            <option value="yes">{t('common.yes')}</option>
                            <option value="no">{t('common.no')}</option>
                          </select>
                        </div>
                      )}

                      {/* Guest YN 2 */}
                      {weddingConfig.guest_yn_question_2_enabled && weddingConfig.guest_yn_question_2_text && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {resolveLabel(weddingConfig.guest_yn_question_2_text, locale)}
                          </label>
                          <select
                            value={member.guest_yn_question_2_answer === null ? '' : member.guest_yn_question_2_answer ? 'yes' : 'no'}
                            onChange={(e) =>
                              updateMember(index, 'guest_yn_question_2_answer', e.target.value === '' ? null : e.target.value === 'yes')
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                          >
                            <option value="">-</option>
                            <option value="yes">{t('common.yes')}</option>
                            <option value="no">{t('common.no')}</option>
                          </select>
                        </div>
                      )}

                      {/* Guest YN 3 */}
                      {weddingConfig.guest_yn_question_3_enabled && weddingConfig.guest_yn_question_3_text && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {resolveLabel(weddingConfig.guest_yn_question_3_text, locale)}
                          </label>
                          <select
                            value={member.guest_yn_question_3_answer === null ? '' : member.guest_yn_question_3_answer ? 'yes' : 'no'}
                            onChange={(e) =>
                              updateMember(index, 'guest_yn_question_3_answer', e.target.value === '' ? null : e.target.value === 'yes')
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                          >
                            <option value="">-</option>
                            <option value="yes">{t('common.yes')}</option>
                            <option value="no">{t('common.no')}</option>
                          </select>
                        </div>
                      )}

                      {/* Guest Dropdown 1 */}
                      {weddingConfig.guest_dropdown_question_1_enabled && weddingConfig.guest_dropdown_question_1_label && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {resolveLabel(weddingConfig.guest_dropdown_question_1_label, locale)}
                          </label>
                          <select
                            value={member.guest_dropdown_question_1_answer || ''}
                            onChange={(e) =>
                              updateMember(index, 'guest_dropdown_question_1_answer', e.target.value || null)
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                          >
                            <option value="">-</option>
                            {resolveOptions(weddingConfig.guest_dropdown_question_1_options, locale).map((opt, i) => {
                              const parsed = parseOption(opt);
                              return (
                                <option key={i} value={parsed.value}>
                                  {parsed.label}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      {/* Guest Dropdown 2 */}
                      {weddingConfig.guest_dropdown_question_2_enabled && weddingConfig.guest_dropdown_question_2_label && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {resolveLabel(weddingConfig.guest_dropdown_question_2_label, locale)}
                          </label>
                          <select
                            value={member.guest_dropdown_question_2_answer || ''}
                            onChange={(e) =>
                              updateMember(index, 'guest_dropdown_question_2_answer', e.target.value || null)
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                          >
                            <option value="">-</option>
                            {resolveOptions(weddingConfig.guest_dropdown_question_2_options, locale).map((opt, i) => {
                              const parsed = parseOption(opt);
                              return (
                                <option key={i} value={parsed.value}>
                                  {parsed.label}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      {/* Guest Dropdown 3 */}
                      {weddingConfig.guest_dropdown_question_3_enabled && weddingConfig.guest_dropdown_question_3_label && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {resolveLabel(weddingConfig.guest_dropdown_question_3_label, locale)}
                          </label>
                          <select
                            value={member.guest_dropdown_question_3_answer || ''}
                            onChange={(e) =>
                              updateMember(index, 'guest_dropdown_question_3_answer', e.target.value || null)
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                          >
                            <option value="">-</option>
                            {resolveOptions(weddingConfig.guest_dropdown_question_3_options, locale).map((opt, i) => {
                              const parsed = parseOption(opt);
                              return (
                                <option key={i} value={parsed.value}>
                                  {parsed.label}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      {/* Guest Text 1 */}
                      {weddingConfig.guest_text_question_1_enabled && weddingConfig.guest_text_question_1_label && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {resolveLabel(weddingConfig.guest_text_question_1_label, locale)}
                          </label>
                          <input
                            type="text"
                            value={member.guest_text_question_1_answer || ''}
                            onChange={(e) =>
                              updateMember(index, 'guest_text_question_1_answer', e.target.value || null)
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                          />
                        </div>
                      )}

                      {/* Guest Text 2 */}
                      {weddingConfig.guest_text_question_2_enabled && weddingConfig.guest_text_question_2_label && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {resolveLabel(weddingConfig.guest_text_question_2_label, locale)}
                          </label>
                          <input
                            type="text"
                            value={member.guest_text_question_2_answer || ''}
                            onChange={(e) =>
                              updateMember(index, 'guest_text_question_2_answer', e.target.value || null)
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                          />
                        </div>
                      )}

                      {/* Guest Text 3 */}
                      {weddingConfig.guest_text_question_3_enabled && weddingConfig.guest_text_question_3_label && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {resolveLabel(weddingConfig.guest_text_question_3_label, locale)}
                          </label>
                          <input
                            type="text"
                            value={member.guest_text_question_3_answer || ''}
                            onChange={(e) =>
                              updateMember(index, 'guest_text_question_3_answer', e.target.value || null)
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addMember}
        className="w-full mt-4 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
      >
        + {t('guest.members.addMember')}
      </button>
    </div>
  );
}
