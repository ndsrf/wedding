/**
 * Shared Guest API Handlers
 *
 * Contains the full business logic for every guest API operation.
 * Route files (admin and planner) are thin auth-and-dispatch wrappers
 * that call these handlers after resolving the wedding ID and verifying
 * role-specific access.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 *
 * Handler signature convention:
 *   - All handlers return a NextResponse (ready to be returned from route)
 *   - weddingId is always the first arg after request-specific params
 *   - actorId (the user performing the action) is passed for audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import type { APIResponse, ListGuestsResponse, UpdateGuestResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import type { Prisma } from '@prisma/client';
import { createFamily, getFamilyWithMembers, updateFamily, deleteFamily } from '@/lib/guests/crud';
import { createFamilySchema, updateFamilySchema } from '@/lib/guests/validation';
import { getCached, setCached, invalidateCache, invalidateCachePattern, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';
import { exportGuestData, exportGuestDataSimplified } from '@/lib/excel/export';
import type { ExportFormat } from '@/lib/excel/export';
import { importGuestList } from '@/lib/excel/import';
import { importVCF } from '@/lib/vcf/import';
import { validateVCF } from '@/lib/vcf/parser';
import { generateTemplate } from '@/lib/excel/templates';
import { getShortUrlPath } from '@/lib/short-url';
import { renderTemplate } from '@/lib/templates';
import { getTemplateForSending } from '@/lib/templates/crud';
import { formatDateByLanguage } from '@/lib/date-formatter';
import type { Language as I18nLanguage } from '@/lib/i18n/config';

// ============================================================================
// SHARED ERROR HANDLER
// ============================================================================

/**
 * Converts caught errors into appropriate NextResponse objects.
 * Handles auth errors (UNAUTHORIZED / FORBIDDEN), Zod validation errors,
 * and unexpected errors.
 */
export function handleGuestApiError(
  error: unknown,
  context: { operation: string },
): NextResponse {
  const msg = error instanceof Error ? error.message : '';

  if (msg.includes('UNAUTHORIZED')) {
    const body: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' },
    };
    return NextResponse.json(body, { status: 401 });
  }

  if (msg.includes('FORBIDDEN')) {
    const body: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Insufficient permissions' },
    };
    return NextResponse.json(body, { status: 403 });
  }

  if (error instanceof z.ZodError) {
    const body: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid request data',
        details: error.issues,
      },
    };
    return NextResponse.json(body, { status: 400 });
  }

  if (msg.toLowerCase().includes('not found')) {
    const body: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Resource not found' },
    };
    return NextResponse.json(body, { status: 404 });
  }

  console.error(`Error in ${context.operation}:`, error);
  const body: APIResponse = {
    success: false,
    error: {
      code: API_ERROR_CODES.INTERNAL_ERROR,
      message: `Failed to ${context.operation}`,
      details: msg || undefined,
    },
  };
  return NextResponse.json(body, { status: 500 });
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const listGuestsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
  ids_only: z.coerce.boolean().default(false),
  rsvp_status: z.enum(['pending', 'submitted']).optional(),
  attendance: z.enum(['yes', 'no', 'partial']).optional(),
  channel: z.enum(['WHATSAPP', 'EMAIL', 'SMS']).optional(),
  payment_status: z.enum(['PENDING', 'RECEIVED', 'CONFIRMED']).optional(),
  invited_by_admin_id: z.string().uuid().optional(),
  label_id: z.string().uuid().optional(),
  label_id_invert: z.coerce.boolean().default(false),
  search: z.string().optional(),
});

const createLabelSchema = z.object({
  name: z.string().min(1, 'Label name is required').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').nullable().optional(),
});

const bulkDeleteSchema = z.object({
  family_ids: z.array(z.string().uuid()).min(1).max(1000),
});

const bulkUpdateSchema = z.object({
  family_ids: z.array(z.string().uuid()).min(1).max(1000),
  updates: z.object({
    preferred_language: z.enum(['ES', 'EN', 'FR', 'IT', 'DE']).optional(),
    channel_preference: z.enum(['WHATSAPP', 'EMAIL', 'SMS']).nullable().optional(),
    invited_by_admin_id: z.string().uuid().nullable().optional(),
    set_all_attending: z.boolean().optional(),
    set_all_not_attending: z.boolean().optional(),
    rsvp_status: z.enum(['pending', 'submitted']).optional(),
    add_label_id: z.string().uuid().optional(),
    remove_label_id: z.string().uuid().optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  ).refine(
    (data) => {
      const attendanceConflict = data.set_all_attending && data.set_all_not_attending;
      const rsvpConflict = data.rsvp_status && (data.set_all_attending || data.set_all_not_attending);
      return !attendanceConflict && !rsvpConflict;
    },
    { message: 'Cannot set conflicting attendance or RSVP statuses' }
  ),
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ============================================================================
// CACHE HELPERS
// ============================================================================

/**
 * Build a deterministic cache-key suffix from filter/pagination params.
 * Sorting entries ensures the same filters always map to the same key.
 */
function buildGuestCacheParamsKey(params: Record<string, string | number | boolean | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('|');
}

/**
 * Invalidate all stats caches that are affected by a guest mutation on weddingId.
 * Resolves the planner_id via the adminWedding cache first (no extra DB round-trip
 * when the cache is warm) and falls back to a lightweight DB lookup.
 */
async function invalidateStatsForWedding(weddingId: string): Promise<void> {
  // Try to get planner_id from the already-cached wedding details
  const cached = await getCached<{ planner_id: string | null }>(CACHE_KEYS.adminWedding(weddingId));
  const plannerId =
    cached?.planner_id ??
    (await prisma.wedding.findUnique({ where: { id: weddingId }, select: { planner_id: true } }))
      ?.planner_id ??
    null;

  await Promise.all([
    invalidateCache(CACHE_KEYS.adminWedding(weddingId)),
    invalidateCache(CACHE_KEYS.adminDashboard(weddingId)),
    invalidateCache(CACHE_KEYS.plannerWeddingDetail(weddingId)),
    invalidateCachePattern(CACHE_KEYS.guestListPattern(weddingId)),
    invalidateCachePattern(CACHE_KEYS.guestIdsPattern(weddingId)),
    ...(plannerId
      ? [
          invalidateCache(CACHE_KEYS.plannerStats(plannerId)),
          invalidateCache(CACHE_KEYS.plannerWeddingsList(plannerId)),
        ]
      : []),
  ]);
}

// ============================================================================
// LIST GUESTS
// ============================================================================

/**
 * GET …/guests  — List families with filters and pagination
 */
export async function listGuestsHandler(
  weddingId: string,
  searchParams: URLSearchParams,
): Promise<NextResponse> {
  try {
    const queryParams = listGuestsQuerySchema.parse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
      ids_only: searchParams.get('ids_only') || false,
      rsvp_status: searchParams.get('rsvp_status') || undefined,
      attendance: searchParams.get('attendance') || undefined,
      channel: searchParams.get('channel') || undefined,
      payment_status: searchParams.get('payment_status') || undefined,
      invited_by_admin_id: searchParams.get('invited_by_admin_id') || undefined,
      label_id: searchParams.get('label_id') || undefined,
      label_id_invert: searchParams.get('label_id_invert') || false,
      search: searchParams.get('search') || undefined,
    });

    const { page, limit, ids_only, rsvp_status, attendance, channel, payment_status, invited_by_admin_id, label_id, label_id_invert, search } = queryParams;

    const whereClause: Prisma.FamilyWhereInput = { wedding_id: weddingId };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (channel) whereClause.channel_preference = channel;
    if (invited_by_admin_id) whereClause.invited_by_admin_id = invited_by_admin_id;
    if (label_id_invert) {
      // Invert: if a label is selected return families that DON'T have it;
      // if no label is selected ("all") invert means families with NO labels.
      whereClause.labels = label_id ? { none: { label_id } } : { none: {} };
    } else if (label_id) {
      whereClause.labels = { some: { label_id } };
    }

    if (rsvp_status === 'submitted') {
      whereClause.members = { some: { attending: { not: null } } };
    } else if (rsvp_status === 'pending') {
      whereClause.members = { every: { attending: null } };
    }

    if (attendance === 'yes') {
      whereClause.members = { some: { attending: true } };
    } else if (attendance === 'no') {
      whereClause.members = { some: { attending: false }, none: { attending: true } };
    } else if (attendance === 'partial') {
      whereClause.AND = [
        { members: { some: { attending: true } } },
        { members: { some: { OR: [{ attending: false }, { attending: null }] } } },
      ];
    }

    if (payment_status) {
      whereClause.gifts = { some: { status: payment_status } };
    }

    // ---- ids_only mode: return just selectable family IDs (no RSVP submitted) ----
    if (ids_only) {
      const filterKey = buildGuestCacheParamsKey({ rsvp_status, attendance, channel, payment_status, invited_by_admin_id, label_id, label_id_invert, search });
      const cacheKey = CACHE_KEYS.guestIds(weddingId, filterKey);

      const cached = await getCached<{ ids: string[]; total: number }>(cacheKey);
      if (cached) {
        return NextResponse.json({ success: true, data: cached }, { status: 200 });
      }

      // Build selectableClause by extending whereClause with the "every member pending" constraint.
      // We can't simply spread whereClause and overwrite `members` — that silently drops any
      // `members` or `AND` already set by rsvp_status / attendance filters. Instead, move
      // those entries into an explicit AND so all active filters still apply. A "submitted"
      // filter combined with "every attending=null" yields 0 results, which is correct.
      const pendingConstraint: Prisma.FamilyWhereInput = { members: { every: { attending: null } } };
      const { members: existingMembers, AND: existingAnd, ...baseClause } = whereClause;
      const andClauses: Prisma.FamilyWhereInput[] = [
        ...(existingAnd
          ? (Array.isArray(existingAnd) ? existingAnd : [existingAnd]) as Prisma.FamilyWhereInput[]
          : []),
        ...(existingMembers ? [{ members: existingMembers }] : []),
        pendingConstraint,
      ];
      const selectableClause: Prisma.FamilyWhereInput = { ...baseClause, AND: andClauses };
      const selectableFamilies = await prisma.family.findMany({
        where: selectableClause,
        select: { id: true },
        orderBy: { name: 'asc' },
      });
      const result = { ids: selectableFamilies.map((f) => f.id), total: selectableFamilies.length };
      await setCached(cacheKey, result, CACHE_TTL.GUEST_IDS);
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    // ---- normal paginated list ----
    const skip = (page - 1) * limit;
    const pageKey = buildGuestCacheParamsKey({ page, limit, rsvp_status, attendance, channel, payment_status, invited_by_admin_id, label_id, label_id_invert, search });
    const cacheKey = CACHE_KEYS.guestList(weddingId, pageKey);

    const cachedList = await getCached<ListGuestsResponse['data']>(cacheKey);
    if (cachedList) {
      const response: ListGuestsResponse = { success: true, data: cachedList };
      return NextResponse.json(response, { status: 200 });
    }

    const [total, families, weddingAdmins] = await Promise.all([
      prisma.family.count({ where: whereClause }),
      prisma.family.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          members: true,
          gifts: { select: { status: true, amount: true } },
          tracking_events: {
            where: { event_type: 'INVITATION_SENT' },
            select: { id: true },
            take: 1,
          },
          labels: {
            include: { label: true },
          },
        },
      }),
      prisma.weddingAdmin.findMany({
        where: { wedding_id: weddingId },
        select: { id: true, name: true, email: true },
      }),
    ]);
    const adminMap = new Map(weddingAdmins.map((a) => [a.id, a]));

    const familiesWithStatus = families.map((family) => {
      const hasRsvp = family.members.some((m) => m.attending !== null);
      const attendingMembers = family.members.filter((m) => m.attending === true);
      const latestGift = family.gifts[0];
      const invitationSent = family.tracking_events.length > 0;
      const invitedByAdmin = family.invited_by_admin_id ? adminMap.get(family.invited_by_admin_id) : null;

      return {
        id: family.id,
        wedding_id: family.wedding_id,
        name: family.name,
        email: family.email,
        phone: family.phone,
        whatsapp_number: family.whatsapp_number,
        magic_token: family.magic_token,
        reference_code: family.reference_code,
        channel_preference: family.channel_preference,
        preferred_language: family.preferred_language,
        invited_by_admin_id: family.invited_by_admin_id,
        invited_by_admin_name: invitedByAdmin ? (invitedByAdmin.name || invitedByAdmin.email) : null,
        private_notes: family.private_notes,
        save_the_date_sent: family.save_the_date_sent,
        created_at: family.created_at,
        transportation_answer: family.transportation_answer,
        extra_question_1_answer: family.extra_question_1_answer,
        extra_question_2_answer: family.extra_question_2_answer,
        extra_question_3_answer: family.extra_question_3_answer,
        extra_info_1_value: family.extra_info_1_value,
        extra_info_2_value: family.extra_info_2_value,
        extra_info_3_value: family.extra_info_3_value,
        members: family.members,
        labels: family.labels.map((la) => la.label),
        rsvp_status: hasRsvp ? 'submitted' : 'pending',
        attending_count: attendingMembers.length,
        total_members: family.members.length,
        payment_status: latestGift?.status || null,
        invitation_sent: invitationSent,
      };
    });

    const listData: ListGuestsResponse['data'] = {
      items: familiesWithStatus,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
    await setCached(cacheKey, listData, CACHE_TTL.GUEST_LIST);

    const response: ListGuestsResponse = { success: true, data: listData };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'fetch guests' });
  }
}

// ============================================================================
// CREATE GUEST
// ============================================================================

/**
 * POST …/guests  — Create a new family with members
 */
export async function createGuestHandler(
  weddingId: string,
  body: unknown,
  actorId: string,
): Promise<NextResponse> {
  try {
    const input = createFamilySchema.parse({ ...(body as object), wedding_id: weddingId });
    const family = await createFamily(input, actorId);
    await invalidateStatsForWedding(weddingId);

    const response: APIResponse = { success: true, data: family };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'create family' });
  }
}

// ============================================================================
// GET SINGLE GUEST
// ============================================================================

/**
 * GET …/guests/:id  — Get family details with all members
 */
export async function getGuestHandler(
  familyId: string,
  weddingId: string,
): Promise<NextResponse> {
  try {
    const family = await getFamilyWithMembers(familyId, weddingId);

    if (!family) {
      const body: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Family not found' },
      };
      return NextResponse.json(body, { status: 404 });
    }

    const response: APIResponse = { success: true, data: family };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'fetch family' });
  }
}

// ============================================================================
// UPDATE GUEST
// ============================================================================

/**
 * PATCH …/guests/:id  — Update family and members
 */
export async function updateGuestHandler(
  familyId: string,
  weddingId: string,
  body: unknown,
  actorId: string,
): Promise<NextResponse> {
  try {
    const validatedData = updateFamilySchema.parse(body);
    const family = await updateFamily(familyId, weddingId, validatedData, actorId);
    await invalidateStatsForWedding(weddingId);

    const response: UpdateGuestResponse = { success: true, data: family };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'update family' });
  }
}

// ============================================================================
// DELETE GUEST
// ============================================================================

/**
 * DELETE …/guests/:id  — Delete family and all related data
 */
export async function deleteGuestHandler(
  familyId: string,
  weddingId: string,
  actorId: string,
): Promise<NextResponse> {
  try {
    const result = await deleteFamily(familyId, weddingId, actorId);
    await invalidateStatsForWedding(weddingId);

    const response: APIResponse = { success: true, data: result };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'delete family' });
  }
}

// ============================================================================
// BULK DELETE
// ============================================================================

/**
 * DELETE …/guests/bulk-delete  — Delete multiple families at once
 */
export async function bulkDeleteGuestsHandler(
  weddingId: string,
  body: unknown,
): Promise<NextResponse> {
  try {
    const { family_ids } = bulkDeleteSchema.parse(body);

    // Verify all families belong to the wedding
    const families = await prisma.family.findMany({
      where: { id: { in: family_ids }, wedding_id: weddingId },
      select: { id: true },
    });

    if (families.length !== family_ids.length) {
      const res: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'One or more families do not belong to this wedding',
        },
      };
      return NextResponse.json(res, { status: 403 });
    }

    const count = await prisma.$transaction(async (tx) => {
      await tx.familyMember.deleteMany({ where: { family_id: { in: family_ids } } });
      return (await tx.family.deleteMany({ where: { id: { in: family_ids } } })).count;
    });

    await invalidateStatsForWedding(weddingId);
    const response: APIResponse = { success: true, data: { deleted_count: count } };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'bulk delete families' });
  }
}

// ============================================================================
// BULK UPDATE
// ============================================================================

/**
 * PATCH …/guests/bulk-update  — Update properties on multiple families
 */
export async function bulkUpdateGuestsHandler(
  weddingId: string,
  body: unknown,
): Promise<NextResponse> {
  try {
    const { family_ids, updates } = bulkUpdateSchema.parse(body);

    // Verify all families belong to the wedding
    const families = await prisma.family.findMany({
      where: { id: { in: family_ids }, wedding_id: weddingId },
      select: { id: true },
    });

    if (families.length !== family_ids.length) {
      const res: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'One or more families do not belong to this wedding',
        },
      };
      return NextResponse.json(res, { status: 403 });
    }

    // Verify invited_by_admin_id exists if provided
    if (updates.invited_by_admin_id !== undefined && updates.invited_by_admin_id !== null) {
      const admin = await prisma.weddingAdmin.findFirst({
        where: { id: updates.invited_by_admin_id, wedding_id: weddingId },
      });
      if (!admin) {
        const res: APIResponse = {
          success: false,
          error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Admin not found' },
        };
        return NextResponse.json(res, { status: 404 });
      }
    }

    // Verify label IDs belong to this wedding if provided
    for (const labelId of [updates.add_label_id, updates.remove_label_id].filter(Boolean) as string[]) {
      const label = await prisma.guestLabel.findFirst({ where: { id: labelId, wedding_id: weddingId } });
      if (!label) {
        const res: APIResponse = {
          success: false,
          error: { code: API_ERROR_CODES.NOT_FOUND, message: `Label ${labelId} not found` },
        };
        return NextResponse.json(res, { status: 404 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      let updatedFamilies = 0;
      let updatedMembers = 0;

      const familyUpdateData: Record<string, unknown> = {};
      if (updates.preferred_language !== undefined) familyUpdateData.preferred_language = updates.preferred_language;
      if (updates.channel_preference !== undefined) familyUpdateData.channel_preference = updates.channel_preference;
      if (updates.invited_by_admin_id !== undefined) familyUpdateData.invited_by_admin_id = updates.invited_by_admin_id;

      if (Object.keys(familyUpdateData).length > 0) {
        updatedFamilies = (await tx.family.updateMany({ where: { id: { in: family_ids } }, data: familyUpdateData })).count;
      } else {
        updatedFamilies = family_ids.length;
      }

      if (updates.rsvp_status === 'pending') {
        updatedMembers = (await tx.familyMember.updateMany({
          where: { family_id: { in: family_ids } },
          data: { attending: null },
        })).count;
      } else if (updates.rsvp_status === 'submitted') {
        updatedMembers = (await tx.familyMember.updateMany({
          where: { family_id: { in: family_ids }, attending: null },
          data: { attending: true },
        })).count;
      } else if (updates.set_all_attending !== undefined || updates.set_all_not_attending !== undefined) {
        updatedMembers = (await tx.familyMember.updateMany({
          where: { family_id: { in: family_ids } },
          data: { attending: updates.set_all_attending ? true : updates.set_all_not_attending ? false : null },
        })).count;
      }

      // Add label: insert only for families that don't already have it
      if (updates.add_label_id) {
        const existing = await tx.familyLabelAssignment.findMany({
          where: { label_id: updates.add_label_id, family_id: { in: family_ids } },
          select: { family_id: true },
        });
        const alreadyHave = new Set(existing.map((e) => e.family_id));
        const toAdd = family_ids.filter((id) => !alreadyHave.has(id));
        if (toAdd.length > 0) {
          await tx.familyLabelAssignment.createMany({
            data: toAdd.map((family_id) => ({ family_id, label_id: updates.add_label_id! })),
          });
        }
      }

      // Remove label: delete assignments that exist
      if (updates.remove_label_id) {
        await tx.familyLabelAssignment.deleteMany({
          where: { label_id: updates.remove_label_id, family_id: { in: family_ids } },
        });
      }

      return { updatedFamilies, updatedMembers };
    });

    await invalidateStatsForWedding(weddingId);
    const response: APIResponse = {
      success: true,
      data: { updated_families: result.updatedFamilies, updated_members: result.updatedMembers },
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'bulk update families' });
  }
}

// ============================================================================
// EXPORT
// ============================================================================

/**
 * GET …/guests/export  — Export guest list as Excel/CSV
 */
export async function exportGuestsHandler(
  weddingId: string,
  searchParams: URLSearchParams,
): Promise<NextResponse> {
  try {
    const format = (searchParams.get('format') || 'xlsx') as ExportFormat;
    const simplified = searchParams.get('simplified') === 'true';

    if (!['xlsx', 'csv'].includes(format)) {
      const body: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Invalid format. Must be xlsx or csv' },
      };
      return NextResponse.json(body, { status: 400 });
    }

    const result = simplified
      ? await exportGuestDataSimplified(weddingId)
      : await exportGuestData(weddingId, { format });

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.buffer.length.toString(),
      },
    });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'export guest list' });
  }
}

// ============================================================================
// IMPORT (Excel)
// ============================================================================

/**
 * POST …/guests/import  — Import guests from Excel file
 */
export async function importGuestsHandler(
  weddingId: string,
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      const body: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'No file provided' },
      };
      return NextResponse.json(body, { status: 400 });
    }

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type)) {
      const body: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Invalid file type. Please upload an Excel file (.xlsx)' },
      };
      return NextResponse.json(body, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      const body: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
      };
      return NextResponse.json(body, { status: 400 });
    }

    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { id: true, payment_tracking_mode: true, default_language: true, wedding_country: true },
    });

    if (!wedding) {
      const body: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Wedding not found' },
      };
      return NextResponse.json(body, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importGuestList(
      wedding.id,
      buffer,
      wedding.payment_tracking_mode,
      wedding.default_language,
      wedding.wedding_country,
    );

    if (!result.success) {
      const body: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: result.message,
          details: { errors: result.errors, warnings: result.warnings },
        },
      };
      return NextResponse.json(body, { status: 400 });
    }

    await invalidateStatsForWedding(weddingId);
    const response: APIResponse = {
      success: true,
      data: {
        familiesCreated: result.familiesCreated,
        membersCreated: result.membersCreated,
        warnings: result.warnings,
        message: result.message,
      },
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'import guest list' });
  }
}

// ============================================================================
// IMPORT VCF
// ============================================================================

/**
 * POST …/guests/import-vcf  — Import guests from VCF contact file
 */
export async function importVcfGuestsHandler(
  weddingId: string,
  request: NextRequest,
  actorId: string,
  actorName: string,
): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      const body: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'No file provided' },
      };
      return NextResponse.json(body, { status: 400 });
    }

    const validTypes = ['text/vcard', 'text/x-vcard', 'text/plain', 'text/directory'];
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.vcf')) {
      const body: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Invalid file type. Please upload a VCF file (.vcf)' },
      };
      return NextResponse.json(body, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      const body: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
      };
      return NextResponse.json(body, { status: 400 });
    }

    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { id: true, default_language: true, wedding_country: true },
    });

    if (!wedding) {
      const body: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Wedding not found' },
      };
      return NextResponse.json(body, { status: 404 });
    }

    const vcfContent = await file.text();
    const validationError = validateVCF(vcfContent);
    if (validationError) {
      const body: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: validationError },
      };
      return NextResponse.json(body, { status: 400 });
    }

    const result = await importVCF(vcfContent, {
      weddingId: wedding.id,
      adminId: actorId,
      adminName: actorName,
      defaultLanguage: wedding.default_language,
      weddingCountry: wedding.wedding_country,
    });

    if (!result.success) {
      const body: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: result.message,
          details: { errors: result.errors },
        },
      };
      return NextResponse.json(body, { status: 400 });
    }

    await invalidateStatsForWedding(weddingId);
    const response: APIResponse = {
      success: true,
      data: {
        familiesCreated: result.familiesCreated,
        membersCreated: result.membersCreated,
        errors: result.errors,
        message: result.message,
      },
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'import VCF file' });
  }
}

// ============================================================================
// TEMPLATE
// ============================================================================

/**
 * GET …/guests/template  — Download Excel import template
 */
export async function getGuestTemplateHandler(
  weddingId: string,
  searchParams: URLSearchParams,
): Promise<NextResponse> {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { default_language: true },
    });

    if (!wedding) {
      const body: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Wedding not found' },
      };
      return NextResponse.json(body, { status: 404 });
    }

    const includeExamples = searchParams.get('includeExamples') !== 'false';
    const result = generateTemplate({ language: wedding.default_language, includeExamples });

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.buffer.length.toString(),
      },
    });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'generate template' });
  }
}

// ============================================================================
// TIMELINE
// ============================================================================

/**
 * GET …/guests/:id/timeline  — Get tracking events for a family
 */
export async function getGuestTimelineHandler(
  familyId: string,
  weddingId: string,
): Promise<NextResponse> {
  try {
    const family = await prisma.family.findFirst({
      where: { id: familyId, wedding_id: weddingId },
      select: { id: true, name: true, created_at: true },
    });

    if (!family) {
      const body: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Family not found' },
      };
      return NextResponse.json(body, { status: 404 });
    }

    const events = await prisma.trackingEvent.findMany({
      where: { family_id: familyId, wedding_id: weddingId },
      orderBy: { timestamp: 'desc' },
      select: {
        id: true, family_id: true, event_type: true, channel: true,
        metadata: true, admin_triggered: true, timestamp: true,
      },
    });

    // Resolve admin names from metadata
    const adminIds = new Set<string>();
    for (const event of events) {
      if (event.metadata && typeof event.metadata === 'object' && 'admin_id' in event.metadata) {
        const adminId = event.metadata.admin_id;
        if (typeof adminId === 'string') adminIds.add(adminId);
      }
    }

    const userMap = new Map<string, { name: string; email: string }>();
    if (adminIds.size > 0) {
      const adminIdsArray = Array.from(adminIds);
      const weddingAdmins = await prisma.weddingAdmin.findMany({
        where: { id: { in: adminIdsArray } },
        select: { id: true, name: true, email: true },
      });
      for (const admin of weddingAdmins) {
        userMap.set(admin.id, { name: admin.name, email: admin.email });
      }

      const remainingIds = adminIdsArray.filter(id => !userMap.has(id));
      if (remainingIds.length > 0) {
        const planners = await prisma.weddingPlanner.findMany({
          where: { id: { in: remainingIds } },
          select: { id: true, name: true, email: true },
        });
        for (const planner of planners) {
          userMap.set(planner.id, { name: planner.name, email: planner.email });
        }
      }
    }

    type TrackingEventRow = {
      id: string;
      family_id: string;
      event_type: string;
      channel: string | null;
      metadata: unknown;
      admin_triggered: boolean;
      timestamp: Date;
    };

    const eventsWithFamily = events.map((event: TrackingEventRow) => {
      let triggeredByUser = null;
      if (event.metadata && typeof event.metadata === 'object' && 'admin_id' in event.metadata) {
        const adminId = event.metadata.admin_id;
        if (typeof adminId === 'string' && userMap.has(adminId)) {
          triggeredByUser = userMap.get(adminId);
        }
      }
      return { ...event, family_name: family.name, triggered_by_user: triggeredByUser };
    });

    eventsWithFamily.push({
      id: `created-${family.id}`,
      family_id: family.id,
      event_type: 'GUEST_CREATED',
      channel: null,
      metadata: null,
      admin_triggered: true,
      timestamp: family.created_at,
      family_name: family.name,
      triggered_by_user: null,
    });

    const response: APIResponse = {
      success: true,
      data: { events: eventsWithFamily, family: { id: family.id, name: family.name } },
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'fetch timeline' });
  }
}

// ============================================================================
// INVITATION LINK
// ============================================================================

/**
 * GET …/guests/:id/inv-link  — Get the short invitation URL for a family
 */
export async function getGuestInvLinkHandler(
  familyId: string,
  weddingId: string,
): Promise<NextResponse> {
  try {
    const family = await prisma.family.findUnique({
      where: { id: familyId },
      select: { wedding_id: true },
    });

    if (!family || family.wedding_id !== weddingId) {
      const body: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Guest not found' },
      };
      return NextResponse.json(body, { status: 404 });
    }

    const path = await getShortUrlPath(familyId);
    const response: APIResponse = { success: true, data: { path } };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'fetch invitation link' });
  }
}

// ============================================================================
// WHATSAPP MESSAGE TEXT
// ============================================================================

const WHATSAPP_FALLBACK_MESSAGES: Record<string, {
  greeting: (familyName: string) => string;
  body: (coupleNames: string, weddingDate: string, cutoffDate: string) => string;
  cta: string;
}> = {
  es: {
    greeting: (n) => `Hola, Familia ${n}!`,
    body: (c, d, f) => `Te recordamos que aún no hemos recibido tu confirmación de asistencia para la boda de ${c} el ${d}. Por favor, confirma antes del ${f}.`,
    cta: 'Confirmar asistencia',
  },
  en: {
    greeting: (n) => `Hello, ${n} Family!`,
    body: (c, d, f) => `This is a friendly reminder that we haven't received your RSVP for ${c}'s wedding on ${d}. Please confirm by ${f}.`,
    cta: 'Confirm attendance',
  },
  fr: {
    greeting: (n) => `Bonjour, Famille ${n}!`,
    body: (c, d, f) => `Nous vous rappelons que nous n'avons pas encore reçu votre confirmation de présence pour le mariage de ${c} le ${d}. Merci de confirmer avant le ${f}.`,
    cta: 'Confirmer la présence',
  },
  it: {
    greeting: (n) => `Ciao, Famiglia ${n}!`,
    body: (c, d, f) => `Ti ricordiamo che non abbiamo ancora ricevuto la tua conferma di partecipazione al matrimonio di ${c} il ${d}. Per favore, conferma entro il ${f}.`,
    cta: 'Conferma partecipazione',
  },
  de: {
    greeting: (n) => `Hallo, Familie ${n}!`,
    body: (c, d, f) => `Wir möchten Sie daran erinnern, dass wir noch keine Rückmeldung zu Ihrer Teilnahme an der Hochzeit von ${c} am ${d} erhalten haben. Bitte bestätigen Sie bis zum ${f}.`,
    cta: 'Teilnahme bestätigen',
  },
};

/**
 * GET …/guests/:id/whatsapp-text  — Get the WhatsApp message text for a family.
 * Returns the text that mirrors what the visible action button would send:
 *   - SAVE_THE_DATE  if save-the-date is enabled and not yet sent and no invitation sent
 *   - CONFIRMATION   if RSVP already submitted
 *   - INVITATION     if no invitation has been sent yet
 *   - REMINDER       if invitation already sent and RSVP pending
 */
export async function getGuestWhatsAppTextHandler(
  familyId: string,
  weddingId: string,
): Promise<NextResponse> {
  try {
    const family = await prisma.family.findUnique({
      where: { id: familyId },
      select: {
        id: true,
        wedding_id: true,
        name: true,
        preferred_language: true,
        reference_code: true,
        save_the_date_sent: true,
        members: { select: { attending: true } },
        // Only look for INVITATION_SENT — REMINDER_SENT can only exist after it,
        // so a single take:1 on this event type is both deterministic and sufficient.
        tracking_events: {
          where: { event_type: 'INVITATION_SENT' },
          select: { id: true },
          take: 1,
        },
        wedding: {
          select: {
            couple_names: true,
            wedding_date: true,
            wedding_time: true,
            location: true,
            rsvp_cutoff_date: true,
            save_the_date_enabled: true,
          },
        },
      },
    });

    if (!family || family.wedding_id !== weddingId) {
      const body: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Guest not found' },
      };
      return NextResponse.json(body, { status: 404 });
    }

    // Mirror the same state flags used by the GuestTable button visibility.
    // REMINDER_SENT can only be created after INVITATION_SENT, so checking
    // INVITATION_SENT is sufficient for both the save-the-date guard (anySent)
    // and the invitation-vs-reminder distinction (invitationSent).
    const invitationSent = family.tracking_events.length > 0;
    const hasRsvp = family.members.some(m => m.attending !== null);
    const wedding = family.wedding!;

    // Determine template type with the same priority as button visibility
    let templateType: 'SAVE_THE_DATE' | 'INVITATION' | 'REMINDER' | 'CONFIRMATION';
    if (wedding.save_the_date_enabled && !family.save_the_date_sent && !invitationSent) {
      templateType = 'SAVE_THE_DATE';
    } else if (hasRsvp) {
      templateType = 'CONFIRMATION';
    } else if (!invitationSent) {
      templateType = 'INVITATION';
    } else {
      templateType = 'REMINDER';
    }

    const language = family.preferred_language;
    const languageLower = language.toLowerCase() as I18nLanguage;
    const weddingDate = formatDateByLanguage(wedding.wedding_date, languageLower);
    const cutoffDate = formatDateByLanguage(wedding.rsvp_cutoff_date, languageLower);
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const shortPath = await getShortUrlPath(familyId);
    const magicLink = `${baseUrl}${shortPath}`;

    const variables = {
      familyName: family.name,
      coupleNames: wedding.couple_names,
      weddingDate,
      weddingTime: wedding.wedding_time || '',
      location: wedding.location || '',
      magicLink,
      rsvpCutoffDate: cutoffDate,
      ...(family.reference_code && { referenceCode: family.reference_code }),
    };

    const specificTemplate = await getTemplateForSending(weddingId, templateType, language, 'WHATSAPP');

    // For CONFIRMATION, only use the specific template — a reminder asking the guest
    // to RSVP would be wrong once they have already confirmed.
    if (!specificTemplate && templateType === 'CONFIRMATION') {
      const body: APIResponse = { success: false, error: { code: API_ERROR_CODES.NOT_FOUND, message: 'No confirmation template configured' } };
      return NextResponse.json(body, { status: 404 });
    }

    // For other types fall back to the REMINDER template, then to hardcoded text.
    const template = specificTemplate ??
      (templateType !== 'REMINDER' ? await getTemplateForSending(weddingId, 'REMINDER', language, 'WHATSAPP') : null);

    let text: string;
    if (template) {
      text = renderTemplate(template.body, variables);
    } else {
      const messages = WHATSAPP_FALLBACK_MESSAGES[languageLower] ?? WHATSAPP_FALLBACK_MESSAGES['es'];
      text = `${messages.greeting(family.name)}\n\n${messages.body(wedding.couple_names, weddingDate, cutoffDate)}\n\n${messages.cta}: ${magicLink}`;
    }

    const response: APIResponse = { success: true, data: { text } };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'fetch whatsapp text' });
  }
}

// ============================================================================
// GUEST LABELS
// ============================================================================

/**
 * GET …/guests/labels  — List all labels for a wedding
 */
export async function listLabelsHandler(weddingId: string): Promise<NextResponse> {
  try {
    const labels = await prisma.guestLabel.findMany({
      where: { wedding_id: weddingId },
      orderBy: { name: 'asc' },
    });
    const response: APIResponse = { success: true, data: labels };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'list labels' });
  }
}

/**
 * POST …/guests/labels  — Create a new label for a wedding
 */
export async function createLabelHandler(weddingId: string, body: unknown): Promise<NextResponse> {
  try {
    const { name, color } = createLabelSchema.parse(body);
    const label = await prisma.guestLabel.create({
      data: { wedding_id: weddingId, name, color: color ?? null },
    });
    await invalidateStatsForWedding(weddingId);
    const response: APIResponse = { success: true, data: label };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'create label' });
  }
}

/**
 * PATCH …/guests/labels/:id  — Update a label
 */
export async function updateLabelHandler(
  labelId: string,
  weddingId: string,
  body: unknown,
): Promise<NextResponse> {
  try {
    const { name, color } = createLabelSchema.parse(body);
    const existing = await prisma.guestLabel.findFirst({ where: { id: labelId, wedding_id: weddingId } });
    if (!existing) {
      const res: APIResponse = { success: false, error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Label not found' } };
      return NextResponse.json(res, { status: 404 });
    }
    const label = await prisma.guestLabel.update({
      where: { id: labelId },
      data: { name, color: color ?? null },
    });
    await invalidateStatsForWedding(weddingId);
    const response: APIResponse = { success: true, data: label };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'update label' });
  }
}

/**
 * DELETE …/guests/labels/:id  — Delete a label
 */
export async function deleteLabelHandler(labelId: string, weddingId: string): Promise<NextResponse> {
  try {
    const existing = await prisma.guestLabel.findFirst({ where: { id: labelId, wedding_id: weddingId } });
    if (!existing) {
      const res: APIResponse = { success: false, error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Label not found' } };
      return NextResponse.json(res, { status: 404 });
    }
    await prisma.guestLabel.delete({ where: { id: labelId } });
    await invalidateStatsForWedding(weddingId);
    const response: APIResponse = { success: true, data: { deleted: true } };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleGuestApiError(error, { operation: 'delete label' });
  }
}
