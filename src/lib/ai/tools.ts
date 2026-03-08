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
  };
}
