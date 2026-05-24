'use client';

import { useState } from 'react';
import { useNamespacedTranslations } from '@/lib/i18n/client';
import type { WeatherWidgetData } from '@/types/astro-weather';
import type { ScheduleBlockWithTimes } from '@/types/schedule';
import {
  timeToMinutes,
  minutesToHHMM,
  timeToPercent,
  getLightZone,
  sunTimesInMinutes,
} from '@/lib/astro-weather/sun-utils';

export type WeatherFetchStatus = 'loading' | 'ok' | 'no-location' | 'error';

// Re-export helpers so existing tests keep importing from this path.
export { timeToMinutes, minutesToHHMM, timeToPercent };

// ── Internal helpers ──────────────────────────────────────────────────────────

function dayLengthLabel(minutes: number, tH: string, tM: string): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}${tH} ${m}${tM}` : `${h}${tH}`;
}

// ── Sun timeline ──────────────────────────────────────────────────────────────

interface StageMarker {
  name: string;
  startTime: string;
}

interface SunTimelineProps {
  civilTwilightBeginMin: number;
  civilTwilightEndMin: number;
  sunriseMin: number;
  sunsetMin: number;
  stages: StageMarker[];
}

function SunTimeline({
  civilTwilightBeginMin,
  civilTwilightEndMin,
  sunriseMin,
  sunsetMin,
  stages,
}: SunTimelineProps) {
  const displayStart = Math.max(0, civilTwilightBeginMin - 60);
  const displayEnd   = Math.min(1440, civilTwilightEndMin + 60);

  function pct(min: number) {
    return timeToPercent(min, displayStart, displayEnd);
  }

  const nightBefore  = pct(civilTwilightBeginMin);
  const sunrise      = pct(sunriseMin);
  const goldenStart  = pct(sunsetMin - 60);
  const sunsetPct    = pct(sunsetMin);
  const nightAfter   = pct(civilTwilightEndMin);

  const gradient = [
    `#0f172a 0%`,
    `#0f172a ${nightBefore}%`,
    `#1e3a5f ${nightBefore}%`,
    `#f97316 ${sunrise}%`,
    `#fef08a ${sunrise + 2}%`,
    `#fef08a ${goldenStart}%`,
    `#fb923c ${sunsetPct}%`,
    `#7c3aed ${nightAfter}%`,
    `#0f172a ${nightAfter + 2}%`,
  ].join(', ');

  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          className="h-6 rounded-full overflow-hidden"
          style={{ background: `linear-gradient(to right, ${gradient})` }}
        />

        {stages.map((stage) => {
          const stageMin = timeToMinutes(stage.startTime);
          const pos      = pct(stageMin);
          const dayPct   = timeToPercent(stageMin, civilTwilightBeginMin, civilTwilightEndMin);

          return (
            <div
              key={`${stage.name}-${stage.startTime}`}
              className="absolute top-0 h-6 flex flex-col items-center group"
              style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-0.5 h-full bg-white/80" />
              <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-10">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                  <span className="font-medium">{stage.name}</span>
                  <span className="text-gray-300 ml-1">{stage.startTime}</span>
                  <span className="text-gray-400 ml-1">· {dayPct}%</span>
                </div>
                <div className="w-1.5 h-1.5 bg-gray-900 rotate-45 -mt-0.5" />
              </div>
            </div>
          );
        })}

        <div className="relative mt-1 h-4">
          {[
            { min: civilTwilightBeginMin, label: minutesToHHMM(civilTwilightBeginMin) },
            { min: sunriseMin,            label: minutesToHHMM(sunriseMin)            },
            { min: sunsetMin,             label: minutesToHHMM(sunsetMin)             },
            { min: civilTwilightEndMin,   label: minutesToHHMM(civilTwilightEndMin)   },
          ].map(({ min, label }) => (
            <span
              key={min}
              className="absolute text-[10px] text-gray-500 -translate-x-1/2"
              style={{ left: `${pct(min)}%` }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Collapsed pill ────────────────────────────────────────────────────────────

interface CollapsedPillProps {
  data: WeatherWidgetData;
  onExpand: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

function CollapsedPill({ data, onExpand, t }: CollapsedPillProps) {
  const { sunTimes, moonPhase, weather } = data;
  const h   = Math.floor(sunTimes.dayLengthMinutes / 60);
  const m   = sunTimes.dayLengthMinutes % 60;
  const dayLen = m > 0 ? `${h}h${m}m` : `${h}h`;

  return (
    <button
      type="button"
      onClick={onExpand}
      className="w-full flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-200 transition-all text-left group"
    >
      <span className="text-base" title={`${t('sunrise')} ${sunTimes.sunrise} · ${t('sunset')} ${sunTimes.sunset}`}>
        ☀️
      </span>
      <span className="text-xs text-gray-600 font-medium">{sunTimes.sunset}</span>
      <span className="text-gray-300">·</span>
      <span className="text-xs text-gray-500">{dayLen}</span>
      <span className="text-gray-300">·</span>
      <span className="text-base">{moonPhase.emoji}</span>
      <span className="text-xs text-gray-600">{moonPhase.illumination}%</span>
      <span className="text-gray-300">·</span>
      <span className="text-base">{weather.conditionEmoji}</span>
      <span className="text-xs text-gray-600">{weather.tempMin}–{weather.tempMax}°C</span>
      <div className="flex-1" />
      <span className="text-xs text-gray-400 group-hover:text-amber-500 transition-colors flex items-center gap-1">
        {t('expand')}
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </button>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

export interface WeatherWidgetProps {
  data: WeatherWidgetData | null;
  fetchStatus: WeatherFetchStatus;
  blocks: ScheduleBlockWithTimes[];
}

export function WeatherWidget({ data, fetchStatus, blocks }: WeatherWidgetProps) {
  const t = useNamespacedTranslations('weatherWidget');
  const [expanded, setExpanded] = useState(false);

  if (fetchStatus === 'loading') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-xs text-gray-400">
        <div className="w-3.5 h-3.5 border-2 border-amber-300 border-t-amber-500 rounded-full animate-spin" />
        {t('loading')}
      </div>
    );
  }

  if (fetchStatus === 'no-location') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-700">
        <span>📍</span>
        <span>{t('noLocation')}</span>
      </div>
    );
  }

  if (fetchStatus === 'error' || !data) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs text-gray-400">
        <span>⚠️</span>
        <span>{t('error')}</span>
      </div>
    );
  }

  if (!expanded) {
    return <CollapsedPill data={data} onExpand={() => setExpanded(true)} t={t} />;
  }

  const { sunTimes, moonPhase, weather } = data;
  const { dawnMin, riseMin, setMin, duskMin } = sunTimesInMinutes(sunTimes);

  const stageMarkers: StageMarker[] = blocks.flatMap((block) =>
    block.stages.map((s) => ({
      name: s.name,
      startTime: s.calculated_start_time,
    }))
  );

  const moonPhaseName  = t(`moonPhases.${moonPhase.name}`);
  const conditionLabel = t(`conditions.${weather.condition}`);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-base">🌤</span>
          <span className="text-sm font-semibold text-gray-800">{t('title')}</span>
          <span className="text-xs text-gray-400">{data.locationName}</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {t('collapse')}
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Sun timeline */}
        <section>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-sm">☀️</span>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              {t('sunrise')} &amp; {t('sunset')}
            </h3>
            <span className="ml-auto text-xs text-gray-400">
              {dayLengthLabel(sunTimes.dayLengthMinutes, t('hours'), t('minutes'))} {t('dayLength').toLowerCase()}
            </span>
          </div>

          <SunTimeline
            civilTwilightBeginMin={dawnMin}
            civilTwilightEndMin={duskMin}
            sunriseMin={riseMin}
            sunsetMin={setMin}
            stages={stageMarkers}
          />

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: t('civilDawn'), time: sunTimes.civilTwilightBegin, color: 'text-indigo-500' },
              { label: t('sunrise'),   time: sunTimes.sunrise,            color: 'text-amber-500'  },
              { label: t('sunset'),    time: sunTimes.sunset,             color: 'text-orange-500' },
              { label: t('civilDusk'), time: sunTimes.civilTwilightEnd,   color: 'text-violet-500' },
            ].map(({ label, time, color }) => (
              <div key={label} className="bg-gray-50 rounded-xl px-3 py-2">
                <p className={`text-xs font-semibold ${color}`}>{time}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {stageMarkers.length > 0 && (
            <div className="mt-3 space-y-1">
              {stageMarkers.map((stage) => {
                const stageMin = timeToMinutes(stage.startTime);
                const dayPct   = timeToPercent(stageMin, dawnMin, duskMin);
                const zone     = getLightZone(stageMin, dawnMin, riseMin, setMin, duskMin);
                const zoneLabel = t(`lightZones.${zone}`);
                return (
                  <div key={`${stage.name}-${stage.startTime}`} className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                    <span className="font-medium truncate max-w-[140px]">{stage.name}</span>
                    <span className="text-gray-400">{stage.startTime}</span>
                    <span className="ml-auto text-gray-500">{dayPct}% · {zoneLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Moon */}
        <section className="border-t border-gray-50 pt-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{moonPhase.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{moonPhaseName}</p>
              <p className="text-xs text-gray-500">{moonPhase.illumination}% {t('illumination')}</p>
            </div>
            <div className="flex-1 ml-2">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-300 to-amber-300 rounded-full transition-all"
                  style={{ width: `${moonPhase.illumination}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Historical weather */}
        <section className="border-t border-gray-50 pt-4">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-sm">🌡</span>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              {t('historicalWeather')}
            </h3>
            <span className="ml-auto text-[10px] text-gray-400">
              {t('referenceYear', { year: weather.referenceYear })}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-sm font-semibold text-gray-800">{weather.tempMin}–{weather.tempMax}°C</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{t('avgTemp')}</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-sm font-semibold text-gray-800">{weather.precipitationMm} mm</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{t('precipitation')}</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="text-xl">{weather.conditionEmoji}</span>
              <div>
                <p className="text-xs font-semibold text-gray-800 leading-tight">{conditionLabel}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
