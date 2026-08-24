/**
 * Unit tests for the confirm-gated AI tool handlers in src/lib/ai/tool-handlers.ts.
 *
 * update_family_rsvp, assign_family_to_table, and record_invoice_payment write
 * real data (guest RSVP status, seating, and — for record_invoice_payment — a
 * financial transaction), so they never write on their first call: they
 * validate the request and return a { status: 'confirmation_required', ... }
 * preview. Only a second call with confirm: true performs the write. These
 * tests assert that contract, plus the familyId disambiguation path added
 * alongside it.
 */

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    family: { findMany: jest.fn() },
    familyMember: { updateMany: jest.fn() },
    table: { findUnique: jest.fn() },
    invoice: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/invoices/service', () => ({
  recordInvoicePayment: jest.fn(),
}));

import { prisma } from '@/lib/db/prisma';
import { recordInvoicePayment } from '@/lib/invoices/service';
import {
  handleUpdateFamilyRsvp,
  handleAssignFamilyToTable,
  handleRecordInvoicePayment,
  callHandler,
} from '@/lib/ai/tool-handlers';

const mockFamilyFindMany = prisma.family.findMany as jest.Mock;
const mockMemberUpdateMany = prisma.familyMember.updateMany as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockTableFindUnique = prisma.table.findUnique as jest.Mock;
const mockInvoiceFindFirst = prisma.invoice.findFirst as jest.Mock;
const mockRecordInvoicePayment = recordInvoicePayment as jest.Mock;

const WEDDING_ID = 'wedding-1';
const PLANNER_ID = 'planner-1';
const FAMILY_ID = 'family-1';

beforeEach(() => {
  jest.clearAllMocks();
  mockTransaction.mockImplementation((ops: unknown[]) => Promise.all(ops));
});

// ============================================================================
// update_family_rsvp
// ============================================================================

describe('handleUpdateFamilyRsvp', () => {
  const family = {
    id: FAMILY_ID,
    name: 'Smith Family',
    members: [
      { id: 'm1', name: 'John', attending: null },
      { id: 'm2', name: 'Elena', attending: null },
    ],
  };

  it('returns ambiguous with candidate ids when familyName matches multiple families', async () => {
    mockFamilyFindMany.mockResolvedValue([family, { ...family, id: 'family-2', name: 'Smith Cousins' }]);

    const result = await handleUpdateFamilyRsvp(
      { weddingId: WEDDING_ID, role: 'wedding_admin' },
      { familyName: 'smith', attending: true },
    );

    expect(result).toMatchObject({ status: 'ambiguous' });
    expect((result as { families: { id: string }[] }).families.map((f) => f.id)).toEqual([FAMILY_ID, 'family-2']);
    expect(mockMemberUpdateMany).not.toHaveBeenCalled();
  });

  it('disambiguates via familyId, bypassing the fuzzy name search', async () => {
    mockFamilyFindMany.mockResolvedValue([family]);

    await handleUpdateFamilyRsvp(
      { weddingId: WEDDING_ID, role: 'wedding_admin' },
      { familyName: 'smith', familyId: FAMILY_ID, attending: true, confirm: true },
    );

    expect(mockFamilyFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { wedding_id: WEDDING_ID, id: FAMILY_ID } }),
    );
  });

  it('previews without writing when confirm is omitted', async () => {
    mockFamilyFindMany.mockResolvedValue([family]);

    const result = await handleUpdateFamilyRsvp(
      { weddingId: WEDDING_ID, role: 'wedding_admin' },
      { familyName: 'smith', memberUpdates: [{ memberName: 'John', attending: true }] },
    );

    expect(result).toMatchObject({
      status: 'confirmation_required',
      family: 'Smith Family',
      plannedChanges: [{ member: 'John', attending: true }],
    });
    expect(mockMemberUpdateMany).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('writes only when confirm is true', async () => {
    mockFamilyFindMany.mockResolvedValue([family]);

    const result = await handleUpdateFamilyRsvp(
      { weddingId: WEDDING_ID, role: 'wedding_admin' },
      { familyName: 'smith', memberUpdates: [{ memberName: 'John', attending: true }], confirm: true },
    );

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: 'success', updated: [{ member: 'John', attending: true }] });
  });

  it('returns an error, not a false success, when no named members are found and there is no fallback', async () => {
    mockFamilyFindMany.mockResolvedValue([family]);

    const result = await handleUpdateFamilyRsvp(
      { weddingId: WEDDING_ID, role: 'wedding_admin' },
      { familyName: 'smith', memberUpdates: [{ memberName: 'Nonexistent', attending: true }] },
    );

    expect(result).toHaveProperty('error');
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns an error without a wedding in context', async () => {
    const result = await handleUpdateFamilyRsvp({ role: 'wedding_admin' }, { familyName: 'smith', attending: true });
    expect(result).toEqual({ error: 'No wedding context available' });
    expect(mockFamilyFindMany).not.toHaveBeenCalled();
  });
});

// ============================================================================
// assign_family_to_table
// ============================================================================

describe('handleAssignFamilyToTable', () => {
  const family = {
    id: FAMILY_ID,
    name: 'Smith Family',
    members: [
      { id: 'm1', name: 'John', attending: true },
      { id: 'm2', name: 'Elena', attending: true },
    ],
  };

  it('fails without writing when the table lacks capacity', async () => {
    mockFamilyFindMany.mockResolvedValue([family]);
    mockTableFindUnique.mockResolvedValue({ capacity: 1, assigned_guests: [] });

    const result = await handleAssignFamilyToTable(
      { weddingId: WEDDING_ID, role: 'wedding_admin' },
      { familyName: 'smith', tableNumber: 5, confirm: true },
    );

    expect(result).toHaveProperty('error');
    expect(mockMemberUpdateMany).not.toHaveBeenCalled();
  });

  it('previews without writing when confirm is omitted', async () => {
    mockFamilyFindMany.mockResolvedValue([family]);
    mockTableFindUnique.mockResolvedValue({ capacity: 10, assigned_guests: [] });

    const result = await handleAssignFamilyToTable(
      { weddingId: WEDDING_ID, role: 'wedding_admin' },
      { familyName: 'smith', tableNumber: 5 },
    );

    expect(result).toMatchObject({ status: 'confirmation_required', table: 5, plannedAssignedMembers: ['John', 'Elena'] });
    expect(mockMemberUpdateMany).not.toHaveBeenCalled();
  });

  it('writes only when confirm is true', async () => {
    mockFamilyFindMany.mockResolvedValue([family]);
    mockTableFindUnique.mockResolvedValue({ capacity: 10, assigned_guests: [] });

    const result = await handleAssignFamilyToTable(
      { weddingId: WEDDING_ID, role: 'wedding_admin' },
      { familyName: 'smith', tableNumber: 5, confirm: true },
    );

    expect(mockMemberUpdateMany).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: 'success', table: 5 });
  });
});

// ============================================================================
// record_invoice_payment
// ============================================================================

describe('handleRecordInvoicePayment', () => {
  it('rejects a non-positive amount before touching the database', async () => {
    const result = await handleRecordInvoicePayment(
      { plannerId: PLANNER_ID, role: 'planner' },
      { invoiceId: 'inv-1', amount: 0, paymentDate: '2026-01-01' },
    );
    expect(result).toHaveProperty('error');
    expect(mockInvoiceFindFirst).not.toHaveBeenCalled();
  });

  it('previews without writing, reporting the current outstanding balance', async () => {
    mockInvoiceFindFirst.mockResolvedValue({
      invoice_number: 'INV-001',
      currency: 'EUR',
      status: 'ISSUED',
      total: 1000,
      amount_paid: 200,
    });

    const result = await handleRecordInvoicePayment(
      { plannerId: PLANNER_ID, role: 'planner' },
      { invoiceId: 'inv-1', amount: 300, paymentDate: '2026-01-01' },
    );

    expect(result).toMatchObject({
      status: 'confirmation_required',
      invoiceNumber: 'INV-001',
      currentOutstanding: 800,
    });
    expect(mockRecordInvoicePayment).not.toHaveBeenCalled();
  });

  it('refuses to preview or confirm a payment on a cancelled invoice', async () => {
    mockInvoiceFindFirst.mockResolvedValue({
      invoice_number: 'INV-001',
      currency: 'EUR',
      status: 'CANCELLED',
      total: 1000,
      amount_paid: 0,
    });

    const result = await handleRecordInvoicePayment(
      { plannerId: PLANNER_ID, role: 'planner' },
      { invoiceId: 'inv-1', amount: 300, paymentDate: '2026-01-01' },
    );

    expect(result).toEqual({ error: 'Cannot record payment on a cancelled invoice' });
  });

  it('only calls the invoice service when confirm is true', async () => {
    mockRecordInvoicePayment.mockResolvedValue({
      updatedInvoice: { currency: 'EUR', invoice_number: 'INV-001' },
      totalPaid: 500,
      invoiceTotal: 1000,
      newStatus: 'PARTIAL',
    });

    const result = await handleRecordInvoicePayment(
      { plannerId: PLANNER_ID, role: 'planner' },
      { invoiceId: 'inv-1', amount: 300, paymentDate: '2026-01-01', confirm: true },
    );

    expect(mockInvoiceFindFirst).not.toHaveBeenCalled(); // preview lookup is skipped once confirmed
    expect(mockRecordInvoicePayment).toHaveBeenCalledWith(PLANNER_ID, 'inv-1', expect.objectContaining({ amount: 300 }));
    expect(result).toMatchObject({ status: 'success', newInvoiceStatus: 'PARTIAL' });
  });
});

// ============================================================================
// Dispatcher
// ============================================================================

describe('callHandler', () => {
  it('throws for an unknown tool name', async () => {
    await expect(callHandler('not_a_real_tool', { role: 'planner' })).rejects.toThrow('Unknown tool: not_a_real_tool');
  });
});
