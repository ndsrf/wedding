/**
 * Unit tests for the notes-users API routes
 *
 * Covers:
 * - Planner route: returns planner + enabled sub-accounts + wedding admins
 * - Planner route: IDs are prefixed with "planner-" / "admin-"
 * - Planner route: disabled sub-accounts are excluded
 * - Admin route: same user list for wedding_admin role
 * - 404 when wedding not found
 * - 401 / 403 for auth errors
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/auth/middleware', () => ({
  requireRole: jest.fn(),
}));

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    wedding: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

import { GET as plannerGET } from '@/app/(public)/api/planner/weddings/[id]/notes-users/route';
import { GET as adminGET } from '@/app/(public)/api/admin/notes-users/route';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const PLANNER = { id: 'p1', name: 'Main Planner', email: 'planner@test.com' };
const SUB_ACCOUNT = { id: 'sa1', name: 'Sub Planner', email: 'sub@test.com' };
const ADMIN = { id: 'a1', name: 'Wedding Admin', email: 'admin@test.com' };

const WEDDING_DATA = {
  planner: {
    ...PLANNER,
    sub_accounts: [SUB_ACCOUNT],
  },
  wedding_admins: [ADMIN],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function plannerRequest(weddingId = 'w1') {
  return new NextRequest(`http://localhost/api/planner/weddings/${weddingId}/notes-users`);
}

function plannerParams(weddingId = 'w1') {
  return { params: Promise.resolve({ id: weddingId }) };
}

// ── Planner route ─────────────────────────────────────────────────────────────

describe('GET /api/planner/weddings/[id]/notes-users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRole as jest.Mock).mockResolvedValue({
      id: 'p1',
      role: 'planner',
      planner_id: 'p1',
    });
    (prisma.wedding.findFirst as jest.Mock).mockResolvedValue(WEDDING_DATA);
  });

  it('returns success with a data array', async () => {
    const res = await plannerGET(plannerRequest(), plannerParams());
    const body = await res.json() as { success: boolean; data: unknown[] };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('includes the main planner with "planner-" id prefix', async () => {
    const res = await plannerGET(plannerRequest(), plannerParams());
    const { data } = await res.json() as { data: { id: string; role: string }[] };

    const planner = data.find((u) => u.id === 'planner-p1');
    expect(planner).toBeDefined();
    expect(planner?.role).toBe('planner');
  });

  it('includes enabled sub-accounts with "planner-" id prefix', async () => {
    const res = await plannerGET(plannerRequest(), plannerParams());
    const { data } = await res.json() as { data: { id: string; role: string; name: string }[] };

    const sub = data.find((u) => u.id === 'planner-sa1');
    expect(sub).toBeDefined();
    expect(sub?.role).toBe('planner');
    expect(sub?.name).toBe('Sub Planner');
  });

  it('includes wedding admins with "admin-" id prefix', async () => {
    const res = await plannerGET(plannerRequest(), plannerParams());
    const { data } = await res.json() as { data: { id: string; role: string }[] };

    const admin = data.find((u) => u.id === 'admin-a1');
    expect(admin).toBeDefined();
    expect(admin?.role).toBe('admin');
  });

  it('returns 3 users when there is 1 planner + 1 sub-account + 1 admin', async () => {
    const res = await plannerGET(plannerRequest(), plannerParams());
    const { data } = await res.json() as { data: unknown[] };

    expect(data).toHaveLength(3);
  });

  it('excludes sub-accounts — Prisma where filter is passed to query', async () => {
    // The route passes { where: { enabled: true } } to Prisma.
    // We verify that the wedding query contains the enabled filter so disabled
    // sub-accounts are never returned to the client.
    (prisma.wedding.findFirst as jest.Mock).mockResolvedValue({
      planner: { ...PLANNER, sub_accounts: [] }, // disabled sub omitted by DB
      wedding_admins: [ADMIN],
    });

    const res = await plannerGET(plannerRequest(), plannerParams());
    const { data } = await res.json() as { data: unknown[] };

    // Only planner + admin = 2 users
    expect(data).toHaveLength(2);

    expect(prisma.wedding.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          planner: expect.objectContaining({
            select: expect.objectContaining({
              sub_accounts: expect.objectContaining({
                where: { enabled: true },
              }),
            }),
          }),
        }),
      }),
    );
  });

  it('returns 404 when the wedding is not found', async () => {
    (prisma.wedding.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await plannerGET(plannerRequest(), plannerParams());

    expect(res.status).toBe(404);
  });

  it('returns 401 when not authenticated', async () => {
    (requireRole as jest.Mock).mockRejectedValue(new Error('UNAUTHORIZED'));

    const res = await plannerGET(plannerRequest(), plannerParams());

    expect(res.status).toBe(401);
  });
});

// ── Admin route ───────────────────────────────────────────────────────────────

describe('GET /api/admin/notes-users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRole as jest.Mock).mockResolvedValue({
      id: 'a1',
      role: 'wedding_admin',
      wedding_id: 'w1',
    });
    (prisma.wedding.findUnique as jest.Mock).mockResolvedValue(WEDDING_DATA);
  });

  it('returns success with a data array', async () => {
    const res = await adminGET();
    const body = await res.json() as { success: boolean; data: unknown[] };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('returns the same user structure as the planner route', async () => {
    const res = await adminGET();
    const { data } = await res.json() as { data: { id: string; role: string }[] };

    expect(data.find((u) => u.id === 'planner-p1')).toBeDefined();
    expect(data.find((u) => u.id === 'planner-sa1')).toBeDefined();
    expect(data.find((u) => u.id === 'admin-a1')).toBeDefined();
  });

  it('returns 400 when the user has no wedding_id', async () => {
    (requireRole as jest.Mock).mockResolvedValue({
      id: 'a1',
      role: 'wedding_admin',
      wedding_id: undefined,
    });

    const res = await adminGET();

    expect(res.status).toBe(400);
  });

  it('returns 404 when the wedding is not found', async () => {
    (prisma.wedding.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await adminGET();

    expect(res.status).toBe(404);
  });

  it('returns 403 when access is forbidden', async () => {
    (requireRole as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

    const res = await adminGET();

    expect(res.status).toBe(403);
  });
});
