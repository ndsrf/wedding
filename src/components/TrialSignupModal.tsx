'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { COUNTRIES } from '@/lib/phone-utils';
import ReCaptchaWrapper from '@/components/ReCaptchaWrapper';

// Maps locale code to default country selector
const LOCALE_TO_COUNTRY: Record<string, string> = {
  es: 'ES',
  fr: 'FR',
  it: 'IT',
  de: 'DE',
  en: 'GB',
};

interface TrialSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
}

type Stage = 'form' | 'loading' | 'success' | 'error';

const STEP_KEYS = [
  'verifying',
  'creating',
  'settingUp',
  'loadingDemo',
  'sendingEmail',
] as const;

function TrialSignupModalInner({ isOpen, onClose, locale }: TrialSignupModalProps) {
  const t = useTranslations('trialSignup');
  const { executeRecaptcha } = useGoogleReCaptcha();

  const [stage, setStage] = useState<Stage>('form');
  const [currentStep, setCurrentStep] = useState(0);
  const [errorKey, setErrorKey] = useState<string>('generic');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const defaultCountry = LOCALE_TO_COUNTRY[locale] ?? 'ES';
  const [countryCode, setCountryCode] = useState(defaultCountry);
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    logoUrl: '',
    phone: '',
  });

  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset when locale changes
  useEffect(() => {
    setCountryCode(LOCALE_TO_COUNTRY[locale] ?? 'ES');
  }, [locale]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stage !== 'loading') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, stage, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Advance through step messages while loading
  useEffect(() => {
    if (stage === 'loading') {
      setCurrentStep(0);
      stepTimerRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < STEP_KEYS.length - 1) return prev + 1;
          clearInterval(stepTimerRef.current!);
          return prev;
        });
      }, 3500);
    } else {
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current);
        stepTimerRef.current = null;
      }
    }
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, [stage]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setStage('loading');
    setSubmittedEmail(formData.email);

    try {
      const recaptchaToken =
        process.env.NODE_ENV !== 'development' && executeRecaptcha
          ? await executeRecaptcha('trial_signup')
          : 'dev-bypass';

      // Compose phone with country prefix if provided
      const countryEntry = COUNTRIES.find(c => c.code === countryCode);
      const fullPhone = formData.phone.trim()
        ? `${countryEntry?.prefix ?? ''}${formData.phone.trim()}`
        : undefined;

      const res = await fetch('/api/public/trial-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName.trim(),
          email: formData.email.trim(),
          logoUrl: formData.logoUrl.trim() || undefined,
          phone: fullPhone,
          recaptchaToken,
          locale,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStage('success');
      } else {
        const errorMap: Record<string, string> = {
          EMAIL_EXISTS: 'emailExists',
          RECAPTCHA_FAILED: 'recaptchaFailed',
          VALIDATION_ERROR: 'invalidEmail',
          INTERNAL_ERROR: 'generic',
        };
        setErrorKey(errorMap[data.error] ?? 'generic');
        setStage('error');
      }
    } catch (err) {
      console.error('[TrialSignupModal] submission error:', err);
      setErrorKey('generic');
      setStage('error');
    }
  };

  const handleRetry = () => {
    setStage('form');
    setErrorKey('generic');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={stage !== 'loading' ? onClose : undefined}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-signup-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-8 py-6 text-white">
          <h2 id="trial-signup-title" className="text-2xl font-bold font-['Playfair_Display']">
            {t('title')}
          </h2>
          <p className="mt-1 text-white/85 text-sm">
            {t('subtitle')}
          </p>
        </div>

        {/* Close button */}
        {stage !== 'loading' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="px-8 py-6">
          {/* ====== FORM STAGE ====== */}
          {stage === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('fields.companyName')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder={t('fields.companyNamePlaceholder')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-gray-900 transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('fields.email')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('fields.emailPlaceholder')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-gray-900 transition-all"
                />
                <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  {t('fields.emailNote')}
                </p>
              </div>

              {/* Logo URL (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('fields.logo')}{' '}
                  <span className="text-gray-400 font-normal text-xs">({t('fields.logoNote')})</span>
                </label>
                <input
                  type="url"
                  name="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleChange}
                  placeholder={t('fields.logoPlaceholder')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-gray-900 transition-all"
                />
              </div>

              {/* Phone (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('fields.phone')}{' '}
                  <span className="text-gray-400 font-normal text-xs">({t('fields.phoneNote')})</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value)}
                    aria-label={t('fields.country')}
                    className="w-28 px-2 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-gray-900 text-sm bg-white"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.prefix} {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder={t('fields.phonePlaceholder')}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-gray-900 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 px-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-semibold hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {t('submit')}
              </button>
            </form>
          )}

          {/* ====== LOADING STAGE ====== */}
          {stage === 'loading' && (
            <div className="py-8 text-center">
              {/* Spinner */}
              <div className="flex justify-center mb-6">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-rose-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-rose-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Step message */}
              <p className="text-lg font-medium text-gray-800 mb-2">
                {t(`steps.${STEP_KEYS[currentStep]}`)}
              </p>

              {/* Progress dots */}
              <div className="flex justify-center gap-2 mt-4">
                {STEP_KEYS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-500 ${
                      i <= currentStep
                        ? 'w-6 bg-rose-500'
                        : 'w-2 bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ====== SUCCESS STAGE ====== */}
          {stage === 'success' && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 font-['Playfair_Display']">
                {t('success.title')}
              </h3>
              <div className="mb-4 p-4 bg-rose-50 rounded-xl border border-rose-100">
                <p className="text-gray-700 text-sm">
                  {t('success.emailSent')}{' '}
                  <span className="font-semibold text-rose-600">{submittedEmail}</span>
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {t('success.checkInbox')}
                </p>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                {t('success.learnMore')}{' '}
                <Link
                  href={`/${locale}/docs`}
                  className="text-rose-600 hover:text-rose-700 font-medium underline"
                  onClick={onClose}
                >
                  {t('success.docsLink')}
                </Link>
                .
              </p>
              <button
                onClick={onClose}
                className="px-8 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-semibold hover:from-rose-600 hover:to-pink-600 transition-all shadow-md"
              >
                {t('success.backHome')}
              </button>
            </div>
          )}

          {/* ====== ERROR STAGE ====== */}
          {stage === 'error' && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t(`errors.${errorKey}`)}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {errorKey === 'emailExists'
                  ? t('errors.emailExists')
                  : t('errors.generic')}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRetry}
                  className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-semibold hover:from-rose-600 hover:to-pink-600 transition-all shadow-md"
                >
                  {t('retry')}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-all"
                >
                  {t('success.backHome')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TrialSignupModal(props: TrialSignupModalProps) {
  return (
    <ReCaptchaWrapper>
      <TrialSignupModalInner {...props} />
    </ReCaptchaWrapper>
  );
}
