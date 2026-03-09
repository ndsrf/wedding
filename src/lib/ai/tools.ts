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
        'Update the RSVP status for all members of a family by family name. Use this when an admin wants to manually set the attendance for an entire family unit.',
      inputSchema: zodSchema(
        z.object({
          familyName: z.string().describe('The name of the family to update (e.g., "Smith")'),
          attending: z.boolean().describe('Whether the family is attending (true) or not (false)'),
        }),
      ),
      execute: async ({ familyName, attending }) => {
        if (!ctx.weddingId) return { error: 'No wedding context available' };
        try {
          // Search for families matching the name (case-insensitive)
          const families = await prisma.family.findMany({
            where: {
              wedding_id: ctx.weddingId,
              name: { contains: familyName, mode: 'insensitive' },
            },
            include: {
              members: { select: { id: true, name: true } },
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

          // Update all members of the family
          await prisma.familyMember.updateMany({
            where: { family_id: family.id },
            data: { attending },
          });

          return {
            status: 'success',
            message: `RSVP status for family "${family.name}" updated to ${
              attending ? 'attending' : 'not attending'
            } for all ${family.members.length} members.`,
            family: family.name,
            memberCount: family.members.length,
          };
        } catch (err) {
          console.error('[TOOLS] update_family_rsvp error:', err);
          return { error: 'Failed to update RSVP status' };
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
