/**
 * Alert System — Wedding nightly summary
 *
 * Once a day, for every wedding whose planner has enabled the
 * "Wedding nightly summary for couples" alert, checks whether any RSVP
 * activity happened in the last 24 hours. If so, fires a NIGHTLY_SUMMARY
 * alert (delivered to the wedding's admins/couple) carrying a structured
 * report in Alert.metadata — the email dispatcher (dispatch.ts) renders it
 * with a dedicated template instead of the generic text-based one.
 *
 * If nothing changed for a wedding in the last 24 hours, nothing is sent.
 */

import { prisma } from '@/lib/db/prisma';
import { triggerAlert } from './trigger';

const WINDOW_MS = 24 * 60 * 60 * 1000;

export interface NightlySummaryChange {
  familyName: string;
  attendingCount: number | null;
  totalMembers: number | null;
  timestamp: string; // ISO
  channel: string | null;
}

export interface NightlySummaryMetadata {
  weddingName: string;
  weddingDate: string | null; // ISO
  rsvpSent: number;
  rsvpReceived: number;
  attendingGuests: number;
  totalGuests: number;
  confirmationsCount: number;
  plannerLogoUrl: string | null;
  changes: NightlySummaryChange[];
}

export interface NightlySummaryResult {
  checked: number;
  triggered: number;
  errors: number;
}

export type ManualTriggerReason = 'wedding_not_found' | 'alert_not_enabled' | 'no_recipients';

export interface ManualTriggerResult {
  sent: boolean;
  reason?: ManualTriggerReason;
}

/**
 * Scan every wedding covered by an enabled NIGHTLY_SUMMARY rule and fire the
 * alert for those that had RSVP activity in the last 24 hours.
 */
export async function processNightlySummaries(): Promise<NightlySummaryResult> {
  const rules = await prisma.alertRule.findMany({
    where: { event_type: 'NIGHTLY_SUMMARY', enabled: true },
  });

  if (rules.length === 0) return { checked: 0, triggered: 0, errors: 0 };

  let checked = 0;
  let triggered = 0;
  let errors = 0;
  const seenWeddingIds = new Set<string>();

  for (const rule of rules) {
    const weddings = await prisma.wedding.findMany({
      where: rule.wedding_id
        ? { id: rule.wedding_id, status: 'ACTIVE', is_disabled: false }
        : { planner_id: rule.planner_id ?? undefined, status: 'ACTIVE', is_disabled: false },
      select: { id: true },
    });

    for (const { id: weddingId } of weddings) {
      if (seenWeddingIds.has(weddingId)) continue; // avoid double-processing across overlapping rules
      seenWeddingIds.add(weddingId);
      checked++;

      try {
        const didTrigger = await processWeddingSummary(weddingId);
        if (didTrigger) triggered++;
      } catch (err) {
        errors++;
        console.error(`[NightlySummary] Failed to process wedding ${weddingId}:`, err);
      }
    }
  }

  return { checked, triggered, errors };
}

interface BuiltReport {
  plannerId: string;
  metadata: NightlySummaryMetadata;
}

/**
 * Fetch the last-24h RSVP tracking events and current guest stats for a
 * wedding, and assemble them into a NightlySummaryMetadata report. Returns
 * null if the wedding doesn't exist.
 *
 * When `alwaysBuild` is false (the default, used by the automatic daily
 * job), the wedding/guest-stats query is skipped entirely and null is
 * returned as soon as there are no events — this avoids a DB round trip
 * per wedding on the (typical) days nothing happened. Manual/test triggers
 * pass `alwaysBuild: true` to get a full report even with zero changes, so
 * the planner can preview the email.
 */
async function buildNightlySummaryReport(
  weddingId: string,
  alwaysBuild = false,
): Promise<BuiltReport | null> {
  const since = new Date(Date.now() - WINDOW_MS);

  const events = await prisma.trackingEvent.findMany({
    where: {
      wedding_id: weddingId,
      event_type: { in: ['RSVP_SUBMITTED', 'RSVP_UPDATED'] },
      // Exclude admin-triggered edits — RSVP_UPDATED is also used by the guest
      // CRUD audit log (src/lib/guests/audit.ts) for planner-made changes in
      // the admin panel, which is not "guest activity" for this report.
      admin_triggered: false,
      timestamp: { gte: since },
    },
    orderBy: { timestamp: 'desc' },
    include: { family: { select: { name: true } } },
  });

  if (events.length === 0 && !alwaysBuild) return null;

  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: {
      couple_names: true,
      wedding_date: true,
      planner_id: true,
      planner: { select: { logo_url: true } },
      families: {
        select: {
          members: { select: { attending: true } },
        },
      },
    },
  });

  if (!wedding) return null;

  const totalFamilies = wedding.families.length;
  const respondedFamilies = wedding.families.filter(
    (f) => f.members.length > 0 && f.members.every((m) => m.attending !== null),
  ).length;

  const allMembers = wedding.families.flatMap((f) => f.members);
  const totalGuests = allMembers.length;
  const attendingGuests = allMembers.filter((m) => m.attending === true).length;

  const changes: NightlySummaryChange[] = events.map((e) => {
    const metadata = (e.metadata ?? {}) as { attending_count?: number; total_members?: number };
    return {
      familyName: e.family?.name ?? '—',
      attendingCount: typeof metadata.attending_count === 'number' ? metadata.attending_count : null,
      totalMembers: typeof metadata.total_members === 'number' ? metadata.total_members : null,
      timestamp: e.timestamp.toISOString(),
      channel: e.channel ?? null,
    };
  });

  return {
    plannerId: wedding.planner_id,
    metadata: {
      weddingName: wedding.couple_names,
      weddingDate: wedding.wedding_date?.toISOString() ?? null,
      rsvpSent: totalFamilies,
      rsvpReceived: respondedFamilies,
      attendingGuests,
      totalGuests,
      confirmationsCount: changes.length,
      plannerLogoUrl: wedding.planner?.logo_url ?? null,
      changes,
    },
  };
}

/**
 * Compute the last-24h RSVP report for a single wedding and fire the alert
 * if there was any activity. Returns whether the alert was triggered.
 */
async function processWeddingSummary(weddingId: string): Promise<boolean> {
  const built = await buildNightlySummaryReport(weddingId);
  if (!built || built.metadata.changes.length === 0) return false; // nothing changed — do nothing

  await triggerAlert({
    event_type: 'NIGHTLY_SUMMARY',
    wedding_id: weddingId,
    planner_id: built.plannerId,
    skipDispatch: true,
    metadata: built.metadata as unknown as Record<string, unknown>,
  });

  return true;
}

/**
 * Manually fire the nightly summary for a single wedding, on demand —
 * used by the "Send test now" button on the planner's alert-settings page.
 * Unlike the automatic daily run, this sends immediately regardless of
 * whether there was real RSVP activity (so the planner can preview the
 * email), bypasses the AlertRule cooldown (so it can be retried freely),
 * but still requires the alert to be enabled and the wedding to have at
 * least one admin to notify — otherwise nothing would actually be sent.
 */
export async function triggerManualNightlySummary(weddingId: string): Promise<ManualTriggerResult> {
  const built = await buildNightlySummaryReport(weddingId, true);
  if (!built) return { sent: false, reason: 'wedding_not_found' };

  const rule = await prisma.alertRule.findFirst({
    where: {
      event_type: 'NIGHTLY_SUMMARY',
      enabled: true,
      OR: [{ wedding_id: weddingId }, { wedding_id: null, planner_id: built.plannerId }],
    },
    select: { id: true },
  });
  if (!rule) return { sent: false, reason: 'alert_not_enabled' };

  const recipientCount = await prisma.weddingAdmin.count({ where: { wedding_id: weddingId } });
  if (recipientCount === 0) return { sent: false, reason: 'no_recipients' };

  await triggerAlert({
    event_type: 'NIGHTLY_SUMMARY',
    wedding_id: weddingId,
    planner_id: built.plannerId,
    skipDispatch: false,
    bypassCooldown: true,
    metadata: built.metadata as unknown as Record<string, unknown>,
  });

  return { sent: true };
}
