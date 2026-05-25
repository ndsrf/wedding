/**
 * Agentic Tool Definitions
 *
 * Vercel AI SDK tool() definitions for use in streamText agentic loops.
 * Tools are context-bound — tenant IDs come from ctx, never from LLM arguments.
 *
 * Tools:
 *   search_knowledge_base - RAG search over DocumentChunk
 *   get_guest_list        - Summary of wedding guest families
 *   get_rsvp_status       - Aggregate RSVP counts and completion percentage
 *
 * Depends on: retrieval.ts, prisma.ts
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import type { ToolSet } from 'ai';
import { retrieveChunks } from './retrieval';
import { prisma } from '@/lib/db/prisma';
import { convertRelativeDateToAbsolute } from '@/lib/checklist/date-converter';
import type { RelativeDateFormat } from '@/lib/checklist/date-converter';
import { getWeddingSchedule } from '@/lib/schedule/crud';
import { computeScheduleWithTimes } from '@/types/schedule';
import { computeEffectiveStatus } from '@/lib/tasting/status';

export interface ToolContext {
  weddingId?: string;
  plannerId?: string;
  role: 'wedding_admin' | 'planner';
}

export function buildTools(ctx: ToolContext): ToolSet {
  return {
    // ── RAG Knowledge Base Search ──────────────────────────────────────────
    search_knowledge_base: tool({
      description:
        'Search the platform documentation and wedding knowledge base. ' +
        'MANDATORY for any questions about how features work, navigation, or business workflows. ' +
        'Examples: "how to create a quote", "how to manage providers", "digital signatures", "guest rsvp setup". ' +
        'Returns specific instructions and deep links.',
      inputSchema: zodSchema(
        z.object({
          query: z.string().describe('The search query (English or Spanish) to find relevant documentation'),
        }),
      ),
      execute: async ({ query }: { query: string }) => {
        try {
          const chunks = await retrieveChunks({
            query,
            weddingId: ctx.weddingId,
            plannerId: ctx.plannerId,
            role: ctx.role,
          });
          return chunks.map((c) => ({
            content: c.content,
            sourceName: c.sourceName,
            // SYSTEM_MANUAL docs (e.g. platform docs) should surface a
            // clickable URL in the References section of the chat reply.
            fullUrl: c.fullUrl,
            weddingProviderId: c.weddingProviderId,
            paymentId: c.paymentId,
            locationId: c.locationId,
          }));
        } catch (err) {
          console.error('[TOOLS] search_knowledge_base error:', err);
          return { error: 'Failed to search knowledge base' };
        }
      },
    }),

    // ── Guest List Summary ─────────────────────────────────────────────────
    get_guest_list: tool({
      description:
        'Get a summary of the wedding guest list including family names, contact info, and RSVP status.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          const families = await prisma.family.findMany({
            where: { wedding_id: ctx.weddingId },
            include: {
              members: { select: { name: true, attending: true, type: true } },
            },
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
        } catch (err) {
          console.error('[TOOLS] get_guest_list error:', err);
          return { error: 'Failed to retrieve guest list' };
        }
      },
    }),

    // ── RSVP Status Summary ────────────────────────────────────────────────
    get_rsvp_status: tool({
      description:
        'Get aggregate RSVP statistics. ' +
        'totalFamilies = number of contact groups; totalPeople = number of individual people invited. ' +
        'attending/notAttending/pendingPeople are all individual person counts.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          const families = await prisma.family.findMany({
            where: { wedding_id: ctx.weddingId },
            include: {
              members: { select: { attending: true } },
            },
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
        } catch (err) {
          console.error('[TOOLS] get_rsvp_status error:', err);
          return { error: 'Failed to retrieve RSVP status' };
        }
      },
    }),

    // ── Guests by Label ───────────────────────────────────────────────────
    get_guests_by_label: tool({
      description:
        'Get the count of individual people (not families) that belong to families tagged with a specific label. ' +
        'Label matching is case-insensitive. Use this whenever the user asks "how many people/guests have label X" or "cuánta gente tiene la etiqueta X".',
      inputSchema: zodSchema(
        z.object({
          labelName: z.string().describe('The label name to filter by (case-insensitive, e.g. "Bus", "bus", "BUS")'),
        }),
      ),
      execute: async ({ labelName }: { labelName: string }) => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          const families = await prisma.family.findMany({
            where: {
              wedding_id: ctx.weddingId,
              labels: {
                some: {
                  label: { name: { equals: labelName, mode: 'insensitive' } },
                },
              },
            },
            include: {
              members: { select: { name: true, attending: true, type: true } },
            },
            orderBy: { name: 'asc' },
          });

          const allMembers = families.flatMap((f) => f.members);
          const totalPeople = allMembers.length;
          const attending = allMembers.filter((m) => m.attending === true).length;
          const notAttending = allMembers.filter((m) => m.attending === false).length;
          const pendingPeople = allMembers.filter((m) => m.attending === null).length;

          return {
            labelName,
            totalFamilies: families.length,
            totalPeople,
            attending,
            notAttending,
            pendingPeople,
            families: families.map((f) => ({
              name: f.name,
              totalMembers: f.members.length,
              attending: f.members.filter((m) => m.attending === true).length,
              notAttending: f.members.filter((m) => m.attending === false).length,
              pending: f.members.filter((m) => m.attending === null).length,
            })),
          };
        } catch (err) {
          console.error('[TOOLS] get_guests_by_label error:', err);
          return { error: 'Failed to retrieve guests by label' };
        }
      },
    }),

    // ── Update Family RSVP ────────────────────────────────────────────────
    update_family_rsvp: tool({
      description:
        'Update the RSVP attendance for a family or specific individual members within a family. ' +
        'IMPORTANT — choose the right parameters: ' +
        '(1) If specific member names are mentioned (e.g. "John is coming but Elena is not"), you MUST use memberUpdates — never set the top-level attending flag for individual-level requests. ' +
        '(2) Only set the top-level attending flag when the whole family is referred to without naming individuals (e.g. "the Smith family is coming"). ' +
        '(3) You may combine both: memberUpdates for named members + attending as a default for the rest.',
      inputSchema: zodSchema(
        z.object({
          familyName: z.string().describe('The name of the family to update (e.g., "Smith")'),
          attending: z
            .boolean()
            .optional()
            .describe(
              'Whole-family default: set ONLY when no specific member names are mentioned. ' +
              'When combined with memberUpdates this becomes the fallback for members not listed in memberUpdates.',
            ),
          memberUpdates: z
            .array(
              z.object({
                memberName: z.string().describe('The name of the individual family member'),
                attending: z.boolean().describe('Whether this specific member is attending'),
              }),
            )
            .optional()
            .describe(
              'REQUIRED whenever specific member names are mentioned. ' +
              'List every named member with their individual attending status.',
            ),
        }),
      ),
      execute: async ({ familyName, attending, memberUpdates }) => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          // Search for families matching the name (case-insensitive)
          const families = await prisma.family.findMany({
            where: {
              wedding_id: ctx.weddingId,
              name: { contains: familyName, mode: 'insensitive' },
            },
            include: {
              members: { select: { id: true, name: true, attending: true } },
            },
          });

          if (families.length === 0) {
            return { error: `No family found matching "${familyName}"` };
          }

          // If multiple families match, return them for clarification
          if (families.length > 1) {
            return {
              status: 'ambiguous',
              message: `Multiple families found matching "${familyName}". Please clarify which one you mean.`,
              families: families.map((f) => ({
                id: f.id,
                name: f.name,
                members: f.members.map((m) => m.name),
              })),
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
              if (!member) {
                notFound.push(update.memberName);
                continue;
              }
              toUpdate.push({ id: member.id, attending: update.attending, name: member.name });
              updatedIds.push(member.id);
            }

            // Batch writes: group by attending value → at most 2 updateMany calls
            if (toUpdate.length > 0) {
              const groups = toUpdate.reduce((acc, u) => {
                const key = String(u.attending);
                if (!acc[key]) acc[key] = { attending: u.attending, ids: [] };
                acc[key].ids.push(u.id);
                return acc;
              }, {} as Record<string, { attending: boolean; ids: string[] }>);

              await prisma.$transaction(
                Object.values(groups).map(({ attending, ids }) =>
                  prisma.familyMember.updateMany({ where: { id: { in: ids } }, data: { attending } })
                )
              );

              for (const u of toUpdate) {
                results.push({ member: u.name, attending: u.attending });
              }
            }

            // Also apply the family-wide flag to remaining members if provided
            if (attending !== undefined) {
              await prisma.familyMember.updateMany({
                where: { family_id: family.id, id: { notIn: updatedIds } },
                data: { attending },
              });
              const remaining = family.members.filter((m) => !updatedIds.includes(m.id));
              for (const m of remaining) {
                results.push({ member: m.name, attending });
              }
            }
          } else if (attending !== undefined) {
            // Whole-family update
            await prisma.familyMember.updateMany({
              where: { family_id: family.id },
              data: { attending },
            });
            for (const m of family.members) {
              results.push({ member: m.name, attending });
            }
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
        } catch (err) {
          console.error('[TOOLS] update_family_rsvp error:', err);
          return { error: 'Failed to update RSVP status' };
        }
      },
    }),

    // ── Assign Family to Table ─────────────────────────────────────────────
    assign_family_to_table: tool({
      description:
        'Assign the attending members of a family to a specific table. Optionally limit which members are assigned. Clears any previous table assignment for the affected members first.',
      inputSchema: zodSchema(
        z.object({
          familyName: z.string().describe('The name of the family to seat'),
          tableNumber: z.number().int().describe('The table number to assign the family to'),
          memberNames: z
            .array(z.string())
            .optional()
            .describe(
              'Specific member names to assign. If omitted, all attending members of the family are assigned.',
            ),
        }),
      ),
      execute: async ({ familyName, tableNumber, memberNames }) => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          // Resolve family
          const families = await prisma.family.findMany({
            where: {
              wedding_id: ctx.weddingId,
              name: { contains: familyName, mode: 'insensitive' },
            },
            include: {
              members: { select: { id: true, name: true, attending: true } },
            },
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

          // Resolve table
          const table = await prisma.table.findUnique({
            where: { wedding_id_number: { wedding_id: ctx.weddingId, number: tableNumber } },
            include: { assigned_guests: { select: { id: true } } },
          });

          if (!table) return { error: `Table ${tableNumber} not found` };

          // Determine which members to assign
          let targets = family.members.filter((m) => m.attending === true);
          if (memberNames && memberNames.length > 0) {
            const lowerNames = memberNames.map((n) => n.toLowerCase());
            targets = targets.filter((m) => lowerNames.includes(m.name.toLowerCase()));
          }

          if (targets.length === 0) {
            return { error: 'No attending members found to assign (check RSVP status).' };
          }

          const currentOccupancy = table.assigned_guests.length;
          if (currentOccupancy + targets.length > table.capacity) {
            return {
              error: `Table ${tableNumber} does not have enough space. Capacity: ${table.capacity}, current occupancy: ${currentOccupancy}, trying to add: ${targets.length}.`,
            };
          }

          // Assign members
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
        } catch (err) {
          console.error('[TOOLS] assign_family_to_table error:', err);
          return { error: 'Failed to assign family to table' };
        }
      },
    }),

    // ── Suggest Tables for a Family ────────────────────────────────────────
    suggest_tables_for_family: tool({
      description:
        'Find the best table(s) for a family to sit at. Ranks tables by: (1) has enough free seats for all attending members, (2) most other guests at that table share the same invited_by_admin_id as this family, (3) closest average age to the family\'s attending members (when age data is available).',
      inputSchema: zodSchema(
        z.object({
          familyName: z.string().describe('The name of the family to find a table for'),
          topN: z
            .number()
            .int()
            .optional()
            .default(3)
            .describe('How many table suggestions to return (default 3)'),
        }),
      ),
      execute: async ({ familyName, topN }) => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          // Resolve family
          const families = await prisma.family.findMany({
            where: {
              wedding_id: ctx.weddingId,
              name: { contains: familyName, mode: 'insensitive' },
            },
            include: {
              members: {
                where: { attending: true },
                select: { id: true, name: true, age: true },
              },
            },
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

          if (attendingCount === 0) {
            return { error: `No attending members in family "${family.name}" to seat.` };
          }

          const invitedByAdminId = family.invited_by_admin_id ?? null;

          // Compute average age of the family's attending members (null if no ages entered)
          const familyAges = family.members.map((m) => m.age).filter((a): a is number => a !== null && a !== undefined);
          const familyAvgAge = familyAges.length > 0 ? familyAges.reduce((s, a) => s + a, 0) / familyAges.length : null;

          // Fetch all tables with their current guests (family admin id + age for similarity)
          const tables = await prisma.table.findMany({
            where: { wedding_id: ctx.weddingId },
            include: {
              assigned_guests: {
                select: {
                  age: true,
                  family: {
                    select: { invited_by_admin_id: true },
                  },
                },
              },
            },
            orderBy: { number: 'asc' },
          });

          type TableSuggestion = {
            tableNumber: number;
            capacity: number;
            currentOccupancy: number;
            availableSeats: number;
            sharedAdminCount: number;
            ageDiff: number | null; // absolute difference between family avg age and table avg age
          };

          const suggestions: TableSuggestion[] = [];

          for (const t of tables) {
            const currentOccupancy = t.assigned_guests.length;
            const availableSeats = t.capacity - currentOccupancy;

            if (availableSeats < attendingCount) continue; // not enough room

            // Count guests at this table sharing the same invited_by_admin_id
            const sharedAdminCount = invitedByAdminId
              ? t.assigned_guests.filter(
                  (g) => g.family?.invited_by_admin_id === invitedByAdminId,
                ).length
              : 0;

            // Compute age similarity: average age of guests already at the table
            let ageDiff: number | null = null;
            if (familyAvgAge !== null) {
              const tableAges = t.assigned_guests
                .map((g) => g.age)
                .filter((a): a is number => a !== null && a !== undefined);
              if (tableAges.length > 0) {
                const tableAvgAge = tableAges.reduce((s, a) => s + a, 0) / tableAges.length;
                ageDiff = Math.abs(familyAvgAge - tableAvgAge);
              }
            }

            suggestions.push({
              tableNumber: t.number,
              capacity: t.capacity,
              currentOccupancy,
              availableSeats,
              sharedAdminCount,
              ageDiff,
            });
          }

          if (suggestions.length === 0) {
            return {
              status: 'no_space',
              message: `No table has enough space for ${attendingCount} attending member(s) from "${family.name}".`,
              attendingCount,
            };
          }

          // Sort: (1) most shared-admin guests, (2) closest average age (nulls last), (3) most available seats
          suggestions.sort((a, b) => {
            if (b.sharedAdminCount !== a.sharedAdminCount) return b.sharedAdminCount - a.sharedAdminCount;
            if (a.ageDiff !== null && b.ageDiff !== null) return a.ageDiff - b.ageDiff;
            if (a.ageDiff !== null) return -1; // a has age data, prefer it
            if (b.ageDiff !== null) return 1;
            return b.availableSeats - a.availableSeats;
          });

          const top = suggestions.slice(0, topN ?? 3);

          return {
            status: 'success',
            family: family.name,
            attendingCount,
            familyAvgAge,
            invitedByAdminId,
            suggestions: top.map((s) => ({
              tableNumber: s.tableNumber,
              capacity: s.capacity,
              currentOccupancy: s.currentOccupancy,
              availableSeats: s.availableSeats,
              sharedAdminGuestsAtTable: s.sharedAdminCount,
              avgAgeDifference: s.ageDiff !== null ? Math.round(s.ageDiff * 10) / 10 : null,
            })),
          };
        } catch (err) {
          console.error('[TOOLS] suggest_tables_for_family error:', err);
          return { error: 'Failed to suggest tables' };
        }
      },
    }),

    // ── Add Reminder to Checklist ──────────────────────────────────────────
    add_reminder: tool({
      description:
        'Add a reminder or task to the wedding checklist under the "Reminders" section. Use this for actions like "Remind me to do X tomorrow" or "Remind me to do X 2 months before the wedding".',
      inputSchema: zodSchema(
        z.object({
          title: z.string().describe('The title of the reminder or task'),
          description: z.string().optional().describe('Additional details about the reminder'),
          dueDate: z.string().optional().describe('The absolute due date in YYYY-MM-DD format (if known)'),
          dueDateRelative: z
            .string()
            .optional()
            .describe(
              'The relative due date in WEDDING_DATE[+-]days format (e.g. "WEDDING_DATE-60" for 2 months before)',
            ),
        }),
      ),
      execute: async ({ title, description, dueDate, dueDateRelative }) => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };

        try {
          // 1. Fetch wedding info (date and language)
          const wedding = await prisma.wedding.findUnique({
            where: { id: ctx.weddingId },
            select: { wedding_date: true, default_language: true },
          });

          if (!wedding) return { error: 'Wedding not found' };

          // 2. Localize section name
          const sectionNames: Record<string, string> = {
            EN: 'Reminders',
            ES: 'Recordatorios',
            DE: 'Erinnerungen',
            FR: 'Rappels',
            IT: 'Promemoria',
          };
          const localizedSectionName = sectionNames[wedding.default_language] || 'Reminders';

          // 3. Find or create the section
          let section = await prisma.checklistSection.findFirst({
            where: {
              wedding_id: ctx.weddingId,
              name: localizedSectionName,
              template_id: null,
            },
          });

          if (!section) {
            const lastSection = await prisma.checklistSection.findFirst({
              where: { wedding_id: ctx.weddingId, template_id: null },
              orderBy: { order: 'desc' },
            });
            const nextOrder = (lastSection?.order ?? 0) + 1;

            section = await prisma.checklistSection.create({
              data: {
                wedding_id: ctx.weddingId,
                name: localizedSectionName,
                order: nextOrder,
              },
            });
          }

          // 4. Resolve absolute due date
          let absoluteDate: Date | null = null;
          if (dueDate) {
            absoluteDate = new Date(dueDate);
          } else if (dueDateRelative && wedding.wedding_date) {
            try {
              absoluteDate = convertRelativeDateToAbsolute(
                dueDateRelative as RelativeDateFormat,
                wedding.wedding_date,
              );
            } catch (err) {
              console.warn('[TOOLS] add_reminder date conversion error:', err);
            }
          }

          // 5. Create the task
          const lastTask = await prisma.checklistTask.findFirst({
            where: { wedding_id: ctx.weddingId, section_id: section.id },
            orderBy: { order: 'desc' },
          });
          const taskOrder = (lastTask?.order ?? 0) + 1;

          const task = await prisma.checklistTask.create({
            data: {
              wedding_id: ctx.weddingId,
              section_id: section.id,
              title,
              description,
              due_date: absoluteDate,
              due_date_relative: dueDateRelative,
              order: taskOrder,
              assigned_to: 'COUPLE',
            },
          });

          return {
            status: 'success',
            message: `Reminder "${title}" added to the "${localizedSectionName}" section.`,
            task: {
              id: task.id,
              title: task.title,
              dueDate: task.due_date?.toISOString(),
              dueDateRelative: task.due_date_relative,
            },
          };
        } catch (err) {
          console.error('[TOOLS] add_reminder error:', err);
          return { error: 'Failed to add reminder' };
        }
      },
    }),

    // ── Get Planner Weddings ──────────────────────────────────────────────
    get_planner_weddings: tool({
      description:
        'Get a list of all weddings managed by this planner. Returns wedding names, dates, guest counts, and RSVP completion.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        if (!ctx.plannerId) return { error: 'No planner context available' };
        try {
          const weddings = await prisma.wedding.findMany({
            where: { planner_id: ctx.plannerId },
            select: {
              id: true,
              couple_names: true,
              wedding_date: true,
              families: {
                select: { members: { select: { attending: true } } },
              },
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
        } catch (err) {
          console.error('[TOOLS] get_planner_weddings error:', err);
          return { error: 'Failed to retrieve weddings' };
        }
      },
    }),

    // ── Get Wedding Invoices ──────────────────────────────────────────────
    get_wedding_invoices: tool({
      description:
        'Get a summary of invoices and payments for the current wedding. Returns invoice status, amounts, and outstanding balances.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          // Find invoices linked to this wedding via quote or contract
          const invoices = await prisma.invoice.findMany({
            where: {
              OR: [
                { quote: { converted_to_wedding_id: ctx.weddingId } },
                { contract: { weddings: { some: { id: ctx.weddingId } } } }
              ]
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
        } catch (err) {
          console.error('[TOOLS] get_wedding_invoices error:', err);
          return { error: 'Failed to retrieve invoices' };
        }
      },
    }),

    // ── Get Wedding Providers ─────────────────────────────────────────────
    get_wedding_providers: tool({
      description:
        'Get the list of providers (vendors) assigned to the current wedding, including their category and payment status.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          const weddingProviders = await prisma.weddingProvider.findMany({
            where: { wedding_id: ctx.weddingId },
            include: {
              category: { select: { name: true } },
              provider: {
                select: {
                  name: true,
                  phone: true,
                  email: true,
                },
              },
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
        } catch (err) {
          console.error('[TOOLS] get_wedding_providers error:', err);
          return { error: 'Failed to retrieve providers' };
        }
      },
    }),

    // ── Get Wedding Itinerary (Locations) ────────────────────────────────
    get_wedding_itinerary: tool({
      description:
        'Get the list of locations and events in the wedding itinerary (ceremony venue, reception hall, pre-event, post-event, etc.). ' +
        'Use this when the user asks about where the wedding takes place, venue names, addresses, event times, or the order of events on the wedding day.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          const items = await prisma.itineraryItem.findMany({
            where: { wedding_id: ctx.weddingId },
            orderBy: { order: 'asc' },
            include: {
              location: {
                select: {
                  name: true,
                  address: true,
                  google_maps_url: true,
                  url: true,
                  notes: true,
                },
              },
            },
          });

          if (items.length === 0) {
            return { status: 'no_itinerary', message: 'No itinerary has been set up for this wedding yet.' };
          }

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
        } catch (err) {
          console.error('[TOOLS] get_wedding_itinerary error:', err);
          return { error: 'Failed to retrieve wedding itinerary' };
        }
      },
    }),

    // ── Get Wedding Schedule ──────────────────────────────────────────────
    get_wedding_schedule: tool({
      description:
        'Get the full wedding day schedule with blocks (e.g. Preparation, Ceremony, Reception) and their stages, including calculated start/end times for each stage. ' +
        'Use this when the user asks about the wedding timeline, what time something starts, how long a block takes, or which provider is assigned to a stage.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          const { schedule, blocks } = await getWeddingSchedule(ctx.weddingId);

          if (!schedule) {
            return { status: 'no_schedule', message: 'No schedule has been created for this wedding yet.' };
          }

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
        } catch (err) {
          console.error('[TOOLS] get_wedding_schedule error:', err);
          return { error: 'Failed to retrieve wedding schedule' };
        }
      },
    }),

    // ── Get Tasting Menu ─────────────────────────────────────────────────
    get_tasting_menu: tool({
      description:
        'Get the tasting menu(s) for the wedding: all rounds, sections, and dishes. ' +
        'Shows which dishes are selected as the final menu choice and the effective status (OPEN/CLOSED). ' +
        'Use this when the user asks about the menu, dishes, courses, what food is served, or the tasting menu content.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          const menus = await prisma.tastingMenu.findMany({
            where: { wedding_id: ctx.weddingId },
            orderBy: { round_number: 'asc' },
            include: {
              sections: {
                orderBy: { order: 'asc' },
                include: {
                  dishes: {
                    orderBy: { order: 'asc' },
                    select: { id: true, name: true, description: true, is_selected: true, order: true },
                  },
                },
              },
              participants: { select: { id: true } },
            },
          });

          if (menus.length === 0) {
            return { status: 'no_menu', message: 'No tasting menu has been created for this wedding yet.' };
          }

          return menus.map((menu) => ({
            round: menu.round_number,
            title: menu.title,
            description: menu.description,
            tastingDate: menu.tasting_date?.toISOString() ?? null,
            status: computeEffectiveStatus(menu.status, menu.tasting_date),
            participantCount: menu.participants.length,
            sections: menu.sections.map((section) => ({
              name: section.name,
              dishes: section.dishes.map((dish) => ({
                name: dish.name,
                description: dish.description,
                isSelected: dish.is_selected,
              })),
            })),
          }));
        } catch (err) {
          console.error('[TOOLS] get_tasting_menu error:', err);
          return { error: 'Failed to retrieve tasting menu' };
        }
      },
    }),

    // ── Get Tasting Scores ───────────────────────────────────────────────
    get_tasting_scores: tool({
      description:
        'Get the tasting scores submitted by participants for each dish, including per-dish averages and participant notes. ' +
        'Use this when the user asks about ratings, scores, which dish was best/worst, participant feedback, or tasting results.',
      inputSchema: zodSchema(
        z.object({
          roundNumber: z
            .number()
            .int()
            .optional()
            .describe('The tasting round to retrieve scores for (default: latest round with scores)'),
        }),
      ),
      execute: async ({ roundNumber }) => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          const menuWhere = roundNumber !== undefined
            ? { wedding_id: ctx.weddingId, round_number: roundNumber }
            : { wedding_id: ctx.weddingId };

          const menus = await prisma.tastingMenu.findMany({
            where: menuWhere,
            orderBy: { round_number: 'asc' },
            include: {
              sections: {
                orderBy: { order: 'asc' },
                include: {
                  dishes: {
                    orderBy: { order: 'asc' },
                    include: {
                      scores: {
                        include: {
                          participant: { select: { name: true } },
                        },
                      },
                    },
                  },
                },
              },
              participants: { select: { id: true, name: true, invite_sent_at: true } },
            },
          });

          if (menus.length === 0) {
            return { status: 'no_menu', message: 'No tasting menu found for the specified round.' };
          }

          return menus.map((menu) => {
            const totalParticipants = menu.participants.length;
            let totalScores = 0;
            let scoredDishCount = 0;

            const sections = menu.sections.map((section) => ({
              name: section.name,
              dishes: section.dishes.map((dish) => {
                const scores = dish.scores;
                const scoreValues = scores.map((s) => s.score);
                const avg = scoreValues.length > 0
                  ? Math.round((scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) * 10) / 10
                  : null;
                if (avg !== null) { totalScores += avg; scoredDishCount++; }
                return {
                  name: dish.name,
                  isSelected: dish.is_selected,
                  averageScore: avg,
                  responseCount: scores.length,
                  scores: scores.map((s) => ({
                    participant: s.participant.name,
                    score: s.score,
                    notes: s.notes,
                  })),
                };
              }),
            }));

            return {
              round: menu.round_number,
              title: menu.title,
              tastingDate: menu.tasting_date?.toISOString() ?? null,
              totalParticipants,
              overallAverageScore: scoredDishCount > 0
                ? Math.round((totalScores / scoredDishCount) * 10) / 10
                : null,
              sections,
            };
          });
        } catch (err) {
          console.error('[TOOLS] get_tasting_scores error:', err);
          return { error: 'Failed to retrieve tasting scores' };
        }
      },
    }),

    // ── List Quotes ───────────────────────────────────────────────────────
    list_quotes: tool({
      description:
        'List all quotes for this planner with their status, couple names, totals, and event dates. ' +
        'Optionally filter by status (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED) or search by couple/customer name. ' +
        'Use for questions like "show me pending quotes", "which quotes were accepted this year", or "do I have a quote for the García wedding".',
      inputSchema: zodSchema(
        z.object({
          status: z
            .enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'])
            .optional()
            .describe('Filter by quote status'),
          search: z
            .string()
            .optional()
            .describe('Partial match against couple_names or customer name (case-insensitive)'),
        }),
      ),
      execute: async ({ status, search }) => {
        if (!ctx.plannerId) return { error: 'No planner context available' };
        try {
          const quotes = await prisma.quote.findMany({
            where: {
              planner_id: ctx.plannerId,
              ...(status ? { status } : {}),
              ...(search
                ? {
                    OR: [
                      { couple_names: { contains: search, mode: 'insensitive' } },
                      { customer: { name: { contains: search, mode: 'insensitive' } } },
                    ],
                  }
                : {}),
            },
            select: {
              id: true,
              couple_names: true,
              status: true,
              event_date: true,
              total: true,
              currency: true,
              expires_at: true,
              version: true,
              created_at: true,
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
        } catch (err) {
          console.error('[TOOLS] list_quotes error:', err);
          return { error: 'Failed to retrieve quotes' };
        }
      },
    }),

    // ── Get Quote Detail ─────────────────────────────────────────────────
    get_quote_detail: tool({
      description:
        'Get the full detail of a specific quote including all line items. ' +
        'Use when the user asks about the contents or breakdown of a specific quote.',
      inputSchema: zodSchema(
        z.object({
          quoteId: z.string().describe('The quote ID to look up'),
        }),
      ),
      execute: async ({ quoteId }) => {
        if (!ctx.plannerId) return { error: 'No planner context available' };
        try {
          const quote = await prisma.quote.findFirst({
            where: { id: quoteId, planner_id: ctx.plannerId },
            include: {
              customer: { select: { name: true, email: true, phone: true } },
              line_items: { select: { name: true, description: true, quantity: true, unit_price: true, total: true } },
            },
          });

          if (!quote) return { error: `Quote ${quoteId} not found` };

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
        } catch (err) {
          console.error('[TOOLS] get_quote_detail error:', err);
          return { error: 'Failed to retrieve quote detail' };
        }
      },
    }),

    // ── List Contracts ────────────────────────────────────────────────────
    list_contracts: tool({
      description:
        'List all contracts for this planner with their status and signing information. ' +
        'Optionally filter by status (DRAFT, SHARED, SIGNING, SIGNED, CANCELLED) or search by title/customer name. ' +
        'Use for questions like "which contracts are pending signature", "show signed contracts", or "find the contract for García".',
      inputSchema: zodSchema(
        z.object({
          status: z
            .enum(['DRAFT', 'SHARED', 'SIGNING', 'SIGNED', 'CANCELLED'])
            .optional()
            .describe('Filter by contract status'),
          search: z
            .string()
            .optional()
            .describe('Partial match against contract title or customer name (case-insensitive)'),
        }),
      ),
      execute: async ({ status, search }) => {
        if (!ctx.plannerId) return { error: 'No planner context available' };
        try {
          const contracts = await prisma.contract.findMany({
            where: {
              planner_id: ctx.plannerId,
              ...(status ? { status } : {}),
              ...(search
                ? {
                    OR: [
                      { title: { contains: search, mode: 'insensitive' } },
                      { customer: { name: { contains: search, mode: 'insensitive' } } },
                      { signer_name: { contains: search, mode: 'insensitive' } },
                    ],
                  }
                : {}),
            },
            select: {
              id: true,
              title: true,
              status: true,
              signed_at: true,
              signer_name: true,
              signer_email: true,
              created_at: true,
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
        } catch (err) {
          console.error('[TOOLS] list_contracts error:', err);
          return { error: 'Failed to retrieve contracts' };
        }
      },
    }),

    // ── List Invoices ─────────────────────────────────────────────────────
    list_invoices: tool({
      description:
        'List all invoices for this planner with their status, amounts, and outstanding balances. ' +
        'Optionally filter by status (DRAFT, ISSUED, PARTIAL, PAID, OVERDUE, CANCELLED) or search by customer/couple name. ' +
        'Use for questions like "show overdue invoices", "which invoices are unpaid", "total revenue this month", or "invoices for García".',
      inputSchema: zodSchema(
        z.object({
          status: z
            .enum(['DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'])
            .optional()
            .describe('Filter by invoice status'),
          search: z
            .string()
            .optional()
            .describe('Partial match against customer name or invoice number (case-insensitive)'),
        }),
      ),
      execute: async ({ status, search }) => {
        if (!ctx.plannerId) return { error: 'No planner context available' };
        try {
          const invoices = await prisma.invoice.findMany({
            where: {
              planner_id: ctx.plannerId,
              ...(status ? { status } : {}),
              ...(search
                ? {
                    OR: [
                      { invoice_number: { contains: search, mode: 'insensitive' } },
                      { customer: { name: { contains: search, mode: 'insensitive' } } },
                      { quote: { couple_names: { contains: search, mode: 'insensitive' } } },
                    ],
                  }
                : {}),
            },
            select: {
              id: true,
              invoice_number: true,
              type: true,
              status: true,
              currency: true,
              total: true,
              amount_paid: true,
              issued_at: true,
              due_date: true,
              customer: { select: { name: true } },
              quote: { select: { couple_names: true } },
            },
            orderBy: { created_at: 'desc' },
          });

          const totalRevenue = invoices
            .filter((inv) => ['ISSUED', 'PARTIAL', 'PAID'].includes(inv.status))
            .reduce((sum, inv) => sum + Number(inv.amount_paid), 0);

          return {
            count: invoices.length,
            totalCollected: Math.round(totalRevenue * 100) / 100,
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
        } catch (err) {
          console.error('[TOOLS] list_invoices error:', err);
          return { error: 'Failed to retrieve invoices' };
        }
      },
    }),

    // ── Record Invoice Payment ────────────────────────────────────────────
    record_invoice_payment: tool({
      description:
        'Record a new payment received against an invoice. ' +
        'Use when the user says a client has paid, wants to log a payment, or asks to mark an invoice as paid. ' +
        'Always confirm the invoice number and amount with the user before calling this tool.',
      inputSchema: zodSchema(
        z.object({
          invoiceId: z.string().describe('The invoice ID to record the payment against'),
          amount: z.number().positive().describe('Payment amount (in the invoice currency)'),
          paymentDate: z
            .string()
            .describe('Payment date in YYYY-MM-DD format'),
          method: z
            .enum(['CASH', 'BANK_TRANSFER', 'PAYPAL', 'BIZUM', 'REVOLUT', 'OTHER'])
            .optional()
            .default('BANK_TRANSFER')
            .describe('Payment method'),
          reference: z.string().optional().describe('Reference number, transaction ID, or note'),
        }),
      ),
      execute: async ({ invoiceId, amount, paymentDate, method, reference }) => {
        if (!ctx.plannerId) return { error: 'No planner context available' };
        try {
          const invoice = await prisma.invoice.findFirst({
            where: { id: invoiceId, planner_id: ctx.plannerId },
            select: { id: true, invoice_number: true, total: true, amount_paid: true, status: true, currency: true },
          });

          if (!invoice) return { error: `Invoice ${invoiceId} not found` };
          if (invoice.status === 'CANCELLED') return { error: 'Cannot record payment on a cancelled invoice' };

          const newPaid = Number(invoice.amount_paid) + amount;
          const total = Number(invoice.total);
          const newStatus: string =
            newPaid >= total ? 'PAID' : newPaid > 0 ? 'PARTIAL' : invoice.status;

          await prisma.$transaction([
            prisma.invoicePayment.create({
              data: {
                invoice_id: invoiceId,
                amount,
                currency: invoice.currency,
                payment_date: new Date(paymentDate),
                method: method ?? 'BANK_TRANSFER',
                reference: reference ?? null,
              },
            }),
            prisma.invoice.update({
              where: { id: invoiceId },
              data: {
                amount_paid: newPaid,
                status: newStatus as 'PAID' | 'PARTIAL' | 'ISSUED' | 'OVERDUE',
              },
            }),
          ]);

          return {
            status: 'success',
            message: `Payment of ${amount} ${invoice.currency} recorded on invoice ${invoice.invoice_number}.`,
            invoiceNumber: invoice.invoice_number,
            amountRecorded: amount,
            totalPaid: Math.round(newPaid * 100) / 100,
            outstanding: Math.round((total - newPaid) * 100) / 100,
            newInvoiceStatus: newStatus,
          };
        } catch (err) {
          console.error('[TOOLS] record_invoice_payment error:', err);
          return { error: 'Failed to record payment' };
        }
      },
    }),
  };
}
