/**
 * Unit Tests - Moon Phase Calculation
 *
 * Tests the pure-math moon phase functions in src/lib/astro-weather/moon.ts
 */

import {
  getMoonPhase,
  getMoonAge,
  computeIllumination,
  getPhaseName,
  toJulianDate,
  SYNODIC_MONTH,
} from '@/lib/astro-weather/moon';

// ── Julian date ───────────────────────────────────────────────────────────────

describe('toJulianDate', () => {
  it('converts J2000.0 epoch correctly', () => {
    // 1 Jan 2000 12:00 UTC = JD 2451545.0
    const j2000 = new Date('2000-01-01T12:00:00Z');
    expect(toJulianDate(j2000)).toBeCloseTo(2_451_545.0, 1);
  });

  it('converts Unix epoch correctly', () => {
    // 1 Jan 1970 00:00 UTC = JD 2440587.5
    const unixEpoch = new Date(0);
    expect(toJulianDate(unixEpoch)).toBeCloseTo(2_440_587.5, 3);
  });
});

// ── Moon age ──────────────────────────────────────────────────────────────────

describe('getMoonAge', () => {
  it('returns a value in [0, SYNODIC_MONTH)', () => {
    const dates = [
      new Date('2024-01-11'),
      new Date('2024-06-14'),
      new Date('2025-12-31'),
      new Date('2000-01-06T18:14:00Z'), // known new moon reference
    ];
    dates.forEach((d) => {
      const age = getMoonAge(d);
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(SYNODIC_MONTH);
    });
  });

  it('is near 0 on the known reference new moon', () => {
    // 6 Jan 2000 18:14 UTC is the reference new moon used in the algorithm.
    // The simplified Julian Day formula has ~hours of rounding error, so we
    // accept within half a day of the new moon.
    const knownNewMoon = new Date('2000-01-06T18:14:00Z');
    const age = getMoonAge(knownNewMoon);
    expect(Math.min(age, SYNODIC_MONTH - age)).toBeLessThan(0.5);
  });

  it('returns approximately 14.77 days for a known full moon', () => {
    // Full moon on 25 Jan 2024 17:54 UTC
    const fullMoon = new Date('2024-01-25T17:54:00Z');
    const age = getMoonAge(fullMoon);
    expect(age).toBeGreaterThan(13);
    expect(age).toBeLessThan(16);
  });
});

// ── Illumination ──────────────────────────────────────────────────────────────

describe('computeIllumination', () => {
  it('returns 0 at new moon (age 0)', () => {
    expect(computeIllumination(0)).toBe(0);
  });

  it('returns 100 at full moon (age ≈ 14.77)', () => {
    expect(computeIllumination(SYNODIC_MONTH / 2)).toBe(100);
  });

  it('returns ~50 at first quarter (age ≈ 7.38)', () => {
    const illum = computeIllumination(SYNODIC_MONTH / 4);
    expect(illum).toBeGreaterThanOrEqual(48);
    expect(illum).toBeLessThanOrEqual(52);
  });

  it('returns ~50 at last quarter (age ≈ 22.15)', () => {
    const illum = computeIllumination((SYNODIC_MONTH * 3) / 4);
    expect(illum).toBeGreaterThanOrEqual(48);
    expect(illum).toBeLessThanOrEqual(52);
  });

  it('is always in [0, 100]', () => {
    for (let age = 0; age < SYNODIC_MONTH; age += 0.5) {
      const illum = computeIllumination(age);
      expect(illum).toBeGreaterThanOrEqual(0);
      expect(illum).toBeLessThanOrEqual(100);
    }
  });
});

// ── Phase name ────────────────────────────────────────────────────────────────

describe('getPhaseName', () => {
  it('returns newMoon at age 0', () => {
    expect(getPhaseName(0)).toBe('newMoon');
  });

  it('returns fullMoon near age 14.77', () => {
    expect(getPhaseName(SYNODIC_MONTH / 2)).toBe('fullMoon');
  });

  it('returns firstQuarter near age 7.38', () => {
    expect(getPhaseName(SYNODIC_MONTH / 4)).toBe('firstQuarter');
  });

  it('returns lastQuarter near age 22.15', () => {
    expect(getPhaseName((SYNODIC_MONTH * 3) / 4)).toBe('lastQuarter');
  });

  it('returns waxingCrescent between new moon and first quarter', () => {
    expect(getPhaseName(3)).toBe('waxingCrescent');
  });

  it('returns waxingGibbous between first quarter and full moon', () => {
    expect(getPhaseName(11)).toBe('waxingGibbous');
  });

  it('returns waningGibbous between full moon and last quarter', () => {
    expect(getPhaseName(18)).toBe('waningGibbous');
  });

  it('returns waningCrescent between last quarter and new moon', () => {
    expect(getPhaseName(26)).toBe('waningCrescent');
  });
});

// ── getMoonPhase ──────────────────────────────────────────────────────────────

describe('getMoonPhase', () => {
  it('returns correct shape', () => {
    const phase = getMoonPhase(new Date('2024-06-14'));
    expect(phase).toHaveProperty('name');
    expect(phase).toHaveProperty('illumination');
    expect(phase).toHaveProperty('emoji');
    expect(phase).toHaveProperty('ageInDays');
  });

  it('illumination is in [0, 100]', () => {
    const dates = [
      new Date('2024-01-11'),
      new Date('2024-04-23'),
      new Date('2024-06-14'),
      new Date('2024-09-03'),
      new Date('2025-12-25'),
    ];
    dates.forEach((d) => {
      const { illumination } = getMoonPhase(d);
      expect(illumination).toBeGreaterThanOrEqual(0);
      expect(illumination).toBeLessThanOrEqual(100);
    });
  });

  it('ageInDays is in [0, SYNODIC_MONTH)', () => {
    const { ageInDays } = getMoonPhase(new Date('2024-06-14'));
    expect(ageInDays).toBeGreaterThanOrEqual(0);
    expect(ageInDays).toBeLessThan(SYNODIC_MONTH);
  });

  it('emoji is one of the 8 moon emoji', () => {
    const validEmojis = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
    const { emoji } = getMoonPhase(new Date('2024-06-14'));
    expect(validEmojis).toContain(emoji);
  });

  it('detects a known full moon correctly', () => {
    // Full moon on 23 Apr 2024
    const { name, illumination } = getMoonPhase(new Date('2024-04-23T23:49:00Z'));
    expect(name).toBe('fullMoon');
    expect(illumination).toBeGreaterThanOrEqual(95);
  });
});
