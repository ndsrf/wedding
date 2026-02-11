/**
 * RSVP Form Component
 *
 * Form for guests to select attending family members and provide dietary/accessibility info.
 * Mobile-first, elderly-friendly design with large touch targets and clear feedback.
 */

'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import FamilyMemberCard from './FamilyMemberCard';
import type { FamilyWithMembers } from '@/types/models';

interface RSVPFormProps {
  token: string;
  family: FamilyWithMembers;
  wedding: {
    allow_guest_additions: boolean;
    rsvp_cutoff_date: string;
    // RSVP Question Configuration
    transportation_question_enabled: boolean;
    transportation_question_text: string | null;
    dietary_restrictions_enabled: boolean;
    extra_question_1_enabled: boolean;
    extra_question_1_text: string | null;
    extra_question_2_enabled: boolean;
    extra_question_2_text: string | null;
    extra_question_3_enabled: boolean;
    extra_question_3_text: string | null;
    extra_info_1_enabled: boolean;
    extra_info_1_label: string | null;
    extra_info_2_enabled: boolean;
    extra_info_2_label: string | null;
    extra_info_3_enabled: boolean;
    extra_info_3_label: string | null;
  };
  rsvpCutoffPassed: boolean;
  onSuccess: () => void;
}

interface MemberUpdate {
  id: string;
  attending: boolean;
  dietary_restrictions?: string;
  accessibility_needs?: string;
}

export default function RSVPForm({
  token,
  family,
  wedding,
  rsvpCutoffPassed,
  onSuccess,
}: RSVPFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [members, setMembers] = useState<MemberUpdate[]>(
    family.members.map((m) => ({
      id: m.id,
      attending: m.attending ?? true,
      dietary_restrictions: m.dietary_restrictions || '',
      accessibility_needs: m.accessibility_needs || '',
    }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    type: 'ADULT' as 'ADULT' | 'CHILD' | 'INFANT',
    age: '',
  });

  // RSVP Question Answers (family-level)
  const [transportationAnswer, setTransportationAnswer] = useState<boolean | null>(
    family.transportation_answer ?? null
  );
  const [extraQuestion1Answer, setExtraQuestion1Answer] = useState<boolean | null>(
    family.extra_question_1_answer ?? null
  );
  const [extraQuestion2Answer, setExtraQuestion2Answer] = useState<boolean | null>(
    family.extra_question_2_answer ?? null
  );
  const [extraQuestion3Answer, setExtraQuestion3Answer] = useState<boolean | null>(
    family.extra_question_3_answer ?? null
  );
  const [extraInfo1Value, setExtraInfo1Value] = useState<string>(
    family.extra_info_1_value ?? ''
  );
  const [extraInfo2Value, setExtraInfo2Value] = useState<string>(
    family.extra_info_2_value ?? ''
  );
  const [extraInfo3Value, setExtraInfo3Value] = useState<string>(
    family.extra_info_3_value ?? ''
  );

  function handleMemberChange(
    id: string,
    field: keyof MemberUpdate,
    value: boolean | string
  ) {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              [field]: value,
              // Clear dietary/accessibility if not attending
              ...(field === 'attending' && !value
                ? { dietary_restrictions: '', accessibility_needs: '' }
                : {}),
            }
          : m
      )
    );
  }

  async function handleAddMember() {
    if (!newMember.name.trim()) {
      setError(t('common.forms.required'));
      return;
    }

    try {
      const response = await fetch(`/api/guest/${token}/member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMember.name.trim(),
          type: newMember.type,
          age: newMember.age ? parseInt(newMember.age) : undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error?.message || t('common.errors.generic'));
        return;
      }

      // Add new member to local state
      setMembers((prev) => [
        ...prev,
        {
          id: result.data.id,
          attending: true,
          dietary_restrictions: '',
          accessibility_needs: '',
        },
      ]);

      // Reset form
      setNewMember({ name: '', type: 'ADULT', age: '' });
      setShowAddMember(false);
      setError(null);
    } catch (err) {
      console.error('Add member error:', err);
      setError(t('common.errors.generic'));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // If no one is attending, ask for confirmation
    const attendingCount = members.filter((m) => m.attending).length;
    if (attendingCount === 0) {
      const confirmed = window.confirm(t('guest.rsvp.emptyConfirmation'));
      if (!confirmed) return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/guest/${token}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          members,
          // Include question answers
          transportation_answer: transportationAnswer,
          extra_question_1_answer: extraQuestion1Answer,
          extra_question_2_answer: extraQuestion2Answer,
          extra_question_3_answer: extraQuestion3Answer,
          extra_info_1_value: extraInfo1Value || null,
          extra_info_2_value: extraInfo2Value || null,
          extra_info_3_value: extraInfo3Value || null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error?.message || t('common.errors.generic'));
        return;
      }

      onSuccess();
    } catch (err) {
      console.error('RSVP submission error:', err);
      setError(t('common.errors.generic'));
    } finally {
      setSubmitting(false);
    }
  }

  if (rsvpCutoffPassed) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
        <h3 className="text-2xl font-bold text-yellow-900 mb-2">
          {t('guest.rsvp.cutoffPassed')}
        </h3>
        <p className="text-lg text-yellow-800">
          {t('guest.rsvp.cutoffPassed')}
        </p>
      </div>
    );
  }

  const attendingCount = members.filter((m) => m.attending).length;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-4">
        {t('guest.rsvp.title')}
      </h3>
      <p className="text-lg text-gray-600 mb-2">
        {t('guest.rsvp.instructions')}
      </p>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
          <p className="text-lg text-red-800">{error}</p>
        </div>
      )}

      {/* Family Members */}
      <div className="space-y-4">
        {family.members.map((member) => {
          const memberUpdate = members.find((m) => m.id === member.id);
          if (!memberUpdate) return null;

          return (
            <FamilyMemberCard
              key={member.id}
              member={member}
              attending={memberUpdate.attending}
              dietaryRestrictions={memberUpdate.dietary_restrictions || ''}
              accessibilityNeeds={memberUpdate.accessibility_needs || ''}
              onAttendingChange={(attending: boolean) =>
                handleMemberChange(member.id, 'attending', attending)
              }
              onDietaryChange={(value: string) =>
                handleMemberChange(member.id, 'dietary_restrictions', value)
              }
              onAccessibilityChange={(value: string) =>
                handleMemberChange(member.id, 'accessibility_needs', value)
              }
            />
          );
        })}
      </div>

      {/* Add Member Section */}
      {wedding.allow_guest_additions && (
        <div className="mb-2 p-4 bg-gray-50 rounded-lg">
          {!showAddMember ? (
            <button
              type="button"
              onClick={() => setShowAddMember(true)}
              className="w-full py-4 px-6 bg-white border-2 border-gray-300 rounded-lg text-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              + {t('guest.members.addMember')}
            </button>
          ) : (
            <div className="space-y-4">
              <h4 className="text-xl font-bold text-gray-900">
                {t('guest.members.addMember')}
              </h4>
              <input
                type="text"
                placeholder={t('guest.members.name')}
                value={newMember.name}
                onChange={(e) =>
                  setNewMember({ ...newMember, name: e.target.value })
                }
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <select
                value={newMember.type}
                onChange={(e) =>
                  setNewMember({
                    ...newMember,
                    type: e.target.value as 'ADULT' | 'CHILD' | 'INFANT',
                  })
                }
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="ADULT">{t('guest.members.types.adult')}</option>
                <option value="CHILD">{t('guest.members.types.child')}</option>
                <option value="INFANT">{t('guest.members.types.infant')}</option>
              </select>
              <input
                type="number"
                placeholder={`${t('guest.members.age')} (optional)`}
                value={newMember.age}
                onChange={(e) =>
                  setNewMember({ ...newMember, age: e.target.value })
                }
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  {t('common.buttons.add')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMember(false);
                    setNewMember({ name: '', type: 'ADULT', age: '' });
                    setError(null);
                  }}
                  className="flex-1 py-3 px-6 bg-gray-300 text-gray-700 rounded-lg text-lg font-semibold hover:bg-gray-400 transition-colors"
                >
                  {t('common.buttons.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RSVP Questions Section */}
      {(wedding.transportation_question_enabled ||
        wedding.extra_question_1_enabled ||
        wedding.extra_question_2_enabled ||
        wedding.extra_question_3_enabled ||
        wedding.extra_info_1_enabled ||
        wedding.extra_info_2_enabled ||
        wedding.extra_info_3_enabled) && (
        <div className="mb-2 p-4 bg-gray-50 rounded-lg space-y-4">
          <h4 className="text-xl font-bold text-gray-900">
            {t('guest.rsvp.additionalQuestions')}
          </h4>

          {/* Transportation Question */}
          {wedding.transportation_question_enabled && (
            <div className="space-y-2">
              <p className="text-lg text-gray-700">
                {wedding.transportation_question_text || t('guest.rsvp.defaultTransportationQuestion')}
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setTransportationAnswer(true)}
                  className={`flex-1 py-3 px-6 rounded-lg text-lg font-semibold transition-colors ${
                    transportationAnswer === true
                      ? 'bg-green-600 text-white'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t('common.yes')}
                </button>
                <button
                  type="button"
                  onClick={() => setTransportationAnswer(false)}
                  className={`flex-1 py-3 px-6 rounded-lg text-lg font-semibold transition-colors ${
                    transportationAnswer === false
                      ? 'bg-red-600 text-white'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t('common.no')}
                </button>
              </div>
            </div>
          )}

          {/* Extra Yes/No Question 1 */}
          {wedding.extra_question_1_enabled && wedding.extra_question_1_text && (
            <div className="space-y-2">
              <p className="text-lg text-gray-700">{wedding.extra_question_1_text}</p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setExtraQuestion1Answer(true)}
                  className={`flex-1 py-3 px-6 rounded-lg text-lg font-semibold transition-colors ${
                    extraQuestion1Answer === true
                      ? 'bg-green-600 text-white'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t('common.yes')}
                </button>
                <button
                  type="button"
                  onClick={() => setExtraQuestion1Answer(false)}
                  className={`flex-1 py-3 px-6 rounded-lg text-lg font-semibold transition-colors ${
                    extraQuestion1Answer === false
                      ? 'bg-red-600 text-white'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t('common.no')}
                </button>
              </div>
            </div>
          )}

          {/* Extra Yes/No Question 2 */}
          {wedding.extra_question_2_enabled && wedding.extra_question_2_text && (
            <div className="space-y-2">
              <p className="text-lg text-gray-700">{wedding.extra_question_2_text}</p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setExtraQuestion2Answer(true)}
                  className={`flex-1 py-3 px-6 rounded-lg text-lg font-semibold transition-colors ${
                    extraQuestion2Answer === true
                      ? 'bg-green-600 text-white'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t('common.yes')}
                </button>
                <button
                  type="button"
                  onClick={() => setExtraQuestion2Answer(false)}
                  className={`flex-1 py-3 px-6 rounded-lg text-lg font-semibold transition-colors ${
                    extraQuestion2Answer === false
                      ? 'bg-red-600 text-white'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t('common.no')}
                </button>
              </div>
            </div>
          )}

          {/* Extra Yes/No Question 3 */}
          {wedding.extra_question_3_enabled && wedding.extra_question_3_text && (
            <div className="space-y-2">
              <p className="text-lg text-gray-700">{wedding.extra_question_3_text}</p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setExtraQuestion3Answer(true)}
                  className={`flex-1 py-3 px-6 rounded-lg text-lg font-semibold transition-colors ${
                    extraQuestion3Answer === true
                      ? 'bg-green-600 text-white'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t('common.yes')}
                </button>
                <button
                  type="button"
                  onClick={() => setExtraQuestion3Answer(false)}
                  className={`flex-1 py-3 px-6 rounded-lg text-lg font-semibold transition-colors ${
                    extraQuestion3Answer === false
                      ? 'bg-red-600 text-white'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t('common.no')}
                </button>
              </div>
            </div>
          )}

          {/* Extra Info Field 1 */}
          {wedding.extra_info_1_enabled && wedding.extra_info_1_label && (
            <div className="space-y-2">
              <label className="text-lg text-gray-700 block">
                {wedding.extra_info_1_label}
              </label>
              <input
                type="text"
                value={extraInfo1Value}
                onChange={(e) => setExtraInfo1Value(e.target.value)}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* Extra Info Field 2 */}
          {wedding.extra_info_2_enabled && wedding.extra_info_2_label && (
            <div className="space-y-2">
              <label className="text-lg text-gray-700 block">
                {wedding.extra_info_2_label}
              </label>
              <input
                type="text"
                value={extraInfo2Value}
                onChange={(e) => setExtraInfo2Value(e.target.value)}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* Extra Info Field 3 */}
          {wedding.extra_info_3_enabled && wedding.extra_info_3_label && (
            <div className="space-y-2">
              <label className="text-lg text-gray-700 block">
                {wedding.extra_info_3_label}
              </label>
              <input
                type="text"
                value={extraInfo3Value}
                onChange={(e) => setExtraInfo3Value(e.target.value)}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-xl font-semibold text-blue-900">
          {t('guest.rsvp.attendingSummary', { count: attendingCount })}
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-5 px-6 bg-green-600 text-white rounded-lg text-xl font-bold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
      >
        {submitting ? t('common.loading') : t('guest.rsvp.submit')}
      </button>

      <p className="mt-4 text-center text-base text-gray-500">
        {t('guest.edit.canEdit', { date: new Date(wedding.rsvp_cutoff_date).toLocaleDateString(locale) })}
      </p>
    </form>
  );
}
