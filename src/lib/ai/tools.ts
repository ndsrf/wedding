/**
 * Agentic Tool Definitions
 *
 * Vercel AI SDK tool() definitions for use in streamText agentic loops
 * (NupciBot / RAG chat). Schemas and descriptions live here; the actual
 * business logic lives in tool-handlers.ts and is shared with the remote
 * MCP dispatcher (POST /api/mcp) so both entry points stay in sync.
 * Tools are context-bound — tenant IDs come from ctx, never from LLM
 * arguments, so a prompt-injected message can never widen a tool's access
 * beyond the wedding/planner the caller is already scoped to.
 *
 * Tools:
 *   search_knowledge_base     - RAG search over the platform docs / wedding knowledge base
 *   get_guest_list            - Full list of wedding guest families with RSVP status
 *   get_rsvp_status           - Aggregate RSVP counts and completion percentage
 *   update_family_rsvp        - Set attendance for a family or specific members
 *   assign_family_to_table    - Seat a family's attending members at a table
 *   suggest_tables_for_family - Rank candidate tables for a family
 *   add_reminder              - Add a task/reminder to the wedding checklist
 *   get_planner_weddings      - List all weddings managed by the current planner
 *   get_wedding_invoices      - Invoice/payment summary for the current wedding
 *   get_wedding_providers     - Providers assigned to the current wedding
 *
 * Depends on: retrieval.ts, tool-handlers.ts
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import type { ToolSet } from 'ai';
import { retrieveChunks } from './retrieval';
import {
  handleGetGuestList,
  handleGetRsvpStatus,
  handleUpdateFamilyRsvp,
  handleAssignFamilyToTable,
  handleSuggestTablesForFamily,
  handleAddReminder,
  handleGetPlannerWeddings,
  handleGetWeddingInvoices,
  handleGetWeddingProviders,
  type ToolContext,
} from './tool-handlers';

export type { ToolContext };

// Shared description fragment for the "familyName" fuzzy-match parameter,
// reused across every family-scoped tool so the matching behavior (and how
// to recover from an ambiguous match) reads identically everywhere.
const FAMILY_NAME_DESC =
  'The family name to search for. Matching is a case-insensitive substring match (e.g. "smith" matches "The Smith Family"), so it may match more than one family.';
const FAMILY_ID_DESC =
  'Exact family id to target, bypassing the fuzzy familyName search entirely. ' +
  'Only use this after a previous call to this or another family-scoped tool returned status "ambiguous" — ' +
  'pass the "id" of the specific family the user meant from that response\'s "families" list, ' +
  'together with the same familyName. Omit on the first attempt.';

export function buildTools(ctx: ToolContext): ToolSet {
  return {
    // ── RAG Knowledge Base Search ──────────────────────────────────────────
    search_knowledge_base: tool({
      description:
        'Searches the Nupci platform documentation and this wedding\'s knowledge base (uploaded wedding documents, ' +
        'the planner\'s "ways of working" notes, and platform user-manual articles) using semantic similarity, and ' +
        'returns up to 5 relevant text passages. MANDATORY before answering any question about how a platform feature ' +
        'works, where to find something in the UI, or a business workflow (quotes, contracts, invoices, providers, ' +
        'invitations, seating, tasting menus, etc.) — never answer those from general knowledge, since the platform\'s ' +
        'exact terminology, page paths, and behavior are versioned in this knowledge base and can change. ' +
        'Do NOT use it for live/transactional data such as this wedding\'s actual guest list, RSVP counts, invoices, or ' +
        'providers — use the dedicated get_guest_list, get_rsvp_status, get_wedding_invoices, or get_wedding_providers ' +
        'tools for those instead. Each result includes the source document name and, for platform-manual sources, a ' +
        'clickable deep link (fullUrl) that should be surfaced to the user. Returns an empty array if nothing relevant ' +
        'is found — in that case, try again once with a broader or rephrased query before giving up.',
      inputSchema: zodSchema(
        z.object({
          query: z
            .string()
            .describe(
              'A focused search query, in English or Spanish, describing the specific feature, workflow, or topic to ' +
              'look up (e.g. "how to create a quote", "digital signatures", "guest rsvp cutoff date"). ' +
              'Prefer a short natural-language phrase over a single keyword — it is embedded and matched by semantic ' +
              'similarity, not exact text search.',
            ),
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
        'Returns every guest family for the current wedding as a list of per-family summaries: family name, preferred ' +
        'contact channel, total member count, and a breakdown of attending / not-attending / pending members. Use this ' +
        'when the user asks to see, browse, or count guests or families (e.g. "who is coming?", "how many families ' +
        'haven\'t responded?", "list the guests"). This tool takes no parameters and always returns the full list — it ' +
        'does not filter or search by name (that is done client-side after the call, or via update_family_rsvp\'s ' +
        'fuzzy match when acting on one specific family). It does NOT include per-member names, seating/table ' +
        'assignments, dietary restrictions, or contact details — those are not returned by this tool.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => handleGetGuestList(ctx),
    }),

    // ── RSVP Status Summary ────────────────────────────────────────────────
    get_rsvp_status: tool({
      description:
        'Returns aggregate RSVP statistics for the current wedding only: total families, how many have submitted an ' +
        'RSVP, how many are still pending, total attending/not-attending people, and the completion percentage. Use ' +
        'this for high-level questions like "what\'s our RSVP completion rate?" or "how many people are coming?" — it ' +
        'is faster and more direct than fetching the full guest list with get_guest_list and computing totals ' +
        'yourself. Takes no parameters. Does not break results down by individual family; use get_guest_list when the ' +
        'user needs the per-family detail.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => handleGetRsvpStatus(ctx),
    }),

    // ── Update Family RSVP ────────────────────────────────────────────────
    update_family_rsvp: tool({
      description:
        'Updates RSVP attendance (attending / not attending) for a family or for specific named members within a ' +
        'family in the current wedding\'s guest list. This performs a real, immediate write to the guest database — ' +
        'only call it when the user is explicitly reporting or changing an RSVP, never speculatively. ' +
        'Choosing the right parameters matters: ' +
        '(1) If specific member names are mentioned (e.g. "John is coming but Elena is not"), you MUST use ' +
        'memberUpdates — never set the top-level attending flag for individual-level requests, or you will silently ' +
        'overwrite every member\'s status. ' +
        '(2) Only set the top-level attending flag when the whole family is referred to without naming individuals ' +
        '(e.g. "the Smith family is coming"). ' +
        '(3) You may combine both: memberUpdates for named members, plus attending as the default for every other ' +
        'member of that family not listed in memberUpdates. ' +
        'If the familyName matches more than one family, the tool returns status "ambiguous" with a list of ' +
        'candidates (each including an id) instead of updating anything — list them for the user, then re-call this ' +
        'tool with the same familyName plus the chosen family\'s id in familyId once they clarify.',
      inputSchema: zodSchema(
        z.object({
          familyName: z.string().describe(`The name of the family to update. ${FAMILY_NAME_DESC}`),
          familyId: z.string().optional().describe(FAMILY_ID_DESC),
          attending: z
            .boolean()
            .optional()
            .describe(
              'Whole-family default: set ONLY when no specific member names are mentioned. ' +
              'When combined with memberUpdates this becomes the fallback for members not listed in memberUpdates. ' +
              'Omit entirely if every named member is already covered by memberUpdates.',
            ),
          memberUpdates: z
            .array(
              z.object({
                memberName: z.string().describe('The exact name of the individual family member, as stored in the guest list.'),
                attending: z.boolean().describe('Whether this specific member is attending (true) or not (false).'),
              }),
            )
            .optional()
            .describe(
              'REQUIRED whenever specific member names are mentioned in the request. ' +
              'List every named member with their individual attending status. Members not in this list are left ' +
              'unchanged unless the top-level attending flag is also provided as a fallback.',
            ),
        }),
      ),
      execute: async ({ familyName, familyId, attending, memberUpdates }) =>
        handleUpdateFamilyRsvp(ctx, { familyName, familyId, attending, memberUpdates }),
    }),

    // ── Assign Family to Table ─────────────────────────────────────────────
    assign_family_to_table: tool({
      description:
        'Seats the attending members of a family at a specific numbered table for the current wedding, immediately ' +
        'writing the assignment to the database. Only members whose RSVP status is "attending" are eligible — members ' +
        'who are pending or not attending are silently skipped, so re-run get_rsvp_status first if you are unsure a ' +
        'family has confirmed. Calling this again for the same family clears their previous table assignment first, ' +
        'so it is also the correct tool to use to move a family to a different table. Fails with an error (without ' +
        'assigning anyone) if the table does not have enough free seats for all the members being assigned — check ' +
        'the returned capacity/occupancy numbers, or call suggest_tables_for_family first to find a table that fits. ' +
        'If familyName matches more than one family, returns status "ambiguous" with candidate ids instead of ' +
        'assigning anyone; re-call with familyId set to the chosen family\'s id.',
      inputSchema: zodSchema(
        z.object({
          familyName: z.string().describe(`The name of the family to seat. ${FAMILY_NAME_DESC}`),
          familyId: z.string().optional().describe(FAMILY_ID_DESC),
          tableNumber: z.number().int().describe('The table number to assign the family to, as shown in the seating plan.'),
          memberNames: z
            .array(z.string())
            .optional()
            .describe(
              'Specific attending member names to assign to this table. If omitted, ALL attending members of the ' +
              'family are assigned — only pass this when the request explicitly splits the family across tables.',
            ),
        }),
      ),
      execute: async ({ familyName, familyId, tableNumber, memberNames }) =>
        handleAssignFamilyToTable(ctx, { familyName, familyId, tableNumber, memberNames }),
    }),

    // ── Suggest Tables for a Family ────────────────────────────────────────
    suggest_tables_for_family: tool({
      description:
        'Recommends the best table(s) for an already-attending family to sit at, without making any changes — this is ' +
        'a read-only lookup tool, unlike assign_family_to_table. Only tables with enough free seats for ALL of the ' +
        'family\'s attending members are considered. Remaining candidates are ranked by, in order: (1) how many ' +
        'guests already seated there share the same invited_by_admin_id as this family (i.e. were invited by the same ' +
        'person/side), then (2) closest average age to the family\'s attending members (only when age data exists for ' +
        'both sides), then (3) most available seats as a tiebreaker. Use this before assign_family_to_table when the ' +
        'user asks where to seat a family rather than naming a specific table themselves. Returns status "no_space" if ' +
        'no table has enough free capacity, or "ambiguous" (with candidate family ids) if familyName matches more ' +
        'than one family — re-call with familyId in that case.',
      inputSchema: zodSchema(
        z.object({
          familyName: z.string().describe(`The name of the family to find a table for. ${FAMILY_NAME_DESC}`),
          familyId: z.string().optional().describe(FAMILY_ID_DESC),
          topN: z
            .number()
            .int()
            .optional()
            .default(3)
            .describe('How many ranked table suggestions to return, best match first (default 3).'),
        }),
      ),
      execute: async ({ familyName, familyId, topN }) =>
        handleSuggestTablesForFamily(ctx, { familyName, familyId, topN }),
    }),

    // ── Add Reminder to Checklist ──────────────────────────────────────────
    add_reminder: tool({
      description:
        'Adds a new task to the current wedding\'s checklist, under a language-appropriate "Reminders" section ' +
        '(created automatically the first time this is called). Use this whenever the user asks to be reminded of ' +
        'something or wants a follow-up task tracked (e.g. "remind me to book the florist next week", "add a task to ' +
        'confirm the menu 2 months before the wedding"). Provide the due date as EITHER dueDate (an absolute date you ' +
        'have already resolved, e.g. from "tomorrow" or "next Friday") OR dueDateRelative (anchored to the wedding ' +
        'date itself, e.g. "2 months before the wedding") — never both; if both are given, dueDate takes precedence ' +
        'and dueDateRelative is ignored. Omit both only if no due date was mentioned at all. This tool always creates ' +
        'a new task; it cannot edit or complete an existing one.',
      inputSchema: zodSchema(
        z.object({
          title: z.string().describe('A short, actionable title for the reminder or task (e.g. "Book the florist").'),
          description: z.string().optional().describe('Optional additional detail or context about the task.'),
          dueDate: z
            .string()
            .optional()
            .describe(
              'An absolute due date in YYYY-MM-DD format, already resolved from any relative phrase the user used ' +
              '(e.g. "tomorrow" or "next Monday") using today\'s date. Takes precedence over dueDateRelative if both are set.',
            ),
          dueDateRelative: z
            .string()
            .optional()
            .describe(
              'A due date expressed relative to the wedding date, in the exact format "WEDDING_DATE[+-]<days>" ' +
              '(e.g. "WEDDING_DATE-60" for 2 months before the wedding, "WEDDING_DATE-7" for 1 week before). ' +
              'Ignored if dueDate is also provided.',
            ),
        }),
      ),
      execute: async ({ title, description, dueDate, dueDateRelative }) =>
        handleAddReminder(ctx, { title, description, dueDate, dueDateRelative }),
    }),

    // ── Get Planner Weddings ──────────────────────────────────────────────
    get_planner_weddings: tool({
      description:
        'Lists every wedding managed by the current planner, each with its couple names, wedding date, total family ' +
        'count, and RSVP completion percentage. Only meaningful for planners — returns an error if called without a ' +
        'planner in context (e.g. for a wedding-admin/couple user). Use this for portfolio-level questions like "which ' +
        'of my weddings still have low RSVP completion?" or "what\'s coming up next?". Takes no parameters and always ' +
        'returns ALL of the planner\'s weddings — it does not filter by date range or status.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => handleGetPlannerWeddings(ctx),
    }),

    // ── Get Wedding Invoices ──────────────────────────────────────────────
    get_wedding_invoices: tool({
      description:
        'Returns every invoice linked to the current wedding (via its originating quote or contract), each with its ' +
        'status, total amount, amount paid, outstanding balance, and line-item/payment counts. Use this for questions ' +
        'about billing or payment status for THIS wedding specifically, e.g. "how much do they still owe?" or "is the ' +
        'deposit invoice paid?". It is read-only and does not record payments or create/modify invoices — there is no ' +
        'tool available in this chat to do that. Scoped to the current wedding only; planners asking about invoices ' +
        'across all their weddings are not supported by this tool.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => handleGetWeddingInvoices(ctx),
    }),

    // ── Get Wedding Providers ─────────────────────────────────────────────
    get_wedding_providers: tool({
      description:
        'Returns every vendor/provider (venue, catering, photography, music, etc.) assigned to the current wedding, ' +
        'each with its category, agreed price, amount already paid, outstanding balance, and contact info (phone/email). ' +
        'Use this when the user asks about vendors for this wedding, e.g. "who is our photographer?" or "how much do we ' +
        'still owe the caterer?". Read-only — it cannot assign a new provider, edit contact details, or record a ' +
        'payment. Scoped to the current wedding only.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => handleGetWeddingProviders(ctx),
    }),
  };
}
