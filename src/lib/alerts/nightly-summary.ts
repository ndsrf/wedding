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

/**
 * Compute the last-24h RSVP report for a single wedding and fire the alert
 * if there was any activity. Returns whether the alert was triggered.
 */
async function processWeddingSummary(weddingId: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);

  const events = await prisma.trackingEvent.findMany({
    where: {
      wedding_id: weddingId,
      event_type: { in: ['RSVP_SUBMITTED', 'RSVP_UPDATED'] },
      timestamp: { gte: since },
    },
    orderBy: { timestamp: 'desc' },
    include: { family: { select: { name: true } } },
  });

  // Nothing changed in the last 24h — do nothing.
  if (events.length === 0) return false;

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

  if (!wedding) return false;

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

  const metadata: NightlySummaryMetadata = {
    weddingName: wedding.couple_names,
    weddingDate: wedding.wedding_date?.toISOString() ?? null,
    rsvpSent: totalFamilies,
    rsvpReceived: respondedFamilies,
    attendingGuests,
    totalGuests,
    confirmationsCount: changes.length,
    plannerLogoUrl: wedding.planner?.logo_url ?? null,
    changes,
  };

  await triggerAlert({
    event_type: 'NIGHTLY_SUMMARY',
    wedding_id: weddingId,
    planner_id: wedding.planner_id,
    skipDispatch: true,
    metadata: metadata as unknown as Record<string, unknown>,
  });

  return true;
}
