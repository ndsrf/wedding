/**
 * Alert System — trigger entry point
 *
 * Call `triggerAlert(context)` from anywhere in the application when an
 * event occurs that may warrant notifying admins/planners/guests.
 *
 * Flow:
 *   1. Find enabled AlertRules that match the event_type + scope
 *   2. Enforce per-rule cooldown (skip if fired too recently)
 *   3. Create an Alert record
 *   4. Resolve recipients for the rule
 *   5. Create AlertDelivery rows with rendered content
 *   6. Fire-and-forget the processor so delivery starts immediately
 *      (the Vercel Cron acts as a safety net for retries)
 */

import { prisma } from '@/lib/db/prisma';
import type { AlertRule, Language, Prisma } from '@prisma/client';
import { resolveRecipients } from './recipients';
import { renderAlertTemplate, buildTemplateVars } from './render';
import { resolveChannel } from './types';
import { processPendingDeliveries } from './processor';
import { defer } from '@/lib/cron/defer';
import type { AlertContext } from './types';

const LANGUAGE_LOCALE: Record<Language, string> = {
  ES: 'es-ES',
  EN: 'en-GB',
  FR: 'fr-FR',
  IT: 'it-IT',
  DE: 'de-DE',
};

export { type AlertContext };

/**
 * Trigger alerts for the given event context.
 * This function is designed to be called fire-and-forget (void) from request
 * handlers — it captures all errors internally.
 */
export async function triggerAlert(context: AlertContext): Promise<void> {
  try {
    const { event_type, wedding_id, planner_id: ctxPlannerId } = context;

    // Resolve planner_id if not provided but wedding_id is
    let planner_id = ctxPlannerId;
    if (!planner_id && wedding_id) {
      const wedding = await prisma.wedding.findUnique({
        where: { id: wedding_id },
        select: { planner_id: true },
      });
      planner_id = wedding?.planner_id;
    }

    // Find all enabled rules that match this event + scope
    const rules = await prisma.alertRule.findMany({
      where: {
        enabled: true,
        event_type,
        AND: [
          // Scope: rule applies to this wedding, this planner, or globally
          {
            OR: [
              { wedding_id: wedding_id ?? null },
              { wedding_id: null },
            ],
          },
          {
            OR: [
              { planner_id: planner_id ?? null },
              { planner_id: null },
            ],
          },
        ],
      },
    });

    if (rules.length === 0) return;

    const metadata = context.metadata ?? {};

    for (const rule of rules) {
      await processRule(rule, context, metadata, wedding_id, planner_id);
    }

    // Dispatch immediately in background — unless the caller handles it themselves.
    // On Vercel: defer() uses waitUntil() to keep the function alive.
    // Elsewhere: fire-and-forget — the in-process scheduler is the safety net.
    if (!context.skipDispatch) {
      defer(processPendingDeliveries(20));
    }
  } catch (err) {
    // Never let alert failures propagate to the caller
    console.error('[ALERT] triggerAlert error:', err);
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function processRule(
  rule: AlertRule,
  context: AlertContext,
  metadata: Record<string, unknown>,
  wedding_id: string | undefined,
  planner_id: string | undefined,
): Promise<void> {
  // Cooldown check: skip if the same rule fired too recently for this wedding
  if (rule.cooldown_minutes && wedding_id) {
    const cutoff = new Date(Date.now() - rule.cooldown_minutes * 60 * 1000);
    const recentAlert = await prisma.alert.findFirst({
      where: {
        rule_id: rule.id,
        wedding_id,
        created_at: { gte: cutoff },
      },
      select: { id: true },
    });
    if (recentAlert) {
      console.log(
        `[ALERT] Skipping rule "${rule.name}" — cooldown active (${rule.cooldown_minutes}m)`,
      );
      return;
    }
  }

  // Resolve recipients
  const recipients = await resolveRecipients(rule, context);
  if (recipients.length === 0) {
    console.log(`[ALERT] No recipients for rule "${rule.name}", skipping.`);
    return;
  }

  // Fetch wedding details for template vars (optional)
  let weddingDetails: { couple_names: string; wedding_date: Date } | null = null;
  if (wedding_id) {
    weddingDetails = await prisma.wedding.findUnique({
      where: { id: wedding_id },
      select: { couple_names: true, wedding_date: true },
    });
  }

  // Base vars without weddingDate — formatted per-recipient locale below
  const baseVars = buildTemplateVars(metadata, {
    coupleNames: weddingDetails?.couple_names,
    eventType: context.event_type,
  });

  // Build delivery specs BEFORE creating the Alert so we can skip the whole
  // thing if no recipient has a valid channel — avoids orphaned PENDING Alerts.
  type DeliverySpec = Omit<Prisma.AlertDeliveryCreateManyInput, 'alert_id'>;

  const seen = new Set<string>();
  const specs: DeliverySpec[] = [];

  for (const recipient of recipients) {
    const channel = resolveChannel(rule.channels, recipient);
    if (!channel) {
      console.warn(
        `[ALERT] No suitable channel for recipient ${recipient.name} (rule: ${rule.name})`,
      );
      continue;
    }

    const dedupKey = `${recipient.id}:${channel}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const locale = LANGUAGE_LOCALE[recipient.language] ?? 'en-GB';
    const weddingDate = weddingDetails?.wedding_date?.toLocaleDateString(locale);

    const vars = { ...baseVars, weddingDate, recipientName: recipient.name };

    specs.push({
      recipient_type: recipient.type,
      recipient_id: recipient.id,
      recipient_name: recipient.name,
      recipient_email: recipient.email ?? null,
      recipient_phone:
        channel === 'WHATSAPP'
          ? (recipient.whatsapp ?? recipient.phone ?? null)
          : (recipient.phone ?? null),
      recipient_language: recipient.language,
      channel,
      subject: renderAlertTemplate(rule.subject, vars),
      body: renderAlertTemplate(rule.body, vars),
      status: 'PENDING' as const,
      max_attempts: 3,
    });
  }

  // No valid deliveries — skip creating the Alert entirely
  if (specs.length === 0) {
    console.log(
      `[ALERT] No deliverable recipients for rule "${rule.name}" (no valid channels), skipping.`,
    );
    return;
  }

  // Create Alert only now that we know there is work to do
  const alert = await prisma.alert.create({
    data: {
      rule_id: rule.id,
      event_type: context.event_type,
      wedding_id: wedding_id ?? null,
      planner_id: planner_id ?? null,
      metadata: metadata as Prisma.InputJsonValue,
      status: 'PENDING',
    },
  });

  await prisma.alertDelivery.createMany({
    data: specs.map((s) => ({ ...s, alert_id: alert.id })),
  });

  console.log(
    `[ALERT] Created ${specs.length} deliveries for rule "${rule.name}" (alert ${alert.id})`,
  );
}
