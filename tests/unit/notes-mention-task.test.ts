/**
 * Unit tests for POST /api/notes-mention-task
 *
 * Covers:
 * - Task title is localised to the user's preferred_language
 * - Existing Reminders section is reused
 * - Reminders section is created when it does not exist
 * - Task order is max(existing) + 1
 * - Planner access is checked via planner_id (works for sub-accounts too)
 * - Wedding admin access is checked via wedding_admins relation
 * - 404 when wedding not found / access denied
 * - 400 when request body is invalid
 */

import { NextRequest } from 'next/server';

// ── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@/lib/auth/middleware', () => ({
  requireAnyRole: jest.fn(),
}));

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    wedding: { findFirst: jest.fn() },
    checklistSection: { findFirst: jest.fn(), create: jest.fn() },
    checklistTask: { findFirst: jest.fn(), create: jest.fn() },
  },
}));

import { POST } from '@/app/(public)/api/notes-mention-task/route';
import { requireAnyRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/notes-mention-task', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const BASE_BODY = {
  wedding_id: 'wedding-1',
  mentioned_name: 'Ana',
  context_text: 'met at the venue',
  assigned_to: 'COUPLE',
  due_date: new Date('2026-04-02T00:00:00.000Z').toISOString(),
};

const PLANNER_USER = {
  id: 'user-planner-1',
  role: 'planner',
  planner_id: 'planner-1',
  preferred_language: 'EN',
};

const ADMIN_USER = {
  id: 'admin-1',
  role: 'wedding_admin',
  wedding_id: 'wedding-1',
  preferred_language: 'EN',
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/notes-mention-task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: section already exists, no existing tasks
    (prisma.checklistSection.findFirst as jest.Mock).mockResolvedValue({
      id: 'section-1',
      order: 1,
    });
    (prisma.checklistTask.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.checklistTask.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ id: 'task-new', ...data }),
    );
  });

  // ── Localisation ──────────────────────────────────────────────────────────

  it('localises task title to Spanish when preferred_language is ES', async () => {
    (requireAnyRole as jest.Mock).mockResolvedValue({
      ...PLANNER_USER,
      preferred_language: 'ES',
    });
    (prisma.wedding.findFirst as jest.Mock).mockResolvedValue({
      id: 'wedding-1',
      default_language: 'ES',
    });

    const res = await POST(makeRequest(BASE_BODY));

    expect(res.status).toBe(201);
    expect(prisma.checklistTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Mención en el bloque de notas: @Ana',
        }),
      }),
    );
  });

  it('localises task title to English when preferred_language is EN', async () => {
    (requireAnyRole as jest.Mock).mockResolvedValue(PLANNER_USER);
    (prisma.wedding.findFirst as jest.Mock).mockResolvedValue({
      id: 'wedding-1',
      default_language: 'EN',
    });

    const res = await POST(makeRequest(BASE_BODY));

    expect(res.status).toBe(201);
    expect(prisma.checklistTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Mention in the notes block: @Ana',
        }),
      }),
    );
  });

  it('falls back to English title when preferred_language is unrecognised', async () => {
    (requireAnyRole as jest.Mock).mockResolvedValue({
      ...PLANNER_USER,
      preferred_language: 'XX',
    });
    (prisma.wedding.findFirst as jest.Mock).mockResolvedValue({
      id: 'wedding-1',
      default_language: 'EN',
    });

    const res = await POST(makeRequest(BASE_BODY));

    expect(res.status).toBe(201);
    expect(prisma.checklistTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Mention in the notes block: @Ana',
        }),
      }),
    );
  });

  it('includes context text in the description', async () => {
    (requireAnyRole as jest.Mock).mockResolvedValue(PLANNER_USER);
    (prisma.wedding.findFirst as jest.Mock).mockResolvedValue({
      id: 'wedding-1',
      default_language: 'EN',
    });

    const res = await POST(makeRequest({ ...BASE_BODY, context_text: 'remind about flowers' }));

    expect(res.status).toBe(201);
    const createCall = (prisma.checklistTask.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.description).toContain('remind about flowers');
  });

  it('sets description to null when context_text is empty', async () => {
    (requireAnyRole as jest.Mock).mockResolvedValue(PLANNER_USER);
    (prisma.wedding.findFirst as jest.Mock).mockResolvedValue({
      id: 'wedding-1',
      default_language: 'EN',
    });

    const res = await POST(makeRequest({ ...BASE_BODY, context_text: '' }));

    expect(res.status).toBe(201);
    const createCall = (prisma.checklistTask.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.description).toBeNull();
  });

  // ── Section find-or-create ────────────────────────────────────────────────

  it('reuses an existing Reminders section', async () => {
    (requireAnyRole as jest.Mock).mockResolvedValue(PLANNER_USER);
    (prisma.wedding.findFirst as jest.Mock).mockResolvedValue({
      id: 'wedding-1',
      default_language: 'EN',
    });

    await POST(makeRequest(BASE_BODY));

    expect(prisma.checklistSection.create).not.toHaveBeenCalled();
    const createCall = (prisma.checklistTask.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.section_id).toBe('section-1');
  });

  it('creates the Recordatorios section when it does not exist (ES wedding)', async () => {
    (requireAnyRole as jest.Mock).mockResolvedValue({
      ...PLANNER_USER,
      preferred_language: 'ES',
    });
    (prisma.wedding.findFirst as jest.Mock).mockResolvedValue({
      id: 'wedding-1',
      default_language: 'ES',
    });
    // Section not found
    (prisma.checklistSection.findFirst as jest.Mock)
      .mockResolvedValueOnce(null)   // section lookup
      .mockResolvedValueOnce({ id: 'last-section', order: 5 }); // last section for order
    (prisma.checklistSection.create as jest.Mock).mockResolvedValue({
      id: 'new-section',
      name: 'Recordatorios',
      order: 6,
    });

    await POST(makeRequest(BASE_BODY));

    expect(prisma.checklistSection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Recordatorios',
          wedding_id: 'wedding-1',
          order: 6,
        }),
      }),
    );
  });

  it('assigns order = max_existing_task_order + 1', async () => {
    (requireAnyRole as jest.Mock).mockResolvedValue(PLANNER_USER);
    (prisma.wedding.findFirst as jest.Mock).mockResolvedValue({
      id: 'wedding-1',
      default_language: 'EN',
    });
    (prisma.checklistTask.findFirst as jest.Mock).mockResolvedValue({ order: 7 });

    await POST(makeRequest(BASE_BODY));

    const createCall = (prisma.checklistTask.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.order).toBe(8);
  });

  // ── Access control ────────────────────────────────────────────────────────

  it('queries wedding by planner_id (not user.id) for planner role', async () => {
    (requireAnyRole as jest.Mock).mockResolvedValue({
      ...PLANNER_USER,
      id: 'sub-account-99',       // different from planner_id — simulates a sub-account
      planner_id: 'planner-1',
    });
    (prisma.wedding.findFirst as jest.Mock).mockResolvedValue({
      id: 'wedding-1',
      default_language: 'EN',
    });

    await POST(makeRequest(BASE_BODY));

    expect(prisma.wedding.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ planner_id: 'planner-1' }),
      }),
    );
  });

  it('queries wedding via wedding_admins relation for wedding_admin role', async () => {
    (requireAnyRole as jest.Mock).mockResolvedValue(ADMIN_USER);
    (prisma.wedding.findFirst as jest.Mock).mockResolvedValue({
      id: 'wedding-1',
      default_language: 'EN',
    });

    await POST(makeRequest(BASE_BODY));

    expect(prisma.wedding.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          wedding_admins: { some: { id: 'admin-1' } },
        }),
      }),
    );
  });

  it('returns 404 when wedding is not found or access denied', async () => {
    (requireAnyRole as jest.Mock).mockResolvedValue(PLANNER_USER);
    (prisma.wedding.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await POST(makeRequest(BASE_BODY));

    expect(res.status).toBe(404);
  });

  // ── Input validation ──────────────────────────────────────────────────────

  it('returns 400 when wedding_id is missing', async () => {
    (requireAnyRole as jest.Mock).mockResolvedValue(PLANNER_USER);

    const noId = {
      mentioned_name: BASE_BODY.mentioned_name,
      context_text: BASE_BODY.context_text,
      assigned_to: BASE_BODY.assigned_to,
      due_date: BASE_BODY.due_date,
    };
    const res = await POST(makeRequest(noId));

    expect(res.status).toBe(400);
  });

  it('returns 400 when assigned_to has an invalid value', async () => {
    (requireAnyRole as jest.Mock).mockResolvedValue(PLANNER_USER);

    const res = await POST(makeRequest({ ...BASE_BODY, assigned_to: 'INVALID' }));

    expect(res.status).toBe(400);
  });

  // ── Auth errors ───────────────────────────────────────────────────────────

  it('returns 401 when user is not authenticated', async () => {
    (requireAnyRole as jest.Mock).mockRejectedValue(new Error('UNAUTHORIZED'));

    const res = await POST(makeRequest(BASE_BODY));

    expect(res.status).toBe(401);
  });
});
