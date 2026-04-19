'use client';

import { useEffect, useMemo, useState } from 'react';
import { Joyride, Step, EventData, STATUS } from 'react-joyride';
import { useTranslations } from 'next-intl';

interface WeddingDemoTutorialProps {
  statusEndpoint?: '/api/planner/trial-status' | '/api/admin/trial-status';
}

export function WeddingDemoTutorial({ statusEndpoint = '/api/planner/trial-status' }: WeddingDemoTutorialProps) {
  const [run, setRun] = useState(false);
  const [isTrialMode, setIsTrialMode] = useState(false);
  const t = useTranslations('demoTutorial');
  const tCommon = useTranslations('common.buttons');

  useEffect(() => {
    fetch(statusEndpoint)
      .then(r => r.json())
      .then(d => {
        if (d.isTrialMode === true) {
          setIsTrialMode(true);
          const tutorialShown = localStorage.getItem('nupci_wedding_tutorial_shown');
          if (!tutorialShown) {
            setRun(true);
          }
        }
      })
      .catch(() => {});
  }, [statusEndpoint]);

  const steps: Step[] = useMemo(() => [
    {
      target: 'body',
      placement: 'center',
      title: t('weddingOverview.title'),
      content: t('weddingOverview.description'),
      skipBeacon: true,
    },
    {
      target: '[data-tutorial="wedding-edit-button"]',
      title: t('editWedding.title'),
      content: t('editWedding.description'),
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="wedding-itinerary"]',
      title: t('itinerary.title'),
      content: t('itinerary.description'),
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="wedding-guest-list"]',
      title: t('guestList.title'),
      content: t('guestList.description'),
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="wedding-tasks-finances"]',
      title: t('tasksFinances.title'),
      content: t('tasksFinances.description'),
      placement: 'top',
    },
    {
      target: '[data-tutorial="wedding-invitations-templates"]',
      title: t('invitationsTemplates.title'),
      content: t('invitationsTemplates.description'),
      placement: 'top',
    },
    {
      target: '[data-tutorial="wedding-food-drinks"]',
      title: t('foodDrinks.title'),
      content: t('foodDrinks.description'),
      placement: 'top',
    },
    {
      target: '[data-tutorial="wedding-reports"]',
      title: t('reports.title'),
      content: t('reports.description'),
      placement: 'left',
    },
    {
      target: '[data-tutorial="wedding-invite-admin"]',
      title: t('inviteCouple.title'),
      content: t('inviteCouple.description'),
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="crisp-help-button"]',
      title: t('support.title'),
      content: t('support.description'),
      placement: 'left',
    },
  ], [t]);

  const handleJoyrideEvent = (data: EventData) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      localStorage.setItem('nupci_wedding_tutorial_shown', 'true');
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
