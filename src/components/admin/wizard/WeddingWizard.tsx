'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

const WIZARD_STEPS = [
  { id: 0, title: 'Welcome', component: WelcomeStep },
  { id: 1, title: 'Basic Info', component: BasicInfoStep },
  { id: 2, title: 'RSVP Settings', component: RsvpSettingsStep },
  { id: 3, title: 'Guests', component: GuestsStep },
  { id: 4, title: 'Message Templates', component: MessageTemplatesStep },
  { id: 5, title: 'Invitation', component: InvitationStep },
  { id: 6, title: 'Seating', component: SeatingStep, optional: true },
  { id: 7, title: 'Checklist', component: ChecklistStep },
  { id: 8, title: 'Payments & Gifts', component: PaymentGiftsStep },
  { id: 9, title: 'Complete', component: CompletionStep },
];

export function WeddingWizard({ wedding, currentStep: initialStep }: WeddingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
              <h1 className="text-2xl font-bold text-gray-900">Wedding Setup Wizard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Let's get your wedding management set up in a few easy steps
              </p>
            </div>
            {!isFirstStep && !isLastStep && (
              <button
                onClick={handleSkip}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Skip wizard and go to dashboard
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
