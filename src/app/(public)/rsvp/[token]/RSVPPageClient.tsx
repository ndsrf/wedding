/**
 * Guest RSVP Page Client Component
 * 
 * Handles interactive parts of the RSVP page.
 */

'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import RSVPForm from '@/components/guest/RSVPForm';
import PaymentInfo from '@/components/guest/PaymentInfo';
import LanguageSelector from '@/components/guest/LanguageSelector';
import ConfirmationMessage from '@/components/guest/ConfirmationMessage';
import { EnvelopeReveal } from '@/components/guest/EnvelopeReveal';
import TemplateRenderer from '@/components/guest/TemplateRenderer';
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

  // Extract invitation style settings from the template design.
  // paperBackgroundImage is the user-uploaded background; map it to backgroundImage for InvStyle consumers.
  const invStyle = (() => {
    if (!invitation_template?.design) return undefined;
    const gs = (invitation_template.design as {
      globalStyle?: {
        backgroundColor?: string;
        paperBackgroundImage?: string;
        paperBackgroundSize?: 'cover' | 'tile';
        textColor?: string;
        fontFamily?: string;
        rsvpButtonColor?: string;
      };
    }).globalStyle;
    if (!gs) return undefined;
    return {
      backgroundColor: gs.backgroundColor,
      backgroundImage: gs.paperBackgroundImage,
      backgroundSize: gs.paperBackgroundSize,
      textColor: gs.textColor,
      fontFamily: gs.fontFamily,
      rsvpButtonColor: gs.rsvpButtonColor,
    };
  })();

  // Map preferred_language to SupportedLanguage
  const templateLanguage = (family.preferred_language.toUpperCase()) as SupportedLanguage;

  const mainContent = (
    <>
      {/* Custom Invitation Template or Standard Welcome Section */}
      {hasTemplate ? (
        <TemplateRenderer
          design={invitation_template.design}
          preRenderedHtml={invitation_template.pre_rendered_html}
          weddingDate={wedding.wedding_date}
          weddingTime={wedding.wedding_time}
          location={wedding.location ?? ''}
          coupleNames={wedding.couple_names}
          language={templateLanguage}
          weddingId={wedding.id}
          iban={wedding.gift_iban ?? undefined}
          isTransparent={true}
        />
      ) : (
        <div className="max-w-4xl mx-auto px-4 pt-8">
          <div 
            className="rounded-lg shadow-md p-6"
            style={{ 
              backgroundColor: invStyle?.backgroundColor ? invStyle.backgroundColor + 'aa' : 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(4px)',
              color: invStyle?.textColor ?? '#111827',
              fontFamily: invStyle?.fontFamily ?? undefined
            }}
          >
            <h2 className="text-3xl font-bold mb-2" style={{ color: invStyle?.textColor ?? '#111827' }}>
              {t('guest.welcome.title', { familyName: family.name })} 👋
            </h2>
            <p className="text-xl mb-4" style={{ color: invStyle?.textColor ? invStyle.textColor + 'cc' : '#4b5563' }}>
              {t('guest.welcome.subtitle')}
            </p>
            <div className="space-y-2 text-lg">
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
                <strong>{t('guest.welcome.location', { location: wedding.location ?? '' })}</strong>
              </p>
              {wedding.dress_code && (
                <p>
                  <strong>{t('guest.welcome.dressCode')}</strong> {wedding.dress_code}
                </p>
              )}
            </div>
            {wedding.additional_info && (
              <div 
                className="mt-4 p-4 rounded-lg"
                style={{ 
                  backgroundColor: invStyle?.backgroundColor ? invStyle.backgroundColor + '44' : 'rgba(239, 246, 255, 0.4)',
                  borderLeft: `4px solid ${invStyle?.rsvpButtonColor ?? '#2563eb'}`
                }}
              >
                <p className="text-lg">{wedding.additional_info}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RSVP Form or Confirmation — id="rsvp-form" allows scroll-to-rsvp hotspot */}
      <div id="rsvp-form" className="max-w-4xl mx-auto px-4 mt-8">
        {rsvpSubmitted ? (
          <ConfirmationMessage
            familyName={family.name}
            canEdit={!rsvp_cutoff_passed}
            cutoffDate={wedding.rsvp_cutoff_date}
            onEdit={() => setRsvpSubmitted(false)}
            invStyle={invStyle}
            attendingCount={family.members.filter(m => m.attending).length}
          />
        ) : (
          <RSVPForm
            token={token}
            family={family}
            wedding={wedding}
            rsvpCutoffPassed={rsvp_cutoff_passed}
            onSuccess={handleRSVPSuccess}
            invStyle={invStyle}
          />
        )}
      </div>

      {/* Payment Information */}
      {rsvpSubmitted && wedding.show_iban_on_rsvp && (
        <div className="max-w-4xl mx-auto px-4 mt-8">
          <PaymentInfo
            token={token}
            paymentMode={data.wedding.payment_tracking_mode || 'MANUAL'}
            invStyle={invStyle}
          />
        </div>
      )}
    </>
  );

  return (
    <div 
      className="min-h-screen" 
      style={{ 
        ...(isGardenBirds 
          ? { background: theme.config.colors.background } 
          : { 
              backgroundColor: invStyle?.backgroundColor ?? '#f9fafb',
              ...(invStyle?.backgroundImage
                ? (invStyle.backgroundSize ?? 'cover') === 'tile'
                  ? { backgroundImage: `url(${invStyle.backgroundImage})`, backgroundSize: 'auto', backgroundRepeat: 'repeat', backgroundPosition: 'top left', backgroundAttachment: 'fixed' }
                  : { backgroundImage: `url(${invStyle.backgroundImage})`, backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundAttachment: 'fixed' }
                : {})
            })
      }}
    >
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
          --theme-spacing: ${theme.config.styles.spacing};
        }
      `}</style>

      {isGardenBirds ? (
        // Garden Birds template with envelope reveal
        <EnvelopeReveal
          coupleNames={wedding.couple_names}
          weddingDate={wedding.wedding_date}
          weddingTime={wedding.wedding_time}
          location={wedding.location ?? undefined}
          additionalInfo={wedding.additional_info || undefined}
        >
          {/* Language Selector in top right */}
          <div className="absolute top-4 right-4 z-10">
            <LanguageSelector
              token={token}
              currentLanguage={family.preferred_language}
              onLanguageChange={() => window.location.reload()}
              textColor={invStyle?.textColor}
              fontFamily={invStyle?.fontFamily}
            />
          </div>
          {mainContent}
        </EnvelopeReveal>
      ) : (
        // Standard template layout
        <>
          {/* Header */}
          <div
            className="shadow-sm"
            style={{
              backgroundColor: 'transparent',
              borderBottom: `1px solid ${invStyle?.textColor ? invStyle.textColor + '33' : '#e5e7eb'}`,
              fontFamily: invStyle?.fontFamily ?? undefined,
            }}
          >
            <div className="max-w-4xl mx-auto px-4 py-1 flex justify-between items-center">
              <h1
                className="text-xl font-bold"
                style={{ color: invStyle?.textColor ?? '#111827' }}
              >
                {wedding.couple_names}
              </h1>
              <LanguageSelector
                token={token}
                currentLanguage={family.preferred_language}
                onLanguageChange={() => window.location.reload()}
                textColor={invStyle?.textColor}
                fontFamily={invStyle?.fontFamily}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="pb-8">
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
