/**
 * Guest RSVP Page Client Component
 * 
 * Handles interactive parts of the RSVP page.
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import RSVPForm from '@/components/guest/RSVPForm';
import PaymentInfo from '@/components/guest/PaymentInfo';
import LanguageSelector from '@/components/guest/LanguageSelector';
import ConfirmationMessage from '@/components/guest/ConfirmationMessage';
import { EnvelopeReveal } from '@/components/guest/EnvelopeReveal';
import TemplateRenderer from '@/components/guest/TemplateRenderer';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import type { GuestRSVPPageData } from '@/types/api';
import type { SupportedLanguage } from '@/types/invitation-template';

interface RSVPPageClientProps {
  token: string;
  initialData: GuestRSVPPageData;
  channel?: string | null;
}

export default function RSVPPageClient({ token, initialData, channel }: RSVPPageClientProps) {
  const t = useTranslations();
  const locale = useLocale();

  const [data, setData] = useState<GuestRSVPPageData>(initialData);
  const [rsvpSubmitted, setRsvpSubmitted] = useState(initialData.has_submitted_rsvp);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set loading to false once the component is mounted and hydrated
    setIsLoading(false);
  }, []);

  async function handleRSVPSuccess() {
    setRsvpSubmitted(true);
    // Reload data to get updated status
    try {
      const url = `/api/guest/${token}${channel ? `?channel=${channel}` : ''}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error('Reload RSVP data error:', err);
    }
  }

  const { family, wedding, theme, invitation_template, rsvp_cutoff_passed } = data;
  const isGardenBirds = theme.name === 'Garden Birds';
  const hasTemplate = !!invitation_template;

  // Map preferred_language to SupportedLanguage
  const templateLanguage = (family.preferred_language.toUpperCase()) as SupportedLanguage;

  // Content to be wrapped in envelope or displayed normally
  // Show loading spinner while component is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <WeddingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  const mainContent = (
    <>
      {/* Custom Invitation Template or Standard Welcome Section */}
      {hasTemplate ? (
        <TemplateRenderer
          design={invitation_template.design}
          preRenderedHtml={invitation_template.pre_rendered_html}
          weddingDate={wedding.wedding_date}
          weddingTime={wedding.wedding_time}
          location={wedding.location}
          coupleNames={wedding.couple_names}
          language={templateLanguage}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {t('guest.welcome.title', { familyName: family.name })} 👋
          </h2>
          <p className="text-xl text-gray-600 mb-4">
            {t('guest.welcome.subtitle')}
          </p>
          <div className="space-y-2 text-lg text-gray-700">
            <p>
              <strong>{t('master.weddings.coupleName')}:</strong> {wedding.couple_names}
            </p>
            <p>
              <strong>{t('guest.welcome.date', { date: new Date(wedding.wedding_date).toLocaleDateString(locale) })}</strong>
            </p>
            <p>
              <strong>{t('guest.welcome.time', { time: wedding.wedding_time })}</strong>
            </p>
            <p>
              <strong>{t('guest.welcome.location', { location: wedding.location })}</strong>
            </p>
            {wedding.dress_code && (
              <p>
                <strong>{t('guest.welcome.dressCode')}</strong> {wedding.dress_code}
              </p>
            )}
          </div>
          {wedding.additional_info && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-lg text-gray-700">{wedding.additional_info}</p>
            </div>
          )}
        </div>
      )}

      {/* RSVP Form or Confirmation */}
      {rsvpSubmitted ? (
        <ConfirmationMessage
          familyName={family.name}
          canEdit={!rsvp_cutoff_passed}
          cutoffDate={wedding.rsvp_cutoff_date}
          onEdit={() => setRsvpSubmitted(false)}
        />
      ) : (
        <RSVPForm
          token={token}
          family={family}
          wedding={wedding}
          rsvpCutoffPassed={rsvp_cutoff_passed}
          onSuccess={handleRSVPSuccess}
        />
      )}

      {/* Payment Information */}
      {rsvpSubmitted && (
        <PaymentInfo
          token={token}
          paymentMode={data.wedding.payment_tracking_mode || 'MANUAL'}
        />
      )}
    </>
  );

  return (
    <div className="min-h-screen" style={{ background: isGardenBirds ? theme.config.colors.background : '#f9fafb' }}>
      {/* Apply theme CSS */}
      <style jsx global>{`
        :root {
          --color-primary: ${theme.config.colors.primary};
          --color-secondary: ${theme.config.colors.secondary};
          --color-accent: ${theme.config.colors.accent};
          --color-background: ${theme.config.colors.background};
          --color-text: ${theme.config.colors.text};
          --font-heading: ${theme.config.fonts.heading};
          --font-body: ${theme.config.fonts.body};
          --button-radius: ${theme.config.styles.buttonRadius};
          --card-shadow: ${theme.config.styles.cardShadow};
          --spacing: ${theme.config.styles.spacing};
        }
      `}</style>

      {isGardenBirds ? (
        // Garden Birds template with envelope reveal
        <EnvelopeReveal
          coupleNames={wedding.couple_names}
          weddingDate={wedding.wedding_date}
          weddingTime={wedding.wedding_time}
          location={wedding.location}
          additionalInfo={wedding.additional_info || undefined}
        >
          {/* Language Selector in top right */}
          <div className="absolute top-4 right-4 z-10">
            <LanguageSelector
              token={token}
              currentLanguage={family.preferred_language}
              onLanguageChange={() => window.location.reload()}
            />
          </div>
          {mainContent}
        </EnvelopeReveal>
      ) : (
        // Standard template layout
        <>
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-4xl mx-auto px-4 py-1 flex justify-between items-center">
              <h1 className="text-xl font-bold text-gray-900">
                {wedding.couple_names}
              </h1>
              <LanguageSelector
                token={token}
                currentLanguage={family.preferred_language}
                onLanguageChange={() => window.location.reload()}
              />
            </div>
          </div>

          {/* Main Content */}
          <div>
            {mainContent}
          </div>

          {/* Footer */}
          <div className="max-w-4xl mx-auto px-4 py-2 text-center text-gray-500">
            <p className="text-base">
              {t('guest.footer.contactCouple')}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
