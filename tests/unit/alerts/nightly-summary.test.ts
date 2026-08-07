/**
 * Unit tests for the "Wedding nightly summary for couples" report logic.
 * Covers: skip-when-no-rules, skip-when-no-24h-activity, correct stats/metadata
 * when there is activity (including configurable-question columns/rows),
 * planner-wide vs single-wedding rule scoping, per-wedding error isolation,
 * the manual/test trigger path, and the planner-language subject resolver.
 */

import {
  processNightlySummaries,
  triggerManualNightlySummary,
  resolveNightlySummarySubject,
} from '@/lib/alerts/nightly-summary';
import { prisma } from '@/lib/db/prisma';
import { triggerAlert } from '@/lib/alerts/trigger';

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    alertRule: { findMany: jest.fn(), findFirst: jest.fn() },
    alert: { findFirst: jest.fn() },
    wedding: { findMany: jest.fn(), findUnique: jest.fn() },
    trackingEvent: { findMany: jest.fn() },
    weddingAdmin: { count: jest.fn() },
    family: { findMany: jest.fn() },
    weddingPlanner: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/alerts/trigger', () => ({
  triggerAlert: jest.fn(),
}));

const mockRuleFindMany = prisma.alertRule.findMany as jest.Mock;
const mockRuleFindFirst = prisma.alertRule.findFirst as jest.Mock;
const mockAlertFindFirst = prisma.alert.findFirst as jest.Mock;
const mockWeddingFindMany = prisma.wedding.findMany as jest.Mock;
const mockWeddingFindUnique = prisma.wedding.findUnique as jest.Mock;
const mockEventFindMany = prisma.trackingEvent.findMany as jest.Mock;
const mockAdminCount = prisma.weddingAdmin.count as jest.Mock;
const mockFamilyFindMany = prisma.family.findMany as jest.Mock;
const mockPlannerFindUnique = prisma.weddingPlanner.findUnique as jest.Mock;
const mockTriggerAlert = triggerAlert as jest.Mock;

function makePlannerRule(overrides: Partial<{ id: string; planner_id: string; wedding_id: string | null }> = {}) {
  return {
    id: 'rule1',
    event_type: 'NIGHTLY_SUMMARY',
    enabled: true,
    planner_id: 'planner1',
    wedding_id: null,
    ...overrides,
  };
}

function makeWeddingWithFamilies(overrides: Partial<{
  couple_names: string;
  wedding_date: Date | null;
  planner_id: string;
  logo_url: string | null;
  families: Array<{ members: Array<{ attending: boolean | null }> }>;
}> = {}) {
  return {
    couple_names: 'John & Jane',
    wedding_date: new Date('2026-09-01'),
    planner_id: 'planner1',
    status: 'ACTIVE',
    is_disabled: false,
    planner: { logo_url: overrides.logo_url ?? 'https://cdn.example.com/logo.png' },
    families: overrides.families ?? [
      { members: [{ attending: true }, { attending: true }] }, // fully responded, both attending
      { members: [{ attending: null }] }, // not responded
    ],
    // Question config: all disabled by default — individual tests enable what they need
    dietary_restrictions_enabled: false,
    accessibility_needs_enabled: false,
    transportation_question_enabled: false,
    transportation_question_text: null,
    extra_question_1_enabled: false,
    extra_question_1_text: null,
    extra_question_2_enabled: false,
    extra_question_2_text: null,
    extra_question_3_enabled: false,
    extra_question_3_text: null,
    extra_info_1_enabled: false,
    extra_info_1_label: null,
    extra_info_2_enabled: false,
    extra_info_2_label: null,
    extra_info_3_enabled: false,
    extra_info_3_label: null,
    family_dropdown_question_1_enabled: false,
    family_dropdown_question_1_label: null,
    guest_yn_question_1_enabled: false,
    guest_yn_question_1_text: null,
    guest_yn_question_2_enabled: false,
    guest_yn_question_2_text: null,
    guest_yn_question_3_enabled: false,
    guest_yn_question_3_text: null,
    guest_dropdown_question_1_enabled: false,
    guest_dropdown_question_1_label: null,
    guest_dropdown_question_2_enabled: false,
    guest_dropdown_question_2_label: null,
    guest_dropdown_question_3_enabled: false,
    guest_dropdown_question_3_label: null,
    guest_text_question_1_enabled: false,
    guest_text_question_1_label: null,
    guest_text_question_2_enabled: false,
    guest_text_question_2_label: null,
    guest_text_question_3_enabled: false,
    guest_text_question_3_label: null,
    ...overrides,
  };
}

describe('processNightlySummaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlertFindFirst.mockResolvedValue(null); // default: not already sent today
  });

  it('does nothing when there are no enabled NIGHTLY_SUMMARY rules', async () => {
    mockRuleFindMany.mockResolvedValue([]);

    const result = await processNightlySummaries();

    expect(result).toEqual({ checked: 0, triggered: 0, errors: 0 });
    expect(mockWeddingFindMany).not.toHaveBeenCalled();
    expect(mockTriggerAlert).not.toHaveBeenCalled();
  });

  it('skips a wedding with no RSVP activity in the last 24 hours', async () => {
    mockRuleFindMany.mockResolvedValue([makePlannerRule()]);
    mockWeddingFindMany.mockResolvedValue([{ id: 'wedding1' }]);
    mockEventFindMany.mockResolvedValue([]);

    const result = await processNightlySummaries();

    expect(result).toEqual({ checked: 1, triggered: 0, errors: 0 });
    expect(mockWeddingFindUnique).not.toHaveBeenCalled();
    expect(mockTriggerAlert).not.toHaveBeenCalled();
  });

  it('excludes admin-triggered edits (RSVP_UPDATED audit entries) from the activity check', async () => {
    mockRuleFindMany.mockResolvedValue([makePlannerRule()]);
    mockWeddingFindMany.mockResolvedValue([{ id: 'wedding1' }]);
    mockEventFindMany.mockResolvedValue([]); // the real query filters admin_triggered:false, so it returns none

    await processNightlySummaries();

    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ admin_triggered: false }),
      }),
    );
    expect(mockTriggerAlert).not.toHaveBeenCalled();
  });

  it('triggers the alert with correct stats, columns and rows when there was RSVP activity', async () => {
    mockRuleFindMany.mockResolvedValue([makePlannerRule()]);
    mockWeddingFindMany.mockResolvedValue([{ id: 'wedding1' }]);
    mockEventFindMany.mockResolvedValue([
      { family_id: 'family1', timestamp: new Date('2026-08-06T10:00:00Z') },
    ]);
    mockWeddingFindUnique.mockResolvedValue(makeWeddingWithFamilies({
      dietary_restrictions_enabled: true,
      guest_yn_question_1_enabled: true,
      guest_yn_question_1_text: { en: 'Bringing a plus-one?', es: '¿Traes acompañante?' },
    } as never));
    mockFamilyFindMany.mockResolvedValue([
      {
        id: 'family1',
        name: 'Smith Family',
        transportation_answer: null,
        extra_question_1_answer: null,
        extra_question_2_answer: null,
        extra_question_3_answer: null,
        extra_info_1_value: null,
        extra_info_2_value: null,
        extra_info_3_value: null,
        family_dropdown_question_1_answer: null,
        members: [
          {
            name: 'Alice Smith',
            attending: true,
            dietary_restrictions: 'Vegetarian',
            accessibility_needs: null,
            guest_yn_question_1_answer: true,
            guest_yn_question_2_answer: null,
            guest_yn_question_3_answer: null,
            guest_dropdown_question_1_answer: null,
            guest_dropdown_question_2_answer: null,
            guest_dropdown_question_3_answer: null,
            guest_text_question_1_answer: null,
            guest_text_question_2_answer: null,
            guest_text_question_3_answer: null,
          },
        ],
      },
    ]);

    const result = await processNightlySummaries();

    expect(result).toEqual({ checked: 1, triggered: 1, errors: 0 });
    expect(mockTriggerAlert).toHaveBeenCalledTimes(1);
    const call = mockTriggerAlert.mock.calls[0][0];
    expect(call.event_type).toBe('NIGHTLY_SUMMARY');
    expect(call.wedding_id).toBe('wedding1');
    expect(call.planner_id).toBe('planner1');
    expect(call.skipDispatch).toBe(true);
    expect(call.bypassCooldown).toBe(true); // the "already sent today" check above replaces the generic cooldown
    expect(call.metadata).toMatchObject({
      weddingName: 'John & Jane',
      rsvpSent: 2, // 2 families total
      rsvpReceived: 1, // only the fully-answered family counts
      attendingGuests: 2,
      totalGuests: 3,
      confirmationsCount: 1, // 1 distinct family changed
      plannerLogoUrl: 'https://cdn.example.com/logo.png',
    });

    // Only the two enabled questions become columns, in the expected order
    expect(call.metadata.columns.map((c: { key: string }) => c.key)).toEqual([
      'dietary_restrictions',
      'guest_yn_question_1_answer',
    ]);

    expect(call.metadata.rows).toEqual([
      {
        familyName: 'Smith Family',
        memberName: 'Alice Smith',
        attending: true,
        timestamp: '2026-08-06T10:00:00.000Z',
        values: expect.objectContaining({
          dietary_restrictions: 'Vegetarian',
          guest_yn_question_1_answer: true,
        }),
      },
    ]);
  });

  it('does not re-trigger a wedding that already got its summary today (UTC)', async () => {
    mockRuleFindMany.mockResolvedValue([makePlannerRule()]);
    mockWeddingFindMany.mockResolvedValue([{ id: 'wedding1' }]);
    mockEventFindMany.mockResolvedValue([
      { family_id: 'family1', timestamp: new Date() },
    ]);
    mockWeddingFindUnique.mockResolvedValue(makeWeddingWithFamilies());
    mockFamilyFindMany.mockResolvedValue([
      { id: 'family1', name: 'Smith Family', members: [{ name: 'Alice', attending: true }] },
    ]);
    mockAlertFindFirst.mockResolvedValue({ id: 'already-sent-today' });

    const result = await processNightlySummaries();

    expect(result).toEqual({ checked: 1, triggered: 0, errors: 0 });
    expect(mockTriggerAlert).not.toHaveBeenCalled();
    expect(mockAlertFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ event_type: 'NIGHTLY_SUMMARY', wedding_id: 'wedding1' }),
      }),
    );
  });

  it('deduplicates a family that submitted more than once, keeping the latest timestamp', async () => {
    mockRuleFindMany.mockResolvedValue([makePlannerRule()]);
    mockWeddingFindMany.mockResolvedValue([{ id: 'wedding1' }]);
    mockEventFindMany.mockResolvedValue([
      { family_id: 'family1', timestamp: new Date('2026-08-06T12:00:00Z') }, // latest (events are desc-ordered)
      { family_id: 'family1', timestamp: new Date('2026-08-06T09:00:00Z') },
    ]);
    mockWeddingFindUnique.mockResolvedValue(makeWeddingWithFamilies({ families: [] } as never));
    mockFamilyFindMany.mockResolvedValue([
      { id: 'family1', name: 'Smith Family', members: [{ name: 'Alice', attending: true }] },
    ]);

    await processNightlySummaries();

    expect(mockFamilyFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['family1'] } } }),
    );
    const call = mockTriggerAlert.mock.calls[0][0];
    expect(call.metadata.confirmationsCount).toBe(1);
    expect(call.metadata.rows[0].timestamp).toBe('2026-08-06T12:00:00.000Z');
  });

  it('scopes to a single wedding when the rule has wedding_id set', async () => {
    mockRuleFindMany.mockResolvedValue([makePlannerRule({ wedding_id: 'wedding42' })]);
    mockWeddingFindMany.mockResolvedValue([{ id: 'wedding42' }]);
    mockEventFindMany.mockResolvedValue([]);

    await processNightlySummaries();

    expect(mockWeddingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'wedding42' }),
      }),
    );
  });

  it('processes every wedding for a planner-wide rule and isolates per-wedding errors', async () => {
    mockRuleFindMany.mockResolvedValue([makePlannerRule()]);
    mockWeddingFindMany.mockResolvedValue([{ id: 'wedding1' }, { id: 'wedding2' }]);
    mockEventFindMany
      .mockRejectedValueOnce(new Error('db down')) // wedding1 fails
      .mockResolvedValueOnce([]); // wedding2 has no changes

    const result = await processNightlySummaries();

    expect(result).toEqual({ checked: 2, triggered: 0, errors: 1 });
  });

  it('does not double-process a wedding matched by more than one rule', async () => {
    mockRuleFindMany.mockResolvedValue([makePlannerRule({ id: 'rule1' }), makePlannerRule({ id: 'rule2' })]);
    mockWeddingFindMany.mockResolvedValue([{ id: 'wedding1' }]);
    mockEventFindMany.mockResolvedValue([]);

    const result = await processNightlySummaries();

    expect(result.checked).toBe(1);
    expect(mockEventFindMany).toHaveBeenCalledTimes(1);
  });
});

describe('triggerManualNightlySummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns wedding_not_found when the wedding does not exist', async () => {
    mockEventFindMany.mockResolvedValue([]);
    mockWeddingFindUnique.mockResolvedValue(null);

    const result = await triggerManualNightlySummary('missing');

    expect(result).toEqual({ sent: false, reason: 'wedding_not_found' });
    expect(mockTriggerAlert).not.toHaveBeenCalled();
  });

  it('returns wedding_inactive for an archived wedding, without building the report', async () => {
    mockWeddingFindUnique.mockResolvedValue({ status: 'ARCHIVED', is_disabled: false });

    const result = await triggerManualNightlySummary('wedding1');

    expect(result).toEqual({ sent: false, reason: 'wedding_inactive' });
    expect(mockTriggerAlert).not.toHaveBeenCalled();
    expect(mockEventFindMany).not.toHaveBeenCalled(); // buildNightlySummaryReport never reached
  });

  it('returns wedding_inactive for a disabled (but status ACTIVE) wedding', async () => {
    mockWeddingFindUnique.mockResolvedValue({ status: 'ACTIVE', is_disabled: true });

    const result = await triggerManualNightlySummary('wedding1');

    expect(result).toEqual({ sent: false, reason: 'wedding_inactive' });
    expect(mockTriggerAlert).not.toHaveBeenCalled();
  });

  it('returns alert_not_enabled when no matching enabled rule exists', async () => {
    mockEventFindMany.mockResolvedValue([]);
    mockWeddingFindUnique.mockResolvedValue(makeWeddingWithFamilies());
    mockRuleFindFirst.mockResolvedValue(null);

    const result = await triggerManualNightlySummary('wedding1');

    expect(result).toEqual({ sent: false, reason: 'alert_not_enabled' });
    expect(mockTriggerAlert).not.toHaveBeenCalled();
  });

  it('returns no_recipients when the wedding has no admins', async () => {
    mockEventFindMany.mockResolvedValue([]);
    mockWeddingFindUnique.mockResolvedValue(makeWeddingWithFamilies());
    mockRuleFindFirst.mockResolvedValue({ id: 'rule1' });
    mockAdminCount.mockResolvedValue(0);

    const result = await triggerManualNightlySummary('wedding1');

    expect(result).toEqual({ sent: false, reason: 'no_recipients' });
    expect(mockTriggerAlert).not.toHaveBeenCalled();
  });

  it('sends immediately, bypassing the cooldown, when the alert is enabled with recipients', async () => {
    mockEventFindMany.mockResolvedValue([]); // no real activity — should still send (manual/test mode)
    mockWeddingFindUnique.mockResolvedValue(makeWeddingWithFamilies());
    mockRuleFindFirst.mockResolvedValue({ id: 'rule1' });
    mockAdminCount.mockResolvedValue(2);

    const result = await triggerManualNightlySummary('wedding1');

    expect(result).toEqual({ sent: true });
    expect(mockTriggerAlert).toHaveBeenCalledTimes(1);
    const call = mockTriggerAlert.mock.calls[0][0];
    expect(call.skipDispatch).toBe(false);
    expect(call.bypassCooldown).toBe(true);
    expect(call.metadata.confirmationsCount).toBe(0);
    expect(call.metadata.rows).toEqual([]);
  });
});

describe('resolveNightlySummarySubject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the English fallback when no plannerId is given', async () => {
    const subject = await resolveNightlySummarySubject(null);
    expect(subject).toBe('There was some activity in the last 24 hours...');
    expect(mockPlannerFindUnique).not.toHaveBeenCalled();
  });

  it("resolves the subject in the planner's current preferred language", async () => {
    mockPlannerFindUnique.mockResolvedValue({ preferred_language: 'ES' });

    const subject = await resolveNightlySummarySubject('planner1');

    expect(subject).toBe('Ha habido actividad en las últimas 24 horas...');
    expect(mockPlannerFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'planner1' } }),
    );
  });

  it('falls back to English if the planner has no preferred_language on record', async () => {
    mockPlannerFindUnique.mockResolvedValue(null);

    const subject = await resolveNightlySummarySubject('planner1');

    expect(subject).toBe('There was some activity in the last 24 hours...');
  });
});
