/**
 * Unit tests for the alert delivery dispatcher.
 * Covers: EMAIL routing (NIGHTLY_SUMMARY → rich template vs. everything else →
 * generic dynamic email), SMS/WHATSAPP behavior (regression), the SENDING
 * optimistic-lock guard, and success/failure status transitions.
 */

import { dispatchDelivery } from '@/lib/alerts/dispatch';
import { prisma } from '@/lib/db/prisma';
import { sendDynamicEmail, sendNightlySummaryEmail } from '@/lib/email/resend';
import { sendDynamicMessage } from '@/lib/sms/twilio';
import { resolveNightlySummarySubject } from '@/lib/alerts/nightly-summary';
import type { AlertDelivery } from '@prisma/client';

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    alertDelivery: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/email/resend', () => ({
  sendDynamicEmail: jest.fn(),
  sendNightlySummaryEmail: jest.fn(),
}));

jest.mock('@/lib/sms/twilio', () => ({
  sendDynamicMessage: jest.fn(),
  MessageType: { SMS: 'SMS', WHATSAPP: 'WHATSAPP' },
}));

jest.mock('@/lib/alerts/nightly-summary', () => ({
  resolveNightlySummarySubject: jest.fn(),
}));

const mockUpdateMany = prisma.alertDelivery.updateMany as jest.Mock;
const mockFindUnique = prisma.alertDelivery.findUnique as jest.Mock;
const mockUpdate = prisma.alertDelivery.update as jest.Mock;
const mockSendDynamicEmail = sendDynamicEmail as jest.Mock;
const mockSendNightlySummaryEmail = sendNightlySummaryEmail as jest.Mock;
const mockSendDynamicMessage = sendDynamicMessage as jest.Mock;
const mockResolveNightlySummarySubject = resolveNightlySummarySubject as jest.Mock;

function makeDelivery(overrides: Partial<AlertDelivery> = {}): AlertDelivery {
  return {
    id: 'delivery1',
    alert_id: 'alert1',
    recipient_type: 'COUPLE',
    recipient_id: 'admin1',
    recipient_name: 'Jane',
    recipient_email: 'jane@example.com',
    recipient_phone: null,
    recipient_language: 'EN',
    channel: 'EMAIL',
    subject: 'Subject',
    body: 'Body',
    status: 'PENDING',
    attempts: 0,
    max_attempts: 3,
    next_retry_at: null,
    last_error: null,
    external_id: null,
    sent_at: null,
    delivered_at: null,
    failed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as AlertDelivery;
}

describe('dispatchDelivery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateMany.mockResolvedValue({ count: 1 }); // claims the SENDING lock by default
    mockUpdate.mockResolvedValue({});
    mockResolveNightlySummarySubject.mockResolvedValue('Ha habido actividad en las últimas 24 horas...');
  });

  it('does nothing if the delivery could not be claimed (already SENDING/terminal)', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });

    await dispatchDelivery(makeDelivery());

    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockSendDynamicEmail).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('sends a NIGHTLY_SUMMARY email via the dedicated rich template, with the subject resolved for the planner', async () => {
    mockFindUnique.mockResolvedValue({
      alert: {
        event_type: 'NIGHTLY_SUMMARY',
        planner_id: 'planner1',
        wedding_id: 'wedding1',
        metadata: { weddingName: 'John & Jane', columns: [], rows: [] },
      },
    });
    mockSendNightlySummaryEmail.mockResolvedValue({ success: true, messageId: 'msg1' });

    await dispatchDelivery(makeDelivery());

    // Subject comes from resolveNightlySummarySubject(plannerId), NOT delivery.subject —
    // it must reflect the planner's language regardless of the recipient's.
    expect(mockResolveNightlySummarySubject).toHaveBeenCalledWith('planner1');
    expect(mockSendNightlySummaryEmail).toHaveBeenCalledWith(
      'jane@example.com',
      'Ha habido actividad en las últimas 24 horas...',
      expect.objectContaining({ weddingName: 'John & Jane' }),
      'en',
      'planner1',
      'wedding1',
    );
    expect(mockSendDynamicEmail).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SENT', external_id: 'msg1' }),
      }),
    );
  });

  it('sends other EMAIL events via the generic dynamic email template', async () => {
    mockFindUnique.mockResolvedValue({
      alert: { event_type: 'QUOTE_EXPIRED', planner_id: 'planner1', wedding_id: null, metadata: {} },
    });
    mockSendDynamicEmail.mockResolvedValue({ success: true, messageId: 'msg2' });

    await dispatchDelivery(makeDelivery());

    expect(mockSendDynamicEmail).toHaveBeenCalledWith(
      'jane@example.com',
      'Subject',
      'Body',
      'en',
      expect.any(String),
      null,
      'planner1',
      undefined,
    );
    expect(mockSendNightlySummaryEmail).not.toHaveBeenCalled();
  });

  it('marks the delivery FAILED with a retry time when sending fails and attempts remain', async () => {
    mockFindUnique.mockResolvedValue({
      alert: { event_type: 'QUOTE_EXPIRED', planner_id: 'planner1', wedding_id: null, metadata: {} },
    });
    mockSendDynamicEmail.mockResolvedValue({ success: false, error: 'boom' });

    await dispatchDelivery(makeDelivery({ attempts: 0, max_attempts: 3 }));

    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.data.status).toBe('FAILED');
    expect(updateArgs.data.last_error).toBe('boom');
    expect(updateArgs.data.next_retry_at).toBeInstanceOf(Date);
  });

  it('routes SMS deliveries through sendDynamicMessage untouched', async () => {
    mockFindUnique.mockResolvedValue({
      alert: { event_type: 'QUOTE_EXPIRED', planner_id: 'planner1', wedding_id: null, metadata: {} },
    });
    mockSendDynamicMessage.mockResolvedValue({ success: true, messageId: 'sms1' });

    await dispatchDelivery(makeDelivery({ channel: 'SMS', recipient_phone: '+34600000000' }));

    expect(mockSendDynamicMessage).toHaveBeenCalledWith(
      '+34600000000',
      'Body',
      'SMS',
      undefined,
      'planner1',
      undefined,
    );
    expect(mockSendDynamicEmail).not.toHaveBeenCalled();
  });

  it('fails gracefully when EMAIL delivery has no recipient email', async () => {
    mockFindUnique.mockResolvedValue({
      alert: { event_type: 'NIGHTLY_SUMMARY', planner_id: 'planner1', wedding_id: 'wedding1', metadata: {} },
    });

    await dispatchDelivery(makeDelivery({ recipient_email: null }));

    expect(mockSendNightlySummaryEmail).not.toHaveBeenCalled();
    expect(mockUpdate.mock.calls[0][0].data.last_error).toBe('No email address for recipient');
  });
});
