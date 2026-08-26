/**
 * RSVP Status Chart
 *
 * Stacked-area chart of the RSVP funnel over time: invited-but-not-opened,
 * opened-but-not-submitted, and submitted — with a dashed projection of
 * each band extending from today to the projected completion date.
 */

'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export interface RsvpStatusPoint {
  date: string;
  notOpened: number;
  opened: number;
  submitted: number;
}

export interface RsvpStatusBreakdown {
  totalTracked: number;
  points: RsvpStatusPoint[];
  projection: {
    projectedCompletionDate: string;
    points: RsvpStatusPoint[];
  } | null;
}

// Warm pair for the two pending sub-states (echoing the "Pending" line's
// orange from the confirmations chart), green matches that chart's "Confirmed".
const COLOR_NOT_OPENED = '#eb6834'; // orange
const COLOR_OPENED = '#eda100'; // yellow
const COLOR_SUBMITTED = '#008300'; // green

const WIDTH = 820;
const HEIGHT = 340;
const MARGIN = { top: 16, right: 20, bottom: 32, left: 44 };

function parseDay(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getTime();
}

function formatShort(dateStr: string, locale: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

function formatLong(dateStr: string, locale: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

interface Layer {
  x: number;
  date: string;
  notOpened: number;
  opened: number;
  submitted: number;
  y0: number; // top of notOpened band
  y1: number; // top of opened band
  y2: number; // top of submitted band (== total)
  projected: boolean;
}

export function RsvpStatusChart({ data }: { data: RsvpStatusBreakdown | null }) {
  const t = useTranslations();
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en';
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (!data || data.points.length === 0) return null;

    const toLayers = (points: RsvpStatusPoint[], projected: boolean): Layer[] =>
      points.map((p) => ({
        x: parseDay(p.date),
        date: p.date,
        notOpened: p.notOpened,
        opened: p.opened,
        submitted: p.submitted,
        y0: p.notOpened,
        y1: p.notOpened + p.opened,
        y2: p.notOpened + p.opened + p.submitted,
        projected,
      }));

    const actual = toLayers(data.points, false);
    const projPoints = data.projection?.points ?? [];
    const projected = toLayers(projPoints.slice(1), true); // skip boundary duplicate

    const all = [...actual, ...projected];
    const xMin = all[0].x;
    const xMax = all[all.length - 1].x;
    const yMax = Math.max(1, data.totalTracked) * 1.08;

    const plotW = WIDTH - MARGIN.left - MARGIN.right;
    const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
    const scaleX = (x: number) => MARGIN.left + (xMax === xMin ? 0 : ((x - xMin) / (xMax - xMin)) * plotW);
    const scaleY = (y: number) => MARGIN.top + plotH - (y / yMax) * plotH;

    const areaPath = (series: Layer[], top: (l: Layer) => number, bottom: (l: Layer) => number) => {
      if (series.length === 0) return '';
      let d = 'M';
      series.forEach((l, i) => {
        d += `${i === 0 ? '' : 'L'}${scaleX(l.x).toFixed(1)},${scaleY(top(l)).toFixed(1)} `;
      });
      for (let i = series.length - 1; i >= 0; i--) {
        d += `L${scaleX(series[i].x).toFixed(1)},${scaleY(bottom(series[i])).toFixed(1)} `;
      }
      return `${d}Z`;
    };

    const lineTop = (series: Layer[], top: (l: Layer) => number) => {
      let d = '';
      series.forEach((l, i) => {
        d += `${i === 0 ? 'M' : 'L'}${scaleX(l.x).toFixed(1)},${scaleY(top(l)).toFixed(1)} `;
      });
      return d.trim();
    };

    // For projected bands, prepend the last actual point as the boundary.
    const projectedWithBoundary = actual.length > 0 ? [actual[actual.length - 1], ...projected] : projected;

    return {
      all,
      xMin,
      xMax,
      yMax,
      scaleX,
      scaleY,
      plotW,
      plotH,
      notOpenedArea: areaPath(actual, () => 0, (l) => l.y0),
      openedArea: areaPath(actual, (l) => l.y0, (l) => l.y1),
      submittedArea: areaPath(actual, (l) => l.y1, (l) => l.y2),
      notOpenedProjArea: areaPath(projectedWithBoundary, () => 0, (l) => l.y0),
      openedProjArea: areaPath(projectedWithBoundary, (l) => l.y0, (l) => l.y1),
      submittedProjArea: areaPath(projectedWithBoundary, (l) => l.y1, (l) => l.y2),
      notOpenedTop: lineTop(actual, (l) => l.y0),
      openedTop: lineTop(actual, (l) => l.y1),
      submittedTop: lineTop(actual, (l) => l.y2),
      notOpenedProjTop: lineTop(projectedWithBoundary, (l) => l.y0),
      openedProjTop: lineTop(projectedWithBoundary, (l) => l.y1),
      submittedProjTop: lineTop(projectedWithBoundary, (l) => l.y2),
      todayX: scaleX(actual[actual.length - 1].x),
    };
  }, [data]);

  if (!data || !chart) {
    return <div className="p-12 text-center text-gray-500 text-sm">{t('admin.reports.rsvpProgress.noData')}</div>;
  }

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    chart.all.forEach((l, idx) => {
      const dist = Math.abs(chart.scaleX(l.x) - px);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = idx;
      }
    });
    setHoverIdx(nearest);
  };

  const hovered = hoverIdx !== null ? chart.all[hoverIdx] : null;

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
        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={tick.py} y2={tick.py} stroke="#e1e0d9" strokeWidth={1} />
            <text x={MARGIN.left - 8} y={tick.py + 4} textAnchor="end" fontSize={11} fill="#898781">
              {tick.value}
            </text>
          </g>
        ))}

        {ticks.map((tick, i) => (
          <text key={i} x={tick.px} y={HEIGHT - MARGIN.bottom + 18} textAnchor="middle" fontSize={11} fill="#898781">
            {formatShort(new Date(tick.x).toISOString().slice(0, 10), locale)}
          </text>
        ))}

        <line
          x1={MARGIN.left}
          x2={WIDTH - MARGIN.right}
          y1={MARGIN.top + chart.plotH}
          y2={MARGIN.top + chart.plotH}
          stroke="#c3c2b7"
          strokeWidth={1}
        />

        {/* Actual stacked areas (bottom to top: notOpened, opened, submitted) */}
        <path d={chart.notOpenedArea} fill={COLOR_NOT_OPENED} opacity={0.75} />
        <path d={chart.openedArea} fill={COLOR_OPENED} opacity={0.75} />
        <path d={chart.submittedArea} fill={COLOR_SUBMITTED} opacity={0.75} />

        {/* Projected stacked areas (lighter, extends from today) */}
        <path d={chart.notOpenedProjArea} fill={COLOR_NOT_OPENED} opacity={0.28} />
        <path d={chart.openedProjArea} fill={COLOR_OPENED} opacity={0.28} />
        <path d={chart.submittedProjArea} fill={COLOR_SUBMITTED} opacity={0.28} />

        {/* Band boundary lines (2px, with a surface gap look via white stroke behind) */}
        <path d={chart.notOpenedTop} fill="none" stroke="#fcfcfb" strokeWidth={3} />
        <path d={chart.notOpenedTop} fill="none" stroke={COLOR_NOT_OPENED} strokeWidth={2} strokeLinecap="round" />
        <path d={chart.openedTop} fill="none" stroke="#fcfcfb" strokeWidth={3} />
        <path d={chart.openedTop} fill="none" stroke={COLOR_OPENED} strokeWidth={2} strokeLinecap="round" />
        <path d={chart.submittedTop} fill="none" stroke="#fcfcfb" strokeWidth={3} />
        <path d={chart.submittedTop} fill="none" stroke={COLOR_SUBMITTED} strokeWidth={2} strokeLinecap="round" />

        <path d={chart.notOpenedProjTop} fill="none" stroke={COLOR_NOT_OPENED} strokeWidth={2} strokeDasharray="6,4" opacity={0.8} />
        <path d={chart.openedProjTop} fill="none" stroke={COLOR_OPENED} strokeWidth={2} strokeDasharray="6,4" opacity={0.8} />
        <path d={chart.submittedProjTop} fill="none" stroke={COLOR_SUBMITTED} strokeWidth={2} strokeDasharray="6,4" opacity={0.8} />

        {/* Today marker */}
        <line
          x1={chart.todayX}
          x2={chart.todayX}
          y1={MARGIN.top}
          y2={MARGIN.top + chart.plotH}
          stroke="#898781"
          strokeWidth={1}
          strokeDasharray="2,3"
        />

        {hovered && (
          <line
            x1={chart.scaleX(hovered.x)}
            x2={chart.scaleX(hovered.x)}
            y1={MARGIN.top}
            y2={MARGIN.top + chart.plotH}
            stroke="#0b0b0b"
            strokeWidth={1}
            opacity={0.35}
          />
        )}
      </svg>

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
          <span className="flex items-center gap-1.5 text-gray-600">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_NOT_OPENED }} />
            {t('admin.reports.rsvpProgress.statusNotOpened')}: {hovered.notOpened}
          </span>
          <span className="flex items-center gap-1.5 text-gray-600">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_OPENED }} />
            {t('admin.reports.rsvpProgress.statusOpened')}: {hovered.opened}
          </span>
          <span className="flex items-center gap-1.5 text-gray-600">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_SUBMITTED }} />
            {t('admin.reports.rsvpProgress.statusSubmitted')}: {hovered.submitted}
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLOR_NOT_OPENED }} />
          {t('admin.reports.rsvpProgress.statusNotOpened')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLOR_OPENED }} />
          {t('admin.reports.rsvpProgress.statusOpened')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLOR_SUBMITTED }} />
          {t('admin.reports.rsvpProgress.statusSubmitted')}
        </span>
        {data.projection && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 opacity-70" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #898781 0 4px, transparent 4px 7px)' }} />
            {t('admin.reports.rsvpProgress.legendProjected')}
          </span>
        )}
      </div>
    </div>
  );
}
