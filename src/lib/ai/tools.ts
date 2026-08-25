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
 * Wedding-scoped tools (available to both wedding_admin and planner, when a
 * wedding is in context):
 *   search_knowledge_base     - RAG search over the platform docs / wedding knowledge base
 *   get_guest_list            - Full list of wedding guest families with RSVP status
 *   get_rsvp_status           - Aggregate RSVP counts and completion percentage
 *   get_guests_by_label       - Guest families filtered by a label
 *   update_family_rsvp        - Set attendance for a family or specific members (confirm-gated)
 *   assign_family_to_table    - Seat a family's attending members at a table (confirm-gated)
 *   suggest_tables_for_family - Rank candidate tables for a family
 *   add_reminder              - Add a task/reminder to the wedding checklist
 *   get_wedding_invoices      - Invoice/payment summary for the current wedding
 *   get_wedding_providers     - Providers assigned to the current wedding
 *   get_wedding_itinerary     - Wedding-day itinerary items
 *   get_wedding_schedule      - Detailed run-of-show schedule
 *   get_tasting_menu          - Tasting menu sections/dishes
 *   get_tasting_scores        - Tasting menu participant scores
 *
 * Planner-only tools (business-wide, not scoped to a single wedding; only
 * included in the returned ToolSet when ctx.role === 'planner'):
 *   get_planner_weddings      - List all weddings managed by the current planner
 *   list_quotes / get_quote_detail
 *   list_contracts
 *   list_invoices
 *   record_invoice_payment    - Records a payment (confirm-gated — a real financial write)
 *
 * Mutating tools ("confirm-gated" above) never write on their first call:
 * they validate the request and return a preview describing exactly what
 * would change, with status "confirmation_required". Only a second call
 * with confirm: true (and otherwise identical arguments) performs the
 * write — see the CONFIRM_STEP_DESC constant and each tool's description.
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
  handleGetGuestsByLabel,
  handleUpdateFamilyRsvp,
  handleAssignFamilyToTable,
  handleSuggestTablesForFamily,
  handleAddReminder,
  handleGetPlannerWeddings,
  handleGetWeddingInvoices,
  handleGetWeddingProviders,
  handleGetWeddingItinerary,
  handleGetWeddingSchedule,
  handleGetTastingMenu,
  handleGetTastingScores,
  handleListQuotes,
  handleGetQuoteDetail,
  handleListContracts,
  handleListInvoices,
  handleRecordInvoicePayment,
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
const CONFIRM_DESC =
  'Set to true ONLY after the user has explicitly confirmed the change you previewed to them. Omit or leave false ' +
  'on the first call — the tool will validate the request and return a preview (status "confirmation_required") ' +
  'instead of writing anything. Re-call with identical other arguments plus confirm: true to actually apply it.';

export function buildTools(ctx: ToolContext): ToolSet {
  // ── Wedding-scoped tools — available to wedding_admin and planner alike. ──
  const weddingTools: ToolSet = {
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
        'providers — use the dedicated data tools for those instead. Each result includes the source document name ' +
        'and, for platform-manual sources, a clickable deep link (fullUrl) that should be surfaced to the user. ' +
        'Returns an empty array if nothing relevant is found — in that case, try again once with a broader or ' +
        'rephrased query before giving up.',
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
        'does not filter or search by name (use get_guests_by_label to filter by label, or update_family_rsvp\'s fuzzy ' +
        'match when acting on one specific family). It does NOT include per-member names, seating/table assignments, ' +
        'dietary restrictions, or contact details — those are not returned by this tool.',
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

    // ── Guests by Label ─────────────────────────────────────────────────────
    get_guests_by_label: tool({
      description:
        'Returns guest families for the current wedding that carry a specific label (labels are admin-defined tags ' +
        'such as "VIP", "Bride\'s side", or "Needs transport" — visible in the Guest Management page). Includes ' +
        'per-family attending/not-attending/pending breakdowns and an aggregate total across all matching families. ' +
        'Use this when the user asks about a specific subgroup of guests by label/tag, e.g. "how many VIP guests are ' +
        'confirmed?". If the label name does not exist or matches no families, returns zero families rather than an ' +
        'error — double-check the spelling with the user if that happens unexpectedly.',
      inputSchema: zodSchema(
        z.object({
          labelName: z.string().describe('The exact label name to filter by (case-insensitive), as defined in the Guest Management page.'),
        }),
      ),
      execute: async ({ labelName }) => handleGetGuestsByLabel(ctx, { labelName }),
    }),

    // ── Update Family RSVP ────────────────────────────────────────────────
    update_family_rsvp: tool({
      description:
        'Updates RSVP attendance (attending / not attending) for a family or for specific named members within a ' +
        'family in the current wedding\'s guest list. This is a real database write — only call it when the user is ' +
        'explicitly reporting or changing an RSVP, never speculatively. It is confirm-gated: the first call (confirm ' +
        'omitted or false) never writes anything — it validates the request and returns a preview with status ' +
        '"confirmation_required" describing exactly what would change. Relay that preview to the user in your reply, ' +
        'and only call this tool again with confirm: true (and the same other arguments) once they explicitly agree. ' +
        'Choosing the right parameters matters: ' +
        '(1) If specific member names are mentioned (e.g. "John is coming but Elena is not"), you MUST use ' +
        'memberUpdates — never set the top-level attending flag for individual-level requests, or you will silently ' +
        'overwrite every member\'s status. ' +
        '(2) Only set the top-level attending flag when the whole family is referred to without naming individuals ' +
        '(e.g. "the Smith family is coming"). ' +
        '(3) You may combine both: memberUpdates for named members, plus attending as the default for every other ' +
        'member of that family not listed in memberUpdates. ' +
        'If the familyName matches more than one family, the tool returns status "ambiguous" with a list of ' +
        'candidates (each including an id) instead of previewing or updating anything — list them for the user, then ' +
        're-call this tool with the same familyName plus the chosen family\'s id in familyId once they clarify.',
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
          confirm: z.boolean().optional().describe(CONFIRM_DESC),
        }),
      ),
      execute: async ({ familyName, familyId, attending, memberUpdates, confirm }) =>
        handleUpdateFamilyRsvp(ctx, { familyName, familyId, attending, memberUpdates, confirm }),
    }),

    // ── Assign Family to Table ─────────────────────────────────────────────
    assign_family_to_table: tool({
      description:
        'Seats the attending members of a family at a specific numbered table for the current wedding. This is a real ' +
        'database write — only members whose RSVP status is "attending" are eligible (pending/not-attending members ' +
        'are silently skipped, so re-run get_rsvp_status first if unsure). It is confirm-gated the same way as ' +
        'update_family_rsvp: the first call (confirm omitted or false) never writes anything — it validates the ' +
        'family, table, and available capacity, and returns a preview with status "confirmation_required". Relay that ' +
        'to the user and only re-call with confirm: true once they explicitly agree. Calling this (confirmed) again ' +
        'for the same family clears their previous table assignment first, so it also works to move a family. Fails ' +
        'with an error if the table does not have enough free seats — check the returned capacity/occupancy numbers, ' +
        'or call suggest_tables_for_family first to find a table that fits. If familyName matches more than one ' +
        'family, returns status "ambiguous" with candidate ids instead of previewing anything; re-call with familyId ' +
        'set to the chosen family\'s id.',
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
          confirm: z.boolean().optional().describe(CONFIRM_DESC),
        }),
      ),
      execute: async ({ familyName, familyId, tableNumber, memberNames, confirm }) =>
        handleAssignFamilyToTable(ctx, { familyName, familyId, tableNumber, memberNames, confirm }),
    }),

    // ── Suggest Tables for a Family ────────────────────────────────────────
    suggest_tables_for_family: tool({
      description:
        'Recommends the best table(s) for an already-attending family to sit at, without making any changes — this is ' +
        'a read-only lookup tool, unlike assign_family_to_table, and needs no confirmation. Only tables with enough ' +
        'free seats for ALL of the family\'s attending members are considered. Remaining candidates are ranked by, in ' +
        'order: (1) how many guests already seated there share the same invited_by_admin_id as this family (i.e. were ' +
        'invited by the same person/side), then (2) closest average age to the family\'s attending members (only when ' +
        'age data exists for both sides), then (3) most available seats as a tiebreaker. Use this before ' +
        'assign_family_to_table when the user asks where to seat a family rather than naming a specific table ' +
        'themselves. Returns status "no_space" if no table has enough free capacity, or "ambiguous" (with candidate ' +
        'family ids) if familyName matches more than one family — re-call with familyId in that case.',
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

    // ── Get Wedding Invoices ──────────────────────────────────────────────
    get_wedding_invoices: tool({
      description:
        'Returns every invoice linked to the current wedding (via its originating quote or contract), each with its ' +
        'status, total amount, amount paid, outstanding balance, and line-item/payment counts. Use this for questions ' +
        'about billing or payment status for THIS wedding specifically, e.g. "how much do they still owe?" or "is the ' +
        'deposit invoice paid?". Read-only — it cannot record payments (planners can use record_invoice_payment for ' +
        'that) or create/modify invoices. Scoped to the current wedding only; planners asking about invoices across ' +
        'their whole business should use list_invoices instead.',
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

    // ── Get Wedding Itinerary ──────────────────────────────────────────────
    get_wedding_itinerary: tool({
      description:
        'Returns the current wedding\'s public-facing itinerary: an ordered list of items (e.g. ceremony, cocktail ' +
        'hour, reception) each with its type, local date/time, notes, and location (name, address, map/website links). ' +
        'Use this when the user asks "what time does X start" or "where is the ceremony" for this wedding. Read-only. ' +
        'Returns status "no_itinerary" if none has been set up yet — in that case say so rather than guessing times.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => handleGetWeddingItinerary(ctx),
    }),

    // ── Get Wedding Schedule ───────────────────────────────────────────────
    get_wedding_schedule: tool({
      description:
        'Returns the current wedding\'s detailed run-of-show schedule: named time blocks (which may run in parallel), ' +
        'each containing ordered stages with calculated start/end times, durations, notes, and the assigned provider ' +
        '(name, category, contact) if any. This is the operational/vendor-facing timeline, more granular than ' +
        'get_wedding_itinerary — use get_wedding_itinerary instead for a couple/guest-facing summary of just the main ' +
        'events. Read-only. Returns status "no_schedule" if none has been created yet.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => handleGetWeddingSchedule(ctx),
    }),

    // ── Get Tasting Menu ───────────────────────────────────────────────────
    get_tasting_menu: tool({
      description:
        'Returns the current wedding\'s tasting menu round(s): title, description, tasting date, status, participant ' +
        'count, and each menu\'s sections with their dishes (name, description, whether selected as the final choice). ' +
        'Does NOT include the numeric scores participants gave each dish — use get_tasting_scores for that. Read-only. ' +
        'Returns status "no_menu" if no tasting menu has been created yet.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => handleGetTastingMenu(ctx),
    }),

    // ── Get Tasting Scores ─────────────────────────────────────────────────
    get_tasting_scores: tool({
      description:
        'Returns the current wedding\'s tasting menu results: for each dish, its average score (1-10), number of ' +
        'responses, and every individual participant\'s score and notes, plus an overall average score per round. Use ' +
        'this when the user asks which dishes scored best, or wants to see participant feedback. Read-only. Returns ' +
        'status "no_menu" if no tasting menu matches (e.g. an invalid roundNumber was given).',
      inputSchema: zodSchema(
        z.object({
          roundNumber: z
            .number()
            .int()
            .optional()
            .describe('Restrict results to a specific tasting round number. Omit to return scores for every round.'),
        }),
      ),
      execute: async ({ roundNumber }) => handleGetTastingScores(ctx, { roundNumber }),
    }),
  };

  // ── Planner-only tools — business-wide data not scoped to a single ──────
  // wedding. Only included when the caller is actually a planner, so an
  // admin/couple user never sees them as an option (they would only ever
  // fail with "No planner context available").
  const plannerTools: ToolSet = ctx.role !== 'planner' ? {} : {
    // ── Get Planner Weddings ──────────────────────────────────────────────
    get_planner_weddings: tool({
      description:
        'Lists every wedding managed by the current planner, each with its couple names, wedding date, total family ' +
        'count, and RSVP completion percentage. Use this for portfolio-level questions like "which of my weddings ' +
        'still have low RSVP completion?" or "what\'s coming up next?". Takes no parameters and always returns ALL of ' +
        'the planner\'s weddings — it does not filter by date range or status.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => handleGetPlannerWeddings(ctx),
    }),

    // ── List Quotes ─────────────────────────────────────────────────────────
    list_quotes: tool({
      description:
        'Lists quotes across the planner\'s whole business (not limited to one wedding), each with couple names, ' +
        'customer, status, event date, total, currency, and expiry date. Use this for questions like "what quotes are ' +
        'still pending?" or "show me quotes for the Garcia family". Follow up with get_quote_detail (using the ' +
        'returned id) when the user needs line-item detail on one specific quote. Read-only.',
      inputSchema: zodSchema(
        z.object({
          status: z
            .enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'])
            .optional()
            .describe('Filter to quotes with this exact status. Omit to return quotes in any status.'),
          search: z
            .string()
            .optional()
            .describe('Free-text filter matched (case-insensitive, substring) against couple names or customer name.'),
        }),
      ),
      execute: async ({ status, search }) => handleListQuotes(ctx, { status, search }),
    }),

    // ── Get Quote Detail ────────────────────────────────────────────────────
    get_quote_detail: tool({
      description:
        'Returns full detail for one specific quote by id: customer contact, status, event date/location, notes, ' +
        'subtotal, discount, tax rate, total, expiry date, and every line item (name, description, quantity, unit ' +
        'price, total). Get the quoteId from list_quotes first — this tool has no name/search lookup of its own. ' +
        'Read-only. Returns an error if the id does not exist or does not belong to this planner.',
      inputSchema: zodSchema(
        z.object({
          quoteId: z.string().describe('The exact quote id, as returned by list_quotes.'),
        }),
      ),
      execute: async ({ quoteId }) => handleGetQuoteDetail(ctx, { quoteId }),
    }),

    // ── List Contracts ──────────────────────────────────────────────────────
    list_contracts: tool({
      description:
        'Lists contracts across the planner\'s whole business, each with title, customer, linked quote\'s couple ' +
        'names/total, status, signer name/email, and signed date. Use this for questions like "which contracts are ' +
        'still awaiting signature?". Read-only — does not return the contract\'s full text/body, only this summary ' +
        'metadata.',
      inputSchema: zodSchema(
        z.object({
          status: z
            .enum(['DRAFT', 'SHARED', 'SIGNING', 'SIGNED', 'CANCELLED'])
            .optional()
            .describe('Filter to contracts with this exact status. Omit to return contracts in any status.'),
          search: z
            .string()
            .optional()
            .describe('Free-text filter matched (case-insensitive, substring) against title, customer name, or signer name.'),
        }),
      ),
      execute: async ({ status, search }) => handleListContracts(ctx, { status, search }),
    }),

    // ── List Invoices (planner-wide) ────────────────────────────────────────
    list_invoices: tool({
      description:
        'Lists invoices across the planner\'s ENTIRE business (every wedding), each with invoice number, type, ' +
        'customer, couple names, status, total, amount paid, outstanding, issue date, and due date — plus a ' +
        'totalCollected figure summed across all issued/partial/paid invoices returned. For invoices scoped to just ' +
        'the wedding currently in context, use get_wedding_invoices instead, which is simpler and doesn\'t require a ' +
        'planner role. Read-only.',
      inputSchema: zodSchema(
        z.object({
          status: z
            .enum(['DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'])
            .optional()
            .describe('Filter to invoices with this exact status. Omit to return invoices in any status.'),
          search: z
            .string()
            .optional()
            .describe('Free-text filter matched (case-insensitive, substring) against invoice number, customer name, or couple names.'),
        }),
      ),
      execute: async ({ status, search }) => handleListInvoices(ctx, { status, search }),
    }),

    // ── Record Invoice Payment ──────────────────────────────────────────────
    record_invoice_payment: tool({
      description:
        'Records a real, non-reversible payment against one invoice and updates its status (to PARTIAL or PAID) — a ' +
        'genuine financial transaction, not a note or a draft. Get the invoiceId from list_quotes/get_quote_detail ' +
        'flow via its invoice, or from list_invoices/get_wedding_invoices first. This tool is confirm-gated: the ' +
        'first call (confirm omitted or false) never writes anything — it validates the invoice (must exist for this ' +
        'planner, must not be cancelled) and returns a preview with status "confirmation_required" including the ' +
        'invoice\'s current outstanding balance. Relay that preview to the user verbatim and only re-call this tool ' +
        'with confirm: true (and the exact same other arguments) once they have explicitly confirmed the amount and ' +
        'date — never guess or assume confirmation from ambiguous phrasing. Never call this speculatively.',
      inputSchema: zodSchema(
        z.object({
          invoiceId: z.string().describe('The exact invoice id to record the payment against.'),
          amount: z.number().positive().describe('The payment amount, in the invoice\'s own currency, as a positive number.'),
          paymentDate: z.string().describe('The date the payment was made/received, in YYYY-MM-DD format.'),
          method: z
            .enum(['CASH', 'BANK_TRANSFER', 'PAYPAL', 'BIZUM', 'REVOLUT', 'OTHER'])
            .optional()
            .describe('How the payment was made. Defaults to BANK_TRANSFER if omitted.'),
          reference: z.string().optional().describe('Optional free-text payment reference/note (e.g. a transfer reference number).'),
          confirm: z.boolean().optional().describe(CONFIRM_DESC),
        }),
      ),
      execute: async ({ invoiceId, amount, paymentDate, method, reference, confirm }) =>
        handleRecordInvoicePayment(ctx, { invoiceId, amount, paymentDate, method, reference, confirm }),
    }),
  };

  return { ...weddingTools, ...plannerTools };
}
