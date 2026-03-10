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
        'Search the wedding knowledge base and documents for relevant information. Use this to answer questions about wedding details, ways of working, or platform documentation.',
      inputSchema: zodSchema(
        z.object({
          query: z.string().describe('The search query to find relevant documents'),
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
        'Get aggregate RSVP statistics: total families, submitted RSVPs, pending, and completion percentage.',
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

          const total = families.length;
          const submitted = families.filter((f) => f.members.some((m) => m.attending !== null)).length;
          const pending = total - submitted;
          const attending = families.flatMap((f) => f.members).filter((m) => m.attending === true).length;
          const notAttending = families.flatMap((f) => f.members).filter((m) => m.attending === false).length;
          const completionPct = total > 0 ? Math.round((submitted / total) * 100) : 0;

          return { total, submitted, pending, attending, notAttending, completionPct };
        } catch (err) {
          console.error('[TOOLS] get_rsvp_status error:', err);
          return { error: 'Failed to retrieve RSVP status' };
        }
      },
    }),

    // ── Update Family RSVP ────────────────────────────────────────────────
    update_family_rsvp: tool({
      description:
        'Update the RSVP status for a family or specific individual members within a family. Use this when an admin wants to manually set attendance — either for the whole family or for named individuals (e.g. "Mark Smith is coming but Jane Smith is not").',
      inputSchema: zodSchema(
        z.object({
          familyName: z.string().describe('The name of the family to update (e.g., "Smith")'),
          attending: z
            .boolean()
            .optional()
            .describe(
              'Whether ALL members of the family are attending. Omit when using memberUpdates for per-member control.',
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
              'Per-member attendance overrides. Use this instead of (or alongside) the top-level attending flag when different members have different statuses.',
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
            // Per-member updates — find each member by name (case-insensitive)
            for (const update of memberUpdates) {
              const member = family.members.find(
                (m) => m.name.toLowerCase() === update.memberName.toLowerCase(),
              );
              if (!member) {
                notFound.push(update.memberName);
                continue;
              }
              await prisma.familyMember.update({
                where: { id: member.id },
                data: { attending: update.attending },
              });
              results.push({ member: member.name, attending: update.attending });
            }

            // Also apply the family-wide flag to remaining members if provided
            if (attending !== undefined) {
              const updatedIds = results.map((r) =>
                family.members.find((m) => m.name === r.member)!.id,
              );
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

          // Get the invited_by_admin_id for this family (may be null)
          const familyRecord = await prisma.family.findUnique({
            where: { id: family.id },
            select: { invited_by_admin_id: true },
          });
          const invitedByAdminId = familyRecord?.invited_by_admin_id ?? null;

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
  };
}
