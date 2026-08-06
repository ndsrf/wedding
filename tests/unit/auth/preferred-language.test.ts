/**
 * Unit tests for PATCH /api/auth/preferred-language.
 * Covers: routing the update to the correct table per role (planner vs
 * planner sub-account vs wedding_admin vs master_admin), validation, and
 * auth failure handling.
 */

import { NextRequest } from 'next/server';
import { PATCH } from '@/app/(public)/api/auth/preferred-language/route';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    weddingPlanner: { update: jest.fn() },
    plannerSubAccount: { update: jest.fn() },
    weddingAdmin: { update: jest.fn() },
    masterAdmin: { update: jest.fn() },
  },
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

const mockRequireAuth = requireAuth as jest.Mock;
const mockWeddingPlannerUpdate = prisma.weddingPlanner.update as jest.Mock;
const mockSubAccountUpdate = prisma.plannerSubAccount.update as jest.Mock;
const mockWeddingAdminUpdate = prisma.weddingAdmin.update as jest.Mock;
const mockMasterAdminUpdate = prisma.masterAdmin.update as jest.Mock;

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/preferred-language', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/auth/preferred-language', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates WeddingPlanner for the primary planner account (id === planner_id)', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'planner1', role: 'planner', planner_id: 'planner1' });

    const res = await PATCH(makeRequest({ language: 'ES' }));

    expect(res.status).toBe(200);
    expect(mockWeddingPlannerUpdate).toHaveBeenCalledWith({
      where: { id: 'planner1' },
      data: { preferred_language: 'ES' },
    });
    expect(mockSubAccountUpdate).not.toHaveBeenCalled();
  });

  it('updates PlannerSubAccount for a sub-account login (id !== planner_id)', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'staff1', role: 'planner', planner_id: 'planner1' });

    const res = await PATCH(makeRequest({ language: 'FR' }));

    expect(res.status).toBe(200);
    expect(mockSubAccountUpdate).toHaveBeenCalledWith({
      where: { id: 'staff1' },
      data: { preferred_language: 'FR' },
    });
    expect(mockWeddingPlannerUpdate).not.toHaveBeenCalled();
  });

  it('updates WeddingAdmin for the couple role', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'admin1', role: 'wedding_admin', wedding_id: 'wedding1' });

    const res = await PATCH(makeRequest({ language: 'DE' }));

    expect(res.status).toBe(200);
    expect(mockWeddingAdminUpdate).toHaveBeenCalledWith({
      where: { id: 'admin1' },
      data: { preferred_language: 'DE' },
    });
  });

  it('updates MasterAdmin for the master_admin role', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'master1', role: 'master_admin' });

    const res = await PATCH(makeRequest({ language: 'IT' }));

    expect(res.status).toBe(200);
    expect(mockMasterAdminUpdate).toHaveBeenCalledWith({
      where: { id: 'master1' },
      data: { preferred_language: 'IT' },
    });
  });

  it('rejects an invalid language value', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'planner1', role: 'planner', planner_id: 'planner1' });

    const res = await PATCH(makeRequest({ language: 'XX' }));

    expect(res.status).toBe(400);
    expect(mockWeddingPlannerUpdate).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(new Error('UNAUTHORIZED: Authentication required'));

    const res = await PATCH(makeRequest({ language: 'ES' }));

    expect(res.status).toBe(401);
  });
});
