/**
 * RSVP Progress Chart
 *
 * Line chart of cumulative invites sent vs. confirmed (RSVP submitted) over
 * time, plus a dashed linear projection of when the remaining invites will
 * be confirmed at the recent average pace.
 */

'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { RsvpStatusBreakdown } from '@/components/admin/RsvpStatusChart';

export interface RsvpProgressPoint {
  date: string;
  sent: number;
  confirmed: number;
  pending: number;
}

export interface RsvpProgressProjectionPoint {
  date: string;
  confirmed: number;
  pending: number;
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

// Fixed categorical color order (not reused elsewhere in the chart).
const COLOR_SENT = '#2a78d6'; // blue
const COLOR_CONFIRMED = '#008300'; // green
const COLOR_PENDING = '#eb6834'; // orange

const WIDTH = 820;
const HEIGHT = 340;
const MARGIN = { top: 16, right: 20, bottom: 32, left: 44 };

function parseDay(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getTime();
}

function formatShort(dateStr: string, locale: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
}

function formatLong(dateStr: string, locale: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface HoverPoint {
  x: number;
  date: string;
  sent: number | null;
  confirmed: number;
  pending: number;
  projected: boolean;
}

export function RsvpProgressChart({ data }: { data: RsvpProgressData }) {
  const t = useTranslations();
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en';
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (!data.hasData || data.points.length === 0) return null;

    const hoverPoints: HoverPoint[] = data.points.map((p) => ({
      x: parseDay(p.date),
      date: p.date,
      sent: p.sent,
      confirmed: p.confirmed,
      pending: p.pending,
      projected: false,
    }));

    const projPoints = data.projection?.points ?? [];
    // Skip the first projection point — it duplicates the last actual day.
    for (const p of projPoints.slice(1)) {
      hoverPoints.push({
        x: parseDay(p.date),
        date: p.date,
        sent: null,
        confirmed: p.confirmed,
        pending: p.pending,
        projected: true,
      });
    }

    const xMin = hoverPoints[0].x;
    const xMax = hoverPoints[hoverPoints.length - 1].x;
    const yMax = Math.max(
      1,
      ...data.points.map((p) => p.sent),
      ...data.points.map((p) => p.confirmed),
      ...projPoints.map((p) => p.confirmed),
    ) * 1.12;

    const plotW = WIDTH - MARGIN.left - MARGIN.right;
    const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

    const scaleX = (x: number) =>
      MARGIN.left + (xMax === xMin ? 0 : ((x - xMin) / (xMax - xMin)) * plotW);
    const scaleY = (y: number) => MARGIN.top + plotH - (y / yMax) * plotH;

    const pathFor = (getY: (p: HoverPoint) => number | null, source: HoverPoint[]) => {
      let d = '';
      let started = false;
      for (const p of source) {
        const y = getY(p);
        if (y === null) continue;
        const cmd = started ? 'L' : 'M';
        d += `${cmd}${scaleX(p.x).toFixed(1)},${scaleY(y).toFixed(1)} `;
        started = true;
      }
      return d.trim();
    };

    const actual = hoverPoints.filter((p) => !p.projected);
    const projected = hoverPoints.filter((p) => p.projected);
    // Include the boundary point so the projected line connects to the actual one.
    const projectedWithBoundary = actual.length > 0 ? [actual[actual.length - 1], ...projected] : projected;

    return {
      hoverPoints,
      xMin,
      xMax,
      yMax,
      scaleX,
      scaleY,
      plotW,
      plotH,
      sentPath: pathFor((p) => p.sent, actual),
      confirmedPath: pathFor((p) => p.confirmed, actual),
      pendingPath: pathFor((p) => p.pending, actual),
      confirmedProjPath: pathFor((p) => p.confirmed, projectedWithBoundary),
      pendingProjPath: pathFor((p) => p.pending, projectedWithBoundary),
      todayX: scaleX(actual[actual.length - 1].x),
      cutoffX: data.rsvpCutoffDate ? scaleX(parseDay(data.rsvpCutoffDate)) : null,
    };
  }, [data]);

  if (!data.hasData || !chart) {
    return (
      <div className="p-12 text-center text-gray-500 text-sm">{t('admin.reports.rsvpProgress.noData')}</div>
    );
  }

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    chart.hoverPoints.forEach((p, idx) => {
      const dist = Math.abs(chart.scaleX(p.x) - px);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = idx;
      }
    });
    setHoverIdx(nearest);
  };

  const hovered = hoverIdx !== null ? chart.hoverPoints[hoverIdx] : null;

  // X-axis ticks: ~6 evenly spaced labels across the full domain (actual + projected).
  const tickCount = 6;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const x = chart.xMin + ((chart.xMax - chart.xMin) * i) / (tickCount - 1);
    return { x, px: chart.scaleX(x) };
  });

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => {
    const value = Math.round((chart.yMax * i) / (yTickCount - 1));
    return { value, py: chart.scaleY(value) };
  });

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto select-none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Gridlines + Y labels */}
        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={tick.py}
              y2={tick.py}
              stroke="#e1e0d9"
              strokeWidth={1}
            />
            <text x={MARGIN.left - 8} y={tick.py + 4} textAnchor="end" fontSize={11} fill="#898781">
              {tick.value}
            </text>
          </g>
        ))}

        {/* X labels */}
        {ticks.map((tick, i) => (
          <text
            key={i}
            x={tick.px}
            y={HEIGHT - MARGIN.bottom + 18}
            textAnchor="middle"
            fontSize={11}
            fill="#898781"
          >
            {formatShort(new Date(tick.x).toISOString().slice(0, 10), locale)}
          </text>
        ))}

        {/* Baseline */}
        <line
          x1={MARGIN.left}
          x2={WIDTH - MARGIN.right}
          y1={MARGIN.top + chart.plotH}
          y2={MARGIN.top + chart.plotH}
          stroke="#c3c2b7"
          strokeWidth={1}
        />

        {/* RSVP cutoff reference line */}
        {chart.cutoffX !== null && chart.cutoffX >= MARGIN.left && chart.cutoffX <= WIDTH - MARGIN.right && (
          <g>
            <line
              x1={chart.cutoffX}
              x2={chart.cutoffX}
              y1={MARGIN.top}
              y2={MARGIN.top + chart.plotH}
              stroke="#e34948"
              strokeWidth={1.5}
              strokeDasharray="3,3"
            />
            <text x={chart.cutoffX + 4} y={MARGIN.top + 10} fontSize={10} fill="#e34948">
              {t('admin.reports.rsvpProgress.cutoffLabel')}
            </text>
          </g>
        )}

        {/* Today marker (start of projection) */}
        <line
          x1={chart.todayX}
          x2={chart.todayX}
          y1={MARGIN.top}
          y2={MARGIN.top + chart.plotH}
          stroke="#c3c2b7"
          strokeWidth={1}
          strokeDasharray="2,3"
        />

        {/* Sent (cumulative) */}
        <path d={chart.sentPath} fill="none" stroke={COLOR_SENT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Confirmed (cumulative) — actual + projected */}
        <path d={chart.confirmedPath} fill="none" stroke={COLOR_CONFIRMED} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <path
          d={chart.confirmedProjPath}
          fill="none"
          stroke={COLOR_CONFIRMED}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6,4"
          opacity={0.7}
        />

        {/* Pending — actual + projected */}
        <path d={chart.pendingPath} fill="none" stroke={COLOR_PENDING} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path
          d={chart.pendingProjPath}
          fill="none"
          stroke={COLOR_PENDING}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6,4"
          opacity={0.7}
        />

        {/* Hover crosshair */}
        {hovered && (
          <g>
            <line
              x1={chart.scaleX(hovered.x)}
              x2={chart.scaleX(hovered.x)}
              y1={MARGIN.top}
              y2={MARGIN.top + chart.plotH}
              stroke="#898781"
              strokeWidth={1}
            />
            {hovered.sent !== null && (
              <circle cx={chart.scaleX(hovered.x)} cy={chart.scaleY(hovered.sent)} r={4} fill={COLOR_SENT} stroke="#fcfcfb" strokeWidth={1.5} />
            )}
            <circle cx={chart.scaleX(hovered.x)} cy={chart.scaleY(hovered.confirmed)} r={4} fill={COLOR_CONFIRMED} stroke="#fcfcfb" strokeWidth={1.5} />
            <circle cx={chart.scaleX(hovered.x)} cy={chart.scaleY(hovered.pending)} r={4} fill={COLOR_PENDING} stroke="#fcfcfb" strokeWidth={1.5} />
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div className="mt-2 inline-flex flex-col gap-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
          <span className="font-medium text-gray-900">
            {formatLong(hovered.date, locale)}
            {hovered.projected && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-normal text-gray-500">
                {t('admin.reports.rsvpProgress.legendProjected')}
              </span>
            )}
          </span>
          {hovered.sent !== null && (
            <span className="flex items-center gap-1.5 text-gray-600">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_SENT }} />
              {t('admin.reports.rsvpProgress.legendSent')}: {hovered.sent}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-gray-600">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_CONFIRMED }} />
            {t('admin.reports.rsvpProgress.legendConfirmed')}: {hovered.confirmed}
          </span>
          <span className="flex items-center gap-1.5 text-gray-600">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_PENDING }} />
            {t('admin.reports.rsvpProgress.legendPending')}: {hovered.pending}
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ backgroundColor: COLOR_SENT }} />
          {t('admin.reports.rsvpProgress.legendSent')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ backgroundColor: COLOR_CONFIRMED }} />
          {t('admin.reports.rsvpProgress.legendConfirmed')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ backgroundColor: COLOR_PENDING }} />
          {t('admin.reports.rsvpProgress.legendPending')}
        </span>
        {data.projection && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-4 opacity-70"
              style={{ backgroundImage: `repeating-linear-gradient(90deg, ${COLOR_CONFIRMED} 0 4px, transparent 4px 7px)` }}
            />
            {t('admin.reports.rsvpProgress.legendProjected')}
          </span>
        )}
      </div>
    </div>
  );
}
