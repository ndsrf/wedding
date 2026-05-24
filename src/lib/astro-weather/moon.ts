import type { MoonPhase, MoonPhaseName } from '@/types/astro-weather';

export const SYNODIC_MONTH = 29.53058868; // days
// Known new moon: 6 Jan 2000 18:14 UTC  →  Julian Day 2451550.1
const KNOWN_NEW_MOON_JD = 2451550.1;

export function toJulianDate(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

export function getMoonAge(date: Date): number {
  const daysSince = toJulianDate(date) - KNOWN_NEW_MOON_JD;
  const age = daysSince % SYNODIC_MONTH;
  return age < 0 ? age + SYNODIC_MONTH : age;
}

export function computeIllumination(ageInDays: number): number {
  const angle = (2 * Math.PI * ageInDays) / SYNODIC_MONTH;
  return Math.round(((1 - Math.cos(angle)) / 2) * 100);
}

export function getPhaseName(ageInDays: number): MoonPhaseName {
  const p = ageInDays / SYNODIC_MONTH;
  if (p < 0.0625) return 'newMoon';
  if (p < 0.25) return 'waxingCrescent';
  if (p < 0.3125) return 'firstQuarter';
  if (p < 0.5) return 'waxingGibbous';
  if (p < 0.5625) return 'fullMoon';
  if (p < 0.75) return 'waningGibbous';
  if (p < 0.8125) return 'lastQuarter';
  return 'waningCrescent';
}

const PHASE_EMOJIS: Record<MoonPhaseName, string> = {
  newMoon: '🌑',
  waxingCrescent: '🌒',
  firstQuarter: '🌓',
  waxingGibbous: '🌔',
  fullMoon: '🌕',
  waningGibbous: '🌖',
  lastQuarter: '🌗',
  waningCrescent: '🌘',
};

export function getMoonPhase(date: Date): MoonPhase {
  const ageInDays = getMoonAge(date);
  const name = getPhaseName(ageInDays);
  return {
    name,
    illumination: computeIllumination(ageInDays),
    emoji: PHASE_EMOJIS[name],
    ageInDays,
  };
}
