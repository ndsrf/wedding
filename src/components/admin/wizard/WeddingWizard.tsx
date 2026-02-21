'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Wedding, Theme, Family, FamilyMember, MessageTemplate, InvitationTemplate, Table, ChecklistTask } from '@prisma/client';
import { WizardProgress } from './WizardProgress';
import { WelcomeStep } from './steps/WelcomeStep';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { RsvpSettingsStep } from './steps/RsvpSettingsStep';
import { GuestsStep } from './steps/GuestsStep';
import { MessageTemplatesStep } from './steps/MessageTemplatesStep';
import { InvitationStep } from './steps/InvitationStep';
import { SeatingStep } from './steps/SeatingStep';
import { ChecklistStep } from './steps/ChecklistStep';
import { PaymentGiftsStep } from './steps/PaymentGiftsStep';
import { CompletionStep } from './steps/CompletionStep';

export type WeddingWithRelations = Wedding & {
  theme: Theme | null;
  families: (Family & { members: FamilyMember[] })[];
  message_templates: MessageTemplate[];
  invitation_templates: InvitationTemplate[];
  tables: Table[];
  checklist_tasks: ChecklistTask[];
};

interface WeddingWizardProps {
  wedding: WeddingWithRelations;
  currentStep: number;
}

const STEP_COMPONENTS = [
  { id: 0, component: WelcomeStep, titleKey: 'welcome.title' },
  { id: 1, component: BasicInfoStep, titleKey: 'basicInfo.title' },
  { id: 2, component: RsvpSettingsStep, titleKey: 'rsvpSettings.title' },
  { id: 3, component: GuestsStep, titleKey: 'guests.title' },
  { id: 4, component: MessageTemplatesStep, titleKey: 'messageTemplates.title' },
  { id: 5, component: InvitationStep, titleKey: 'invitation.title' },
  { id: 6, component: SeatingStep, titleKey: 'seating.title', optional: true },
  { id: 7, component: ChecklistStep, titleKey: 'checklist.title' },
  { id: 8, component: PaymentGiftsStep, titleKey: 'paymentGifts.title' },
  { id: 9, component: CompletionStep, titleKey: 'completion.title' },
];

export function WeddingWizard({ wedding, currentStep: initialStep }: WeddingWizardProps) {
  const router = useRouter();
  const t = useTranslations('admin.wizard');
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Build wizard steps with translated titles
  const WIZARD_STEPS = useMemo(() =>
    STEP_COMPONENTS.map(step => ({
      id: step.id,
      title: t(step.titleKey),
      component: step.component,
      optional: step.optional,
    })),
    [t]
  );

  const CurrentStepComponent = WIZARD_STEPS[currentStep]?.component || WelcomeStep;

  const handleNext = async () => {
    setIsTransitioning(true);

    // Save current step to backend
    try {
      await fetch(`/api/admin/wizard/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStep: currentStep + 1 }),
      });
    } catch (error) {
      console.error('Failed to save wizard progress:', error);
    }

    setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
      setIsTransitioning(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  };

  const handleBack = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep((prev) => Math.max(prev - 1, 0));
      setIsTransitioning(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  };

  const handleSkip = async () => {
    // Mark wizard as skipped and redirect to dashboard
    try {
      await fetch(`/api/admin/wizard/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipped: true }),
      });
      router.push('/admin');
    } catch (error) {
      console.error('Failed to skip wizard:', error);
      router.push('/admin');
    }
  };

  const handleComplete = async () => {
    // Mark wizard as completed and redirect to dashboard
    try {
      await fetch(`/api/admin/wizard/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipped: false }),
      });
      router.push('/admin');
      router.refresh();
    } catch (error) {
      console.error('Failed to complete wizard:', error);
      router.push('/admin');
    }
  };

  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {t('subtitle')}
              </p>
            </div>
            {!isFirstStep && !isLastStep && (
              <button
                onClick={handleSkip}
                className="inline-flex items-center px-4 py-2 border-2 border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all"
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                {t('skipWizard')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <WizardProgress steps={WIZARD_STEPS} currentStep={currentStep} />

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div
          className={`transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <CurrentStepComponent
            wedding={wedding}
            onNext={handleNext}
            onBack={handleBack}
            onComplete={handleComplete}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
          />
        </div>
      </div>
    </div>
  );
}
