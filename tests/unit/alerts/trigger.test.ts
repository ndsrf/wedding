/**
 * Unit tests for triggerAlert's cooldown gate, focused on the bypassCooldown
 * flag added for manual/test triggers (e.g. the nightly summary "Send test
 * now" button) — it must skip the recent-alert lookup only when explicitly
 * requested, never by default.
 */

import { triggerAlert } from '@/lib/alerts/trigger';
import { prisma } from '@/lib/db/prisma';
import { resolveRecipients } from '@/lib/alerts/recipients';
import { processPendingDeliveries } from '@/lib/alerts/processor';
import { defer } from '@/lib/cron/defer';

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    wedding: { findUnique: jest.fn() },
    alertRule: { findMany: jest.fn() },
    alert: { findFirst: jest.fn(), create: jest.fn() },
    alertDelivery: { createMany: jest.fn() },
  },
}));

jest.mock('@/lib/alerts/recipients', () => ({
  resolveRecipients: jest.fn(),
}));

jest.mock('@/lib/alerts/processor', () => ({
  processPendingDeliveries: jest.fn(),
}));

jest.mock('@/lib/cron/defer', () => ({
  defer: jest.fn(),
}));

const mockWeddingFindUnique = prisma.wedding.findUnique as jest.Mock;
const mockRuleFindMany = prisma.alertRule.findMany as jest.Mock;
const mockAlertFindFirst = prisma.alert.findFirst as jest.Mock;
const mockAlertCreate = prisma.alert.create as jest.Mock;
const mockDeliveryCreateMany = prisma.alertDelivery.createMany as jest.Mock;
const mockResolveRecipients = resolveRecipients as jest.Mock;

const RULE = {
  id: 'rule1',
  name: 'test-rule',
  cooldown_minutes: 1200,
  channels: ['EMAIL'],
  subject: 'Subject',
  body: 'Body',
};

describe('triggerAlert cooldown handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWeddingFindUnique.mockResolvedValue({ planner_id: 'planner1', couple_names: 'A & B', wedding_date: new Date() });
    mockRuleFindMany.mockResolvedValue([RULE]);
    mockResolveRecipients.mockResolvedValue([
      { type: 'COUPLE', id: 'admin1', name: 'Jane', email: 'jane@example.com', language: 'EN' },
    ]);
    mockAlertCreate.mockResolvedValue({ id: 'alert1' });
  });

  it('skips firing when a recent Alert exists within the cooldown window', async () => {
    mockAlertFindFirst.mockResolvedValue({ id: 'recent-alert' });

    await triggerAlert({ event_type: 'NIGHTLY_SUMMARY', wedding_id: 'wedding1', skipDispatch: true });

    expect(mockAlertCreate).not.toHaveBeenCalled();
    expect(mockDeliveryCreateMany).not.toHaveBeenCalled();
  });

  it('fires normally when no recent Alert exists', async () => {
    mockAlertFindFirst.mockResolvedValue(null);

    await triggerAlert({ event_type: 'NIGHTLY_SUMMARY', wedding_id: 'wedding1', skipDispatch: true });

    expect(mockAlertCreate).toHaveBeenCalledTimes(1);
    expect(mockDeliveryCreateMany).toHaveBeenCalledTimes(1);
  });

  it('bypasses the cooldown lookup entirely when bypassCooldown is true', async () => {
    // Even if a recent Alert exists, it must not block — and the lookup
    // itself should be skipped since bypassCooldown short-circuits it.
    mockAlertFindFirst.mockResolvedValue({ id: 'recent-alert' });

    await triggerAlert({
      event_type: 'NIGHTLY_SUMMARY',
      wedding_id: 'wedding1',
      skipDispatch: true,
      bypassCooldown: true,
    });

    expect(mockAlertFindFirst).not.toHaveBeenCalled();
    expect(mockAlertCreate).toHaveBeenCalledTimes(1);
    expect(mockDeliveryCreateMany).toHaveBeenCalledTimes(1);
  });

  it('still respects skipDispatch=false by deferring the processor', async () => {
    mockAlertFindFirst.mockResolvedValue(null);

    await triggerAlert({ event_type: 'NIGHTLY_SUMMARY', wedding_id: 'wedding1', skipDispatch: false });

    expect(defer).toHaveBeenCalledTimes(1);
    expect(processPendingDeliveries).toHaveBeenCalledWith(20);
  });
});
