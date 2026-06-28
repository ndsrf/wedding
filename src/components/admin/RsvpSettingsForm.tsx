'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { UpdateWeddingConfigRequest } from '@/types/api';
import type { Wedding } from '@/types/models';
import { PaymentMode } from '@prisma/client';
import { LanguageTabs, RSVP_LANGUAGES, type RsvpLanguage } from './LanguageTabs';

// ── helpers ────────────────────────────────────────────────────────────────
function getLang(map: Record<string, string> | null | undefined, lang: string): string {
  return map?.[lang] ?? '';
}
function setLang(map: Record<string, string> | null | undefined, lang: string, val: string): Record<string, string> {
  return { ...(map ?? {}), [lang]: val };
}
function getOpts(map: Record<string, string[]> | null | undefined, lang: string): string {
  return (map?.[lang] ?? []).join('\n');
}
function setOpts(map: Record<string, string[]> | null | undefined, lang: string, raw: string): Record<string, string[]> {
  return { ...(map ?? {}), [lang]: raw.split('\n').map(s => s.trim()) };
}
function cleanOpts(opts: I18nOptions | null): I18nOptions | null {
  if (!opts) return null;
  const out: I18nOptions = {};
  for (const [lang, arr] of Object.entries(opts)) {
    const clean = arr.filter(Boolean);
    if (clean.length) out[lang] = clean;
  }
  return Object.keys(out).length ? out : null;
}
function filledLangs(map: Record<string, string> | null | undefined): string[] {
  if (!map) return [];
  return RSVP_LANGUAGES.filter(l => !!(map as Record<string, string>)[l]?.trim());
}
function filledOptsLangs(map: Record<string, string[]> | null | undefined): string[] {
  if (!map) return [];
  return RSVP_LANGUAGES.filter(l => ((map as Record<string, string[]>)[l]?.length ?? 0) > 0);
}

// ── types ──────────────────────────────────────────────────────────────────
interface I18nField { [lang: string]: string }
interface I18nOptions { [lang: string]: string[] }

interface RsvpFormState {
  payment_tracking_mode: PaymentMode;
  gift_iban: string;
  show_iban_on_rsvp: boolean;
  theme_id: string;
  allow_guest_additions: boolean;
  dress_code: string;
  additional_info: string;
  // Per-guest simple
  dietary_restrictions_enabled: boolean;
  accessibility_needs_enabled: boolean;
  // Per-guest Yes/No (×3)
  guest_yn_question_1_enabled: boolean;
  guest_yn_question_1_text: I18nField | null;
  guest_yn_question_2_enabled: boolean;
  guest_yn_question_2_text: I18nField | null;
  guest_yn_question_3_enabled: boolean;
  guest_yn_question_3_text: I18nField | null;
  // Per-guest Dropdown (×3)
  guest_dropdown_question_1_enabled: boolean;
  guest_dropdown_question_1_label: I18nField | null;
  guest_dropdown_question_1_options: I18nOptions | null;
  guest_dropdown_question_2_enabled: boolean;
  guest_dropdown_question_2_label: I18nField | null;
  guest_dropdown_question_2_options: I18nOptions | null;
  guest_dropdown_question_3_enabled: boolean;
  guest_dropdown_question_3_label: I18nField | null;
  guest_dropdown_question_3_options: I18nOptions | null;
  // Per-guest Text (×3)
  guest_text_question_1_enabled: boolean;
  guest_text_question_1_label: I18nField | null;
  guest_text_question_2_enabled: boolean;
  guest_text_question_2_label: I18nField | null;
  guest_text_question_3_enabled: boolean;
  guest_text_question_3_label: I18nField | null;
  // Per-family Transportation
  transportation_question_enabled: boolean;
  transportation_question_text: I18nField | null;
  // Per-family Yes/No (×3)
  extra_question_1_enabled: boolean;
  extra_question_1_text: I18nField | null;
  extra_question_2_enabled: boolean;
  extra_question_2_text: I18nField | null;
  extra_question_3_enabled: boolean;
  extra_question_3_text: I18nField | null;
  // Per-family Info (×3)
  extra_info_1_enabled: boolean;
  extra_info_1_label: I18nField | null;
  extra_info_2_enabled: boolean;
  extra_info_2_label: I18nField | null;
  extra_info_3_enabled: boolean;
  extra_info_3_label: I18nField | null;
  // Per-family Dropdown (×1)
  family_dropdown_question_1_enabled: boolean;
  family_dropdown_question_1_label: I18nField | null;
  family_dropdown_question_1_options: I18nOptions | null;
  // Branding
  show_nupcibot_whatsapp_link: boolean;
  show_nupci_banner: boolean;
}

interface RsvpSettingsFormProps {
  wedding: Wedding;
  onSubmit: (data: UpdateWeddingConfigRequest) => Promise<void>;
  onCancel: () => void;
  deleteCacheUrl: string;
}

// ── module-level CSS constants ────────────────────────────────────────────
const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 text-sm';
const checkCls = 'h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded';
const cardCls = 'p-4 border border-gray-200 rounded-lg';
const subCls = 'mt-3 ml-6 space-y-2';

// ── module-level sub-components (NOT inside the render function) ───────────

function I18nTextInput({
  label,
  map,
  onChange,
  placeholder,
  activeLang,
  onLangChange,
}: {
  label?: string;
  map: I18nField | null;
  onChange: (m: I18nField) => void;
  placeholder?: string;
  activeLang: RsvpLanguage;
  onLangChange: (lang: RsvpLanguage) => void;
}) {
  return (
    <div>
      {label && <p className="text-xs text-gray-500 mb-1">{label}</p>}
      <LanguageTabs activeLanguage={activeLang} onChange={onLangChange} filledLanguages={filledLangs(map)} />
      <input
        type="text"
        value={getLang(map, activeLang)}
        onChange={e => onChange(setLang(map, activeLang, e.target.value))}
        className={inputCls}
        placeholder={placeholder}
      />
    </div>
  );
}

function I18nDropdownInput({
  labelMap,
  optionsMap,
  onLabelChange,
  onOptionsChange,
  activeLang,
  onLangChange,
  questionLabelText,
  questionLabelPlaceholderText,
  dropdownOptionsText,
  dropdownOptionsPlaceholderText,
}: {
  labelMap: I18nField | null;
  optionsMap: I18nOptions | null;
  onLabelChange: (m: I18nField) => void;
  onOptionsChange: (m: I18nOptions) => void;
  activeLang: RsvpLanguage;
  onLangChange: (lang: RsvpLanguage) => void;
  questionLabelText: string;
  questionLabelPlaceholderText: string;
  dropdownOptionsText: string;
  dropdownOptionsPlaceholderText: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-gray-500 mb-1">{questionLabelText}</p>
        <LanguageTabs activeLanguage={activeLang} onChange={onLangChange} filledLanguages={filledLangs(labelMap)} />
        <input
          type="text"
          value={getLang(labelMap, activeLang)}
          onChange={e => onLabelChange(setLang(labelMap, activeLang, e.target.value))}
          className={inputCls}
          placeholder={questionLabelPlaceholderText}
        />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">{dropdownOptionsText}</p>
        <LanguageTabs activeLanguage={activeLang} onChange={onLangChange} filledLanguages={filledOptsLangs(optionsMap)} />
        <textarea
          value={getOpts(optionsMap, activeLang)}
          onChange={e => onOptionsChange(setOpts(optionsMap, activeLang, e.target.value))}
          className={`${inputCls} min-h-[80px] resize-y`}
          placeholder={dropdownOptionsPlaceholderText}
        />
      </div>
    </div>
  );
}

// ── component ──────────────────────────────────────────────────────────────
export function RsvpSettingsForm({ wedding, onSubmit, onCancel, deleteCacheUrl }: RsvpSettingsFormProps) {
  const t = useTranslations('admin.configure.form');

  const [activeLang, setActiveLang] = useState<RsvpLanguage>('en');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDeletingCache, setIsDeletingCache] = useState(false);
  const [cacheDeleteStatus, setCacheDeleteStatus] = useState<'success' | 'error' | null>(null);

  const [f, setF] = useState<RsvpFormState>({
    payment_tracking_mode: wedding.payment_tracking_mode,
    gift_iban: wedding.gift_iban || '',
    show_iban_on_rsvp: wedding.show_iban_on_rsvp ?? true,
    theme_id: wedding.theme_id || '',
    allow_guest_additions: wedding.allow_guest_additions,
    dress_code: wedding.dress_code || '',
    additional_info: wedding.additional_info || '',
    dietary_restrictions_enabled: wedding.dietary_restrictions_enabled,
    accessibility_needs_enabled: wedding.accessibility_needs_enabled,
    guest_yn_question_1_enabled: wedding.guest_yn_question_1_enabled,
    guest_yn_question_1_text: (wedding.guest_yn_question_1_text as I18nField | null) ?? null,
    guest_yn_question_2_enabled: wedding.guest_yn_question_2_enabled,
    guest_yn_question_2_text: (wedding.guest_yn_question_2_text as I18nField | null) ?? null,
    guest_yn_question_3_enabled: wedding.guest_yn_question_3_enabled,
    guest_yn_question_3_text: (wedding.guest_yn_question_3_text as I18nField | null) ?? null,
    guest_dropdown_question_1_enabled: wedding.guest_dropdown_question_1_enabled,
    guest_dropdown_question_1_label: (wedding.guest_dropdown_question_1_label as I18nField | null) ?? null,
    guest_dropdown_question_1_options: (wedding.guest_dropdown_question_1_options as I18nOptions | null) ?? null,
    guest_dropdown_question_2_enabled: wedding.guest_dropdown_question_2_enabled,
    guest_dropdown_question_2_label: (wedding.guest_dropdown_question_2_label as I18nField | null) ?? null,
    guest_dropdown_question_2_options: (wedding.guest_dropdown_question_2_options as I18nOptions | null) ?? null,
    guest_dropdown_question_3_enabled: wedding.guest_dropdown_question_3_enabled,
    guest_dropdown_question_3_label: (wedding.guest_dropdown_question_3_label as I18nField | null) ?? null,
    guest_dropdown_question_3_options: (wedding.guest_dropdown_question_3_options as I18nOptions | null) ?? null,
    guest_text_question_1_enabled: wedding.guest_text_question_1_enabled,
    guest_text_question_1_label: (wedding.guest_text_question_1_label as I18nField | null) ?? null,
    guest_text_question_2_enabled: wedding.guest_text_question_2_enabled,
    guest_text_question_2_label: (wedding.guest_text_question_2_label as I18nField | null) ?? null,
    guest_text_question_3_enabled: wedding.guest_text_question_3_enabled,
    guest_text_question_3_label: (wedding.guest_text_question_3_label as I18nField | null) ?? null,
    transportation_question_enabled: wedding.transportation_question_enabled,
    transportation_question_text: (wedding.transportation_question_text as I18nField | null) ?? null,
    extra_question_1_enabled: wedding.extra_question_1_enabled,
    extra_question_1_text: (wedding.extra_question_1_text as I18nField | null) ?? null,
    extra_question_2_enabled: wedding.extra_question_2_enabled,
    extra_question_2_text: (wedding.extra_question_2_text as I18nField | null) ?? null,
    extra_question_3_enabled: wedding.extra_question_3_enabled,
    extra_question_3_text: (wedding.extra_question_3_text as I18nField | null) ?? null,
    extra_info_1_enabled: wedding.extra_info_1_enabled,
    extra_info_1_label: (wedding.extra_info_1_label as I18nField | null) ?? null,
    extra_info_2_enabled: wedding.extra_info_2_enabled,
    extra_info_2_label: (wedding.extra_info_2_label as I18nField | null) ?? null,
    extra_info_3_enabled: wedding.extra_info_3_enabled,
    extra_info_3_label: (wedding.extra_info_3_label as I18nField | null) ?? null,
    family_dropdown_question_1_enabled: wedding.family_dropdown_question_1_enabled,
    family_dropdown_question_1_label: (wedding.family_dropdown_question_1_label as I18nField | null) ?? null,
    family_dropdown_question_1_options: (wedding.family_dropdown_question_1_options as I18nOptions | null) ?? null,
    show_nupcibot_whatsapp_link: wedding.show_nupcibot_whatsapp_link ?? true,
    show_nupci_banner: wedding.show_nupci_banner ?? true,
  });

  const set = <K extends keyof RsvpFormState>(key: K, val: RsvpFormState[K]) =>
    setF(prev => ({ ...prev, [key]: val }));

  const invitationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/w/${wedding.short_url_initials}`
    : '';

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleDeleteCache = async () => {
    setIsDeletingCache(true);
    setCacheDeleteStatus(null);
    try {
      const res = await fetch(deleteCacheUrl, { method: 'DELETE' });
      setCacheDeleteStatus(res.ok ? 'success' : 'error');
    } catch {
      setCacheDeleteStatus('error');
    } finally {
      setIsDeletingCache(false);
      setTimeout(() => setCacheDeleteStatus(null), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        payment_tracking_mode: f.payment_tracking_mode,
        gift_iban: f.gift_iban || null,
        show_iban_on_rsvp: f.show_iban_on_rsvp,
        theme_id: f.theme_id || null,
        allow_guest_additions: f.allow_guest_additions,
        dress_code: f.dress_code || null,
        additional_info: f.additional_info || null,
        save_the_date_enabled: wedding.save_the_date_enabled,
        dietary_restrictions_enabled: f.dietary_restrictions_enabled,
        accessibility_needs_enabled: f.accessibility_needs_enabled,
        // Per-guest Yes/No
        guest_yn_question_1_enabled: f.guest_yn_question_1_enabled,
        guest_yn_question_1_text: f.guest_yn_question_1_enabled ? f.guest_yn_question_1_text : null,
        guest_yn_question_2_enabled: f.guest_yn_question_2_enabled,
        guest_yn_question_2_text: f.guest_yn_question_2_enabled ? f.guest_yn_question_2_text : null,
        guest_yn_question_3_enabled: f.guest_yn_question_3_enabled,
        guest_yn_question_3_text: f.guest_yn_question_3_enabled ? f.guest_yn_question_3_text : null,
        // Per-guest Dropdown
        guest_dropdown_question_1_enabled: f.guest_dropdown_question_1_enabled,
        guest_dropdown_question_1_label: f.guest_dropdown_question_1_enabled ? f.guest_dropdown_question_1_label : null,
        guest_dropdown_question_1_options: f.guest_dropdown_question_1_enabled ? cleanOpts(f.guest_dropdown_question_1_options) : null,
        guest_dropdown_question_2_enabled: f.guest_dropdown_question_2_enabled,
        guest_dropdown_question_2_label: f.guest_dropdown_question_2_enabled ? f.guest_dropdown_question_2_label : null,
        guest_dropdown_question_2_options: f.guest_dropdown_question_2_enabled ? cleanOpts(f.guest_dropdown_question_2_options) : null,
        guest_dropdown_question_3_enabled: f.guest_dropdown_question_3_enabled,
        guest_dropdown_question_3_label: f.guest_dropdown_question_3_enabled ? f.guest_dropdown_question_3_label : null,
        guest_dropdown_question_3_options: f.guest_dropdown_question_3_enabled ? cleanOpts(f.guest_dropdown_question_3_options) : null,
        // Per-guest Text
        guest_text_question_1_enabled: f.guest_text_question_1_enabled,
        guest_text_question_1_label: f.guest_text_question_1_enabled ? f.guest_text_question_1_label : null,
        guest_text_question_2_enabled: f.guest_text_question_2_enabled,
        guest_text_question_2_label: f.guest_text_question_2_enabled ? f.guest_text_question_2_label : null,
        guest_text_question_3_enabled: f.guest_text_question_3_enabled,
        guest_text_question_3_label: f.guest_text_question_3_enabled ? f.guest_text_question_3_label : null,
        // Per-family Transportation
        transportation_question_enabled: f.transportation_question_enabled,
        transportation_question_text: f.transportation_question_enabled ? f.transportation_question_text : null,
        // Per-family Yes/No
        extra_question_1_enabled: f.extra_question_1_enabled,
        extra_question_1_text: f.extra_question_1_enabled ? f.extra_question_1_text : null,
        extra_question_2_enabled: f.extra_question_2_enabled,
        extra_question_2_text: f.extra_question_2_enabled ? f.extra_question_2_text : null,
        extra_question_3_enabled: f.extra_question_3_enabled,
        extra_question_3_text: f.extra_question_3_enabled ? f.extra_question_3_text : null,
        // Per-family Info
        extra_info_1_enabled: f.extra_info_1_enabled,
        extra_info_1_label: f.extra_info_1_enabled ? f.extra_info_1_label : null,
        extra_info_2_enabled: f.extra_info_2_enabled,
        extra_info_2_label: f.extra_info_2_enabled ? f.extra_info_2_label : null,
        extra_info_3_enabled: f.extra_info_3_enabled,
        extra_info_3_label: f.extra_info_3_enabled ? f.extra_info_3_label : null,
        // Per-family Dropdown
        family_dropdown_question_1_enabled: f.family_dropdown_question_1_enabled,
        family_dropdown_question_1_label: f.family_dropdown_question_1_enabled ? f.family_dropdown_question_1_label : null,
        family_dropdown_question_1_options: f.family_dropdown_question_1_enabled ? cleanOpts(f.family_dropdown_question_1_options) : null,
        // Branding
        show_nupcibot_whatsapp_link: f.show_nupcibot_whatsapp_link,
        show_nupci_banner: f.show_nupci_banner,
      });
    } catch (err) {
      console.error('Form submission error:', err);
      setError(t('submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Invitation URL */}
      {wedding.short_url_initials && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-6">
          <h3 className="text-lg font-medium text-purple-900 mb-2">{t('invitationUrl')}</h3>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-white border border-purple-200 rounded-md px-4 py-2 text-purple-900 font-mono text-sm overflow-hidden text-ellipsis whitespace-nowrap">
              {invitationUrl}
            </div>
            <button
              type="button"
              onClick={handleCopyUrl}
              className={`flex-shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
            >
              {copied ? t('copySuccess') : t('copyUrl')}
            </button>
          </div>
        </div>
      )}

      {/* ── PER-GUEST QUESTIONS ─────────────────────────────────────────── */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-1">{t('perGuestQuestions')}</h3>
        <p className="text-sm text-gray-500 mb-6">{t('perGuestQuestionsDesc')}</p>

        {/* Dietary + Accessibility */}
        <div className={`${cardCls} mb-4`}>
          <label className="flex items-center">
            <input type="checkbox" checked={f.dietary_restrictions_enabled}
              onChange={e => set('dietary_restrictions_enabled', e.target.checked)} className={checkCls} />
            <span className="ml-2 text-sm font-medium text-gray-700">{t('dietary')}</span>
          </label>
          <p className="mt-1 ml-6 text-xs text-gray-500">{t('dietaryDesc')}</p>
        </div>

        <div className={`${cardCls} mb-6`}>
          <label className="flex items-center">
            <input type="checkbox" checked={f.accessibility_needs_enabled}
              onChange={e => set('accessibility_needs_enabled', e.target.checked)} className={checkCls} />
            <span className="ml-2 text-sm font-medium text-gray-700">{t('accessibilityNeeds')}</span>
          </label>
          <p className="mt-1 ml-6 text-xs text-gray-500">{t('accessibilityNeedsDesc')}</p>
        </div>

        {/* Guest Yes/No questions */}
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('guestYnQuestions')}</h4>
        {([1, 2, 3] as const).map(n => {
          const enabledKey = `guest_yn_question_${n}_enabled` as keyof RsvpFormState;
          const textKey = `guest_yn_question_${n}_text` as keyof RsvpFormState;
          return (
            <div key={n} className={`${cardCls} mb-3`}>
              <label className="flex items-center">
                <input type="checkbox" checked={f[enabledKey] as boolean}
                  onChange={e => set(enabledKey, e.target.checked)} className={checkCls} />
                <span className="ml-2 text-sm text-gray-700">{t('enableGuestYnQuestion', { number: n })}</span>
              </label>
              {(f[enabledKey] as boolean) && (
                <div className={subCls}>
                  <I18nTextInput
                    map={f[textKey] as I18nField | null}
                    onChange={m => set(textKey, m)}
                    placeholder={t('questionPlaceholder')}
                    activeLang={activeLang}
                    onLangChange={setActiveLang}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Guest Dropdown questions */}
        <h4 className="text-sm font-semibold text-gray-700 mb-3 mt-6">{t('guestDropdownQuestions')}</h4>
        {([1, 2, 3] as const).map(n => {
          const enabledKey = `guest_dropdown_question_${n}_enabled` as keyof RsvpFormState;
          const labelKey = `guest_dropdown_question_${n}_label` as keyof RsvpFormState;
          const optsKey = `guest_dropdown_question_${n}_options` as keyof RsvpFormState;
          return (
            <div key={n} className={`${cardCls} mb-3`}>
              <label className="flex items-center">
                <input type="checkbox" checked={f[enabledKey] as boolean}
                  onChange={e => set(enabledKey, e.target.checked)} className={checkCls} />
                <span className="ml-2 text-sm text-gray-700">{t('enableGuestDropdownQuestion', { number: n })}</span>
              </label>
              {(f[enabledKey] as boolean) && (
                <div className={subCls}>
                  <I18nDropdownInput
                    labelMap={f[labelKey] as I18nField | null}
                    optionsMap={f[optsKey] as I18nOptions | null}
                    onLabelChange={m => set(labelKey, m)}
                    onOptionsChange={m => set(optsKey, m)}
                    activeLang={activeLang}
                    onLangChange={setActiveLang}
                    questionLabelText={t('questionLabel')}
                    questionLabelPlaceholderText={t('questionLabelPlaceholder')}
                    dropdownOptionsText={t('dropdownOptions')}
                    dropdownOptionsPlaceholderText={t('dropdownOptionsPlaceholder')}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Guest Text questions */}
        <h4 className="text-sm font-semibold text-gray-700 mb-3 mt-6">{t('guestTextQuestions')}</h4>
        {([1, 2, 3] as const).map(n => {
          const enabledKey = `guest_text_question_${n}_enabled` as keyof RsvpFormState;
          const labelKey = `guest_text_question_${n}_label` as keyof RsvpFormState;
          return (
            <div key={n} className={`${cardCls} mb-3`}>
              <label className="flex items-center">
                <input type="checkbox" checked={f[enabledKey] as boolean}
                  onChange={e => set(enabledKey, e.target.checked)} className={checkCls} />
                <span className="ml-2 text-sm text-gray-700">{t('enableGuestTextQuestion', { number: n })}</span>
              </label>
              {(f[enabledKey] as boolean) && (
                <div className={subCls}>
                  <I18nTextInput
                    map={f[labelKey] as I18nField | null}
                    onChange={m => set(labelKey, m)}
                    placeholder={t('questionLabelPlaceholder')}
                    activeLang={activeLang}
                    onLangChange={setActiveLang}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── PER-FAMILY QUESTIONS ────────────────────────────────────────── */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-1">{t('perFamilyQuestions')}</h3>
        <p className="text-sm text-gray-500 mb-6">{t('perFamilyQuestionsDesc')}</p>

        {/* Transportation */}
        <div className={`${cardCls} mb-4`}>
          <label className="flex items-center">
            <input type="checkbox" checked={f.transportation_question_enabled}
              onChange={e => set('transportation_question_enabled', e.target.checked)} className={checkCls} />
            <span className="ml-2 text-sm font-medium text-gray-700">{t('transportation')}</span>
          </label>
          {f.transportation_question_enabled && (
            <div className={subCls}>
              <p className="text-xs text-gray-500">{t('transportationText')}</p>
              <LanguageTabs activeLanguage={activeLang} onChange={setActiveLang} filledLanguages={filledLangs(f.transportation_question_text)} />
              <input
                type="text"
                value={getLang(f.transportation_question_text, activeLang)}
                onChange={e => set('transportation_question_text', setLang(f.transportation_question_text, activeLang, e.target.value))}
                className={inputCls}
                placeholder={t('transportationPlaceholder')}
              />
            </div>
          )}
        </div>

        {/* Family Yes/No questions */}
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('extraQuestions')}</h4>
        {([1, 2, 3] as const).map(n => {
          const enabledKey = `extra_question_${n}_enabled` as keyof RsvpFormState;
          const textKey = `extra_question_${n}_text` as keyof RsvpFormState;
          return (
            <div key={n} className={`${cardCls} mb-3`}>
              <label className="flex items-center">
                <input type="checkbox" checked={f[enabledKey] as boolean}
                  onChange={e => set(enabledKey, e.target.checked)} className={checkCls} />
                <span className="ml-2 text-sm text-gray-700">{t('enableQuestion', { number: n })}</span>
              </label>
              {(f[enabledKey] as boolean) && (
                <div className={subCls}>
                  <I18nTextInput
                    map={f[textKey] as I18nField | null}
                    onChange={m => set(textKey, m)}
                    placeholder={t('questionPlaceholder')}
                    activeLang={activeLang}
                    onLangChange={setActiveLang}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Family Info fields */}
        <h4 className="text-sm font-semibold text-gray-700 mb-2 mt-6">{t('extraInfo')}</h4>
        <p className="text-xs text-gray-500 mb-3">{t('extraInfoDesc')}</p>
        {([1, 2, 3] as const).map(n => {
          const enabledKey = `extra_info_${n}_enabled` as keyof RsvpFormState;
          const labelKey = `extra_info_${n}_label` as keyof RsvpFormState;
          return (
            <div key={n} className={`${cardCls} mb-3`}>
              <label className="flex items-center">
                <input type="checkbox" checked={f[enabledKey] as boolean}
                  onChange={e => set(enabledKey, e.target.checked)} className={checkCls} />
                <span className="ml-2 text-sm text-gray-700">{t('enableInfo', { number: n })}</span>
              </label>
              {(f[enabledKey] as boolean) && (
                <div className={subCls}>
                  <p className="text-xs text-gray-500">{t('infoLabel')}</p>
                  <LanguageTabs activeLanguage={activeLang} onChange={setActiveLang} filledLanguages={filledLangs(f[labelKey] as I18nField | null)} />
                  <input
                    type="text"
                    value={getLang(f[labelKey] as I18nField | null, activeLang)}
                    onChange={e => set(labelKey, setLang(f[labelKey] as I18nField | null, activeLang, e.target.value))}
                    className={inputCls}
                    placeholder={t('infoPlaceholder')}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Family Dropdown question */}
        <h4 className="text-sm font-semibold text-gray-700 mb-3 mt-6">{t('perFamilyDropdown')}</h4>
        <div className={cardCls}>
          <label className="flex items-center">
            <input type="checkbox" checked={f.family_dropdown_question_1_enabled}
              onChange={e => set('family_dropdown_question_1_enabled', e.target.checked)} className={checkCls} />
            <span className="ml-2 text-sm text-gray-700">{t('enableFamilyDropdown')}</span>
          </label>
          {f.family_dropdown_question_1_enabled && (
            <div className={subCls}>
              <I18nDropdownInput
                labelMap={f.family_dropdown_question_1_label}
                optionsMap={f.family_dropdown_question_1_options}
                onLabelChange={m => set('family_dropdown_question_1_label', m)}
                onOptionsChange={m => set('family_dropdown_question_1_options', m)}
                activeLang={activeLang}
                onLangChange={setActiveLang}
                questionLabelText={t('questionLabel')}
                questionLabelPlaceholderText={t('questionLabelPlaceholder')}
                dropdownOptionsText={t('dropdownOptions')}
                dropdownOptionsPlaceholderText={t('dropdownOptionsPlaceholder')}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── RSVP BRANDING ──────────────────────────────────────────────── */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-1">{t('rsvpBranding')}</h3>
        <p className="text-sm text-gray-500 mb-6">{t('rsvpBrandingDesc')}</p>

        <div className={`${cardCls} mb-4`}>
          <label className="flex items-center">
            <input type="checkbox" checked={f.show_nupcibot_whatsapp_link}
              onChange={e => set('show_nupcibot_whatsapp_link', e.target.checked)} className={checkCls} />
            <span className="ml-2 text-sm font-medium text-gray-700">{t('showNupcibotWhatsappLink')}</span>
          </label>
          <p className="mt-1 ml-6 text-xs text-gray-500">{t('showNupcibotWhatsappLinkDesc')}</p>
        </div>

        <div className={cardCls}>
          <label className="flex items-center">
            <input type="checkbox" checked={f.show_nupci_banner}
              onChange={e => set('show_nupci_banner', e.target.checked)} className={checkCls} />
            <span className="ml-2 text-sm font-medium text-gray-700">{t('showNupciBanner')}</span>
          </label>
          <p className="mt-1 ml-6 text-xs text-gray-500">{t('showNupciBannerDesc')}</p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleDeleteCache}
            disabled={isDeletingCache}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeletingCache ? t('deletingCache') : t('deleteCache')}
          </button>
          {cacheDeleteStatus === 'success' && <span className="text-sm text-green-600">{t('deleteCacheSuccess')}</span>}
          {cacheDeleteStatus === 'error' && <span className="text-sm text-red-600">{t('deleteCacheError')}</span>}
        </div>
        <div className="flex space-x-3">
          <button type="button" onClick={onCancel} disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed">
            {t('cancel')}
          </button>
          <button type="submit" disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </form>
  );
}
