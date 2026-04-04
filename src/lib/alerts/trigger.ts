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
import type { AlertRule, Prisma } from '@prisma/client';
import { resolveRecipients } from './recipients';
import { renderAlertTemplate, buildTemplateVars } from './render';
import { resolveChannel } from './types';
import { processPendingDeliveries } from './processor';
import type { AlertContext } from './types';

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

    // Fire-and-forget: start dispatching immediately
    processPendingDeliveries(20).catch((err) => {
      console.error('[ALERT] Background processor error:', err);
    });
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

  const baseVars = buildTemplateVars(metadata, {
    coupleNames: weddingDetails?.couple_names,
    weddingDate: weddingDetails?.wedding_date?.toLocaleDateString('es-ES') ?? undefined,
    eventType: context.event_type,
  });

  // Create the Alert record
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

  // Create one AlertDelivery per (recipient × resolved-channel)
  const deliveryData: Prisma.AlertDeliveryCreateManyInput[] = [];

  for (const recipient of recipients) {
    const channel = resolveChannel(rule.channels, recipient);
    if (!channel) {
      console.warn(
        `[ALERT] No suitable channel for recipient ${recipient.name} (rule: ${rule.name})`,
      );
      continue;
    }

    const vars = { 
      ...baseVars, 
      recipientName: recipient.name,
      weddingDate: weddingDetails?.wedding_date?.toLocaleDateString(recipient.language.toLowerCase())
    };
    const subject = renderAlertTemplate(rule.subject, vars);
    const body = renderAlertTemplate(rule.body, vars);

    // For WhatsApp we store the WA number in recipient_phone
    const phone =
      channel === 'WHATSAPP'
        ? (recipient.whatsapp ?? recipient.phone)
        : recipient.phone;

    deliveryData.push({
      alert_id: alert.id,
      recipient_type: recipient.type,
      recipient_id: recipient.id,
      recipient_name: recipient.name,
      recipient_email: recipient.email ?? null,
      recipient_phone: phone ?? null,
      recipient_language: recipient.language,
      channel,
      subject,
      body,
      status: 'PENDING',
      max_attempts: 3,
    });
  }

  if (deliveryData.length > 0) {
    await prisma.alertDelivery.createMany({ data: deliveryData });
    console.log(
      `[ALERT] Created ${deliveryData.length} deliveries for rule "${rule.name}" (alert ${alert.id})`,
    );
  }
}
