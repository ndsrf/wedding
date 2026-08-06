/**
 * Wedding Nightly Summary Email Template
 * Sent to a wedding's admins once a day when there has been RSVP activity
 * in the previous 24 hours. Built from NightlySummaryMetadata (see
 * src/lib/alerts/nightly-summary.ts) rather than the generic dynamic-message
 * template, since it needs a real header logo and a data table.
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html as BaseEmailHtml,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { Language } from '../../i18n/config';
import type { NightlySummaryChange } from '../../alerts/nightly-summary';

interface NightlySummaryEmailProps {
  language: Language;
  weddingName: string;
  weddingDate: string | null;
  rsvpSent: number;
  rsvpReceived: number;
  attendingGuests: number;
  totalGuests: number;
  confirmationsCount: number;
  plannerLogoUrl?: string | null;
  changes: NightlySummaryChange[];
}

const LOCALE_MAP: Record<Language, string> = {
  es: 'es-ES',
  en: 'en-GB',
  fr: 'fr-FR',
  it: 'it-IT',
  de: 'de-DE',
};

const translations = {
  es: {
    preview: 'Ha habido actividad en las últimas 24 horas...',
    title: 'Ha habido actividad en las últimas 24 horas...',
    progress: 'Progreso de RSVP',
    familiesResponded: 'familias han respondido',
    attendees: 'Asistentes confirmados',
    guestsConfirmed: 'de los invitados totales',
    confirmations: (n: number) => `${n} ${n === 1 ? 'confirmación nueva' : 'confirmaciones nuevas'} en las últimas 24 horas`,
    changesTitle: 'Detalle de los cambios',
    family: 'Familia',
    response: 'Respuesta',
    when: 'Cuándo',
    confirmedLabel: 'confirman',
    footer: 'Este es un resumen automático de la actividad de tu boda.',
  },
  en: {
    preview: 'There was some activity in the last 24 hours...',
    title: 'There was some activity in the last 24 hours...',
    progress: 'RSVP progress',
    familiesResponded: 'families have responded',
    attendees: 'Confirmed attendees',
    guestsConfirmed: 'of total guests',
    confirmations: (n: number) => `${n} new ${n === 1 ? 'confirmation' : 'confirmations'} in the last 24 hours`,
    changesTitle: 'Change details',
    family: 'Family',
    response: 'Response',
    when: 'When',
    confirmedLabel: 'attending',
    footer: 'This is an automated summary of your wedding activity.',
  },
  fr: {
    preview: "Il y a eu de l'activité au cours des dernières 24 heures...",
    title: "Il y a eu de l'activité au cours des dernières 24 heures...",
    progress: 'Progression RSVP',
    familiesResponded: 'familles ont répondu',
    attendees: 'Invités confirmés',
    guestsConfirmed: 'du total des invités',
    confirmations: (n: number) => `${n} ${n === 1 ? 'nouvelle confirmation' : 'nouvelles confirmations'} au cours des dernières 24 heures`,
    changesTitle: 'Détail des changements',
    family: 'Famille',
    response: 'Réponse',
    when: 'Quand',
    confirmedLabel: 'présents',
    footer: 'Ceci est un résumé automatique de l\'activité de votre mariage.',
  },
  it: {
    preview: "C'è stata attività nelle ultime 24 ore...",
    title: "C'è stata attività nelle ultime 24 ore...",
    progress: 'Progresso RSVP',
    familiesResponded: 'famiglie hanno risposto',
    attendees: 'Ospiti confermati',
    guestsConfirmed: 'del totale ospiti',
    confirmations: (n: number) => `${n} ${n === 1 ? 'nuova conferma' : 'nuove conferme'} nelle ultime 24 ore`,
    changesTitle: 'Dettaglio delle modifiche',
    family: 'Famiglia',
    response: 'Risposta',
    when: 'Quando',
    confirmedLabel: 'presenti',
    footer: 'Questo è un riepilogo automatico dell\'attività del vostro matrimonio.',
  },
  de: {
    preview: 'In den letzten 24 Stunden gab es Aktivität...',
    title: 'In den letzten 24 Stunden gab es Aktivität...',
    progress: 'RSVP-Fortschritt',
    familiesResponded: 'Familien haben geantwortet',
    attendees: 'Bestätigte Gäste',
    guestsConfirmed: 'von allen Gästen',
    confirmations: (n: number) => `${n} ${n === 1 ? 'neue Bestätigung' : 'neue Bestätigungen'} in den letzten 24 Stunden`,
    changesTitle: 'Details der Änderungen',
    family: 'Familie',
    response: 'Antwort',
    when: 'Wann',
    confirmedLabel: 'teilnehmend',
    footer: 'Dies ist eine automatische Zusammenfassung der Aktivität eurer Hochzeit.',
  },
};

export const NightlySummaryEmail = ({
  language = 'en',
  weddingName = '',
  weddingDate = null,
  rsvpSent = 0,
  rsvpReceived = 0,
  attendingGuests = 0,
  totalGuests = 0,
  confirmationsCount = 0,
  plannerLogoUrl = null,
  changes = [],
}: NightlySummaryEmailProps) => {
  const t = translations[language] ?? translations.en;
  const locale = LOCALE_MAP[language] ?? 'en-GB';

  const formattedDate = weddingDate
    ? new Date(weddingDate).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <BaseEmailHtml>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {plannerLogoUrl && (
            <Section style={logoSection}>
              <Img src={plannerLogoUrl} alt={weddingName} width="120" style={logoImg} />
            </Section>
          )}

          <Heading style={h1}>{t.title}</Heading>
          <Text style={weddingNameText}>{weddingName}</Text>
          {formattedDate && <Text style={weddingDateText}>{formattedDate}</Text>}

          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={statsTable}>
            <tbody>
              <tr>
                <td style={statCell}>
                  <Text style={statLabel}>{t.progress}</Text>
                  <Text style={statValue}>{rsvpReceived}/{rsvpSent}</Text>
                  <Text style={statSub}>{t.familiesResponded}</Text>
                </td>
                <td style={statCellRight}>
                  <Text style={statLabel}>{t.attendees}</Text>
                  <Text style={statValue}>{attendingGuests}/{totalGuests}</Text>
                  <Text style={statSub}>{t.guestsConfirmed}</Text>
                </td>
              </tr>
            </tbody>
          </table>

          <Section style={confirmationsBanner}>
            <Text style={confirmationsText}>{t.confirmations(confirmationsCount)}</Text>
          </Section>

          <Text style={sectionTitle}>{t.changesTitle}</Text>

          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={changesTable}>
            <thead>
              <tr>
                <th style={th}>{t.family}</th>
                <th style={th}>{t.response}</th>
                <th style={thRight}>{t.when}</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change, index) => (
                <tr key={index} style={index % 2 === 0 ? rowEven : rowOdd}>
                  <td style={td}>{change.familyName}</td>
                  <td style={td}>
                    {change.attendingCount !== null && change.totalMembers !== null
                      ? `${change.attendingCount}/${change.totalMembers} ${t.confirmedLabel}`
                      : '—'}
                  </td>
                  <td style={tdRight}>
                    {new Date(change.timestamp).toLocaleString(locale, {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Section style={footer}>
            <Text style={footerText}>{t.footer}</Text>
          </Section>
        </Container>
      </Body>
    </BaseEmailHtml>
  );
};

export default NightlySummaryEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '32px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const logoSection = {
  textAlign: 'center' as const,
  padding: '0 0 16px',
};

const logoImg = {
  display: 'inline-block',
  maxWidth: '120px',
  height: 'auto',
  margin: '0 auto',
};

const h1 = {
  color: '#333',
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '0 0 4px',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const weddingNameText = {
  color: '#111',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '8px 0 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const weddingDateText = {
  color: '#888',
  fontSize: '14px',
  margin: '2px 0 24px',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const statsTable = {
  margin: '8px 40px 0',
  width: 'calc(100% - 80px)',
};

const statCell = {
  backgroundColor: '#fdf2f4',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
  width: '50%',
};

const statCellRight = {
  ...statCell,
  paddingLeft: '16px',
};

const statLabel = {
  color: '#9b5b66',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.03em',
  margin: '0 0 4px',
};

const statValue = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const statSub = {
  color: '#888',
  fontSize: '12px',
  margin: '2px 0 0',
};

const confirmationsBanner = {
  backgroundColor: '#eefaf1',
  borderLeft: '4px solid #28a745',
  margin: '20px 40px',
  padding: '12px 16px',
};

const confirmationsText = {
  color: '#1e7a35',
  fontSize: '15px',
  fontWeight: 'bold',
  margin: '0',
};

const sectionTitle = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '8px 40px 8px',
  padding: '0',
};

const changesTable = {
  margin: '0 40px',
  width: 'calc(100% - 80px)',
  borderCollapse: 'collapse' as const,
};

const th = {
  color: '#888',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  textAlign: 'left' as const,
  padding: '8px 8px',
  borderBottom: '2px solid #eaeaea',
};

const thRight = {
  ...th,
  textAlign: 'right' as const,
};

const td = {
  color: '#333',
  fontSize: '14px',
  padding: '8px 8px',
  borderBottom: '1px solid #f0f0f0',
};

const tdRight = {
  ...td,
  color: '#888',
  textAlign: 'right' as const,
};

const rowEven = {};
const rowOdd = { backgroundColor: '#fafafa' };

const footer = {
  borderTop: '1px solid #eaeaea',
  margin: '32px 0 0',
  padding: '24px 40px 0',
};

const footerText = {
  color: '#999',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
  textAlign: 'center' as const,
};
