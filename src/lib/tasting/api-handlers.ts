/**
 * Shared Tasting API Handlers
 *
 * Business logic for all tasting-related operations, shared between
 * admin (/api/admin/tasting/*) and planner (/api/planner/weddings/[id]/tasting/*) routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { computeEffectiveStatus } from '@/lib/tasting/status';
import { uploadFile, deleteFile } from '@/lib/storage';
import { parseMenuFromFile } from '@/lib/ai/menu-parser';
import { renderTemplate } from '@/lib/templates';
import { getTemplateForSending } from '@/lib/templates/crud';
import { sendDynamicEmail } from '@/lib/email/resend';
import { sendDynamicMessage, MessageType } from '@/lib/sms/twilio';
import { buildWhatsAppLink } from '@/lib/notifications/whatsapp-links';
import { toAbsoluteUrl } from '@/lib/images/processor';

// ============================================================================
// SCHEMAS
// ============================================================================

const upsertMenuSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  tasting_date: z.string().datetime({ offset: true }).optional().nullable(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
});

const createSectionSchema = z.object({
  name: z.string().min(1).max(200),
  menu_id: z.string().uuid().optional(),
});

const updateSectionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  order: z.number().int().min(0).optional(),
});

const createDishSchema = z.object({
  section_id: z.string().uuid(),
  name: z.string().min(1).max(300),
  description: z.string().max(1000).optional(),
});

const updateDishSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(1000).nullable().optional(),
  order: z.number().int().min(0).optional(),
});

const createParticipantSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  whatsapp_number: z.string().max(50).optional().or(z.literal('')),
  channel_preference: z.enum(['WHATSAPP', 'EMAIL', 'SMS']).optional(),
  language: z.enum(['ES', 'EN', 'FR', 'IT', 'DE']).optional(),
  menu_id: z.string().uuid().optional(),
});

const updateParticipantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  whatsapp_number: z.string().max(50).optional().or(z.literal('')),
  channel_preference: z.enum(['WHATSAPP', 'EMAIL', 'SMS']).nullable().optional(),
  language: z.enum(['ES', 'EN', 'FR', 'IT', 'DE']).optional(),
});

const sendSchema = z.object({
  channel: z.enum(['WHATSAPP', 'EMAIL', 'SMS']),
  custom_message: z.string().max(2000).optional(),
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_IMPORT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// ============================================================================
// HELPERS
// ============================================================================

async function getOrCreateMenu(weddingId: string, roundNumber = 1) {
  return prisma.tastingMenu.upsert({
    where: { wedding_id_round_number: { wedding_id: weddingId, round_number: roundNumber } },
    create: { wedding_id: weddingId, round_number: roundNumber, title: 'Tasting Menu' },
    update: {},
  });
}

function mapMenuWithScores(menuData: MenuWithScores) {
  const sections = menuData.sections.map((section) => ({
    ...section,
    dishes: section.dishes.map((dish) => {
      const scores = dish.scores || [];
      const avg =
        scores.length > 0
          ? Math.round((scores.reduce((sum, s) => sum + s.score, 0) / scores.length) * 10) / 10
          : null;
      return { ...dish, average_score: avg, score_count: scores.length };
    }),
  }));
  const effective_status = computeEffectiveStatus(menuData.status, menuData.tasting_date);
  return { ...menuData, sections, effective_status };
}

const menuInclude = {
  sections: {
    orderBy: { order: 'asc' as const },
    include: {
      dishes: {
        orderBy: { order: 'asc' as const },
        include: { scores: { select: { score: true } } },
      },
    },
  },
  participants: { orderBy: { created_at: 'asc' as const } },
} satisfies Prisma.TastingMenuInclude;

type MenuWithScores = Prisma.TastingMenuGetPayload<{ include: typeof menuInclude }>;

// ============================================================================
// SHARED DISH QUERY
// ============================================================================

export interface FlatDish {
  id: string;
  name: string;
  description: string | null;
  average_score: number | null;
  score_count: number;
  section_name: string;
}

/**
 * Fetch all dishes from every tasting round for a wedding, flattened into a
 * single array with pre-computed average scores.  Used by the AI menu generator
 * and any other place that needs the full dish catalogue across rounds.
 */
export async function getAllDishesForWedding(weddingId: string): Promise<FlatDish[]> {
  const allMenus = await prisma.tastingMenu.findMany({
    where: { wedding_id: weddingId },
    orderBy: { round_number: 'asc' },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          dishes: {
            orderBy: { order: 'asc' },
            include: { scores: { select: { score: true } } },
          },
        },
      },
    },
  });

  return allMenus.flatMap(menu =>
    menu.sections.flatMap(section =>
      section.dishes.map(dish => {
        const scores = dish.scores ?? [];
        const score_count = scores.length;
        const average_score =
          score_count > 0
            ? Math.round((scores.reduce((sum, s) => sum + s.score, 0) / score_count) * 10) / 10
            : null;
        return {
          id: dish.id,
          name: dish.name,
          description: dish.description,
          average_score,
          score_count,
          section_name: section.name,
        };
      }),
    ),
  );
}

// ============================================================================
// ROUNDS HANDLERS
// ============================================================================

export async function getAllRoundsHandler(weddingId: string) {
  const rounds = await prisma.tastingMenu.findMany({
    where: { wedding_id: weddingId },
    orderBy: { round_number: 'asc' },
    select: {
      id: true,
      round_number: true,
      title: true,
      tasting_date: true,
      status: true,
      created_at: true,
    },
  });
  return NextResponse.json({ success: true, data: rounds });
}

export async function createRoundHandler(weddingId: string) {
  const maxRound = await prisma.tastingMenu.aggregate({
    where: { wedding_id: weddingId },
    _max: { round_number: true },
  });
  const nextRound = (maxRound._max.round_number ?? 0) + 1;

  const menu = await prisma.tastingMenu.create({
    data: {
      wedding_id: weddingId,
      round_number: nextRound,
      title: `Tasting Round ${nextRound}`,
    },
    include: menuInclude,
  });

  const effective_status = computeEffectiveStatus(menu.status, menu.tasting_date);
  return NextResponse.json({ success: true, data: { ...menu, effective_status } }, { status: 201 });
}

// ============================================================================
// MENU HANDLERS
// ============================================================================

export async function getTastingMenuHandler(weddingId: string, menuId?: string) {
  const whereClause = menuId
    ? { id: menuId, wedding_id: weddingId }
    : undefined;

  const [menuData, wedding] = await Promise.all([
    menuId
      ? prisma.tastingMenu.findFirst({ where: whereClause, include: menuInclude })
      : prisma.tastingMenu.findFirst({
          where: { wedding_id: weddingId },
          orderBy: { round_number: 'asc' },
          include: menuInclude,
        }),
    prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { default_language: true, whatsapp_mode: true },
    }),
  ]);

  const menu = menuData ? mapMenuWithScores(menuData) : null;

  return NextResponse.json({
    success: true,
    data: menu,
    wedding_language: wedding?.default_language ?? 'ES',
    whatsapp_mode: wedding?.whatsapp_mode ?? 'BUSINESS',
  });
}

export async function upsertTastingMenuHandler(weddingId: string, request: NextRequest) {
  const url = new URL(request.url);
  const menuId = url.searchParams.get('menuId');

  const body = await request.json();
  const parsed = upsertMenuSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 },
    );
  }

  const { tasting_date, ...rest } = parsed.data;
  const data = {
    ...rest,
    tasting_date: tasting_date ? new Date(tasting_date) : tasting_date === null ? null : undefined,
  };

  let menu;
  if (menuId) {
    // Update a specific round by its ID
    const existing = await prisma.tastingMenu.findFirst({
      where: { id: menuId, wedding_id: weddingId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Round not found' } },
        { status: 404 },
      );
    }
    menu = await prisma.tastingMenu.update({ where: { id: menuId }, data });
  } else {
    // Upsert round 1 (legacy / default behaviour)
    menu = await prisma.tastingMenu.upsert({
      where: { wedding_id_round_number: { wedding_id: weddingId, round_number: 1 } },
      create: { wedding_id: weddingId, round_number: 1, ...data },
      update: data,
    });
  }

  const effective_status = computeEffectiveStatus(menu.status, menu.tasting_date);
  return NextResponse.json({ success: true, data: { ...menu, effective_status } });
}

// ============================================================================
// SECTION HANDLERS
// ============================================================================

export async function createSectionHandler(weddingId: string, request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      );
    }

    let menuId: string;
    if (parsed.data.menu_id) {
      // Validate the menu belongs to this wedding
      const menu = await prisma.tastingMenu.findFirst({
        where: { id: parsed.data.menu_id, wedding_id: weddingId },
      });
      if (!menu) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Round not found' } },
          { status: 404 },
        );
      }
      menuId = menu.id;
    } else {
      const menu = await getOrCreateMenu(weddingId);
      menuId = menu.id;
    }

    const maxOrder = await prisma.tastingSection.aggregate({
      where: { menu_id: menuId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const section = await prisma.tastingSection.create({
      data: { menu_id: menuId, name: parsed.data.name, order: nextOrder },
      include: { dishes: true },
    });

    return NextResponse.json({ success: true, data: section }, { status: 201 });
  } catch (error) {
    console.error('Error creating tasting section:', error);
    const message = error instanceof Error ? error.message : 'Failed to create section';
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message } },
      { status: 500 },
    );
  }
}

export async function updateSectionHandler(
  sectionId: string,
  weddingId: string,
  request: NextRequest,
) {
  const section = await prisma.tastingSection.findFirst({
    where: { id: sectionId, menu: { wedding_id: weddingId } },
  });
  if (!section) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Section not found' } },
      { status: 404 },
    );
  }

  const body = await request.json();
  const parsed = updateSectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 },
    );
  }

  const updated = await prisma.tastingSection.update({
    where: { id: sectionId },
    data: parsed.data,
    include: { dishes: { orderBy: { order: 'asc' } } },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function deleteSectionHandler(sectionId: string, weddingId: string) {
  const section = await prisma.tastingSection.findFirst({
    where: { id: sectionId, menu: { wedding_id: weddingId } },
  });
  if (!section) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Section not found' } },
      { status: 404 },
    );
  }

  await prisma.tastingSection.delete({ where: { id: sectionId } });
  return NextResponse.json({ success: true });
}

// ============================================================================
// DISH HANDLERS
// ============================================================================

export async function createDishHandler(weddingId: string, request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createDishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      );
    }

    const section = await prisma.tastingSection.findFirst({
      where: { id: parsed.data.section_id, menu: { wedding_id: weddingId } },
    });
    if (!section) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Section not found' } },
        { status: 404 },
      );
    }

    const maxOrder = await prisma.tastingDish.aggregate({
      where: { section_id: parsed.data.section_id },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const dish = await prisma.tastingDish.create({
      data: {
        section_id: parsed.data.section_id,
        name: parsed.data.name,
        description: parsed.data.description,
        order: nextOrder,
      },
    });

    return NextResponse.json({ success: true, data: dish }, { status: 201 });
  } catch (error) {
    console.error('Error creating tasting dish:', error);
    const message = error instanceof Error ? error.message : 'Failed to create dish';
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message } },
      { status: 500 },
    );
  }
}

export async function updateDishHandler(dishId: string, weddingId: string, request: NextRequest) {
  const dish = await prisma.tastingDish.findFirst({
    where: { id: dishId, section: { menu: { wedding_id: weddingId } } },
  });
  if (!dish) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Dish not found' } },
      { status: 404 },
    );
  }

  const body = await request.json();
  const parsed = updateDishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 },
    );
  }

  const updated = await prisma.tastingDish.update({ where: { id: dishId }, data: parsed.data });
  return NextResponse.json({ success: true, data: updated });
}

export async function deleteDishHandler(dishId: string, weddingId: string) {
  const dish = await prisma.tastingDish.findFirst({
    where: { id: dishId, section: { menu: { wedding_id: weddingId } } },
  });
  if (!dish) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Dish not found' } },
      { status: 404 },
    );
  }

  await prisma.tastingDish.delete({ where: { id: dishId } });
  return NextResponse.json({ success: true });
}

export async function uploadDishImageHandler(
  dishId: string,
  weddingId: string,
  request: NextRequest,
) {
  const dish = await prisma.tastingDish.findFirst({
    where: { id: dishId, section: { menu: { wedding_id: weddingId } } },
  });
  if (!dish) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Dish not found' } },
      { status: 404 },
    );
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'No file provided' } },
      { status: 400 },
    );
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid image type' } },
      { status: 400 },
    );
  }

  if (dish.image_url) await deleteFile(dish.image_url).catch(() => {});

  const ext = file.type.split('/')[1] || 'jpg';
  const filename = `${Date.now()}-${randomUUID().split('-')[0]}.${ext}`;
  const filepath = `uploads/weddings/${weddingId}/tasting/dishes/${dishId}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { url } = await uploadFile(filepath, buffer, { contentType: file.type });

  const updated = await prisma.tastingDish.update({ where: { id: dishId }, data: { image_url: url } });
  return NextResponse.json({ success: true, data: updated });
}

export async function deleteDishImageHandler(dishId: string, weddingId: string) {
  const dish = await prisma.tastingDish.findFirst({
    where: { id: dishId, section: { menu: { wedding_id: weddingId } } },
  });
  if (!dish) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Dish not found' } },
      { status: 404 },
    );
  }

  if (dish.image_url) await deleteFile(dish.image_url).catch(() => {});

  const updated = await prisma.tastingDish.update({
    where: { id: dishId },
    data: { image_url: null },
  });
  return NextResponse.json({ success: true, data: updated });
}

// ============================================================================
// PARTICIPANT HANDLERS
// ============================================================================

export async function getParticipantsHandler(weddingId: string) {
  const menu = await prisma.tastingMenu.findFirst({
    where: { wedding_id: weddingId },
    orderBy: { round_number: 'asc' },
    include: { participants: { orderBy: { created_at: 'asc' } } },
  });
  return NextResponse.json({ success: true, data: menu?.participants ?? [] });
}

export async function createParticipantHandler(weddingId: string, request: NextRequest) {
  const body = await request.json();
  const parsed = createParticipantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 },
    );
  }

  let menuId: string;
  if (parsed.data.menu_id) {
    const menu = await prisma.tastingMenu.findFirst({
      where: { id: parsed.data.menu_id, wedding_id: weddingId },
    });
    if (!menu) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Round not found' } },
        { status: 404 },
      );
    }
    menuId = menu.id;
  } else {
    const menu = await getOrCreateMenu(weddingId);
    menuId = menu.id;
  }

  const participant = await prisma.tastingParticipant.create({
    data: {
      menu_id: menuId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      whatsapp_number: parsed.data.whatsapp_number || null,
      channel_preference: parsed.data.channel_preference ?? null,
      language: parsed.data.language ?? 'ES',
    },
  });

  return NextResponse.json({ success: true, data: participant }, { status: 201 });
}

export async function updateParticipantHandler(
  participantId: string,
  weddingId: string,
  request: NextRequest,
) {
  const participant = await prisma.tastingParticipant.findFirst({
    where: { id: participantId, menu: { wedding_id: weddingId } },
  });
  if (!participant) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Participant not found' } },
      { status: 404 },
    );
  }

  const body = await request.json();
  const parsed = updateParticipantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 },
    );
  }

  const updated = await prisma.tastingParticipant.update({
    where: { id: participantId },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.email !== undefined && { email: parsed.data.email || null }),
      ...(parsed.data.phone !== undefined && { phone: parsed.data.phone || null }),
      ...(parsed.data.whatsapp_number !== undefined && {
        whatsapp_number: parsed.data.whatsapp_number || null,
      }),
      ...(parsed.data.channel_preference !== undefined && {
        channel_preference: parsed.data.channel_preference,
      }),
      ...(parsed.data.language !== undefined && { language: parsed.data.language }),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function deleteParticipantHandler(participantId: string, weddingId: string) {
  const participant = await prisma.tastingParticipant.findFirst({
    where: { id: participantId, menu: { wedding_id: weddingId } },
  });
  if (!participant) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Participant not found' } },
      { status: 404 },
    );
  }

  await prisma.tastingParticipant.delete({ where: { id: participantId } });
  return NextResponse.json({ success: true });
}

export async function sendParticipantLinkHandler(
  participantId: string,
  weddingId: string,
  request: NextRequest,
) {
  const participant = await prisma.tastingParticipant.findFirst({
    where: { id: participantId, menu: { wedding_id: weddingId } },
    include: { menu: { include: { wedding: true } } },
  });
  if (!participant) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Participant not found' } },
      { status: 404 },
    );
  }

  const body = await request.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 },
    );
  }

  const { channel, custom_message } = parsed.data;
  const wedding = participant.menu.wedding;

  const tastingLink = toAbsoluteUrl(`/tasting/${participant.magic_token}`) ?? '';
  const variables = {
    tastingParticipantName: participant.name,
    coupleNames: wedding.couple_names,
    tastingLink,
    weddingDate: wedding.wedding_date.toLocaleDateString('en-US'),
  };

  let messageBody = custom_message ?? '';
  let messageSubject = `Tasting Menu - ${wedding.couple_names}`;
  let contentTemplateId: string | undefined;

  if (!custom_message) {
    try {
      const lang = (wedding.default_language ?? 'ES') as Parameters<typeof getTemplateForSending>[2];
      const tpl = await getTemplateForSending(
        weddingId,
        'TASTING_MENU',
        lang,
        channel as Parameters<typeof getTemplateForSending>[3],
      );
      if (tpl) {
        messageBody = renderTemplate(tpl.body, variables);
        messageSubject = renderTemplate(tpl.subject, variables);
        contentTemplateId = (tpl as unknown as { content_template_id?: string }).content_template_id;
      }
    } catch {
      /* use fallback */
    }
  }

  if (!messageBody) {
    messageBody = `Hi ${participant.name}! You are invited to rate the tasting menu for ${wedding.couple_names}'s wedding: ${tastingLink}`;
  }

  if (channel === 'WHATSAPP' && wedding.whatsapp_mode === 'LINKS') {
    const phone = participant.whatsapp_number || participant.phone || '';
    const waUrl = phone ? buildWhatsAppLink(phone, messageBody) : null;
    await prisma.tastingParticipant.update({
      where: { id: participantId },
      data: { invite_sent_at: new Date() },
    });
    return NextResponse.json({ success: true, data: { mode: 'LINKS', wa_url: waUrl } });
  }

  if (channel === 'EMAIL') {
    if (!participant.email) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'No email address for participant' } },
        { status: 400 },
      );
    }
    const result = await sendDynamicEmail(
      participant.email,
      messageSubject,
      messageBody,
      'en',
      wedding.couple_names,
    );
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: 'SEND_FAILED', message: result.error ?? 'Failed to send email' } },
        { status: 500 },
      );
    }
  } else if (channel === 'WHATSAPP') {
    const phone = participant.whatsapp_number || participant.phone;
    if (!phone) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'No phone number for participant' } },
        { status: 400 },
      );
    }
    if (!contentTemplateId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No WhatsApp Content Template ID configured for this template',
          },
        },
        { status: 400 },
      );
    }
    const { mapToWhatsAppVariables } = await import('@/lib/templates/whatsapp-mapper');
    const { sendWhatsAppWithContentTemplate } = await import('@/lib/sms/twilio');
    const whatsappVars = mapToWhatsAppVariables(variables);
    const result = await sendWhatsAppWithContentTemplate(phone, contentTemplateId, whatsappVars);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: 'SEND_FAILED', message: result.error ?? 'Failed to send WhatsApp' } },
        { status: 500 },
      );
    }
  } else {
    const phone = participant.phone || participant.whatsapp_number;
    if (!phone) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'No phone number for participant' } },
        { status: 400 },
      );
    }
    const result = await sendDynamicMessage(phone, messageBody, MessageType.SMS);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: 'SEND_FAILED', message: result.error ?? 'Failed to send SMS' } },
        { status: 500 },
      );
    }
  }

  await prisma.tastingParticipant.update({
    where: { id: participantId },
    data: { invite_sent_at: new Date() },
  });
  return NextResponse.json({ success: true, data: { mode: 'SENT' } });
}

// ============================================================================
// IMPORT HANDLER
// ============================================================================

export async function importTastingMenuHandler(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid form data' } },
      { status: 400 },
    );
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'No file provided' } },
      { status: 400 },
    );
  }
  if (!ALLOWED_IMPORT_TYPES.includes(file.type)) {
    return NextResponse.json(
      { success: false, error: { code: 'UNSUPPORTED_FILE_TYPE', message: `Unsupported file type: ${file.type}` } },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { success: false, error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 20 MB limit' } },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseMenuFromFile(buffer, file.type);
  if (!parsed) {
    return NextResponse.json(
      { success: false, error: { code: 'PARSE_FAILED', message: 'Could not extract menu structure from file' } },
      { status: 422 },
    );
  }

  return NextResponse.json({ success: true, data: parsed });
}
