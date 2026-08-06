/**
 * Unit tests for the "Wedding nightly summary for couples" report logic.
 * Covers: skip-when-no-rules, skip-when-no-24h-activity, correct stats/metadata
 * when there is activity, planner-wide vs single-wedding rule scoping, and
 * per-wedding error isolation.
 */

import { processNightlySummaries } from '@/lib/alerts/nightly-summary';
import { prisma } from '@/lib/db/prisma';
import { triggerAlert } from '@/lib/alerts/trigger';

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    alertRule: { findMany: jest.fn() },
    wedding: { findMany: jest.fn(), findUnique: jest.fn() },
    trackingEvent: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/alerts/trigger', () => ({
  triggerAlert: jest.fn(),
}));

const mockRuleFindMany = prisma.alertRule.findMany as jest.Mock;
const mockWeddingFindMany = prisma.wedding.findMany as jest.Mock;
const mockWeddingFindUnique = prisma.wedding.findUnique as jest.Mock;
const mockEventFindMany = prisma.trackingEvent.findMany as jest.Mock;
const mockTriggerAlert = triggerAlert as jest.Mock;

function makePlannerRule(overrides: Partial<{ planner_id: string; wedding_id: string | null }> = {}) {
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
    planner: { logo_url: overrides.logo_url ?? 'https://cdn.example.com/logo.png' },
    families: overrides.families ?? [
      { members: [{ attending: true }, { attending: true }] }, // fully responded, both attending
      { members: [{ attending: null }] }, // not responded
    ],
    ...overrides,
  };
}

describe('processNightlySummaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('triggers the alert with correct stats when there was RSVP activity', async () => {
    mockRuleFindMany.mockResolvedValue([makePlannerRule()]);
    mockWeddingFindMany.mockResolvedValue([{ id: 'wedding1' }]);
    mockEventFindMany.mockResolvedValue([
      {
        family: { name: 'Smith Family' },
        metadata: { attending_count: 2, total_members: 2 },
        timestamp: new Date('2026-08-06T10:00:00Z'),
        channel: 'EMAIL',
      },
    ]);
    mockWeddingFindUnique.mockResolvedValue(makeWeddingWithFamilies());

    const result = await processNightlySummaries();

    expect(result).toEqual({ checked: 1, triggered: 1, errors: 0 });
    expect(mockTriggerAlert).toHaveBeenCalledTimes(1);
    const call = mockTriggerAlert.mock.calls[0][0];
    expect(call.event_type).toBe('NIGHTLY_SUMMARY');
    expect(call.wedding_id).toBe('wedding1');
    expect(call.planner_id).toBe('planner1');
    expect(call.skipDispatch).toBe(true);
    expect(call.metadata).toMatchObject({
      weddingName: 'John & Jane',
      rsvpSent: 2, // 2 families total
      rsvpReceived: 1, // only the fully-answered family counts
      attendingGuests: 2,
      totalGuests: 3,
      confirmationsCount: 1,
      plannerLogoUrl: 'https://cdn.example.com/logo.png',
    });
    expect(call.metadata.changes).toEqual([
      {
        familyName: 'Smith Family',
        attendingCount: 2,
        totalMembers: 2,
        timestamp: '2026-08-06T10:00:00.000Z',
        channel: 'EMAIL',
      },
    ]);
  });

  it('falls back to null when event metadata is missing expected fields', async () => {
    mockRuleFindMany.mockResolvedValue([makePlannerRule()]);
    mockWeddingFindMany.mockResolvedValue([{ id: 'wedding1' }]);
    mockEventFindMany.mockResolvedValue([
      {
        family: null,
        metadata: {},
        timestamp: new Date('2026-08-06T10:00:00Z'),
        channel: null,
      },
    ]);
    mockWeddingFindUnique.mockResolvedValue(makeWeddingWithFamilies({ families: [] }));

    await processNightlySummaries();

    const call = mockTriggerAlert.mock.calls[0][0];
    expect(call.metadata.changes).toEqual([
      { familyName: '—', attendingCount: null, totalMembers: null, timestamp: '2026-08-06T10:00:00.000Z', channel: null },
    ]);
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
    mockRuleFindMany.mockResolvedValue([makePlannerRule({ id: 'rule1' } as never), makePlannerRule({ id: 'rule2' } as never)]);
    mockWeddingFindMany.mockResolvedValue([{ id: 'wedding1' }]);
    mockEventFindMany.mockResolvedValue([]);

    const result = await processNightlySummaries();

    expect(result.checked).toBe(1);
    expect(mockEventFindMany).toHaveBeenCalledTimes(1);
  });
});
