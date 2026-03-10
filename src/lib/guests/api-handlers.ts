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
import { invalidateCache, CACHE_KEYS } from '@/lib/cache/redis';
import { exportGuestData, exportGuestDataSimplified } from '@/lib/excel/export';
import type { ExportFormat } from '@/lib/excel/export';
import { importGuestList } from '@/lib/excel/import';
import { importVCF } from '@/lib/vcf/import';
import { validateVCF } from '@/lib/vcf/parser';
import { generateTemplate } from '@/lib/excel/templates';
import { getShortUrlPath } from '@/lib/short-url';

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
        details: error.errors,
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
  limit: z.coerce.number().int().positive().max(100).default(50),
  rsvp_status: z.enum(['pending', 'submitted']).optional(),
  attendance: z.enum(['yes', 'no', 'partial']).optional(),
  channel: z.enum(['WHATSAPP', 'EMAIL', 'SMS']).optional(),
  payment_status: z.enum(['PENDING', 'RECEIVED', 'CONFIRMED']).optional(),
  invited_by_admin_id: z.string().uuid().optional(),
  search: z.string().optional(),
});

const bulkDeleteSchema = z.object({
  family_ids: z.array(z.string().uuid()).min(1).max(100),
});

const bulkUpdateSchema = z.object({
  family_ids: z.array(z.string().uuid()).min(1).max(100),
  updates: z.object({
    preferred_language: z.enum(['ES', 'EN', 'FR', 'IT', 'DE']).optional(),
    channel_preference: z.enum(['WHATSAPP', 'EMAIL', 'SMS']).nullable().optional(),
    invited_by_admin_id: z.string().uuid().nullable().optional(),
    set_all_attending: z.boolean().optional(),
    set_all_not_attending: z.boolean().optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  ).refine(
    (data) => !(data.set_all_attending && data.set_all_not_attending),
    { message: 'Cannot set both attending and not attending' }
  ),
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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
      rsvp_status: searchParams.get('rsvp_status') || undefined,
      attendance: searchParams.get('attendance') || undefined,
      channel: searchParams.get('channel') || undefined,
      payment_status: searchParams.get('payment_status') || undefined,
      invited_by_admin_id: searchParams.get('invited_by_admin_id') || undefined,
      search: searchParams.get('search') || undefined,
    });

    const { page, limit, rsvp_status, attendance, channel, payment_status, invited_by_admin_id, search } = queryParams;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.FamilyWhereInput = { wedding_id: weddingId };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (channel) whereClause.channel_preference = channel;
    if (invited_by_admin_id) whereClause.invited_by_admin_id = invited_by_admin_id;

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

    const total = await prisma.family.count({ where: whereClause });

    const families = await prisma.family.findMany({
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
      },
    });

    const weddingAdmins = await prisma.weddingAdmin.findMany({
      where: { wedding_id: weddingId },
      select: { id: true, name: true, email: true },
    });
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
        rsvp_status: hasRsvp ? 'submitted' : 'pending',
        attending_count: attendingMembers.length,
        total_members: family.members.length,
        payment_status: latestGift?.status || null,
        invitation_sent: invitationSent,
      };
    });

    const response: ListGuestsResponse = {
      success: true,
      data: {
        items: familiesWithStatus,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };

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
    await invalidateCache(CACHE_KEYS.adminWedding(weddingId));

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
    await invalidateCache(CACHE_KEYS.adminWedding(weddingId));

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
    await invalidateCache(CACHE_KEYS.adminWedding(weddingId));

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

      if (updates.set_all_attending !== undefined || updates.set_all_not_attending !== undefined) {
        updatedMembers = (await tx.familyMember.updateMany({
          where: { family_id: { in: family_ids } },
          data: { attending: updates.set_all_attending ? true : updates.set_all_not_attending ? false : null },
        })).count;
      }

      return { updatedFamilies, updatedMembers };
    });

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
