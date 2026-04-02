/**
 * Unit tests for verifyWeddingAccess (src/lib/checklist/access.ts)
 *
 * Covers:
 *   - wedding_admin: access granted only to their own wedding
 *   - planner (main account): access granted to weddings they own
 *   - planner (sub-account): same check works via parent planner_id
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

    const result = await verifyWeddingAccess(ADMIN_ID, WEDDING_ID, 'wedding_admin');

    expect(result).toBe(true);
    expect(mockWeddingAdmin).toHaveBeenCalledWith({
      where: { id: ADMIN_ID, wedding_id: WEDDING_ID },
    });
  });

  it('denies access when admin belongs to a different wedding', async () => {
    mockWeddingAdmin.mockResolvedValue(null);

    const result = await verifyWeddingAccess(ADMIN_ID, OTHER_WEDDING_ID, 'wedding_admin');

    expect(result).toBe(false);
  });

  it('denies access when a different admin ID is used for the wedding', async () => {
    mockWeddingAdmin.mockResolvedValue(null);

    const result = await verifyWeddingAccess(OTHER_ADMIN_ID, WEDDING_ID, 'wedding_admin');

    expect(result).toBe(false);
    expect(mockWedding).not.toHaveBeenCalled();
  });

  it('does not query the wedding table for wedding_admin', async () => {
    mockWeddingAdmin.mockResolvedValue({ id: ADMIN_ID, wedding_id: WEDDING_ID });

    await verifyWeddingAccess(ADMIN_ID, WEDDING_ID, 'wedding_admin');

    expect(mockWedding).not.toHaveBeenCalled();
  });
});

// ============================================================================
// planner — main account (user.id === user.planner_id)
// ============================================================================

describe('verifyWeddingAccess — planner (main account)', () => {
  it('grants access when the wedding belongs to the planner', async () => {
    mockWedding.mockResolvedValue({ id: WEDDING_ID, planner_id: PLANNER_ID });

    // Main planners: planner_id ?? id resolves to PLANNER_ID
    const result = await verifyWeddingAccess(PLANNER_ID, WEDDING_ID, 'planner');

    expect(result).toBe(true);
    expect(mockWedding).toHaveBeenCalledWith({
      where: { id: WEDDING_ID, planner_id: PLANNER_ID },
    });
  });

  it('denies access when the wedding belongs to a different planner', async () => {
    mockWedding.mockResolvedValue(null);

    const result = await verifyWeddingAccess(OTHER_PLANNER_ID, WEDDING_ID, 'planner');

    expect(result).toBe(false);
  });

  it('denies access when the wedding_id does not exist', async () => {
    mockWedding.mockResolvedValue(null);

    const result = await verifyWeddingAccess(PLANNER_ID, OTHER_WEDDING_ID, 'planner');

    expect(result).toBe(false);
  });

  it('does not query the weddingAdmin table for planners', async () => {
    mockWedding.mockResolvedValue({ id: WEDDING_ID, planner_id: PLANNER_ID });

    await verifyWeddingAccess(PLANNER_ID, WEDDING_ID, 'planner');

    expect(mockWeddingAdmin).not.toHaveBeenCalled();
  });
});

// ============================================================================
// planner — sub-account (user.id = SUB_ACCOUNT_ID, user.planner_id = PLANNER_ID)
// The caller passes user.planner_id ?? user.id, so the function receives PLANNER_ID.
// ============================================================================

describe('verifyWeddingAccess — planner (sub-account)', () => {
  it('grants access using parent planner ID', async () => {
    mockWedding.mockResolvedValue({ id: WEDDING_ID, planner_id: PLANNER_ID });

    // Simulates: verifyWeddingAccess(user.planner_id ?? user.id, ...)
    // where user.planner_id = PLANNER_ID (parent), user.id = SUB_ACCOUNT_ID
    const result = await verifyWeddingAccess(PLANNER_ID, WEDDING_ID, 'planner');

    expect(result).toBe(true);
    expect(mockWedding).toHaveBeenCalledWith({
      where: { id: WEDDING_ID, planner_id: PLANNER_ID },
    });
  });

  it('denies access when sub-account raw ID is used (regression guard)', async () => {
    // If the sub-account's own ID were passed instead of the parent planner ID,
    // the wedding lookup would return null — access must be denied.
    mockWedding.mockResolvedValue(null);

    const result = await verifyWeddingAccess(SUB_ACCOUNT_ID, WEDDING_ID, 'planner');

    expect(result).toBe(false);
  });

  it('denies access to a wedding owned by a different planner', async () => {
    mockWedding.mockResolvedValue(null);

    const result = await verifyWeddingAccess(PLANNER_ID, OTHER_WEDDING_ID, 'planner');

    expect(result).toBe(false);
  });
});

// ============================================================================
// Unknown / unsupported roles
// ============================================================================

describe('verifyWeddingAccess — unknown role', () => {
  it('denies access for master_admin (not a supported role here)', async () => {
    const result = await verifyWeddingAccess(PLANNER_ID, WEDDING_ID, 'master_admin');

    expect(result).toBe(false);
    expect(mockWeddingAdmin).not.toHaveBeenCalled();
    expect(mockWedding).not.toHaveBeenCalled();
  });

  it('denies access for an empty role string', async () => {
    const result = await verifyWeddingAccess(PLANNER_ID, WEDDING_ID, '');

    expect(result).toBe(false);
  });
});
