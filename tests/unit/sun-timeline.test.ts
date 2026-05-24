/**
 * Unit Tests - Sun Timeline Utilities
 *
 * Tests the time/percentage helpers and getLightZone from sun-utils.
 */

import { timeToMinutes, minutesToHHMM, timeToPercent, getLightZone } from '@/lib/astro-weather/sun-utils';

// ── timeToMinutes ─────────────────────────────────────────────────────────────

describe('timeToMinutes', () => {
  it('converts midnight to 0', () => {
    expect(timeToMinutes('00:00')).toBe(0);
  });

  it('converts noon correctly', () => {
    expect(timeToMinutes('12:00')).toBe(720);
  });

  it('converts 23:59 correctly', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('converts 06:30 correctly', () => {
    expect(timeToMinutes('06:30')).toBe(390);
  });

  it('converts 20:45 correctly', () => {
    expect(timeToMinutes('20:45')).toBe(1245);
  });
});

// ── minutesToHHMM ─────────────────────────────────────────────────────────────

describe('minutesToHHMM', () => {
  it('converts 0 to 00:00', () => {
    expect(minutesToHHMM(0)).toBe('00:00');
  });

  it('converts 720 to 12:00', () => {
    expect(minutesToHHMM(720)).toBe('12:00');
  });

  it('converts 1439 to 23:59', () => {
    expect(minutesToHHMM(1439)).toBe('23:59');
  });

  it('converts 390 to 06:30', () => {
    expect(minutesToHHMM(390)).toBe('06:30');
  });

  it('pads single-digit hours and minutes with zeros', () => {
    expect(minutesToHHMM(65)).toBe('01:05');
  });

  it('wraps around at 1440 (midnight)', () => {
    // 1440 = 24:00, wraps to 00:00
    expect(minutesToHHMM(1440)).toBe('00:00');
  });
});

// ── timeToPercent ──────────────────────────────────────────────────────────────

describe('timeToPercent', () => {
  it('returns 0 at the start of the window', () => {
    expect(timeToPercent(375, 375, 1260)).toBe(0); // 6:15 in [6:15, 21:00]
  });

  it('returns 100 at the end of the window', () => {
    expect(timeToPercent(1260, 375, 1260)).toBe(100); // 21:00
  });

  it('returns 50 at the midpoint', () => {
    const start = 375;   // 6:15
    const end = 1263;    // 21:03  (888 min range)
    const mid = Math.round((start + end) / 2); // 819 = 13:39
    const pct = timeToPercent(mid, start, end);
    expect(pct).toBeGreaterThanOrEqual(49);
    expect(pct).toBeLessThanOrEqual(51);
  });

  it('clamps below 0 to 0', () => {
    expect(timeToPercent(300, 375, 1260)).toBe(0); // 5:00 is before 6:15
  });

  it('clamps above 100 to 100', () => {
    expect(timeToPercent(1400, 375, 1260)).toBe(100); // 23:20 is after 21:00
  });

  it('returns 0 when start equals end (degenerate range)', () => {
    expect(timeToPercent(720, 720, 720)).toBe(0);
  });

  it('correctly positions a stage during golden hour', () => {
    // Day window 6:15 (375) to 21:03 (1263), 888 min total
    // Sunset at 20:03 (1203). Stage at 19:30 (1170)
    // Expected: (1170 - 375) / 888 * 100 ≈ 89.5% → 90
    const pct = timeToPercent(1170, 375, 1263);
    expect(pct).toBeGreaterThanOrEqual(88);
    expect(pct).toBeLessThanOrEqual(92);
  });

  it('produces integer output', () => {
    const pct = timeToPercent(900, 375, 1263);
    expect(Number.isInteger(pct)).toBe(true);
  });
});

// ── getLightZone ──────────────────────────────────────────────────────────────
// Reference window: dawn=375 (6:15), rise=390 (6:30), set=1230 (20:30), dusk=1263 (21:03)

const DAWN = 375;  // 6:15
const RISE = 390;  // 6:30
const SET  = 1230; // 20:30
const DUSK = 1263; // 21:03

describe('getLightZone', () => {
  it('returns night before civil dawn', () => {
    expect(getLightZone(300, DAWN, RISE, SET, DUSK)).toBe('night'); // 5:00
  });

  it('returns night after civil dusk', () => {
    expect(getLightZone(1320, DAWN, RISE, SET, DUSK)).toBe('night'); // 22:00
  });

  it('returns dawn between civil dawn and sunrise', () => {
    expect(getLightZone(380, DAWN, RISE, SET, DUSK)).toBe('dawn'); // 6:20
  });

  it('returns day during full daylight', () => {
    expect(getLightZone(720, DAWN, RISE, SET, DUSK)).toBe('day'); // 12:00
  });

  it('returns goldenHour in the hour before sunset', () => {
    expect(getLightZone(1185, DAWN, RISE, SET, DUSK)).toBe('goldenHour'); // 19:45 (45 min before 20:30)
  });

  it('returns dusk at exact sunset time', () => {
    expect(getLightZone(SET, DAWN, RISE, SET, DUSK)).toBe('dusk');
  });

  it('returns dusk between sunset and civil dusk', () => {
    expect(getLightZone(1245, DAWN, RISE, SET, DUSK)).toBe('dusk'); // 20:45
  });

  it('returns day just after sunrise', () => {
    expect(getLightZone(RISE + 1, DAWN, RISE, SET, DUSK)).toBe('day');
  });
});
