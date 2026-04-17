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
  const vimeoUrl = process.env.NEXT_PUBLIC_VIMEO_PLANNER_TUTORIAL_URL || 'https://player.vimeo.com/video/1182292327';

  useEffect(() => {
    fetch(statusEndpoint)
      .then(r => r.json())
      .then(d => {
        if (d.isTrialMode === true) {
          setIsTrialMode(true);
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
          <p className="mb-4 text-sm text-gray-600">{t('welcome.description')}</p>
          <div className="relative pb-[56.25%] h-0 overflow-hidden max-w-full bg-black rounded-lg shadow-inner">
            <iframe
              src={vimeoUrl}
              className="absolute top-0 left-0 w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ),
      skipBeacon: true,
    },
    {
      target: 'body',
      placement: 'center',
      title: t('plannerOverview.title'),
      content: t('plannerOverview.description'),
      skipBeacon: true,
    },
    {
      target: 'body',
      placement: 'center',
      title: t('trialMode.title'),
      content: t('trialMode.description'),
      skipBeacon: true,
    },
    {
      target: '[data-tutorial="planner-header"]',
      title: t('header.title'),
      content: t('header.description'),
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="planner-stats"]',
      title: t('stats.title'),
      content: t('stats.description'),
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="upcoming-weddings"]',
      title: t('upcomingWeddings.title'),
      content: t('upcomingWeddings.description'),
      placement: 'top',
    },
    {
      target: '[data-tutorial="upcoming-tasks"]',
      title: t('upcomingTasks.title'),
      content: t('upcomingTasks.description'),
      placement: 'top',
    },
    {
      target: '[data-tutorial="quotes-finances"]',
      title: t('quotesFinances.title'),
      content: t('quotesFinances.description'),
      placement: 'top',
    },
    {
      target: '[data-tutorial="quick-actions"]',
      title: t('quickActions.title'),
      content: t('quickActions.description'),
      placement: 'top',
    },
    {
      target: '[data-tutorial="wedding-card-ana-y-luis"]',
      title: t('openWedding.title'),
      content: t('openWedding.description'),
      placement: 'bottom',
    },
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
        primaryColor: '#f43f5e',
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
        last: tCommon('confirm'),
        next: tCommon('next'),
        skip: t('skip'),
      }}
    />
  );
}
