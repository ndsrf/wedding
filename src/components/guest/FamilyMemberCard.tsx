/**
 * Family Member Card Component
 *
 * Card for displaying and editing a single family member's RSVP details.
 * Shows/hides dietary, accessibility, and custom per-guest question fields based on attending status.
 */

'use client';

import { useTranslations } from 'next-intl';
import type { FamilyMember } from '@/types/models';

function parseOption(raw: string): { label: string; value: string } {
  const idx = raw.indexOf('||');
  return idx === -1 ? { label: raw, value: raw } : { label: raw.slice(0, idx), value: raw.slice(idx + 2) };
}

export interface InvStyle {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'tile';
  textColor?: string;
  fontFamily?: string;
  rsvpButtonColor?: string;
}

export interface GuestQuestionConfig {
  // Per-guest Yes/No questions
  guest_yn_question_1_enabled: boolean;
  guest_yn_question_1_text: string;
  guest_yn_question_2_enabled: boolean;
  guest_yn_question_2_text: string;
  guest_yn_question_3_enabled: boolean;
  guest_yn_question_3_text: string;
  // Per-guest Dropdown questions
  guest_dropdown_question_1_enabled: boolean;
  guest_dropdown_question_1_label: string;
  guest_dropdown_question_1_options: string[];
  guest_dropdown_question_2_enabled: boolean;
  guest_dropdown_question_2_label: string;
  guest_dropdown_question_2_options: string[];
  guest_dropdown_question_3_enabled: boolean;
  guest_dropdown_question_3_label: string;
  guest_dropdown_question_3_options: string[];
  // Per-guest Text questions
  guest_text_question_1_enabled: boolean;
  guest_text_question_1_label: string;
  guest_text_question_2_enabled: boolean;
  guest_text_question_2_label: string;
  guest_text_question_3_enabled: boolean;
  guest_text_question_3_label: string;
}

interface FamilyMemberCardProps {
  member: FamilyMember;
  attending: boolean;
  dietaryRestrictions: string;
  accessibilityNeeds: string;
  dietaryRestrictionsEnabled: boolean;
  accessibilityNeedsEnabled: boolean;
  guestQuestions: GuestQuestionConfig;
  guest_yn_question_1_answer: boolean | null;
  guest_yn_question_2_answer: boolean | null;
  guest_yn_question_3_answer: boolean | null;
  guest_dropdown_question_1_answer: string;
  guest_dropdown_question_2_answer: string;
  guest_dropdown_question_3_answer: string;
  guest_text_question_1_answer: string;
  guest_text_question_2_answer: string;
  guest_text_question_3_answer: string;
  onAttendingChange: (attending: boolean) => void;
  onDietaryChange: (value: string) => void;
  onAccessibilityChange: (value: string) => void;
  onGuestYnChange: (field: 'guest_yn_question_1_answer' | 'guest_yn_question_2_answer' | 'guest_yn_question_3_answer', value: boolean | null) => void;
  onGuestDropdownChange: (field: 'guest_dropdown_question_1_answer' | 'guest_dropdown_question_2_answer' | 'guest_dropdown_question_3_answer', value: string) => void;
  onGuestTextChange: (field: 'guest_text_question_1_answer' | 'guest_text_question_2_answer' | 'guest_text_question_3_answer', value: string) => void;
  invStyle?: InvStyle;
}

export default function FamilyMemberCard({
  member,
  attending,
  dietaryRestrictions,
  accessibilityNeeds,
  dietaryRestrictionsEnabled,
  accessibilityNeedsEnabled,
  guestQuestions,
  guest_yn_question_1_answer,
  guest_yn_question_2_answer,
  guest_yn_question_3_answer,
  guest_dropdown_question_1_answer,
  guest_dropdown_question_2_answer,
  guest_dropdown_question_3_answer,
  guest_text_question_1_answer,
  guest_text_question_2_answer,
  guest_text_question_3_answer,
  onAttendingChange,
  onDietaryChange,
  onAccessibilityChange,
  onGuestYnChange,
  onGuestDropdownChange,
  onGuestTextChange,
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

  const yesSelected: React.CSSProperties = { backgroundColor: bc, color: '#ffffff' };
  const yesUnselected: React.CSSProperties = { borderColor: borderCol, color: tc, backgroundColor: 'transparent' };
  const noSelected: React.CSSProperties = { backgroundColor: '#dc2626', color: '#ffffff' };
  const noUnselected: React.CSSProperties = { borderColor: borderCol, color: tc, backgroundColor: 'transparent' };

  const hasExtraGuestFields =
    guestQuestions.guest_yn_question_1_enabled ||
    guestQuestions.guest_yn_question_2_enabled ||
    guestQuestions.guest_yn_question_3_enabled ||
    guestQuestions.guest_dropdown_question_1_enabled ||
    guestQuestions.guest_dropdown_question_2_enabled ||
    guestQuestions.guest_dropdown_question_3_enabled ||
    guestQuestions.guest_text_question_1_enabled ||
    guestQuestions.guest_text_question_2_enabled ||
    guestQuestions.guest_text_question_3_enabled;

  function renderYnQuestion(
    enabled: boolean,
    text: string,
    answer: boolean | null,
    field: 'guest_yn_question_1_answer' | 'guest_yn_question_2_answer' | 'guest_yn_question_3_answer'
  ) {
    if (!enabled || !text) return null;
    return (
      <div className="space-y-2" key={field}>
        <p className="text-base font-semibold" style={{ color: tc }}>{text}</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => onGuestYnChange(field, answer === true ? null : true)}
            className="flex-1 py-2 px-4 rounded-lg text-base font-semibold border-2 transition-colors"
            style={answer === true ? yesSelected : yesUnselected}>
            {t('common.yes')}
          </button>
          <button type="button" onClick={() => onGuestYnChange(field, answer === false ? null : false)}
            className="flex-1 py-2 px-4 rounded-lg text-base font-semibold border-2 transition-colors"
            style={answer === false ? noSelected : noUnselected}>
            {t('common.no')}
          </button>
        </div>
      </div>
    );
  }

  function renderDropdownQuestion(
    enabled: boolean,
    label: string,
    options: string[],
    answer: string,
    field: 'guest_dropdown_question_1_answer' | 'guest_dropdown_question_2_answer' | 'guest_dropdown_question_3_answer'
  ) {
    if (!enabled || !label || options.length === 0) return null;
    return (
      <div key={field}>
        <label className="block text-base font-semibold mb-1" style={{ color: tc }}>{label}</label>
        <select value={answer} onChange={(e) => onGuestDropdownChange(field, e.target.value)}
          className="w-full px-4 py-3 text-base border-2 rounded-lg focus:outline-none"
          style={inputStyle}>
          <option value="">—</option>
          {options.map((raw) => { const { label, value } = parseOption(raw); return <option key={value} value={value}>{label}</option>; })}
        </select>
      </div>
    );
  }

  function renderTextQuestion(
    enabled: boolean,
    label: string,
    answer: string,
    field: 'guest_text_question_1_answer' | 'guest_text_question_2_answer' | 'guest_text_question_3_answer'
  ) {
    if (!enabled || !label) return null;
    return (
      <div key={field}>
        <label className="block text-base font-semibold mb-1" style={{ color: tc }}>{label}</label>
        <input type="text" value={answer} onChange={(e) => onGuestTextChange(field, e.target.value)}
          className="w-full px-4 py-3 text-base border-2 rounded-lg focus:outline-none"
          style={inputStyle} />
      </div>
    );
  }

  return (
    <div
      className="border-2 rounded-lg p-5"
      style={{
        borderColor: borderCol,
        backgroundColor: invStyle?.backgroundColor ? invStyle.backgroundColor + '66' : 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(2px)',
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

      {/* Dietary, Accessibility, and Custom Per-Guest Questions (only if attending) */}
      {attending && (dietaryRestrictionsEnabled || accessibilityNeedsEnabled || hasExtraGuestFields) && (
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

          {renderYnQuestion(guestQuestions.guest_yn_question_1_enabled, guestQuestions.guest_yn_question_1_text, guest_yn_question_1_answer, 'guest_yn_question_1_answer')}
          {renderYnQuestion(guestQuestions.guest_yn_question_2_enabled, guestQuestions.guest_yn_question_2_text, guest_yn_question_2_answer, 'guest_yn_question_2_answer')}
          {renderYnQuestion(guestQuestions.guest_yn_question_3_enabled, guestQuestions.guest_yn_question_3_text, guest_yn_question_3_answer, 'guest_yn_question_3_answer')}
          {renderDropdownQuestion(guestQuestions.guest_dropdown_question_1_enabled, guestQuestions.guest_dropdown_question_1_label, guestQuestions.guest_dropdown_question_1_options, guest_dropdown_question_1_answer, 'guest_dropdown_question_1_answer')}
          {renderDropdownQuestion(guestQuestions.guest_dropdown_question_2_enabled, guestQuestions.guest_dropdown_question_2_label, guestQuestions.guest_dropdown_question_2_options, guest_dropdown_question_2_answer, 'guest_dropdown_question_2_answer')}
          {renderDropdownQuestion(guestQuestions.guest_dropdown_question_3_enabled, guestQuestions.guest_dropdown_question_3_label, guestQuestions.guest_dropdown_question_3_options, guest_dropdown_question_3_answer, 'guest_dropdown_question_3_answer')}
          {renderTextQuestion(guestQuestions.guest_text_question_1_enabled, guestQuestions.guest_text_question_1_label, guest_text_question_1_answer, 'guest_text_question_1_answer')}
          {renderTextQuestion(guestQuestions.guest_text_question_2_enabled, guestQuestions.guest_text_question_2_label, guest_text_question_2_answer, 'guest_text_question_2_answer')}
          {renderTextQuestion(guestQuestions.guest_text_question_3_enabled, guestQuestions.guest_text_question_3_label, guest_text_question_3_answer, 'guest_text_question_3_answer')}
        </div>
      )}
    </div>
  );
}
