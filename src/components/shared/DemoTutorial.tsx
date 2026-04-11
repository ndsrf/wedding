'use client';

import { useEffect, useState } from 'react';
import { Joyride, Step, EventData, STATUS } from 'react-joyride';
import { useTranslations } from 'next-intl';

interface DemoTutorialProps {
  statusEndpoint: '/api/planner/trial-status' | '/api/admin/trial-status';
}

export function DemoTutorial({ statusEndpoint }: DemoTutorialProps) {
  const [run, setRun] = useState(false);
  const [isTrialMode, setIsTrialMode] = useState(false);
  const t = useTranslations('demoTutorial');
  const tCommon = useTranslations('common.buttons');
  const vimeoUrl = process.env.NEXT_PUBLIC_VIMEO_PLANNER_TUTORIAL_URL || "https://player.vimeo.com/video/1182292327";

  useEffect(() => {
    // Check trial status
    fetch(statusEndpoint)
      .then(r => r.json())
      .then(d => {
        if (d.isTrialMode === true) {
          setIsTrialMode(true);
          // Check if tutorial was already shown
          const tutorialShown = localStorage.getItem('nupci_planner_tutorial_shown');
          if (!tutorialShown) {
            setRun(true);
          }
        }
      })
      .catch(() => {});
  }, [statusEndpoint]);

  const steps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      title: t('welcome.title'),
      content: (
        <div className="w-full">
          <p className="mb-4 text-sm text-gray-600">
            {t('welcome.description')}
          </p>
          <div className="relative pb-[56.25%] h-0 overflow-hidden max-w-full bg-black rounded-lg shadow-inner">
            <iframe
              src={vimeoUrl}
              className="absolute top-0 left-0 w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      ),
      skipBeacon: true,
    },
    {
      target: '[data-tutorial="wedding-card-ana-y-luis"]',
      title: t('firstWedding.title'),
      content: t('firstWedding.description'),
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="trial-banner-learn-more"]',
      title: t('support.title'),
      content: t('support.description'),
      placement: 'bottom',
    }
  ];

  const handleJoyrideEvent = (data: EventData) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      localStorage.setItem('nupci_planner_tutorial_shown', 'true');
    }
  };

  if (!isTrialMode) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      onEvent={handleJoyrideEvent}
      options={{
        primaryColor: '#f43f5e', // rose-500
        zIndex: 1000,
      }}
      styles={{
        tooltipContainer: {
          textAlign: 'left',
        },
      }}
      locale={{
        back: tCommon('back'),
        close: tCommon('close'),
        last: tCommon('confirm'), // Or some other finalization text
        next: tCommon('next'),
        skip: t('welcome.title') === '¡Bienvenido a Nupci!' ? 'Saltar' : 'Skip', // Simple fallback for skip if not in common
      }}
    />
  );
}
