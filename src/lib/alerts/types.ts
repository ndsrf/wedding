/**
 * Alert System — shared types
 */

import type {
  AlertEventType,
  AlertRecipientType,
  AlertStatus,
  DeliveryStatus,
  Channel,
  Language,
} from '@prisma/client';

export type { AlertEventType, AlertRecipientType, AlertStatus, DeliveryStatus };

// ── Trigger context ───────────────────────────────────────────────────────────

export interface AlertContext {
  /** The event that fired the alert */
  event_type: AlertEventType;
  /** Wedding this event belongs to (null for planner/master-level events) */
  wedding_id?: string;
  /** Planner owning the wedding (resolved automatically from wedding if omitted) */
  planner_id?: string;
  /**
   * Arbitrary payload stored on the Alert and rendered into the alert template.
   * Top-level primitive values are flattened into {{variable}} template vars
   * (see buildTemplateVars); nested objects/arrays pass through untouched for
   * dispatchers that build richer content directly from Alert.metadata
   * (e.g. the nightly summary email's RSVP change table).
   */
  metadata?: Record<string, unknown>;
  /**
   * Skip the rule's cooldown check for this firing. Used by manual/test
   * triggers (e.g. the alert-settings "Send test now" button) so they aren't
   * blocked by a recent automatic firing of the same rule.
   */
  bypassCooldown?: boolean;
  /**
   * When true, skip the immediate fire-and-forget dispatch after queuing deliveries.
   * Use this in batch callers (e.g. the cron) where a single processor run will
   * follow and dispatch everything at once, avoiding N concurrent processor calls.
   */
  skipDispatch?: boolean;
}

// ── Resolved recipient ────────────────────────────────────────────────────────

export interface ResolvedRecipient {
  type: AlertRecipientType;
  /** Primary key of the entity (MasterAdmin.id, WeddingPlanner.id, WeddingAdmin.id, Family.id) */
  id: string;
  name: string;
  email?: string;
  /** E.164 phone for SMS */
  phone?: string;
  /** E.164 number for WhatsApp (may differ from phone) */
  whatsapp?: string;
  language: Language;
}

// ── Template variables ────────────────────────────────────────────────────────

/** All supported {{variable}} placeholders in alert subject/body */
export interface AlertTemplateVars {
  coupleNames?: string;
  weddingDate?: string;
  familyName?: string;
  memberName?: string;
  amount?: string;
  taskTitle?: string;
  eventType?: string;
  recipientName?: string;
  [key: string]: string | undefined;
}

// ── Channel resolution helper ─────────────────────────────────────────────────

/**
 * Returns the first channel from the rule's ordered list for which the
 * recipient has valid contact information.
 */
export function resolveChannel(
  channels: Channel[],
  recipient: ResolvedRecipient,
): Channel | null {
  for (const ch of channels) {
    if (ch === 'EMAIL' && recipient.email) return 'EMAIL';
    if (ch === 'SMS' && recipient.phone) return 'SMS';
    if (ch === 'WHATSAPP' && recipient.whatsapp) return 'WHATSAPP';
  }
  return null;
}
