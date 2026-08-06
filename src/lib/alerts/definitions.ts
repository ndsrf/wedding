/**
 * Alert System — predefined (builtin) alert definitions
 *
 * Each entry represents a user-configurable alert that has a fixed purpose,
 * stable default templates, and maps to a single AlertRule in the database.
 *
 * The AlertRule is identified in the DB by its `name` field, which is set to
 * `BUILTIN_RULE_PREFIX + builtinId` (e.g. "__builtin__quote_expired").
 * This makes it possible to reliably find/create the rule without using
 * opaque UUIDs in the UI.
 */

import type { AlertEventType } from '@prisma/client';

export const BUILTIN_RULE_PREFIX = '__builtin__';

export interface AlertDefinition {
  /** Stable identifier — appended to BUILTIN_RULE_PREFIX to form the rule name */
  builtinId: string;
  event_type: AlertEventType;
  /** Ordered default channels when the alert is first enabled */
  defaultChannels: Array<'EMAIL' | 'SMS' | 'WHATSAPP'>;
  /** Default email subject per language code (falls back to EN) */
  subject: Partial<Record<string, string>> & { EN: string };
  /** Default message body per language code (falls back to EN) */
  body: Partial<Record<string, string>> & { EN: string };
  /** Recipient flags used when the rule is first created (defaults: planner only) */
  notifyPlanner?: boolean;
  notifyCouple?: boolean;
  notifyMasterAdmin?: boolean;
  /** Minimum minutes between two firings of this rule for the same wedding */
  cooldownMinutes?: number;
}

// ── Definitions ───────────────────────────────────────────────────────────────

export const BUILTIN_ALERTS: AlertDefinition[] = [
  {
    builtinId: 'quote_expired',
    event_type: 'QUOTE_EXPIRED',
    defaultChannels: ['EMAIL'],
    subject: {
      ES: 'Presupuesto caducado: {{coupleNames}} (ref: {{quoteId}})',
      EN: 'Quote expired: {{coupleNames}} (ref: {{quoteId}})',
      FR: 'Devis expiré : {{coupleNames}} (réf : {{quoteId}})',
      IT: 'Preventivo scaduto: {{coupleNames}} (rif: {{quoteId}})',
      DE: 'Angebot abgelaufen: {{coupleNames}} (Ref.: {{quoteId}})',
    },
    body: {
      ES: 'El presupuesto para **{{coupleNames}}** ha caducado.\n\n[[Revisar presupuesto en el panel|{{quoteLink}}]]\n\nContacta al cliente si es necesario.',
      EN: 'The quote for **{{coupleNames}}** has expired.\n\n[[Review quote in dashboard|{{quoteLink}}]]\n\nContact the client if needed.',
      FR: 'Le devis pour **{{coupleNames}}** a expiré.\n\n[[Consulter le devis dans le tableau de bord|{{quoteLink}}]]\n\nContactez le client si nécessaire.',
      IT: 'Il preventivo per **{{coupleNames}}** è scaduto.\n\n[[Rivedi il preventivo nella dashboard|{{quoteLink}}]]\n\nContatta il cliente se necessario.',
      DE: 'Das Angebot für **{{coupleNames}}** ist abgelaufen.\n\n[[Angebot im Dashboard ansehen|{{quoteLink}}]]\n\nKontaktieren Sie den Kunden falls nötig.',
    },
  },
  {
    builtinId: 'wedding_nightly_summary',
    event_type: 'NIGHTLY_SUMMARY',
    defaultChannels: ['EMAIL'],
    notifyPlanner: false,
    notifyCouple: true,
    // Once fired for a wedding, wait ~20h before firing again — the report
    // itself only runs once a day (05:00), this just guards against the
    // in-process (non-Vercel) scheduler re-triggering within the same hour.
    cooldownMinutes: 1200,
    subject: {
      ES: 'Ha habido actividad en las últimas 24 horas...',
      EN: 'There was some activity in the last 24 hours...',
      FR: "Il y a eu de l'activité au cours des dernières 24 heures...",
      IT: "C'è stata attività nelle ultime 24 ore...",
      DE: 'In den letzten 24 Stunden gab es Aktivität...',
    },
    body: {
      ES: 'Hola **{{coupleNames}}**,\n\nVuestros invitados han estado confirmando su asistencia. Progreso: {{rsvpReceived}}/{{rsvpSent}} familias han respondido, {{attendingGuests}}/{{totalGuests}} invitados confirmados.\n\nRevisad el correo completo para ver el detalle de los cambios de las últimas 24 horas.',
      EN: 'Hi **{{coupleNames}}**,\n\nYour guests have been confirming their attendance. Progress: {{rsvpReceived}}/{{rsvpSent}} families have responded, {{attendingGuests}}/{{totalGuests}} guests confirmed.\n\nSee the full email for the details of the changes from the last 24 hours.',
      FR: 'Bonjour **{{coupleNames}}**,\n\nVos invités ont confirmé leur présence. Progression : {{rsvpReceived}}/{{rsvpSent}} familles ont répondu, {{attendingGuests}}/{{totalGuests}} invités confirmés.\n\nConsultez l\'e-mail complet pour le détail des changements des dernières 24 heures.',
      IT: 'Ciao **{{coupleNames}}**,\n\nI vostri ospiti hanno confermato la loro presenza. Avanzamento: {{rsvpReceived}}/{{rsvpSent}} famiglie hanno risposto, {{attendingGuests}}/{{totalGuests}} ospiti confermati.\n\nConsultate l\'email completa per i dettagli delle modifiche delle ultime 24 ore.',
      DE: 'Hallo **{{coupleNames}}**,\n\nEure Gäste haben ihre Teilnahme bestätigt. Fortschritt: {{rsvpReceived}}/{{rsvpSent}} Familien haben geantwortet, {{attendingGuests}}/{{totalGuests}} Gäste bestätigt.\n\nDetails zu den Änderungen der letzten 24 Stunden findet ihr in der vollständigen E-Mail.',
    },
  },
];

/** Returns the AlertRule name for a given builtinId */
export function builtinRuleName(builtinId: string): string {
  return `${BUILTIN_RULE_PREFIX}${builtinId}`;
}

/** Returns the AlertDefinition for a given builtinId, or undefined */
export function findDefinition(builtinId: string): AlertDefinition | undefined {
  return BUILTIN_ALERTS.find((d) => d.builtinId === builtinId);
}
