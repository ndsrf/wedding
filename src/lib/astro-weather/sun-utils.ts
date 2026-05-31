import type { SunTimes } from '@/types/astro-weather';

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Returns 0–100 representing how far `timeMin` sits between `startMin` and `endMin`.
// Clamped to [0, 100].
export function timeToPercent(timeMin: number, startMin: number, endMin: number): number {
  if (endMin <= startMin) return 0;
  const pct = ((timeMin - startMin) / (endMin - startMin)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export type LightZone = 'night' | 'dawn' | 'day' | 'goldenHour' | 'dusk';

export function getLightZone(
  timeMin: number,
  civilBeginMin: number,
  sunriseMin: number,
  sunsetMin: number,
  civilEndMin: number,
): LightZone {
  if (timeMin < civilBeginMin || timeMin > civilEndMin) return 'night';
  if (timeMin < sunriseMin) return 'dawn';
  if (timeMin >= sunsetMin) return 'dusk';
  if (timeMin >= sunsetMin - 60) return 'goldenHour';
  return 'day';
}

export interface LightZoneStyle {
  emoji: string;
  bg: string;
  text: string;
  label: string; // i18n key suffix: lightZones.<label>
}

export const LIGHT_ZONE_STYLE: Record<LightZone, LightZoneStyle> = {
  night:      { emoji: '🌙', bg: 'bg-slate-100', text: 'text-slate-500', label: 'night'      },
  dawn:       { emoji: '🌄', bg: 'bg-indigo-50', text: 'text-indigo-500', label: 'dawn'      },
  day:        { emoji: '☀️',  bg: 'bg-amber-50',  text: 'text-amber-600',  label: 'day'       },
  goldenHour: { emoji: '🌅', bg: 'bg-orange-50', text: 'text-orange-500', label: 'goldenHour' },
  dusk:       { emoji: '🌆', bg: 'bg-violet-50', text: 'text-violet-500', label: 'dusk'      },
};

// Convenience: compute all sun key-times in minutes from a SunTimes record.
export function sunTimesInMinutes(st: SunTimes) {
  return {
    dawnMin: timeToMinutes(st.civilTwilightBegin),
    riseMin: timeToMinutes(st.sunrise),
    noonMin: timeToMinutes(st.solarNoon),
    setMin:  timeToMinutes(st.sunset),
    duskMin: timeToMinutes(st.civilTwilightEnd),
  };
}

// Light intensity: 0% at dawn/dusk, 100% at solar noon.
// Rises linearly dawn→noon, falls linearly noon→dusk, clamps to 0 outside.
export function lightIntensityPercent(
  timeMin: number,
  dawnMin: number,
  noonMin: number,
  duskMin: number,
): number {
  if (timeMin <= dawnMin || timeMin >= duskMin) return 0;
  if (timeMin <= noonMin) {
    return Math.round(((timeMin - dawnMin) / (noonMin - dawnMin)) * 100);
  }
  return Math.round(((duskMin - timeMin) / (duskMin - noonMin)) * 100);
}
