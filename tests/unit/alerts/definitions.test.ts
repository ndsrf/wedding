/**
 * Locks in the properties of the "Wedding nightly summary for couples"
 * builtin alert that the rest of the system depends on: it must notify the
 * couple (not the planner), fire on NIGHTLY_SUMMARY, default to EMAIL only,
 * and have every language's subject/body defined.
 */

import { BUILTIN_ALERTS, findDefinition, builtinRuleName } from '@/lib/alerts/definitions';

describe('wedding_nightly_summary builtin alert', () => {
  const def = findDefinition('wedding_nightly_summary');

  it('is registered', () => {
    expect(def).toBeDefined();
  });

  it('fires on the NIGHTLY_SUMMARY event and notifies the couple, not the planner', () => {
    expect(def?.event_type).toBe('NIGHTLY_SUMMARY');
    expect(def?.notifyCouple).toBe(true);
    expect(def?.notifyPlanner).toBeFalsy();
    expect(def?.notifyMasterAdmin).toBeFalsy();
  });

  it('defaults to EMAIL only', () => {
    expect(def?.defaultChannels).toEqual(['EMAIL']);
  });

  it('has no generic cooldown — pacing is a calendar-day gate in nightly-summary.ts instead', () => {
    expect(def?.cooldownMinutes).toBeUndefined();
  });

  it('has subject and body defined for every supported language', () => {
    for (const lang of ['ES', 'EN', 'FR', 'IT', 'DE']) {
      expect(def?.subject[lang]).toBeTruthy();
      expect(def?.body[lang]).toBeTruthy();
    }
  });

  it('produces a stable, prefixed rule name', () => {
    expect(builtinRuleName('wedding_nightly_summary')).toBe('__builtin__wedding_nightly_summary');
  });

  it('is the only definition using the NIGHTLY_SUMMARY event type', () => {
    const matches = BUILTIN_ALERTS.filter((d) => d.event_type === 'NIGHTLY_SUMMARY');
    expect(matches).toHaveLength(1);
  });
});
