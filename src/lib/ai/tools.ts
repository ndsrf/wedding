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
 *   add_person            - Add a new person to a group
 *   update_person         - Update a person's details
 *   remove_person         - Remove a person from a group
 *   update_group_labels   - Add, remove, or replace labels on a group
 *   list_labels           - List all labels defined for the wedding
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
import { invalidateStatsForWedding } from '@/lib/guests/api-handlers';

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

            // Per-member updates — find each member by name (case-insensitive)
            for (const update of memberUpdates) {
              const member = memberMap.get(update.memberName.toLowerCase());
              if (!member) {
                notFound.push(update.memberName);
                continue;
              }
              await prisma.familyMember.update({
                where: { id: member.id },
                data: { attending: update.attending },
              });
              results.push({ member: member.name, attending: update.attending });
              updatedIds.push(member.id);
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
              _count: { select: { families: true } },
            },
            orderBy: { wedding_date: 'asc' },
          });

          // For each wedding compute RSVP completion
          const results = await Promise.all(
            weddings.map(async (w) => {
              const families = await prisma.family.findMany({
                where: { wedding_id: w.id },
                include: { members: { select: { attending: true } } },
              });
              const total = families.length;
              const submitted = families.filter((f) => f.members.some((m) => m.attending !== null)).length;
              return {
                id: w.id,
                coupleNames: w.couple_names,
                weddingDate: w.wedding_date.toISOString().split('T')[0],
                totalFamilies: total,
                rsvpSubmitted: submitted,
                rsvpPending: total - submitted,
                completionPct: total > 0 ? Math.round((submitted / total) * 100) : 0,
              };
            }),
          );

          return results;
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

    // ── Add Person to Group ───────────────────────────────────────────────
    add_person: tool({
      description:
        'Add a new person (guest, attendee) to an existing group. ' +
        'Use when the user wants to add a new person or guest. ' +
        'The group is identified by its name — users will say things like "add María to the García group", ' +
        '"add a child named Pedro to the Smith guests", or "add Juan to the list". ' +
        'Infer the group from context if not stated explicitly (e.g. "add Juan" after discussing a specific group).',
      inputSchema: zodSchema(
        z.object({
          groupName: z.string().describe('The name of the group to add the person to (case-insensitive)'),
          personName: z.string().describe('The full name of the person to add'),
          type: z
            .enum(['ADULT', 'CHILD', 'INFANT'])
            .default('ADULT')
            .describe('Type of person: ADULT (default), CHILD, or INFANT'),
          age: z.number().int().min(0).max(150).optional().describe('Age of the person (optional)'),
          dietary_restrictions: z.string().optional().describe('Dietary restrictions or preferences (optional)'),
          accessibility_needs: z.string().optional().describe('Accessibility requirements (optional)'),
        }),
      ),
      execute: async ({ groupName, personName, type, age, dietary_restrictions, accessibility_needs }) => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          // Exact match first, contains fallback
          let families = await prisma.family.findMany({
            where: { wedding_id: ctx.weddingId, name: { equals: groupName, mode: 'insensitive' } },
            select: { id: true, name: true },
          });
          if (families.length === 0) {
            families = await prisma.family.findMany({
              where: { wedding_id: ctx.weddingId, name: { contains: groupName, mode: 'insensitive' } },
              select: { id: true, name: true },
            });
          }

          if (families.length === 0) return { error: `No group found matching "${groupName}"` };
          if (families.length > 1) {
            return {
              status: 'ambiguous',
              message: `STOP: Multiple groups match "${groupName}". Do not retry — present these options to the user and ask which one they mean.`,
              groups: families.map((f) => ({ id: f.id, name: f.name })),
            };
          }

          const family = families[0];
          const member = await prisma.familyMember.create({
            data: {
              family_id: family.id,
              name: personName,
              type: type ?? 'ADULT',
              age: age ?? null,
              dietary_restrictions: dietary_restrictions ?? null,
              accessibility_needs: accessibility_needs ?? null,
              added_by_guest: false,
            },
          });

          await invalidateStatsForWedding(ctx.weddingId);
          return {
            status: 'success',
            message: `Added "${personName}" to group "${family.name}".`,
            person: { id: member.id, name: member.name, type: member.type, age: member.age, group: family.name },
          };
        } catch (err) {
          console.error('[TOOLS] add_person error:', err);
          return { error: 'Failed to add person' };
        }
      },
    }),

    // ── Update Person ─────────────────────────────────────────────────────
    update_person: tool({
      description:
        'Update details of a specific person (guest) such as name, type, age, dietary restrictions, or accessibility needs. ' +
        'Provide groupName to disambiguate when multiple people share the same name. ' +
        'Examples: "change María\'s dietary restrictions to vegetarian", "update Pedro\'s age to 8", "rename Juan to Juan Carlos".',
      inputSchema: zodSchema(
        z.object({
          personName: z.string().describe('The current name of the person to update (case-insensitive)'),
          groupName: z
            .string()
            .optional()
            .describe('The group the person belongs to — use to disambiguate when names are not unique (optional)'),
          newName: z.string().optional().describe('New name for the person'),
          type: z.enum(['ADULT', 'CHILD', 'INFANT']).optional().describe('New type: ADULT, CHILD, or INFANT'),
          age: z.number().int().min(0).max(150).nullable().optional().describe('New age (null to clear)'),
          dietary_restrictions: z.string().nullable().optional().describe('New dietary restrictions (null to clear)'),
          accessibility_needs: z.string().nullable().optional().describe('New accessibility needs (null to clear)'),
        }),
      ),
      execute: async ({ personName, groupName, newName, type, age, dietary_restrictions, accessibility_needs }) => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          const familyWhere = {
            wedding_id: ctx.weddingId,
            ...(groupName ? { name: { contains: groupName, mode: 'insensitive' as const } } : {}),
          };

          const members = await prisma.familyMember.findMany({
            where: {
              name: { contains: personName, mode: 'insensitive' },
              family: familyWhere,
            },
            include: { family: { select: { id: true, name: true } } },
          });

          if (members.length === 0) {
            return {
              error: `No person found matching "${personName}"${groupName ? ` in group "${groupName}"` : ''}`,
            };
          }
          if (members.length > 1) {
            return {
              status: 'ambiguous',
              message: `Multiple people found matching "${personName}". Please specify the group name.`,
              people: members.map((m) => ({ name: m.name, group: m.family.name })),
            };
          }

          const member = members[0];
          const updateData: {
            name?: string;
            type?: 'ADULT' | 'CHILD' | 'INFANT';
            age?: number | null;
            dietary_restrictions?: string | null;
            accessibility_needs?: string | null;
          } = {};
          if (newName !== undefined) updateData.name = newName;
          if (type !== undefined) updateData.type = type;
          if (age !== undefined) updateData.age = age;
          if (dietary_restrictions !== undefined) updateData.dietary_restrictions = dietary_restrictions;
          if (accessibility_needs !== undefined) updateData.accessibility_needs = accessibility_needs;

          if (Object.keys(updateData).length === 0) {
            return { error: 'No fields to update provided.' };
          }

          const updated = await prisma.familyMember.update({
            where: { id: member.id },
            data: updateData,
          });

          await invalidateStatsForWedding(ctx.weddingId);
          return {
            status: 'success',
            message: `Updated "${member.name}" in group "${member.family.name}".`,
            person: {
              id: updated.id,
              name: updated.name,
              type: updated.type,
              age: updated.age,
              dietary_restrictions: updated.dietary_restrictions,
              accessibility_needs: updated.accessibility_needs,
              group: member.family.name,
            },
          };
        } catch (err) {
          console.error('[TOOLS] update_person error:', err);
          return { error: 'Failed to update person' };
        }
      },
    }),

    // ── Remove Person from Group ──────────────────────────────────────────
    remove_person: tool({
      description:
        'Remove a specific person (guest) from the guest list. ' +
        'Provide groupName to disambiguate when the name is not unique. ' +
        'Examples: "remove Pedro from the García group", "delete guest María", "remove Juan from the list".',
      inputSchema: zodSchema(
        z.object({
          personName: z.string().describe('The name of the person to remove (case-insensitive)'),
          groupName: z
            .string()
            .optional()
            .describe('The group the person belongs to — use to disambiguate when names are not unique (optional)'),
        }),
      ),
      execute: async ({ personName, groupName }) => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          const familyWhere = {
            wedding_id: ctx.weddingId,
            ...(groupName ? { name: { contains: groupName, mode: 'insensitive' as const } } : {}),
          };

          const members = await prisma.familyMember.findMany({
            where: {
              name: { contains: personName, mode: 'insensitive' },
              family: familyWhere,
            },
            include: { family: { select: { id: true, name: true } } },
          });

          if (members.length === 0) {
            return {
              error: `No person found matching "${personName}"${groupName ? ` in group "${groupName}"` : ''}`,
            };
          }
          if (members.length > 1) {
            return {
              status: 'ambiguous',
              message: `Multiple people found matching "${personName}". Please specify the group name.`,
              people: members.map((m) => ({ name: m.name, group: m.family.name })),
            };
          }

          const member = members[0];
          await prisma.familyMember.delete({ where: { id: member.id } });
          await invalidateStatsForWedding(ctx.weddingId);
          return {
            status: 'success',
            message: `Removed "${member.name}" from group "${member.family.name}".`,
            removedPerson: { name: member.name, group: member.family.name },
          };
        } catch (err) {
          console.error('[TOOLS] remove_person error:', err);
          return { error: 'Failed to remove person' };
        }
      },
    }),

    // ── List Labels ───────────────────────────────────────────────────────
    list_labels: tool({
      description:
        'List all labels (etiquetas) defined for this wedding. Returns each label name and how many groups have it. ' +
        'ALWAYS call this tool before update_group_labels to verify that the word the user mentioned actually exists as a label. ' +
        'If the word is not in this list, do NOT treat it as a label — it may refer to an RSVP question or something else entirely; ask the user to clarify.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          const labels = await prisma.guestLabel.findMany({
            where: { wedding_id: ctx.weddingId },
            select: {
              id: true,
              name: true,
              color: true,
              _count: { select: { families: true } },
            },
            orderBy: { name: 'asc' },
          });

          return labels.map((l) => ({
            name: l.name,
            color: l.color,
            groupCount: l._count.families,
          }));
        } catch (err) {
          console.error('[TOOLS] list_labels error:', err);
          return { error: 'Failed to retrieve labels' };
        }
      },
    }),

    // ── Update Group Labels ───────────────────────────────────────────────
    update_group_labels: tool({
      description:
        'Add, remove, or replace labels (etiquetas) on a group of guests. ' +
        '\n\nCRITICAL — ALWAYS call list_labels before this tool. Labels are fixed tags defined by the planner; you must verify the exact label name exists before acting. ' +
        'NEVER assume a word is a label. For example, "vegetariano" could be an existing label OR it could refer to an RSVP question answer — they are different things. ' +
        'If the word the user mentioned does NOT appear in the list returned by list_labels, do NOT use this tool; instead ask the user whether they mean a label or something else (such as an RSVP question).' +
        '\n\nRECOGNIZE INDIRECT LABEL REFERENCES. Users will rarely say "add a label"; instead they phrase it through context:' +
        '\n- "Adelina no viene en bus" → if "Bus" exists as a label, remove it from group "Adelina"' +
        '\n- "los García vienen en autobús" → if "Bus" exists as a label, add it to group "García"' +
        '\nOnly act if the referenced concept matches an existing label name. Otherwise ask for clarification.' +
        '\n\nAMBIGUITY: if the group or label name matches multiple entries, this tool returns an ambiguous status — present the options to the user as a question before retrying.' +
        '\n\nMODES (mutually exclusive):' +
        '\n- labelsToAdd / labelsToRemove: incremental changes (can both be set in one call)' +
        '\n- replaceWith: sets the complete label list; pass [] to clear all labels',
      inputSchema: zodSchema(
        z.object({
          groupName: z.string().describe('The name of the group to update (case-insensitive)'),
          labelsToAdd: z
            .array(z.string())
            .optional()
            .describe('Label names to add to the group (must already exist)'),
          labelsToRemove: z
            .array(z.string())
            .optional()
            .describe('Label names to remove from the group'),
          replaceWith: z
            .array(z.string())
            .optional()
            .describe(
              'Replace the entire label set with these names. Pass an empty array to clear all labels. ' +
              'Cannot be combined with labelsToAdd or labelsToRemove.',
            ),
        }),
      ),
      execute: async ({ groupName, labelsToAdd, labelsToRemove, replaceWith }) => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };

        // replaceWith cannot be combined with incremental ops
        if (replaceWith !== undefined && (labelsToAdd?.length || labelsToRemove?.length)) {
          return { error: 'Use either replaceWith or labelsToAdd/labelsToRemove, not both.' };
        }
        if (replaceWith === undefined && !labelsToAdd?.length && !labelsToRemove?.length) {
          return { error: 'Provide at least one of labelsToAdd, labelsToRemove, or replaceWith.' };
        }

        try {
          // Resolve group — exact match first (insensitive), then contains fallback.
          // Exact match prevents false-positive ambiguity when other families
          // happen to contain the group name as a substring.
          const groupSelect = {
            id: true,
            name: true,
            labels: { include: { label: { select: { id: true, name: true } } } },
          };
          let families = await prisma.family.findMany({
            where: { wedding_id: ctx.weddingId, name: { equals: groupName, mode: 'insensitive' } },
            select: groupSelect,
          });
          if (families.length === 0) {
            families = await prisma.family.findMany({
              where: { wedding_id: ctx.weddingId, name: { contains: groupName, mode: 'insensitive' } },
              select: groupSelect,
            });
          }

          if (families.length === 0) return { error: `No group found matching "${groupName}"` };
          if (families.length > 1) {
            return {
              status: 'ambiguous',
              message: `STOP: Multiple groups match "${groupName}". Do not retry — present these options to the user and ask which one they mean.`,
              groups: families.map((f) => ({ id: f.id, name: f.name })),
            };
          }

          const family = families[0];

          // Helper: resolve label names → GuestLabel rows, collecting not-found names.
          // Fetches all labels for the wedding and filters in JS to avoid Prisma mode limitations.
          const resolveLabels = async (names: string[]) => {
            const allLabels = await prisma.guestLabel.findMany({
              where: { wedding_id: ctx.weddingId },
              select: { id: true, name: true },
            });
            const lowerNames = names.map((n) => n.toLowerCase());
            const found = allLabels.filter((l) => lowerNames.includes(l.name.toLowerCase()));
            const notFound = names.filter(
              (n) => !found.some((l) => l.name.toLowerCase() === n.toLowerCase()),
            );
            return { found, notFound, allLabels };
          };

          if (replaceWith !== undefined) {
            // Replace all labels
            const { found, notFound, allLabels } = replaceWith.length ? await resolveLabels(replaceWith) : { found: [], notFound: [], allLabels: [] as {id:string;name:string}[] };
            if (notFound.length > 0) {
              return {
                error: `The following labels do not exist: ${notFound.join(', ')}. No changes made. Available labels: ${allLabels.map(l => l.name).join(', ') || 'none'}.`,
              };
            }

            await prisma.$transaction([
              prisma.familyLabelAssignment.deleteMany({ where: { family_id: family.id } }),
              ...(found.length > 0
                ? [
                    prisma.familyLabelAssignment.createMany({
                      data: found.map((l) => ({ family_id: family.id, label_id: l.id })),
                      skipDuplicates: true,
                    }),
                  ]
                : []),
            ]);

            await invalidateStatsForWedding(ctx.weddingId);
            return {
              status: 'success',
              message:
                found.length > 0
                  ? `Labels for "${family.name}" replaced with: ${found.map((l) => l.name).join(', ')}.`
                  : `All labels cleared from "${family.name}".`,
              group: family.name,
              currentLabels: found.map((l) => l.name),
            };
          }

          // Incremental add / remove
          const errors: string[] = [];
          const added: string[] = [];
          const removed: string[] = [];

          if (labelsToAdd?.length) {
            const { found, notFound, allLabels } = await resolveLabels(labelsToAdd);
            if (notFound.length > 0) errors.push(`Labels not found: ${notFound.join(', ')}. Available labels: ${allLabels.map(l => l.name).join(', ') || 'none'}`);
            if (found.length > 0) {
              await prisma.familyLabelAssignment.createMany({
                data: found.map((l) => ({ family_id: family.id, label_id: l.id })),
                skipDuplicates: true,
              });
              added.push(...found.map((l) => l.name));
            }
          }

          if (labelsToRemove?.length) {
            const { found, notFound, allLabels } = await resolveLabels(labelsToRemove);
            if (notFound.length > 0) errors.push(`Labels not found: ${notFound.join(', ')}. Available labels: ${allLabels.map(l => l.name).join(', ') || 'none'}`);
            if (found.length > 0) {
              await prisma.familyLabelAssignment.deleteMany({
                where: {
                  family_id: family.id,
                  label_id: { in: found.map((l) => l.id) },
                },
              });
              removed.push(...found.map((l) => l.name));
            }
          }

          // Fetch final label state
          const updatedFamily = await prisma.family.findUnique({
            where: { id: family.id },
            select: { labels: { include: { label: { select: { name: true } } } } },
          });
          const currentLabels = updatedFamily?.labels.map((la) => la.label.name) ?? [];

          await invalidateStatsForWedding(ctx.weddingId);
          const parts: string[] = [];
          if (removed.length > 0) parts.push(`removed label(s): ${removed.join(', ')}`);
          if (added.length > 0) parts.push(`added label(s): ${added.join(', ')}`);
          return {
            status: errors.length > 0 ? 'partial' : 'success',
            message:
              errors.length > 0
                ? `Could not complete all label changes for "${family.name}": ${errors.join('; ')}.`
                : `Labels updated for "${family.name}": ${parts.join('; ')}. Current labels: ${currentLabels.length > 0 ? currentLabels.join(', ') : 'none'}.`,
            group: family.name,
            added,
            removed,
            currentLabels,
            errors: errors.length > 0 ? errors : undefined,
          };
        } catch (err) {
          console.error('[TOOLS] update_group_labels error:', err);
          return { error: 'Failed to update group labels' };
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
  };
}
