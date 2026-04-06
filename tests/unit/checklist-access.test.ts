/**
 * Unit tests for verifyWeddingAccess (src/lib/checklist/access.ts)
 *
 * Covers:
 *   - wedding_admin: access granted only to their own wedding
 *   - wedding_admin: planner_id on the session must NOT affect the lookup (regression)
 *   - planner (main account): access granted to weddings they own
 *   - planner (sub-account): uses planner_id over user.id
 *   - cross-role and negative cases
 */

import { verifyWeddingAccess } from '@/lib/checklist/access';
import { prisma } from '@/lib/db/prisma';

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    weddingAdmin: {
      findFirst: jest.fn(),
    },
    wedding: {
      findFirst: jest.fn(),
    },
  },
}));

const mockWeddingAdmin = prisma.weddingAdmin.findFirst as jest.Mock;
const mockWedding = prisma.wedding.findFirst as jest.Mock;

// Stable IDs used throughout
const WEDDING_ID = '00000000-0000-0000-0000-000000000001';
const OTHER_WEDDING_ID = '00000000-0000-0000-0000-000000000002';

const ADMIN_ID = '00000000-0000-0000-0000-000000000010';
const OTHER_ADMIN_ID = '00000000-0000-0000-0000-000000000011';

const PLANNER_ID = '00000000-0000-0000-0000-000000000020'; // WeddingPlanner row
const SUB_ACCOUNT_ID = '00000000-0000-0000-0000-000000000021'; // PlannerSubAccount row
const OTHER_PLANNER_ID = '00000000-0000-0000-0000-000000000022';

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================================
// wedding_admin
// ============================================================================

describe('verifyWeddingAccess — wedding_admin', () => {
  it('grants access when admin is assigned to the wedding', async () => {
    mockWeddingAdmin.mockResolvedValue({ id: ADMIN_ID, wedding_id: WEDDING_ID });

    const result = await verifyWeddingAccess(
      { id: ADMIN_ID, role: 'wedding_admin' },
      WEDDING_ID
    );

    expect(result).toBe(true);
    expect(mockWeddingAdmin).toHaveBeenCalledWith({
      where: { id: ADMIN_ID, wedding_id: WEDDING_ID },
    });
  });

  it('denies access when admin belongs to a different wedding', async () => {
    mockWeddingAdmin.mockResolvedValue(null);

    const result = await verifyWeddingAccess(
      { id: ADMIN_ID, role: 'wedding_admin' },
      OTHER_WEDDING_ID
    );

    expect(result).toBe(false);
  });

  it('denies access when a different admin ID is used for the wedding', async () => {
    mockWeddingAdmin.mockResolvedValue(null);

    const result = await verifyWeddingAccess(
      { id: OTHER_ADMIN_ID, role: 'wedding_admin' },
      WEDDING_ID
    );

    expect(result).toBe(false);
    expect(mockWedding).not.toHaveBeenCalled();
  });

  it('does not query the wedding table for wedding_admin', async () => {
    mockWeddingAdmin.mockResolvedValue({ id: ADMIN_ID, wedding_id: WEDDING_ID });

    await verifyWeddingAccess({ id: ADMIN_ID, role: 'wedding_admin' }, WEDDING_ID);

    expect(mockWedding).not.toHaveBeenCalled();
  });

  it('uses user.id (not planner_id) when both are present on the session (regression)', async () => {
    // wedding_admin sessions carry planner_id = the wedding's planner ID.
    // The lookup must still use user.id, not planner_id.
    mockWeddingAdmin.mockResolvedValue({ id: ADMIN_ID, wedding_id: WEDDING_ID });

    const result = await verifyWeddingAccess(
      { id: ADMIN_ID, planner_id: PLANNER_ID, role: 'wedding_admin' },
      WEDDING_ID
    );

    expect(result).toBe(true);
    expect(mockWeddingAdmin).toHaveBeenCalledWith({
      where: { id: ADMIN_ID, wedding_id: WEDDING_ID },
    });
  });
});

// ============================================================================
// planner — main account (user.id === user.planner_id)
// ============================================================================

describe('verifyWeddingAccess — planner (main account)', () => {
  it('grants access when the wedding belongs to the planner', async () => {
    mockWedding.mockResolvedValue({ id: WEDDING_ID, planner_id: PLANNER_ID });

    const result = await verifyWeddingAccess(
      { id: PLANNER_ID, planner_id: PLANNER_ID, role: 'planner' },
      WEDDING_ID
    );

    expect(result).toBe(true);
    expect(mockWedding).toHaveBeenCalledWith({
      where: { id: WEDDING_ID, planner_id: PLANNER_ID },
    });
  });

  it('denies access when the wedding belongs to a different planner', async () => {
    mockWedding.mockResolvedValue(null);

    const result = await verifyWeddingAccess(
      { id: OTHER_PLANNER_ID, planner_id: OTHER_PLANNER_ID, role: 'planner' },
      WEDDING_ID
    );

    expect(result).toBe(false);
  });

  it('denies access when the wedding_id does not exist', async () => {
    mockWedding.mockResolvedValue(null);

    const result = await verifyWeddingAccess(
      { id: PLANNER_ID, planner_id: PLANNER_ID, role: 'planner' },
      OTHER_WEDDING_ID
    );

    expect(result).toBe(false);
  });

  it('does not query the weddingAdmin table for planners', async () => {
    mockWedding.mockResolvedValue({ id: WEDDING_ID, planner_id: PLANNER_ID });

    await verifyWeddingAccess(
      { id: PLANNER_ID, planner_id: PLANNER_ID, role: 'planner' },
      WEDDING_ID
    );

    expect(mockWeddingAdmin).not.toHaveBeenCalled();
  });
});

// ============================================================================
// planner — sub-account (user.id = SUB_ACCOUNT_ID, user.planner_id = PLANNER_ID)
// ============================================================================

describe('verifyWeddingAccess — planner (sub-account)', () => {
  it('grants access using parent planner_id, not the sub-account user.id', async () => {
    mockWedding.mockResolvedValue({ id: WEDDING_ID, planner_id: PLANNER_ID });

    const result = await verifyWeddingAccess(
      { id: SUB_ACCOUNT_ID, planner_id: PLANNER_ID, role: 'planner' },
      WEDDING_ID
    );

    expect(result).toBe(true);
    expect(mockWedding).toHaveBeenCalledWith({
      where: { id: WEDDING_ID, planner_id: PLANNER_ID },
    });
  });

  it('denies access when sub-account has no parent planner_id and raw id does not match', async () => {
    // planner_id absent — falls back to user.id (SUB_ACCOUNT_ID), which is not
    // the planner_id on the wedding record.
    mockWedding.mockResolvedValue(null);

    const result = await verifyWeddingAccess(
      { id: SUB_ACCOUNT_ID, role: 'planner' },
      WEDDING_ID
    );

    expect(result).toBe(false);
    expect(mockWedding).toHaveBeenCalledWith({
      where: { id: WEDDING_ID, planner_id: SUB_ACCOUNT_ID },
    });
  });

  it('denies access to a wedding owned by a different planner', async () => {
    mockWedding.mockResolvedValue(null);

    const result = await verifyWeddingAccess(
      { id: SUB_ACCOUNT_ID, planner_id: PLANNER_ID, role: 'planner' },
      OTHER_WEDDING_ID
    );

    expect(result).toBe(false);
  });
});

// ============================================================================
// Unknown / unsupported roles
// ============================================================================

describe('verifyWeddingAccess — unknown role', () => {
  it('denies access for master_admin (not a supported role here)', async () => {
    const result = await verifyWeddingAccess(
      { id: PLANNER_ID, role: 'master_admin' },
      WEDDING_ID
    );

    expect(result).toBe(false);
    expect(mockWeddingAdmin).not.toHaveBeenCalled();
    expect(mockWedding).not.toHaveBeenCalled();
  });

  it('neither queries weddingAdmin nor wedding for unsupported roles', async () => {
    const result = await verifyWeddingAccess(
      { id: PLANNER_ID, role: 'master_admin' },
      OTHER_WEDDING_ID
    );

    expect(result).toBe(false);
    expect(mockWeddingAdmin).not.toHaveBeenCalled();
    expect(mockWedding).not.toHaveBeenCalled();
  });
});
