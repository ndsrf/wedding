/**
 * Tool Handlers — shared business logic for NupciBot and the MCP server.
 *
 * Each function is a plain async function that accepts a ToolContext and typed
 * args, runs Prisma queries, and returns a plain serialisable object.
 *
 * Consumed by:
 *   - src/lib/ai/tools.ts                     (Vercel AI SDK adapter — NupciBot)
 *   - src/app/(public)/api/mcp/route.ts        (unified HTTP dispatcher — MCP server)
 */

import { prisma } from '@/lib/db/prisma';
import { convertRelativeDateToAbsolute } from '@/lib/checklist/date-converter';
import type { RelativeDateFormat } from '@/lib/checklist/date-converter';
import { createSection, createTask } from '@/lib/checklist/crud';
import { getWeddingSchedule } from '@/lib/schedule/crud';
import { computeScheduleWithTimes } from '@/types/schedule';
import { computeEffectiveStatus } from '@/lib/tasting/status';
import { recordInvoicePayment } from '@/lib/invoices/service';

// ── Context ───────────────────────────────────────────────────────────────────

export interface ToolContext {
  weddingId?: string;
  plannerId?: string;
  role: 'wedding_admin' | 'planner';
}

// ── Guest List ────────────────────────────────────────────────────────────────

export async function handleGetGuestList(ctx: ToolContext) {
  if (!ctx.weddingId) return { error: 'No wedding context available' };
  const families = await prisma.family.findMany({
    where: { wedding_id: ctx.weddingId },
    include: { members: { select: { name: true, attending: true, type: true } } },
    orderBy: { name: 'asc' },
  });
  return families.map((f) => ({
    name: f.name,
    channel: f.channel_preference,
    memberCount: f.members.length,
    attending: f.members.filter((m) => m.attending === true).length,
    notAttending: f.members.filter((m) => m.attending === false).length,
    pending: f.members.filter((m) => m.attending === null).length,
    rsvpSubmitted: f.members.some((m) => m.attending !== null),
  }));
}

// ── RSVP Status ───────────────────────────────────────────────────────────────

export async function handleGetRsvpStatus(ctx: ToolContext) {
  if (!ctx.weddingId) return { error: 'No wedding context available' };
  const families = await prisma.family.findMany({
    where: { wedding_id: ctx.weddingId },
    include: { members: { select: { attending: true } } },
  });
  const totalFamilies = families.length;
  const submitted = families.filter((f) => f.members.some((m) => m.attending !== null)).length;
  const pending = totalFamilies - submitted;
  const allMembers = families.flatMap((f) => f.members);
  const totalPeople = allMembers.length;
  const attending = allMembers.filter((m) => m.attending === true).length;
  const notAttending = allMembers.filter((m) => m.attending === false).length;
  const pendingPeople = allMembers.filter((m) => m.attending === null).length;
  const completionPct = totalFamilies > 0 ? Math.round((submitted / totalFamilies) * 100) : 0;
  return { totalFamilies, totalPeople, submitted, pending, attending, notAttending, pendingPeople, completionPct };
}

// ── Guests by Label ───────────────────────────────────────────────────────────

export async function handleGetGuestsByLabel(ctx: ToolContext, args: { labelName: string }) {
  if (!ctx.weddingId) return { error: 'No wedding context available' };
  const { labelName } = args;
  const families = await prisma.family.findMany({
    where: {
      wedding_id: ctx.weddingId,
      labels: { some: { label: { name: { equals: labelName, mode: 'insensitive' } } } },
    },
    include: { members: { select: { name: true, attending: true, type: true } } },
    orderBy: { name: 'asc' },
  });
  const allMembers = families.flatMap((f) => f.members);
  return {
    labelName,
    totalFamilies: families.length,
    totalPeople: allMembers.length,
    attending: allMembers.filter((m) => m.attending === true).length,
    notAttending: allMembers.filter((m) => m.attending === false).length,
    pendingPeople: allMembers.filter((m) => m.attending === null).length,
    families: families.map((f) => ({
      name: f.name,
      totalMembers: f.members.length,
      attending: f.members.filter((m) => m.attending === true).length,
      notAttending: f.members.filter((m) => m.attending === false).length,
      pending: f.members.filter((m) => m.attending === null).length,
    })),
  };
}

// ── Update Family RSVP ────────────────────────────────────────────────────────

interface MemberUpdate { memberName: string; attending: boolean }

export async function handleUpdateFamilyRsvp(
  ctx: ToolContext,
  args: { familyName: string; attending?: boolean; memberUpdates?: MemberUpdate[] },
) {
  if (!ctx.weddingId) return { error: 'No wedding context available' };
  const { familyName, attending, memberUpdates } = args;

  const families = await prisma.family.findMany({
    where: { wedding_id: ctx.weddingId, name: { contains: familyName, mode: 'insensitive' } },
    include: { members: { select: { id: true, name: true, attending: true } } },
  });

  if (families.length === 0) return { error: `No family found matching "${familyName}"` };
  if (families.length > 1) {
    return {
      status: 'ambiguous',
      message: `Multiple families found matching "${familyName}". Please clarify which one you mean.`,
      families: families.map((f) => ({ id: f.id, name: f.name, members: f.members.map((m) => m.name) })),
    };
  }

  const family = families[0];
  const results: Array<{ member: string; attending: boolean }> = [];
  const notFound: string[] = [];

  if (memberUpdates && memberUpdates.length > 0) {
    const memberMap = new Map(family.members.map((m) => [m.name.toLowerCase(), m]));
    const updatedIds: string[] = [];
    const toUpdate: Array<{ id: string; attending: boolean; name: string }> = [];

    for (const update of memberUpdates) {
      const member = memberMap.get(update.memberName.toLowerCase());
      if (!member) { notFound.push(update.memberName); continue; }
      toUpdate.push({ id: member.id, attending: update.attending, name: member.name });
      updatedIds.push(member.id);
    }

    if (toUpdate.length > 0) {
      const groups = toUpdate.reduce((acc, u) => {
        const key = String(u.attending);
        if (!acc[key]) acc[key] = { attending: u.attending, ids: [] };
        acc[key].ids.push(u.id);
        return acc;
      }, {} as Record<string, { attending: boolean; ids: string[] }>);

      await prisma.$transaction(
        Object.values(groups).map(({ attending: a, ids }) =>
          prisma.familyMember.updateMany({ where: { id: { in: ids } }, data: { attending: a } }),
        ),
      );
      for (const u of toUpdate) results.push({ member: u.name, attending: u.attending });
    }

    if (attending !== undefined) {
      await prisma.familyMember.updateMany({
        where: { family_id: family.id, id: { notIn: updatedIds } },
        data: { attending },
      });
      for (const m of family.members.filter((m) => !updatedIds.includes(m.id))) {
        results.push({ member: m.name, attending });
      }
    }
  } else if (attending !== undefined) {
    await prisma.familyMember.updateMany({ where: { family_id: family.id }, data: { attending } });
    for (const m of family.members) results.push({ member: m.name, attending });
  } else {
    return { error: 'Provide either attending or memberUpdates (or both).' };
  }

  return {
    status: notFound.length > 0 ? 'partial' : 'success',
    family: family.name,
    updated: results,
    notFound: notFound.length > 0 ? notFound : undefined,
    message:
      notFound.length > 0
        ? `Updated ${results.length} member(s) for "${family.name}". Could not find: ${notFound.join(', ')}.`
        : `Updated ${results.length} member(s) for family "${family.name}".`,
  };
}

// ── Assign Family to Table ────────────────────────────────────────────────────

export async function handleAssignFamilyToTable(
  ctx: ToolContext,
  args: { familyName: string; tableNumber: number; memberNames?: string[] },
) {
  if (!ctx.weddingId) return { error: 'No wedding context available' };
  const { familyName, tableNumber, memberNames } = args;

  const families = await prisma.family.findMany({
    where: { wedding_id: ctx.weddingId, name: { contains: familyName, mode: 'insensitive' } },
    include: { members: { select: { id: true, name: true, attending: true } } },
  });
  if (families.length === 0) return { error: `No family found matching "${familyName}"` };
  if (families.length > 1) {
    return {
      status: 'ambiguous',
      message: `Multiple families found matching "${familyName}". Please clarify.`,
      families: families.map((f) => ({ id: f.id, name: f.name })),
    };
  }

  const family = families[0];
  const table = await prisma.table.findUnique({
    where: { wedding_id_number: { wedding_id: ctx.weddingId, number: tableNumber } },
    include: { assigned_guests: { select: { id: true } } },
  });
  if (!table) return { error: `Table ${tableNumber} not found` };

  let targets = family.members.filter((m) => m.attending === true);
  if (memberNames && memberNames.length > 0) {
    const lowerNames = memberNames.map((n) => n.toLowerCase());
    targets = targets.filter((m) => lowerNames.includes(m.name.toLowerCase()));
  }
  if (targets.length === 0) return { error: 'No attending members found to assign (check RSVP status).' };

  const currentOccupancy = table.assigned_guests.length;
  if (currentOccupancy + targets.length > table.capacity) {
    return {
      error: `Table ${tableNumber} does not have enough space. Capacity: ${table.capacity}, current occupancy: ${currentOccupancy}, trying to add: ${targets.length}.`,
    };
  }

  await prisma.familyMember.updateMany({
    where: { id: { in: targets.map((m) => m.id) } },
    data: { table_id: table.id },
  });

  return {
    status: 'success',
    message: `Assigned ${targets.length} member(s) of "${family.name}" to table ${tableNumber}.`,
    family: family.name,
    table: tableNumber,
    assignedMembers: targets.map((m) => m.name),
  };
}

// ── Suggest Tables for a Family ───────────────────────────────────────────────

export async function handleSuggestTablesForFamily(
  ctx: ToolContext,
  args: { familyName: string; topN?: number },
) {
  if (!ctx.weddingId) return { error: 'No wedding context available' };
  const { familyName, topN = 3 } = args;

  const families = await prisma.family.findMany({
    where: { wedding_id: ctx.weddingId, name: { contains: familyName, mode: 'insensitive' } },
    include: { members: { where: { attending: true }, select: { id: true, name: true, age: true } } },
  });
  if (families.length === 0) return { error: `No family found matching "${familyName}"` };
  if (families.length > 1) {
    return {
      status: 'ambiguous',
      message: `Multiple families found matching "${familyName}". Please clarify.`,
      families: families.map((f) => ({ id: f.id, name: f.name })),
    };
  }

  const family = families[0];
  const attendingCount = family.members.length;
  if (attendingCount === 0) return { error: `No attending members in family "${family.name}" to seat.` };

  const invitedByAdminId = (family as Record<string, unknown>).invited_by_admin_id as string | null ?? null;
  const familyAges = family.members.map((m) => m.age).filter((a): a is number => a !== null && a !== undefined);
  const familyAvgAge = familyAges.length > 0 ? familyAges.reduce((s, a) => s + a, 0) / familyAges.length : null;

  const tables = await prisma.table.findMany({
    where: { wedding_id: ctx.weddingId },
    include: {
      assigned_guests: { select: { age: true, family: { select: { invited_by_admin_id: true } } } },
    },
    orderBy: { number: 'asc' },
  });

  type Suggestion = {
    tableNumber: number; capacity: number; currentOccupancy: number;
    availableSeats: number; sharedAdminCount: number; ageDiff: number | null;
  };

  const suggestions: Suggestion[] = [];
  for (const t of tables) {
    const currentOccupancy = t.assigned_guests.length;
    const availableSeats = t.capacity - currentOccupancy;
    if (availableSeats < attendingCount) continue;

    const sharedAdminCount = invitedByAdminId
      ? t.assigned_guests.filter((g) => g.family?.invited_by_admin_id === invitedByAdminId).length
      : 0;

    let ageDiff: number | null = null;
    if (familyAvgAge !== null) {
      const tableAges = t.assigned_guests.map((g) => g.age).filter((a): a is number => a !== null && a !== undefined);
      if (tableAges.length > 0) {
        const tableAvgAge = tableAges.reduce((s, a) => s + a, 0) / tableAges.length;
        ageDiff = Math.abs(familyAvgAge - tableAvgAge);
      }
    }
    suggestions.push({ tableNumber: t.number, capacity: t.capacity, currentOccupancy, availableSeats, sharedAdminCount, ageDiff });
  }

  if (suggestions.length === 0) {
    return { status: 'no_space', message: `No table has enough space for ${attendingCount} attending member(s) from "${family.name}".`, attendingCount };
  }

  suggestions.sort((a, b) => {
    if (b.sharedAdminCount !== a.sharedAdminCount) return b.sharedAdminCount - a.sharedAdminCount;
    if (a.ageDiff !== null && b.ageDiff !== null) return a.ageDiff - b.ageDiff;
    if (a.ageDiff !== null) return -1;
    if (b.ageDiff !== null) return 1;
    return b.availableSeats - a.availableSeats;
  });

  return {
    status: 'success',
    family: family.name,
    attendingCount,
    familyAvgAge,
    invitedByAdminId,
    suggestions: suggestions.slice(0, topN).map((s) => ({
      tableNumber: s.tableNumber,
      capacity: s.capacity,
      currentOccupancy: s.currentOccupancy,
      availableSeats: s.availableSeats,
      sharedAdminGuestsAtTable: s.sharedAdminCount,
      avgAgeDifference: s.ageDiff !== null ? Math.round(s.ageDiff * 10) / 10 : null,
    })),
  };
}

// ── Add Reminder ──────────────────────────────────────────────────────────────

export async function handleAddReminder(
  ctx: ToolContext,
  args: { title: string; description?: string; dueDate?: string; dueDateRelative?: string },
) {
  if (!ctx.weddingId) return { error: 'No wedding context available' };
  const { title, description, dueDate, dueDateRelative } = args;

  const wedding = await prisma.wedding.findUnique({
    where: { id: ctx.weddingId },
    select: { wedding_date: true, default_language: true },
  });
  if (!wedding) return { error: 'Wedding not found' };

  const sectionNames: Record<string, string> = {
    EN: 'Reminders', ES: 'Recordatorios', DE: 'Erinnerungen', FR: 'Rappels', IT: 'Promemoria',
  };
  const localizedSectionName = sectionNames[wedding.default_language] || 'Reminders';

  let section = await prisma.checklistSection.findFirst({
    where: { wedding_id: ctx.weddingId, name: localizedSectionName, template_id: null },
  });
  if (!section) {
    const lastSection = await prisma.checklistSection.findFirst({
      where: { wedding_id: ctx.weddingId, template_id: null },
      orderBy: { order: 'desc' },
    });
    section = await createSection({
      wedding_id: ctx.weddingId,
      name: localizedSectionName,
      order: (lastSection?.order ?? 0) + 1,
    });
  }

  let absoluteDate: Date | null = null;
  if (dueDate) {
    absoluteDate = new Date(dueDate);
  } else if (dueDateRelative && wedding.wedding_date) {
    try {
      absoluteDate = convertRelativeDateToAbsolute(dueDateRelative as RelativeDateFormat, wedding.wedding_date);
    } catch { /* ignore */ }
  }

  const lastTask = await prisma.checklistTask.findFirst({
    where: { wedding_id: ctx.weddingId, section_id: section.id },
    orderBy: { order: 'desc' },
  });

  const task = await createTask({
    wedding_id: ctx.weddingId,
    section_id: section.id,
    title,
    description: description ?? null,
    due_date: absoluteDate,
    due_date_relative: dueDateRelative ?? null,
    assigned_to: 'COUPLE',
    status: 'TODO',
    completed: false,
    order: (lastTask?.order ?? 0) + 1,
  });

  return {
    status: 'success',
    message: `Reminder "${title}" added to the "${localizedSectionName}" section.`,
    task: { id: task.id, title: task.title, dueDate: task.due_date?.toISOString(), dueDateRelative: task.due_date_relative },
  };
}

// ── Planner Weddings ──────────────────────────────────────────────────────────

export async function handleGetPlannerWeddings(ctx: ToolContext) {
  if (!ctx.plannerId) return { error: 'No planner context available' };
  const weddings = await prisma.wedding.findMany({
    where: { planner_id: ctx.plannerId },
    select: {
      id: true,
      couple_names: true,
      wedding_date: true,
      families: { select: { members: { select: { attending: true } } } },
    },
    orderBy: { wedding_date: 'asc' },
  });
  return weddings.map((w) => {
    const total = w.families.length;
    const submitted = w.families.filter((f) => f.members.some((m) => m.attending !== null)).length;
    return {
      id: w.id,
      coupleNames: w.couple_names,
      weddingDate: w.wedding_date.toISOString().split('T')[0],
      totalFamilies: total,
      rsvpSubmitted: submitted,
      rsvpPending: total - submitted,
      completionPct: total > 0 ? Math.round((submitted / total) * 100) : 0,
    };
  });
}

// ── Wedding Invoices (wedding-scoped) ─────────────────────────────────────────

export async function handleGetWeddingInvoices(ctx: ToolContext) {
  if (!ctx.weddingId) return { error: 'No wedding context available' };
  const invoices = await prisma.invoice.findMany({
    where: {
      OR: [
        { quote: { converted_to_wedding_id: ctx.weddingId } },
        { contract: { weddings: { some: { id: ctx.weddingId } } } },
      ],
    },
    include: {
      line_items: { select: { name: true, quantity: true, unit_price: true } },
      payments: { select: { amount: true, payment_date: true } },
    },
    orderBy: { created_at: 'desc' },
  });
  return invoices.map((inv) => {
    const total = inv.line_items.reduce((sum, li) => sum + Number(li.quantity) * Number(li.unit_price), 0);
    const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      status: inv.status,
      total,
      paid,
      outstanding: total - paid,
      lineItemCount: inv.line_items.length,
      paymentCount: inv.payments.length,
    };
  });
}

// ── Wedding Providers ─────────────────────────────────────────────────────────

export async function handleGetWeddingProviders(ctx: ToolContext) {
  if (!ctx.weddingId) return { error: 'No wedding context available' };
  const weddingProviders = await prisma.weddingProvider.findMany({
    where: { wedding_id: ctx.weddingId },
    include: {
      category: { select: { name: true } },
      provider: { select: { name: true, phone: true, email: true } },
      payments: { select: { amount: true, date: true } },
    },
    orderBy: { created_at: 'asc' },
  });
  return weddingProviders.map((wp) => {
    const totalPaid = wp.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const agreedAmount = wp.total_price ? Number(wp.total_price) : null;
    return {
      providerName: wp.provider?.name || wp.name || 'Unknown',
      category: wp.category.name,
      agreedAmount,
      totalPaid,
      outstanding: agreedAmount !== null ? agreedAmount - totalPaid : null,
      phone: wp.provider?.phone || wp.phone,
      email: wp.provider?.email || wp.email,
    };
  });
}

// ── Wedding Itinerary ─────────────────────────────────────────────────────────

export async function handleGetWeddingItinerary(ctx: ToolContext) {
  if (!ctx.weddingId) return { error: 'No wedding context available' };
  const items = await prisma.itineraryItem.findMany({
    where: { wedding_id: ctx.weddingId },
    orderBy: { order: 'asc' },
    include: {
      location: {
        select: { name: true, address: true, google_maps_url: true, url: true, notes: true },
      },
    },
  });
  if (items.length === 0) return { status: 'no_itinerary', message: 'No itinerary has been set up for this wedding yet.' };
  return {
    itemCount: items.length,
    items: items.map((item) => ({
      type: item.item_type,
      dateTime: item.date_time.toISOString(),
      notes: item.notes,
      location: {
        name: item.location.name,
        address: item.location.address,
        googleMapsUrl: item.location.google_maps_url,
        websiteUrl: item.location.url,
        notes: item.location.notes,
      },
    })),
  };
}

// ── Wedding Schedule ──────────────────────────────────────────────────────────

export async function handleGetWeddingSchedule(ctx: ToolContext) {
  if (!ctx.weddingId) return { error: 'No wedding context available' };
  const { schedule, blocks } = await getWeddingSchedule(ctx.weddingId);
  if (!schedule) return { status: 'no_schedule', message: 'No schedule has been created for this wedding yet.' };

  const blocksWithTimes = computeScheduleWithTimes(blocks, schedule.start_time);
  return {
    startTime: schedule.start_time,
    notes: schedule.notes,
    blocks: blocksWithTimes.map((b) => ({
      name: b.name,
      startTime: b.block_start_time,
      endTime: b.block_end_time,
      isParallel: b.offset_minutes !== null && b.offset_minutes !== undefined,
      offsetMinutes: b.offset_minutes,
      totalDurationMinutes: b.stages.reduce((sum, s) => sum + s.duration_minutes, 0),
      stages: b.stages.map((s) => ({
        name: s.name,
        startTime: s.calculated_start_time,
        endTime: s.calculated_end_time,
        durationMinutes: s.duration_minutes,
        notes: s.notes,
        visibleToCouple: s.visible_to_couple,
        provider: s.wedding_provider
          ? {
              name: s.wedding_provider.name,
              category: s.wedding_provider.category.name,
              phone: s.wedding_provider.phone,
              email: s.wedding_provider.email,
            }
          : null,
      })),
    })),
  };
}

// ── Tasting Menu ──────────────────────────────────────────────────────────────

export async function handleGetTastingMenu(ctx: ToolContext) {
  if (!ctx.weddingId) return { error: 'No wedding context available' };
  const menus = await prisma.tastingMenu.findMany({
    where: { wedding_id: ctx.weddingId },
    orderBy: { round_number: 'asc' },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { dishes: { orderBy: { order: 'asc' }, select: { id: true, name: true, description: true, is_selected: true, order: true } } },
      },
      participants: { select: { id: true } },
    },
  });
  if (menus.length === 0) return { status: 'no_menu', message: 'No tasting menu has been created for this wedding yet.' };
  return menus.map((menu) => ({
    round: menu.round_number,
    title: menu.title,
    description: menu.description,
    tastingDate: menu.tasting_date?.toISOString() ?? null,
    status: computeEffectiveStatus(menu.status, menu.tasting_date),
    participantCount: menu.participants.length,
    sections: menu.sections.map((section) => ({
      name: section.name,
      dishes: section.dishes.map((dish) => ({ name: dish.name, description: dish.description, isSelected: dish.is_selected })),
    })),
  }));
}

// ── Tasting Scores ────────────────────────────────────────────────────────────

export async function handleGetTastingScores(ctx: ToolContext, args: { roundNumber?: number }) {
  if (!ctx.weddingId) return { error: 'No wedding context available' };
  const { roundNumber } = args;

  const menus = await prisma.tastingMenu.findMany({
    where: {
      wedding_id: ctx.weddingId,
      ...(roundNumber !== undefined ? { round_number: roundNumber } : {}),
    },
    orderBy: { round_number: 'asc' },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          dishes: {
            orderBy: { order: 'asc' },
            include: { scores: { include: { participant: { select: { name: true } } } } },
          },
        },
      },
      participants: { select: { id: true, name: true, invite_sent_at: true } },
    },
  });

  if (menus.length === 0) return { status: 'no_menu', message: 'No tasting menu found for the specified round.' };

  return menus.map((menu) => {
    const totalParticipants = menu.participants.length;
    let totalScores = 0;
    let scoredDishCount = 0;

    const sections = menu.sections.map((section) => ({
      name: section.name,
      dishes: section.dishes.map((dish) => {
        const scoreValues = dish.scores.map((s) => s.score);
        const avg = scoreValues.length > 0
          ? Math.round((scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) * 10) / 10
          : null;
        if (avg !== null) { totalScores += avg; scoredDishCount++; }
        return {
          name: dish.name,
          isSelected: dish.is_selected,
          averageScore: avg,
          responseCount: dish.scores.length,
          scores: dish.scores.map((s) => ({ participant: s.participant.name, score: s.score, notes: s.notes })),
        };
      }),
    }));

    return {
      round: menu.round_number,
      title: menu.title,
      tastingDate: menu.tasting_date?.toISOString() ?? null,
      totalParticipants,
      overallAverageScore: scoredDishCount > 0 ? Math.round((totalScores / scoredDishCount) * 10) / 10 : null,
      sections,
    };
  });
}

// ── List Quotes ───────────────────────────────────────────────────────────────

export async function handleListQuotes(
  ctx: ToolContext,
  args: { status?: string; search?: string },
) {
  if (!ctx.plannerId) return { error: 'No planner context available' };
  const { status, search } = args;
  const quotes = await prisma.quote.findMany({
    where: {
      planner_id: ctx.plannerId,
      ...(status ? { status: status as 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' } : {}),
      ...(search ? {
        OR: [
          { couple_names: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
    },
    select: {
      id: true, couple_names: true, status: true, event_date: true,
      total: true, currency: true, expires_at: true, version: true, created_at: true,
      customer: { select: { name: true, email: true } },
    },
    orderBy: { created_at: 'desc' },
  });
  return {
    count: quotes.length,
    quotes: quotes.map((q) => ({
      id: q.id,
      coupleNames: q.couple_names,
      customer: q.customer?.name ?? null,
      customerEmail: q.customer?.email ?? null,
      status: q.status,
      eventDate: q.event_date?.toISOString().split('T')[0] ?? null,
      total: Number(q.total),
      currency: q.currency,
      expiresAt: q.expires_at?.toISOString().split('T')[0] ?? null,
      version: q.version,
      createdAt: q.created_at.toISOString().split('T')[0],
    })),
  };
}

// ── Get Quote Detail ──────────────────────────────────────────────────────────

export async function handleGetQuoteDetail(ctx: ToolContext, args: { quoteId: string }) {
  if (!ctx.plannerId) return { error: 'No planner context available' };
  const quote = await prisma.quote.findFirst({
    where: { id: args.quoteId, planner_id: ctx.plannerId },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      line_items: { select: { name: true, description: true, quantity: true, unit_price: true, total: true } },
    },
  });
  if (!quote) return { error: `Quote ${args.quoteId} not found` };
  return {
    id: quote.id,
    coupleNames: quote.couple_names,
    customer: quote.customer,
    status: quote.status,
    eventDate: quote.event_date?.toISOString().split('T')[0] ?? null,
    location: quote.location,
    notes: quote.notes,
    currency: quote.currency,
    subtotal: Number(quote.subtotal),
    discount: quote.discount ? Number(quote.discount) : null,
    taxRate: quote.tax_rate ? Number(quote.tax_rate) : null,
    total: Number(quote.total),
    expiresAt: quote.expires_at?.toISOString().split('T')[0] ?? null,
    version: quote.version,
    lineItems: quote.line_items.map((li) => ({
      name: li.name,
      description: li.description,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unit_price),
      total: Number(li.total),
    })),
  };
}

// ── List Contracts ────────────────────────────────────────────────────────────

export async function handleListContracts(
  ctx: ToolContext,
  args: { status?: string; search?: string },
) {
  if (!ctx.plannerId) return { error: 'No planner context available' };
  const { status, search } = args;
  const contracts = await prisma.contract.findMany({
    where: {
      planner_id: ctx.plannerId,
      ...(status ? { status: status as 'DRAFT' | 'SHARED' | 'SIGNING' | 'SIGNED' | 'CANCELLED' } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { signer_name: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    select: {
      id: true, title: true, status: true, signed_at: true,
      signer_name: true, signer_email: true, created_at: true,
      customer: { select: { name: true, email: true } },
      quote: { select: { couple_names: true, total: true, currency: true } },
    },
    orderBy: { created_at: 'desc' },
  });
  return {
    count: contracts.length,
    contracts: contracts.map((c) => ({
      id: c.id,
      title: c.title,
      customer: c.customer?.name ?? null,
      customerEmail: c.customer?.email ?? null,
      coupleNames: c.quote?.couple_names ?? null,
      quoteTotal: c.quote?.total ? Number(c.quote.total) : null,
      quoteCurrency: c.quote?.currency ?? null,
      status: c.status,
      signerName: c.signer_name,
      signerEmail: c.signer_email,
      signedAt: c.signed_at?.toISOString().split('T')[0] ?? null,
      createdAt: c.created_at.toISOString().split('T')[0],
    })),
  };
}

// ── List Invoices (planner-wide) ──────────────────────────────────────────────

export async function handleListInvoices(
  ctx: ToolContext,
  args: { status?: string; search?: string },
) {
  if (!ctx.plannerId) return { error: 'No planner context available' };
  const { status, search } = args;
  const invoices = await prisma.invoice.findMany({
    where: {
      planner_id: ctx.plannerId,
      ...(status ? { status: status as 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' } : {}),
      ...(search ? {
        OR: [
          { invoice_number: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { quote: { couple_names: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
    },
    select: {
      id: true, invoice_number: true, type: true, status: true,
      currency: true, total: true, amount_paid: true,
      issued_at: true, due_date: true,
      customer: { select: { name: true } },
      quote: { select: { couple_names: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  const totalCollected = invoices
    .filter((inv) => ['ISSUED', 'PARTIAL', 'PAID'].includes(inv.status))
    .reduce((sum, inv) => sum + Number(inv.amount_paid), 0);

  return {
    count: invoices.length,
    totalCollected: Math.round(totalCollected * 100) / 100,
    invoices: invoices.map((inv) => {
      const total = Number(inv.total);
      const paid = Number(inv.amount_paid);
      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        type: inv.type,
        customer: inv.customer?.name ?? null,
        coupleNames: inv.quote?.couple_names ?? null,
        status: inv.status,
        currency: inv.currency,
        total,
        paid,
        outstanding: Math.round((total - paid) * 100) / 100,
        issuedAt: inv.issued_at?.toISOString().split('T')[0] ?? null,
        dueDate: inv.due_date?.toISOString().split('T')[0] ?? null,
      };
    }),
  };
}

// ── Record Invoice Payment ────────────────────────────────────────────────────

export async function handleRecordInvoicePayment(
  ctx: ToolContext,
  args: { invoiceId: string; amount: number; paymentDate: string; method?: string; reference?: string },
) {
  if (!ctx.plannerId) return { error: 'No planner context available' };
  const { invoiceId, amount, paymentDate, method, reference } = args;

  try {
    const result = await recordInvoicePayment(ctx.plannerId, invoiceId, {
      amount,
      paymentDate: new Date(paymentDate),
      method: method as 'CASH' | 'BANK_TRANSFER' | 'PAYPAL' | 'BIZUM' | 'REVOLUT' | 'OTHER' | undefined,
      reference: reference ?? null,
    });

    const { updatedInvoice, totalPaid, invoiceTotal, newStatus } = result;
    return {
      status: 'success',
      message: `Payment of ${amount} ${updatedInvoice.currency} recorded on invoice ${updatedInvoice.invoice_number}.`,
      invoiceNumber: updatedInvoice.invoice_number,
      amountRecorded: amount,
      totalPaid: Math.round(totalPaid * 100) / 100,
      outstanding: Math.round((invoiceTotal - totalPaid) * 100) / 100,
      newInvoiceStatus: newStatus,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

type Handler = (ctx: ToolContext, args: Record<string, unknown>) => Promise<unknown>;

const HANDLERS: Record<string, Handler> = {
  get_guest_list:             (ctx) => handleGetGuestList(ctx),
  get_rsvp_status:            (ctx) => handleGetRsvpStatus(ctx),
  get_guests_by_label:        (ctx, a) => handleGetGuestsByLabel(ctx, a as Parameters<typeof handleGetGuestsByLabel>[1]),
  update_family_rsvp:         (ctx, a) => handleUpdateFamilyRsvp(ctx, a as Parameters<typeof handleUpdateFamilyRsvp>[1]),
  assign_family_to_table:     (ctx, a) => handleAssignFamilyToTable(ctx, a as Parameters<typeof handleAssignFamilyToTable>[1]),
  suggest_tables_for_family:  (ctx, a) => handleSuggestTablesForFamily(ctx, a as Parameters<typeof handleSuggestTablesForFamily>[1]),
  add_reminder:               (ctx, a) => handleAddReminder(ctx, a as Parameters<typeof handleAddReminder>[1]),
  get_planner_weddings:       (ctx) => handleGetPlannerWeddings(ctx),
  get_wedding_invoices:       (ctx) => handleGetWeddingInvoices(ctx),
  get_wedding_providers:      (ctx) => handleGetWeddingProviders(ctx),
  get_wedding_itinerary:      (ctx) => handleGetWeddingItinerary(ctx),
  get_wedding_schedule:       (ctx) => handleGetWeddingSchedule(ctx),
  get_tasting_menu:           (ctx) => handleGetTastingMenu(ctx),
  get_tasting_scores:         (ctx, a) => handleGetTastingScores(ctx, a as Parameters<typeof handleGetTastingScores>[1]),
  list_quotes:                (ctx, a) => handleListQuotes(ctx, a as Parameters<typeof handleListQuotes>[1]),
  get_quote_detail:           (ctx, a) => handleGetQuoteDetail(ctx, a as Parameters<typeof handleGetQuoteDetail>[1]),
  list_contracts:             (ctx, a) => handleListContracts(ctx, a as Parameters<typeof handleListContracts>[1]),
  list_invoices:              (ctx, a) => handleListInvoices(ctx, a as Parameters<typeof handleListInvoices>[1]),
  record_invoice_payment:     (ctx, a) => handleRecordInvoicePayment(ctx, a as Parameters<typeof handleRecordInvoicePayment>[1]),
};

export async function callHandler(
  toolName: string,
  ctx: ToolContext,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const handler = HANDLERS[toolName];
  if (!handler) throw new Error(`Unknown tool: ${toolName}`);
  return handler(ctx, args);
}
