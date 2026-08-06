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
import { findDefinition } from './definitions';
import type { Language } from '@prisma/client';

const WINDOW_MS = 24 * 60 * 60 * 1000;

// ── Report data shapes ──────────────────────────────────────────────────────

/**
 * One column in the RSVP-changes table. Fixed columns (family/guest/attending
 * status/when) are handled directly by the email template; this only covers
 * the wedding's *configurable* questions, since which ones are enabled (and
 * their labels) varies per wedding.
 */
export interface NightlySummaryColumn {
  /** Matches a key in each row's `values` map. */
  key: string;
  /** Built-in question (dietary/accessibility) — label comes from the email template's own translations. */
  builtinLabelKey?: 'dietary' | 'accessibility';
  /** Wedding-configured question — raw multi-language label, resolved at render time using the recipient's language. */
  customLabel?: Record<string, string> | null;
  /** Shown if customLabel has no usable translation. */
  fallbackLabel: string;
  /** Yes/No question vs free-text/dropdown answer — controls how the value is formatted. */
  isBool: boolean;
}

/** One guest's answers for a family that had RSVP activity in the last 24h. */
export interface NightlySummaryRow {
  familyName: string;
  memberName: string;
  attending: boolean | null;
  /** ISO timestamp of that family's most recent RSVP change in the window. */
  timestamp: string;
  /** Keyed by NightlySummaryColumn.key. */
  values: Record<string, string | boolean | null>;
}

export interface NightlySummaryMetadata {
  weddingName: string;
  weddingDate: string | null; // ISO
  rsvpSent: number;
  rsvpReceived: number;
  attendingGuests: number;
  totalGuests: number;
  /** Number of distinct families that had an RSVP change in the last 24h. */
  confirmationsCount: number;
  plannerLogoUrl: string | null;
  columns: NightlySummaryColumn[];
  rows: NightlySummaryRow[];
}

export interface NightlySummaryResult {
  checked: number;
  triggered: number;
  errors: number;
}

export type ManualTriggerReason = 'wedding_not_found' | 'wedding_inactive' | 'alert_not_enabled' | 'no_recipients';

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

/** Wedding fields needed to know which configurable RSVP questions are enabled and how they're labeled. */
const QUESTION_CONFIG_SELECT = {
  dietary_restrictions_enabled: true,
  accessibility_needs_enabled: true,
  transportation_question_enabled: true,
  transportation_question_text: true,
  extra_question_1_enabled: true,
  extra_question_1_text: true,
  extra_question_2_enabled: true,
  extra_question_2_text: true,
  extra_question_3_enabled: true,
  extra_question_3_text: true,
  extra_info_1_enabled: true,
  extra_info_1_label: true,
  extra_info_2_enabled: true,
  extra_info_2_label: true,
  extra_info_3_enabled: true,
  extra_info_3_label: true,
  family_dropdown_question_1_enabled: true,
  family_dropdown_question_1_label: true,
  guest_yn_question_1_enabled: true,
  guest_yn_question_1_text: true,
  guest_yn_question_2_enabled: true,
  guest_yn_question_2_text: true,
  guest_yn_question_3_enabled: true,
  guest_yn_question_3_text: true,
  guest_dropdown_question_1_enabled: true,
  guest_dropdown_question_1_label: true,
  guest_dropdown_question_2_enabled: true,
  guest_dropdown_question_2_label: true,
  guest_dropdown_question_3_enabled: true,
  guest_dropdown_question_3_label: true,
  guest_text_question_1_enabled: true,
  guest_text_question_1_label: true,
  guest_text_question_2_enabled: true,
  guest_text_question_2_label: true,
  guest_text_question_3_enabled: true,
  guest_text_question_3_label: true,
} as const;

type QuestionConfig = {
  [K in keyof typeof QUESTION_CONFIG_SELECT]: K extends `${string}_enabled` ? boolean : unknown;
};

/** Builds the dynamic column list (only the questions this wedding has enabled), in a stable order. */
function buildColumns(wedding: QuestionConfig): NightlySummaryColumn[] {
  const columns: NightlySummaryColumn[] = [];
  const asLabel = (v: unknown) => v as Record<string, string> | null;

  if (wedding.dietary_restrictions_enabled) {
    columns.push({ key: 'dietary_restrictions', builtinLabelKey: 'dietary', fallbackLabel: 'Dietary Restrictions', isBool: false });
  }
  if (wedding.accessibility_needs_enabled) {
    columns.push({ key: 'accessibility_needs', builtinLabelKey: 'accessibility', fallbackLabel: 'Accessibility Needs', isBool: false });
  }
  if (wedding.transportation_question_enabled) {
    columns.push({ key: 'transportation_answer', customLabel: asLabel(wedding.transportation_question_text), fallbackLabel: 'Transportation', isBool: true });
  }
  for (const n of [1, 2, 3] as const) {
    if (wedding[`extra_question_${n}_enabled`]) {
      columns.push({
        key: `extra_question_${n}_answer`,
        customLabel: asLabel(wedding[`extra_question_${n}_text`]),
        fallbackLabel: `Question ${n}`,
        isBool: true,
      });
    }
  }
  for (const n of [1, 2, 3] as const) {
    if (wedding[`extra_info_${n}_enabled`]) {
      columns.push({
        key: `extra_info_${n}_value`,
        customLabel: asLabel(wedding[`extra_info_${n}_label`]),
        fallbackLabel: `Info ${n}`,
        isBool: false,
      });
    }
  }
  if (wedding.family_dropdown_question_1_enabled) {
    columns.push({
      key: 'family_dropdown_question_1_answer',
      customLabel: asLabel(wedding.family_dropdown_question_1_label),
      fallbackLabel: 'Family Dropdown',
      isBool: false,
    });
  }
  for (const n of [1, 2, 3] as const) {
    if (wedding[`guest_yn_question_${n}_enabled`]) {
      columns.push({
        key: `guest_yn_question_${n}_answer`,
        customLabel: asLabel(wedding[`guest_yn_question_${n}_text`]),
        fallbackLabel: `Guest Question ${n}`,
        isBool: true,
      });
    }
  }
  for (const n of [1, 2, 3] as const) {
    if (wedding[`guest_dropdown_question_${n}_enabled`]) {
      columns.push({
        key: `guest_dropdown_question_${n}_answer`,
        customLabel: asLabel(wedding[`guest_dropdown_question_${n}_label`]),
        fallbackLabel: `Guest Dropdown ${n}`,
        isBool: false,
      });
    }
  }
  for (const n of [1, 2, 3] as const) {
    if (wedding[`guest_text_question_${n}_enabled`]) {
      columns.push({
        key: `guest_text_question_${n}_answer`,
        customLabel: asLabel(wedding[`guest_text_question_${n}_label`]),
        fallbackLabel: `Guest Text ${n}`,
        isBool: false,
      });
    }
  }

  return columns;
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
 *
 * Row detail reflects each changed family's *current* RSVP answers (there's
 * no per-submission historical snapshot to diff against), deduplicated to
 * one entry per family even if they submitted more than once in the window.
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
    select: { family_id: true, timestamp: true },
  });

  if (events.length === 0 && !alwaysBuild) return null;

  // Events are ordered desc, so the first occurrence per family is the latest.
  const latestChangeByFamily = new Map<string, Date>();
  for (const e of events) {
    if (!latestChangeByFamily.has(e.family_id)) latestChangeByFamily.set(e.family_id, e.timestamp);
  }
  const changedFamilyIds = [...latestChangeByFamily.keys()];

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
      ...QUESTION_CONFIG_SELECT,
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

  const columns = buildColumns(wedding as unknown as QuestionConfig);

  const rows: NightlySummaryRow[] = [];
  if (changedFamilyIds.length > 0) {
    const changedFamilies = await prisma.family.findMany({
      where: { id: { in: changedFamilyIds } },
      select: {
        id: true,
        name: true,
        transportation_answer: true,
        extra_question_1_answer: true,
        extra_question_2_answer: true,
        extra_question_3_answer: true,
        extra_info_1_value: true,
        extra_info_2_value: true,
        extra_info_3_value: true,
        family_dropdown_question_1_answer: true,
        members: {
          select: {
            name: true,
            attending: true,
            dietary_restrictions: true,
            accessibility_needs: true,
            guest_yn_question_1_answer: true,
            guest_yn_question_2_answer: true,
            guest_yn_question_3_answer: true,
            guest_dropdown_question_1_answer: true,
            guest_dropdown_question_2_answer: true,
            guest_dropdown_question_3_answer: true,
            guest_text_question_1_answer: true,
            guest_text_question_2_answer: true,
            guest_text_question_3_answer: true,
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    for (const family of changedFamilies) {
      const timestamp = (latestChangeByFamily.get(family.id) ?? new Date()).toISOString();
      const familyValues: Record<string, string | boolean | null> = {
        transportation_answer: family.transportation_answer,
        extra_question_1_answer: family.extra_question_1_answer,
        extra_question_2_answer: family.extra_question_2_answer,
        extra_question_3_answer: family.extra_question_3_answer,
        extra_info_1_value: family.extra_info_1_value,
        extra_info_2_value: family.extra_info_2_value,
        extra_info_3_value: family.extra_info_3_value,
        family_dropdown_question_1_answer: family.family_dropdown_question_1_answer,
      };

      for (const member of family.members) {
        rows.push({
          familyName: family.name,
          memberName: member.name,
          attending: member.attending,
          timestamp,
          values: {
            ...familyValues,
            dietary_restrictions: member.dietary_restrictions,
            accessibility_needs: member.accessibility_needs,
            guest_yn_question_1_answer: member.guest_yn_question_1_answer,
            guest_yn_question_2_answer: member.guest_yn_question_2_answer,
            guest_yn_question_3_answer: member.guest_yn_question_3_answer,
            guest_dropdown_question_1_answer: member.guest_dropdown_question_1_answer,
            guest_dropdown_question_2_answer: member.guest_dropdown_question_2_answer,
            guest_dropdown_question_3_answer: member.guest_dropdown_question_3_answer,
            guest_text_question_1_answer: member.guest_text_question_1_answer,
            guest_text_question_2_answer: member.guest_text_question_2_answer,
            guest_text_question_3_answer: member.guest_text_question_3_answer,
          },
        });
      }
    }
  }

  return {
    plannerId: wedding.planner_id,
    metadata: {
      weddingName: wedding.couple_names,
      weddingDate: wedding.wedding_date?.toISOString() ?? null,
      rsvpSent: totalFamilies,
      rsvpReceived: respondedFamilies,
      attendingGuests,
      totalGuests,
      confirmationsCount: changedFamilyIds.length,
      plannerLogoUrl: wedding.planner?.logo_url ?? null,
      columns,
      rows,
    },
  };
}

/**
 * Compute the last-24h RSVP report for a single wedding and fire the alert
 * if there was any activity. Returns whether the alert was triggered.
 */
async function processWeddingSummary(weddingId: string): Promise<boolean> {
  const built = await buildNightlySummaryReport(weddingId);
  if (!built || built.metadata.confirmationsCount === 0) return false; // nothing changed — do nothing

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
 * but still requires the wedding to be active (the automatic job already
 * skips deleted/archived/disabled weddings via its own query — this check
 * exists because a manual trigger can target any wedding id directly) and
 * the alert to be enabled with at least one admin to notify — otherwise
 * nothing would actually be sent.
 */
export async function triggerManualNightlySummary(weddingId: string): Promise<ManualTriggerResult> {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { status: true, is_disabled: true },
  });
  if (!wedding) return { sent: false, reason: 'wedding_not_found' };
  if (wedding.status !== 'ACTIVE' || wedding.is_disabled) {
    return { sent: false, reason: 'wedding_inactive' };
  }

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

/**
 * Resolve the nightly-summary email subject in the wedding planner's
 * *current* preferred language — regardless of which language each
 * recipient (couple/admin) reads the body in. Looked up fresh at send time
 * rather than relying on the AlertRule's stored `subject` (frozen in
 * whatever language was active when the alert was last saved).
 */
export async function resolveNightlySummarySubject(plannerId: string | null | undefined): Promise<string> {
  const def = findDefinition('wedding_nightly_summary');
  const fallback = def?.subject.EN ?? 'There was some activity in the last 24 hours...';
  if (!def || !plannerId) return fallback;

  const planner = await prisma.weddingPlanner.findUnique({
    where: { id: plannerId },
    select: { preferred_language: true },
  });
  const lang: Language = planner?.preferred_language ?? 'EN';
  return def.subject[lang] ?? fallback;
}
