/**
 * Wedding Nightly Summary Email Template
 * Sent to a wedding's admins once a day when there has been RSVP activity
 * in the previous 24 hours. Built from NightlySummaryMetadata (see
 * src/lib/alerts/nightly-summary.ts) rather than the generic dynamic-message
 * template, since it needs a real header logo and a data table covering
 * every configurable RSVP question this wedding has enabled.
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html as BaseEmailHtml,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { Language } from '../../i18n/config';
import type { NightlySummaryColumn, NightlySummaryRow } from '../../alerts/nightly-summary';

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
  columns: NightlySummaryColumn[];
  rows: NightlySummaryRow[];
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
    confirmations: (n: number) => `${n} ${n === 1 ? 'familia ha' : 'familias han'} confirmado o actualizado su RSVP en las últimas 24 horas`,
    changesTitle: 'Detalle de los cambios',
    family: 'Familia',
    guest: 'Invitado',
    attendingColumn: 'Asistencia',
    details: 'Detalles',
    when: 'Cuándo',
    yes: 'Sí',
    no: 'No',
    pending: 'Pendiente',
    empty: '—',
    dietary: 'Restricciones alimentarias',
    accessibility: 'Necesidades de accesibilidad',
    footer: 'Este es un resumen automático de la actividad de tu boda.',
    unsubscribeNote: 'Si no quieres recibir estos correos, coméntaselo a tu wedding planner.',
    poweredBy: 'Con la tecnología de',
  },
  en: {
    preview: 'There was some activity in the last 24 hours...',
    title: 'There was some activity in the last 24 hours...',
    progress: 'RSVP progress',
    familiesResponded: 'families have responded',
    attendees: 'Confirmed attendees',
    guestsConfirmed: 'of total guests',
    confirmations: (n: number) => `${n} ${n === 1 ? 'family' : 'families'} confirmed or updated their RSVP in the last 24 hours`,
    changesTitle: 'Change details',
    family: 'Family',
    guest: 'Guest',
    attendingColumn: 'Attending',
    details: 'Details',
    when: 'When',
    yes: 'Yes',
    no: 'No',
    pending: 'Pending',
    empty: '—',
    dietary: 'Dietary Restrictions',
    accessibility: 'Accessibility Needs',
    footer: 'This is an automated summary of your wedding activity.',
    unsubscribeNote: "If you don't want to receive these emails, check with your wedding planner.",
    poweredBy: 'Powered by',
  },
  fr: {
    preview: "Il y a eu de l'activité au cours des dernières 24 heures...",
    title: "Il y a eu de l'activité au cours des dernières 24 heures...",
    progress: 'Progression RSVP',
    familiesResponded: 'familles ont répondu',
    attendees: 'Invités confirmés',
    guestsConfirmed: 'du total des invités',
    confirmations: (n: number) => `${n} ${n === 1 ? 'famille a confirmé ou mis à jour' : 'familles ont confirmé ou mis à jour'} leur RSVP au cours des dernières 24 heures`,
    changesTitle: 'Détail des changements',
    family: 'Famille',
    guest: 'Invité',
    attendingColumn: 'Présence',
    details: 'Détails',
    when: 'Quand',
    yes: 'Oui',
    no: 'Non',
    pending: 'En attente',
    empty: '—',
    dietary: 'Restrictions Alimentaires',
    accessibility: "Besoins d'Accessibilité",
    footer: 'Ceci est un résumé automatique de l\'activité de votre mariage.',
    unsubscribeNote: 'Si vous ne souhaitez plus recevoir ces e-mails, contactez votre wedding planner.',
    poweredBy: 'Propulsé par',
  },
  it: {
    preview: "C'è stata attività nelle ultime 24 ore...",
    title: "C'è stata attività nelle ultime 24 ore...",
    progress: 'Progresso RSVP',
    familiesResponded: 'famiglie hanno risposto',
    attendees: 'Ospiti confermati',
    guestsConfirmed: 'del totale ospiti',
    confirmations: (n: number) => `${n} ${n === 1 ? 'famiglia ha confermato o aggiornato' : 'famiglie hanno confermato o aggiornato'} il proprio RSVP nelle ultime 24 ore`,
    changesTitle: 'Dettaglio delle modifiche',
    family: 'Famiglia',
    guest: 'Ospite',
    attendingColumn: 'Presenza',
    details: 'Dettagli',
    when: 'Quando',
    yes: 'Sì',
    no: 'No',
    pending: 'In sospeso',
    empty: '—',
    dietary: 'Restrizioni Alimentari',
    accessibility: 'Esigenze di Accessibilità',
    footer: 'Questo è un riepilogo automatico dell\'attività del vostro matrimonio.',
    unsubscribeNote: 'Se non desiderate ricevere queste email, parlatene con il vostro wedding planner.',
    poweredBy: 'Offerto da',
  },
  de: {
    preview: 'In den letzten 24 Stunden gab es Aktivität...',
    title: 'In den letzten 24 Stunden gab es Aktivität...',
    progress: 'RSVP-Fortschritt',
    familiesResponded: 'Familien haben geantwortet',
    attendees: 'Bestätigte Gäste',
    guestsConfirmed: 'von allen Gästen',
    confirmations: (n: number) => `${n} ${n === 1 ? 'Familie hat' : 'Familien haben'} ihre RSVP in den letzten 24 Stunden bestätigt oder aktualisiert`,
    changesTitle: 'Details der Änderungen',
    family: 'Familie',
    guest: 'Gast',
    attendingColumn: 'Teilnahme',
    details: 'Details',
    when: 'Wann',
    yes: 'Ja',
    no: 'Nein',
    pending: 'Ausstehend',
    empty: '—',
    dietary: 'Ernährungseinschränkungen',
    accessibility: 'Barrierefreiheitsbedürfnisse',
    footer: 'Dies ist eine automatische Zusammenfassung der Aktivität eurer Hochzeit.',
    unsubscribeNote: 'Wenn ihr diese E-Mails nicht erhalten möchtet, wendet euch an euren Wedding Planner.',
    poweredBy: 'Bereitgestellt von',
  },
};

type Translations = (typeof translations)['en'];

function resolveColumnLabel(column: NightlySummaryColumn, t: Translations, language: Language): string {
  if (column.builtinLabelKey === 'dietary') return t.dietary;
  if (column.builtinLabelKey === 'accessibility') return t.accessibility;
  const label = column.customLabel;
  const resolved = label?.[language] || label?.['en'] || label?.['es'];
  return resolved || column.fallbackLabel;
}

function formatValue(column: NightlySummaryColumn, value: string | boolean | null, t: Translations): string {
  if (column.isBool) {
    if (value === null || value === undefined) return t.empty;
    return value ? t.yes : t.no;
  }
  return typeof value === 'string' && value.trim() ? value : t.empty;
}

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
  columns = [],
  rows = [],
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

          {/*
            Fixed columns only (Family/Guest/Attending/When) — a wedding can
            have up to ~17 configurable questions enabled, which would make a
            one-column-per-question table too wide for most email clients
            (few support horizontal scroll on mobile). Instead every enabled
            question's answer is listed as its own line inside the "Details"
            cell, so the table always stays a fixed, narrow width.
          */}
          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={changesTable}>
            <thead>
              <tr>
                <th style={th}>{t.family}</th>
                <th style={th}>{t.guest}</th>
                <th style={th}>{t.attendingColumn}</th>
                <th style={th}>{t.details}</th>
                <th style={thRight}>{t.when}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.familyName}-${row.memberName}-${index}`} style={index % 2 === 0 ? rowEven : rowOdd}>
                  <td style={td}>{row.familyName}</td>
                  <td style={td}>{row.memberName}</td>
                  <td style={td}>
                    {row.attending === null ? t.pending : row.attending ? t.yes : t.no}
                  </td>
                  <td style={td}>
                    {columns.length === 0 ? (
                      t.empty
                    ) : (
                      columns.map((column) => (
                        <div key={column.key} style={detailLine}>
                          <span style={detailLabel}>{resolveColumnLabel(column, t, language)}: </span>
                          {formatValue(column, row.values[column.key], t)}
                        </div>
                      ))
                    )}
                  </td>
                  <td style={tdRight}>
                    {new Date(row.timestamp).toLocaleString(locale, {
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
            <Text style={footerText}>{t.unsubscribeNote}</Text>
            <Text style={poweredByText}>
              {t.poweredBy}{' '}
              <Link href="https://nupci.com" style={poweredByLink}>Nupci</Link>
            </Text>
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
  maxWidth: '680px',
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
  tableLayout: 'fixed' as const,
};

const th = {
  color: '#888',
  fontSize: '11px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  textAlign: 'left' as const,
  padding: '8px 10px',
  borderBottom: '2px solid #eaeaea',
  whiteSpace: 'nowrap' as const,
};

const thRight = {
  ...th,
  textAlign: 'right' as const,
};

const td = {
  color: '#333',
  fontSize: '13px',
  padding: '8px 10px',
  borderBottom: '1px solid #f0f0f0',
  verticalAlign: 'top' as const,
};

const tdRight = {
  ...td,
  color: '#888',
  textAlign: 'right' as const,
  whiteSpace: 'nowrap' as const,
};

const detailLine = {
  margin: '0 0 2px',
  lineHeight: '18px',
};

const detailLabel = {
  color: '#888',
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
  margin: '0 0 4px',
  textAlign: 'center' as const,
};

const poweredByText = {
  color: '#bbb',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '12px 0 0',
  textAlign: 'center' as const,
};

const poweredByLink = {
  color: '#9b5b66',
  fontWeight: 'bold' as const,
  textDecoration: 'none' as const,
};
