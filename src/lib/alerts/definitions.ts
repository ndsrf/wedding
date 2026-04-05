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
];

/** Returns the AlertRule name for a given builtinId */
export function builtinRuleName(builtinId: string): string {
  return `${BUILTIN_RULE_PREFIX}${builtinId}`;
}

/** Returns the AlertDefinition for a given builtinId, or undefined */
export function findDefinition(builtinId: string): AlertDefinition | undefined {
  return BUILTIN_ALERTS.find((d) => d.builtinId === builtinId);
}
