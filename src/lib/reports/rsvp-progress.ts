/**
 * RSVP Progress Report
 *
 * Builds a daily timeline of cumulative invites sent vs. confirmed (RSVP
 * submitted) for a wedding, plus a linear projection of when the remaining
 * (pending) invites will be confirmed if replies keep arriving at the
 * recent average rate.
 */

import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db/prisma';
import type { ExportFormat, ExportResult } from '@/lib/excel/export';

// ============================================================================
// TYPES
// ============================================================================

export interface RsvpProgressPoint {
  date: string; // YYYY-MM-DD
  sent: number; // cumulative distinct families with an invitation sent
  confirmed: number; // cumulative distinct families with an RSVP submitted
  pending: number; // sent - confirmed
}

export interface RsvpProgressProjectionPoint {
  date: string;
  confirmed: number;
  pending: number;
}

export type RsvpStatusBucket = 'notOpened' | 'opened' | 'submitted';

export interface RsvpStatusPoint {
  date: string;
  notOpened: number; // invited, link never opened, no RSVP yet
  opened: number; // link opened (or RSVP started), no RSVP submitted yet
  submitted: number; // RSVP submitted
}

export interface RsvpStatusBreakdown {
  totalTracked: number;
  points: RsvpStatusPoint[];
  projection: {
    projectedCompletionDate: string;
    points: RsvpStatusPoint[];
  } | null;
}

export interface RsvpProgressData {
  hasData: boolean;
  totalSent: number;
  totalConfirmed: number;
  totalPending: number;
  weddingDate: string | null;
  rsvpCutoffDate: string | null;
  points: RsvpProgressPoint[];
  projection: {
    ratePerDay: number;
    projectedCompletionDate: string;
    afterCutoff: boolean;
    points: RsvpProgressProjectionPoint[];
  } | null;
  statusBreakdown: RsvpStatusBreakdown | null;
}

// ============================================================================
// HELPERS
// ============================================================================

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDayUTC(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function fmtDay(dayMs: number): string {
  return new Date(dayMs).toISOString().slice(0, 10);
}

/** Evenly downsample a series to at most `max` points, always keeping the first and last. */
function downsample<T>(series: T[], max: number): T[] {
  if (series.length <= max) return series;
  const step = (series.length - 1) / (max - 1);
  const result: T[] = [];
  for (let i = 0; i < max; i++) {
    result.push(series[Math.round(i * step)]);
  }
  return result;
}

/** Least-squares slope of y over evenly-spaced integer x (0..n-1). */
function leastSquaresSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }
  return den === 0 ? 0 : num / den;
}

/**
 * Builds the notOpened -> opened -> submitted funnel timeline from the
 * per-family first-seen timestamps for each stage, plus a projection that
 * extrapolates each bucket's own recent trend (submitted grows, and the
 * two pending buckets are derived so the three always sum to the total
 * tracked families).
 */
function buildStatusBreakdown(
  firstSent: Map<string, number>,
  firstOpened: Map<string, number>,
  firstConfirmed: Map<string, number>,
  todayDay: number,
): RsvpStatusBreakdown | null {
  const familyIds = new Set<string>([...firstSent.keys(), ...firstOpened.keys(), ...firstConfirmed.keys()]);
  if (familyIds.size === 0) return null;

  type Delta = { day: number; bucket: RsvpStatusBucket; sign: 1 | -1 };
  const deltas: Delta[] = [];
  let minDay = Infinity;

  for (const familyId of familyIds) {
    const sent = firstSent.get(familyId);
    const submitted = firstConfirmed.get(familyId);
    let opened = firstOpened.get(familyId);
    // If "opened" happens at/after "submitted", it's not part of the
    // pre-submission funnel (e.g. they re-open the confirmation page).
    if (opened !== undefined && submitted !== undefined && opened >= submitted) {
      opened = undefined;
    }

    const stages: { day: number; bucket: RsvpStatusBucket }[] = [];
    if (sent !== undefined) stages.push({ day: sent, bucket: 'notOpened' });
    if (opened !== undefined) stages.push({ day: opened, bucket: 'opened' });
    if (submitted !== undefined) stages.push({ day: submitted, bucket: 'submitted' });
    stages.sort((a, b) => a.day - b.day);
    if (stages.length === 0) continue;

    minDay = Math.min(minDay, stages[0].day);

    let prevBucket: RsvpStatusBucket | null = null;
    for (const stage of stages) {
      if (prevBucket) deltas.push({ day: stage.day, bucket: prevBucket, sign: -1 });
      deltas.push({ day: stage.day, bucket: stage.bucket, sign: 1 });
      prevBucket = stage.bucket;
    }
  }

  if (!Number.isFinite(minDay)) return null;
  deltas.sort((a, b) => a.day - b.day);
  const maxDay = Math.max(minDay, todayDay);

  const dailyPoints: RsvpStatusPoint[] = [];
  const counts: Record<RsvpStatusBucket, number> = { notOpened: 0, opened: 0, submitted: 0 };
  let deltaIdx = 0;
  for (let day = minDay; day <= maxDay; day += DAY_MS) {
    while (deltaIdx < deltas.length && deltas[deltaIdx].day <= day) {
      counts[deltas[deltaIdx].bucket] += deltas[deltaIdx].sign;
      deltaIdx++;
    }
    dailyPoints.push({ date: fmtDay(day), notOpened: counts.notOpened, opened: counts.opened, submitted: counts.submitted });
  }

  const totalTracked = familyIds.size;
  const last = dailyPoints[dailyPoints.length - 1];
  const recentWindow = dailyPoints.slice(-30);
  const submittedRate = leastSquaresSlope(recentWindow.map((p) => p.submitted));
  const openedRate = leastSquaresSlope(recentWindow.map((p) => p.opened));

  const remaining = totalTracked - last.submitted;
  let projection: RsvpStatusBreakdown['projection'] = null;

  if (remaining > 0 && submittedRate > 0.01) {
    const daysNeeded = Math.ceil(remaining / submittedRate);
    const projectedCompletionDate = fmtDay(maxDay + daysNeeded * DAY_MS);
    const projPoints: RsvpStatusPoint[] = [];
    const step = Math.max(1, Math.ceil(daysNeeded / 40));

    for (let elapsed = 0; elapsed <= daysNeeded; elapsed += step) {
      const submitted = Math.min(totalTracked, Math.max(0, last.submitted + submittedRate * elapsed));
      const openedRaw = last.opened + openedRate * elapsed;
      const opened = Math.min(Math.max(0, openedRaw), Math.max(0, totalTracked - submitted));
      const notOpened = Math.max(0, totalTracked - submitted - opened);
      projPoints.push({
        date: fmtDay(maxDay + elapsed * DAY_MS),
        notOpened: Math.round(notOpened),
        opened: Math.round(opened),
        submitted: Math.round(submitted),
      });
    }
    if (projPoints[projPoints.length - 1]?.date !== projectedCompletionDate) {
      projPoints.push({ date: projectedCompletionDate, notOpened: 0, opened: 0, submitted: totalTracked });
    }

    projection = { projectedCompletionDate, points: projPoints };
  }

  return { totalTracked, points: downsample(dailyPoints, 120), projection };
}

// ============================================================================
// MAIN
// ============================================================================

export async function fetchRsvpProgress(weddingId: string): Promise<RsvpProgressData> {
  const [events, wedding] = await Promise.all([
    prisma.trackingEvent.findMany({
      where: {
        wedding_id: weddingId,
        event_type: { in: ['INVITATION_SENT', 'LINK_OPENED', 'RSVP_STARTED', 'RSVP_SUBMITTED'] },
      },
      select: { family_id: true, event_type: true, timestamp: true },
      orderBy: { timestamp: 'asc' },
    }),
    prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { wedding_date: true, rsvp_cutoff_date: true },
    }),
  ]);

  const firstSent = new Map<string, number>();
  const firstOpened = new Map<string, number>();
  const firstConfirmed = new Map<string, number>();

  for (const e of events) {
    const day = startOfDayUTC(e.timestamp);
    if (e.event_type === 'INVITATION_SENT' && !firstSent.has(e.family_id)) {
      firstSent.set(e.family_id, day);
    } else if ((e.event_type === 'LINK_OPENED' || e.event_type === 'RSVP_STARTED') && !firstOpened.has(e.family_id)) {
      firstOpened.set(e.family_id, day);
    } else if (e.event_type === 'RSVP_SUBMITTED' && !firstConfirmed.has(e.family_id)) {
      firstConfirmed.set(e.family_id, day);
    }
  }

  const sentDays = Array.from(firstSent.values()).sort((a, b) => a - b);
  const confirmedDays = Array.from(firstConfirmed.values()).sort((a, b) => a - b);

  const weddingDate = wedding?.wedding_date ? wedding.wedding_date.toISOString().slice(0, 10) : null;
  const rsvpCutoffDate = wedding?.rsvp_cutoff_date ? wedding.rsvp_cutoff_date.toISOString().slice(0, 10) : null;

  if (sentDays.length === 0 && confirmedDays.length === 0) {
    return {
      hasData: false,
      totalSent: 0,
      totalConfirmed: 0,
      totalPending: 0,
      weddingDate,
      rsvpCutoffDate,
      points: [],
      projection: null,
      statusBreakdown: null,
    };
  }

  const minDay = Math.min(sentDays[0] ?? Infinity, confirmedDays[0] ?? Infinity);
  const todayDay = startOfDayUTC(new Date());
  const maxDay = Math.max(minDay, todayDay);

  // Build the full daily series first (used for an accurate regression),
  // then downsample only for the response so the chart stays readable.
  const dailyPoints: RsvpProgressPoint[] = [];
  let sentIdx = 0;
  let confIdx = 0;
  for (let day = minDay; day <= maxDay; day += DAY_MS) {
    while (sentIdx < sentDays.length && sentDays[sentIdx] <= day) sentIdx++;
    while (confIdx < confirmedDays.length && confirmedDays[confIdx] <= day) confIdx++;
    dailyPoints.push({
      date: fmtDay(day),
      sent: sentIdx,
      confirmed: confIdx,
      pending: Math.max(sentIdx - confIdx, 0),
    });
  }

  const totalSent = sentDays.length;
  const totalConfirmed = confirmedDays.length;
  const totalPending = Math.max(totalSent - totalConfirmed, 0);

  // Projection: linear regression over the confirmed-cumulative trend,
  // using up to the most recent 30 days of data (more representative of
  // current momentum than the full history for weddings sent long ago).
  let projection: RsvpProgressData['projection'] = null;
  const recentWindow = dailyPoints.slice(-30);
  const ratePerDay = leastSquaresSlope(recentWindow.map((p) => p.confirmed));

  if (totalPending > 0 && ratePerDay > 0.01) {
    const daysNeeded = Math.ceil(totalPending / ratePerDay);
    const projectedCompletionDay = maxDay + daysNeeded * DAY_MS;
    const projectedCompletionDate = fmtDay(projectedCompletionDay);

    const projPoints: RsvpProgressProjectionPoint[] = [];
    const step = Math.max(1, Math.ceil(daysNeeded / 40)); // cap ~40 points
    for (let elapsed = 0; elapsed <= daysNeeded; elapsed += step) {
      const confirmed = Math.min(totalSent, totalConfirmed + ratePerDay * elapsed);
      projPoints.push({
        date: fmtDay(maxDay + elapsed * DAY_MS),
        confirmed: Math.round(confirmed),
        pending: Math.max(0, Math.round(totalSent - confirmed)),
      });
    }
    // Always end exactly at the projected completion day.
    if (projPoints[projPoints.length - 1]?.date !== projectedCompletionDate) {
      projPoints.push({ date: projectedCompletionDate, confirmed: totalSent, pending: 0 });
    }

    projection = {
      ratePerDay: Math.round(ratePerDay * 100) / 100,
      projectedCompletionDate,
      afterCutoff: rsvpCutoffDate ? projectedCompletionDate > rsvpCutoffDate : false,
      points: projPoints,
    };
  }

  return {
    hasData: true,
    totalSent,
    totalConfirmed,
    totalPending,
    weddingDate,
    rsvpCutoffDate,
    points: downsample(dailyPoints, 120),
    projection,
    statusBreakdown: buildStatusBreakdown(firstSent, firstOpened, firstConfirmed, todayDay),
  };
}

/**
 * Export the daily timeline (invites sent / confirmed / pending, cumulative)
 * as a spreadsheet.
 */
export async function exportRsvpProgress(
  weddingId: string,
  format: ExportFormat = 'xlsx',
): Promise<ExportResult> {
  const data = await fetchRsvpProgress(weddingId);

  const rows: (string | number)[][] = [['Date', 'Invites Sent (cumulative)', 'Confirmed (cumulative)', 'Pending']];
  data.points.forEach((p) => {
    rows.push([p.date, p.sent, p.confirmed, p.pending]);
  });
  if (data.projection) {
    rows.push([]);
    rows.push(['Projected completion date', data.projection.projectedCompletionDate]);
    rows.push(['Projected confirmations/day', data.projection.ratePerDay]);
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = rows[0].map((_, colIdx) => {
    const maxLen = Math.max(...rows.map((row) => String(row[colIdx] ?? '').length));
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });
  XLSX.utils.book_append_sheet(workbook, worksheet, 'RSVP Progress');

  if (data.statusBreakdown && format !== 'csv') {
    const statusRows: (string | number)[][] = [['Date', 'Not Opened', 'Opened (no RSVP yet)', 'Submitted']];
    data.statusBreakdown.points.forEach((p) => {
      statusRows.push([p.date, p.notOpened, p.opened, p.submitted]);
    });
    const statusSheet = XLSX.utils.aoa_to_sheet(statusRows);
    statusSheet['!cols'] = statusRows[0].map((_, colIdx) => {
      const maxLen = Math.max(...statusRows.map((row) => String(row[colIdx] ?? '').length));
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });
    XLSX.utils.book_append_sheet(workbook, statusSheet, 'RSVP Status');
  }

  const timestamp = new Date().toISOString().split('T')[0];

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return {
      buffer: Buffer.from(csv, 'utf-8'),
      filename: `rsvp-progress-${timestamp}.csv`,
      mimeType: 'text/csv',
    };
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return {
    buffer: Buffer.from(buffer),
    filename: `rsvp-progress-${timestamp}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}
