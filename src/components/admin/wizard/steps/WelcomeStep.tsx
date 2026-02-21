'use client';

import { useTranslations } from 'next-intl';
import type { WeddingWithRelations } from '../WeddingWizard';

interface WelcomeStepProps {
  wedding: WeddingWithRelations;
  onNext: () => void;
  onBack: () => void;
  onComplete: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function WelcomeStep({ wedding, onNext }: WelcomeStepProps) {
  const t = useTranslations('admin.wizard.welcome');

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h2 className="mt-6 text-3xl font-bold text-gray-900">
          {t('title')}
        </h2>
        <p className="mt-4 text-lg text-gray-600">
          {t('congratulations')} <strong>{wedding.couple_names}</strong>!
        </p>
        <p className="mt-2 text-base text-gray-500">
          {t('excited')}
        </p>
      </div>

      <div className="mt-10">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('whatYouWillSetup')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            'basicInfo',
            'rsvpConfig',
            'guestList',
            'messageTemplates',
            'invitation',
            'seating',
            'checklist',
            'payments'
          ].map((feature) => (
            <div key={feature} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{t(`features.${feature}.title`)}</p>
                <p className="text-sm text-gray-500">{t(`features.${feature}.description`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>{t('tip')}</strong> {t('tipText')}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 flex justify-end">
        <button
          onClick={onNext}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all"
        >
          {t('getStarted')}
          <svg className="ml-2 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
