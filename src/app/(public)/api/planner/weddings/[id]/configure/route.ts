/**
 * Planner - Wedding Configure API Route
 *
 * GET  /api/planner/weddings/:id/configure  - Get full wedding config (including available_themes)
 * PATCH /api/planner/weddings/:id/configure - Update RSVP & basic wedding config
 *
 * Mirrors /api/admin/wedding but scoped to a planner-owned wedding.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { getAllSystemThemes } from '@/lib/theme/presets';
import { invalidateWeddingPageCache } from '@/lib/cache/rsvp-page';
import { reRenderWeddingTemplates } from '@/lib/invitation-template/re-render';
import { revalidateWeddingRSVPPages } from '@/lib/cache/revalidate-rsvp';
import { getCached, setCached, invalidateCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';
import { toInitials } from '@/lib/wedding-utils';
import type { ThemeConfig } from '@/types/theme';
import type { Theme } from '@/types/models';
import type { APIResponse, GetWeddingDetailsResponse, UpdateWeddingConfigResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

const updateWeddingConfigSchema = z.object({
  couple_names: z.string().optional(),
  wedding_date: z.string().datetime().optional(),
  wedding_time: z.string().optional(),
  location: z.string().nullable().optional(),
  rsvp_cutoff_date: z.string().datetime().optional(),
  payment_tracking_mode: z.enum(['AUTOMATED', 'MANUAL']).optional(),
  gift_iban: z.string().nullable().optional(),
  planned_guests: z.number().int().positive().nullable().optional(),
  planned_gift_per_person: z.number().positive().nullable().optional(),
  theme_id: z.string().nullable().optional(),
  wedding_day_theme_id: z.string().nullable().optional(),
  wedding_day_invitation_template_id: z.string().nullable().optional(),
  invitation_template_id: z.string().nullable().optional(),
  allow_guest_additions: z.boolean().optional(),
  dress_code: z.string().nullable().optional(),
  additional_info: z.string().nullable().optional(),
  wedding_country: z.string().optional(),
  save_the_date_enabled: z.boolean().optional(),
  transportation_question_enabled: z.boolean().optional(),
  transportation_question_text: z.string().nullable().optional(),
  dietary_restrictions_enabled: z.boolean().optional(),
  extra_question_1_enabled: z.boolean().optional(),
  extra_question_1_text: z.string().nullable().optional(),
  extra_question_2_enabled: z.boolean().optional(),
  extra_question_2_text: z.string().nullable().optional(),
  extra_question_3_enabled: z.boolean().optional(),
  extra_question_3_text: z.string().nullable().optional(),
  extra_info_1_enabled: z.boolean().optional(),
  extra_info_1_label: z.string().nullable().optional(),
  extra_info_2_enabled: z.boolean().optional(),
  extra_info_2_label: z.string().nullable().optional(),
  extra_info_3_enabled: z.boolean().optional(),
  extra_info_3_label: z.string().nullable().optional(),
});

/**
 * GET /api/planner/weddings/:id/configure
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner ID not found in session' } },
        { status: 403 }
      );
    }

    const { id: weddingId } = await params;

    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;

    const cacheKey = CACHE_KEYS.adminWedding(weddingId);
    const cached = await getCached<object>(cacheKey);
    if (cached) {
      return NextResponse.json<GetWeddingDetailsResponse>(
        { success: true, data: cached as GetWeddingDetailsResponse['data'] },
        { status: 200, headers: { 'X-Cache': 'HIT', 'Cache-Control': 'no-cache' } }
      );
    }

    const [wedding, totalGuests, totalFamilies, rsvpCount, attendingCount, paymentReceivedCountRows] =
      await Promise.all([
        prisma.wedding.findUnique({
          where: { id: weddingId },
          include: {
            planner: { select: { name: true, logo_url: true } },
            wedding_admins: true,
          },
        }),
        prisma.familyMember.count({ where: { family: { wedding_id: weddingId } } }),
        prisma.family.count({ where: { wedding_id: weddingId } }),
        prisma.family.count({
          where: { wedding_id: weddingId, members: { some: { attending: { not: null } } } },
        }),
        prisma.familyMember.count({ where: { family: { wedding_id: weddingId }, attending: true } }),
        prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(DISTINCT family_id) AS count
          FROM gifts
          WHERE wedding_id = ${weddingId}
            AND status = ANY(ARRAY['RECEIVED','CONFIRMED']::"GiftStatus"[])
        `,
      ]);

    if (!wedding) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Wedding not found' } },
        { status: 404 }
      );
    }

    const paymentReceivedCount = Number(paymentReceivedCountRows[0]?.count ?? 0);
    const rsvpCompletionPercentage = totalFamilies > 0 ? Math.round((rsvpCount / totalFamilies) * 100) : 0;

    const systemThemes = getAllSystemThemes();
    const systemThemeObjects = systemThemes.map((theme) => ({
      id: theme.id,
      planner_id: null,
      name: theme.info.name,
      description: theme.info.description,
      is_default: false,
      is_system_theme: true,
      config: theme.config,
      preview_image_url: theme.info.preview_image_url || null,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    }));

    const customThemes = await prisma.theme.findMany({
      where: { planner_id: wedding.planner_id, is_system_theme: false },
      orderBy: { created_at: 'desc' },
    });

    const customThemeObjects = customThemes.map((theme) => ({
      ...theme,
      config: theme.config as unknown as ThemeConfig,
    }));

    const invitationTemplates = await prisma.invitationTemplate.findMany({
      where: { wedding_id: weddingId },
      orderBy: { created_at: 'desc' },
    });

    const invitationTemplateObjects = invitationTemplates.map((template) => ({
      id: template.id,
      planner_id: null,
      name: `[Invitation] ${template.name}`,
      description: 'Custom invitation template',
      is_default: false,
      is_system_theme: false,
      config: {} as ThemeConfig,
      preview_image_url: null,
      created_at: template.created_at,
      updated_at: template.updated_at,
      _type: 'invitation_template',
    } as unknown as Theme));

    const availableThemes = [...systemThemeObjects, ...customThemeObjects, ...invitationTemplateObjects];

    const weddingDetails = {
      id: wedding.id,
      planner_id: wedding.planner_id,
      theme_id: wedding.theme_id,
      wedding_day_theme_id: (wedding as unknown as { wedding_day_theme_id: string | null }).wedding_day_theme_id || null,
      wedding_day_invitation_template_id: (wedding as unknown as { wedding_day_invitation_template_id: string | null }).wedding_day_invitation_template_id || null,
      invitation_template_id: (wedding as unknown as { invitation_template_id: string | null }).invitation_template_id || null,
      couple_names: wedding.couple_names,
      wedding_date: wedding.wedding_date,
      wedding_time: wedding.wedding_time,
      location: wedding.location,
      main_event_location_id: wedding.main_event_location_id,
      rsvp_cutoff_date: wedding.rsvp_cutoff_date,
      dress_code: wedding.dress_code,
      additional_info: wedding.additional_info,
      payment_tracking_mode: wedding.payment_tracking_mode,
      gift_iban: wedding.gift_iban,
      planned_guests: wedding.planned_guests,
      planned_gift_per_person: wedding.planned_gift_per_person ? Number(wedding.planned_gift_per_person) : null,
      allow_guest_additions: wedding.allow_guest_additions,
      default_language: wedding.default_language,
      wedding_country: wedding.wedding_country,
      status: wedding.status,
      is_disabled: wedding.is_disabled,
      disabled_at: wedding.disabled_at,
      disabled_by: wedding.disabled_by,
      deleted_at: wedding.deleted_at,
      deleted_by: wedding.deleted_by,
      created_at: wedding.created_at,
      created_by: wedding.created_by,
      updated_at: wedding.updated_at,
      updated_by: wedding.updated_by,
      short_url_initials: wedding.short_url_initials,
      transportation_question_enabled: wedding.transportation_question_enabled,
      transportation_question_text: wedding.transportation_question_text,
      dietary_restrictions_enabled: wedding.dietary_restrictions_enabled,
      save_the_date_enabled: wedding.save_the_date_enabled,
      whatsapp_mode: wedding.whatsapp_mode,
      extra_question_1_enabled: wedding.extra_question_1_enabled,
      extra_question_1_text: wedding.extra_question_1_text,
      extra_question_2_enabled: wedding.extra_question_2_enabled,
      extra_question_2_text: wedding.extra_question_2_text,
      extra_question_3_enabled: wedding.extra_question_3_enabled,
      extra_question_3_text: wedding.extra_question_3_text,
      extra_info_1_enabled: wedding.extra_info_1_enabled,
      extra_info_1_label: wedding.extra_info_1_label,
      extra_info_2_enabled: wedding.extra_info_2_enabled,
      extra_info_2_label: wedding.extra_info_2_label,
      extra_info_3_enabled: wedding.extra_info_3_enabled,
      extra_info_3_label: wedding.extra_info_3_label,
      guest_count: totalGuests,
      rsvp_count: rsvpCount,
      rsvp_completion_percentage: rsvpCompletionPercentage,
      attending_count: attendingCount,
      payment_received_count: paymentReceivedCount,
      planner_name: wedding.planner.name,
      planner_logo_url: wedding.planner?.logo_url ?? null,
      admin_count: wedding.wedding_admins.length,
      available_themes: availableThemes,
      customer_id: wedding.customer_id,
      contract_id: wedding.contract_id,
    };

    await setCached(cacheKey, weddingDetails, CACHE_TTL.WEDDING_DETAILS);

    return NextResponse.json<GetWeddingDetailsResponse>(
      { success: true, data: weddingDetails },
      { status: 200, headers: { 'X-Cache': 'MISS', 'Cache-Control': 'no-cache' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' } },
        { status: 401 }
      );
    }
    if (msg.includes('FORBIDDEN')) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner role required' } },
        { status: 403 }
      );
    }
    console.error('Error fetching wedding config for planner:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to fetch wedding details' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/planner/weddings/:id/configure
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner ID not found in session' } },
        { status: 403 }
      );
    }

    const { id: weddingId } = await params;

    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;

    const body = await request.json();
    const validatedData = updateWeddingConfigSchema.parse(body);

    const currentWedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { theme_id: true, wedding_day_theme_id: true, couple_names: true, planner_id: true },
    });

    if (!currentWedding) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Wedding not found' } },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = { updated_by: user.id };

    const fields = [
      'couple_names', 'wedding_time', 'location', 'payment_tracking_mode',
      'gift_iban', 'planned_guests', 'planned_gift_per_person', 'theme_id',
      'wedding_day_theme_id', 'wedding_day_invitation_template_id', 'invitation_template_id',
      'allow_guest_additions', 'dress_code', 'additional_info', 'wedding_country',
      'save_the_date_enabled', 'transportation_question_enabled', 'transportation_question_text',
      'dietary_restrictions_enabled', 'extra_question_1_enabled', 'extra_question_1_text',
      'extra_question_2_enabled', 'extra_question_2_text', 'extra_question_3_enabled',
      'extra_question_3_text', 'extra_info_1_enabled', 'extra_info_1_label',
      'extra_info_2_enabled', 'extra_info_2_label', 'extra_info_3_enabled', 'extra_info_3_label',
    ] as const;

    for (const field of fields) {
      if (validatedData[field] !== undefined) updateData[field] = validatedData[field];
    }

    if (validatedData.wedding_date) updateData.wedding_date = new Date(validatedData.wedding_date);
    if (validatedData.rsvp_cutoff_date) updateData.rsvp_cutoff_date = new Date(validatedData.rsvp_cutoff_date);

    const wedding = await prisma.wedding.update({ where: { id: weddingId }, data: updateData });

    const themeChanged = validatedData.theme_id !== undefined && validatedData.theme_id !== currentWedding.theme_id;
    const weddingDayThemeChanged = validatedData.wedding_day_theme_id !== undefined && validatedData.wedding_day_theme_id !== currentWedding.wedding_day_theme_id;
    if (themeChanged) {
      await reRenderWeddingTemplates(weddingId);
      invalidateWeddingPageCache(weddingId);
      void revalidateWeddingRSVPPages(weddingId);
    } else if (weddingDayThemeChanged) {
      invalidateWeddingPageCache(weddingId);
      void revalidateWeddingRSVPPages(weddingId);
    } else {
      invalidateWeddingPageCache(weddingId);
    }

    await Promise.all([
      invalidateCache(CACHE_KEYS.adminWedding(weddingId)),
      invalidateCache(CACHE_KEYS.adminDashboard(weddingId)),
      invalidateCache(CACHE_KEYS.plannerWeddingDetail(weddingId)),
      ...(currentWedding.planner_id
        ? [invalidateCache(CACHE_KEYS.plannerWeddingsList(currentWedding.planner_id))]
        : []),
    ]);

    if (validatedData.couple_names !== undefined) {
      const oldInitials = toInitials(currentWedding.couple_names);
      const newInitials = toInitials(validatedData.couple_names);
      if (oldInitials !== newInitials) {
        await invalidateCache(CACHE_KEYS.adminIcon(weddingId));
      }
    }

    return NextResponse.json<UpdateWeddingConfigResponse>({ success: true, data: wedding }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' } },
        { status: 401 }
      );
    }
    if (msg.includes('FORBIDDEN')) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner role required' } },
        { status: 403 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Invalid request data', details: error.issues } },
        { status: 400 }
      );
    }
    console.error('Error updating wedding config for planner:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to update wedding configuration' } },
      { status: 500 }
    );
  }
}
