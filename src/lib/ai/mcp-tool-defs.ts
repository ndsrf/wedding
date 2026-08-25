/**
 * MCP tools/list Definitions
 *
 * Plain JSON-Schema tool definitions advertised by the /mcp JSON-RPC server's
 * tools/list method (src/app/(public)/mcp/route.ts), for external MCP clients
 * such as Claude Desktop. Kept in a separate module (rather than inline in
 * route.ts) because Next.js route files may only export the whitelisted
 * route handlers/config — any other export fails the build.
 *
 * Kept in sync by hand with the tool() definitions in tools.ts, since MCP's
 * tools/list needs plain JSON Schema while the Vercel AI SDK side uses Zod.
 * If a tool's description or schema changes in tools.ts, mirror it here too
 * — otherwise external MCP clients see a stale or missing definition even
 * though executeTool() (which calls buildTools() directly) would still run
 * it correctly. tests/unit/ai-tools-mcp-sync.test.ts guards the tool-name set
 * (not the descriptions/schemas themselves) against drifting from buildTools().
 */

import type { ApiKeyContext } from '@/lib/auth/api-key';

const FAMILY_ID_DESC =
  'Exact family id to target, bypassing the fuzzy familyName search. Only use this after a previous call ' +
  'returned status "ambiguous" — pass the "id" of the intended family from that response\'s "families" list, ' +
  'together with the same familyName. Omit on the first attempt.';
const CONFIRM_DESC =
  'Set to true ONLY after the user has explicitly confirmed the change you previewed to them. Omit or leave false ' +
  'on the first call — the tool validates the request and returns a preview (status "confirmation_required") ' +
  'instead of writing anything. Re-call with identical other arguments plus confirm: true to actually apply it.';

export const ADMIN_TOOL_DEFS = [
  {
    name: 'search_knowledge_base',
    description:
      'Searches the Nupci platform documentation and this wedding\'s knowledge base (uploaded wedding documents, ' +
      'planner notes, platform user-manual articles) by semantic similarity and returns up to 5 relevant passages. ' +
      'Use for "how do I / how does X work" questions about the platform; do NOT use it for live data such as the ' +
      'actual guest list, RSVP counts, invoices, or providers — use the dedicated tools for those instead.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'A focused search query, in English or Spanish, describing the feature or topic to look up.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_guest_list',
    description: 'Get every guest family for this wedding: family name, contact channel, member count, and attending/not-attending/pending breakdown. Does not include per-member names or table assignments.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_rsvp_status',
    description: 'Get aggregate RSVP statistics for this wedding: total families, submitted RSVPs, pending, and completion percentage.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'update_family_rsvp',
    description:
      'Update RSVP attendance for a family or individual members of this wedding. Confirm-gated: the first call ' +
      '(confirm omitted/false) validates the request and returns a preview (status "confirmation_required") without ' +
      'writing; only re-call with confirm: true after the user agrees. Use memberUpdates for named individuals; use ' +
      'attending only for a whole-family default with no members named. If familyName matches multiple families, ' +
      'returns status "ambiguous" with candidate ids instead — re-call with familyId set.',
    inputSchema: {
      type: 'object',
      properties: {
        familyName: { type: 'string', description: 'The name of the family to update (case-insensitive substring match).' },
        familyId: { type: 'string', description: FAMILY_ID_DESC },
        attending: { type: 'boolean', description: 'Whole-family attendance default; set only when no member names are mentioned.' },
        memberUpdates: {
          type: 'array',
          description: 'Per-member attendance updates. Required whenever specific member names are mentioned.',
          items: {
            type: 'object',
            properties: {
              memberName: { type: 'string', description: 'Exact member name as stored in the guest list.' },
              attending: { type: 'boolean', description: 'Whether this member is attending.' },
            },
            required: ['memberName', 'attending'],
          },
        },
        confirm: { type: 'boolean', description: CONFIRM_DESC },
      },
      required: ['familyName'],
    },
  },
  {
    name: 'assign_family_to_table',
    description:
      'Seat the attending members of a family at a numbered table. Confirm-gated: the first call (confirm ' +
      'omitted/false) validates the family, table, and capacity, and returns a preview (status ' +
      '"confirmation_required") without writing; only re-call with confirm: true after the user agrees. Only members ' +
      'with attending RSVP status are eligible. Clears any previous table assignment for those members first, so ' +
      'this also works to move a family. Fails if the table lacks capacity. If familyName is ambiguous, returns ' +
      'candidate ids — re-call with familyId set.',
    inputSchema: {
      type: 'object',
      properties: {
        familyName: { type: 'string', description: 'The name of the family to seat (case-insensitive substring match).' },
        familyId: { type: 'string', description: FAMILY_ID_DESC },
        tableNumber: { type: 'number', description: 'Table number to assign the family to, as shown in the seating plan.' },
        memberNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific attending members to assign (omit to assign all attending members of the family).',
        },
        confirm: { type: 'boolean', description: CONFIRM_DESC },
      },
      required: ['familyName', 'tableNumber'],
    },
  },
  {
    name: 'suggest_tables_for_family',
    description:
      'Read-only: rank the best available table(s) for an already-attending family, without assigning anyone. Only ' +
      'tables with enough free seats are considered, ranked by shared inviter, then age similarity, then free seats. ' +
      'Returns "no_space" if nothing fits, or "ambiguous" with candidate ids if familyName matches multiple families.',
    inputSchema: {
      type: 'object',
      properties: {
        familyName: { type: 'string', description: 'The name of the family (case-insensitive substring match).' },
        familyId: { type: 'string', description: FAMILY_ID_DESC },
        topN: { type: 'number', description: 'How many ranked suggestions to return, best first (default 3).' },
      },
      required: ['familyName'],
    },
  },
  {
    name: 'add_reminder',
    description:
      "Add a task to this wedding's checklist Reminders section (created automatically if missing). Provide EITHER " +
      "dueDate (an absolute YYYY-MM-DD date) OR dueDateRelative (format 'WEDDING_DATE[+-]<days>', e.g. 'WEDDING_DATE-60' " +
      'for 2 months before the wedding) — never both; dueDate takes precedence if both are given. Always creates a new ' +
      'task; cannot edit or complete an existing one.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'A short, actionable title for the reminder or task.' },
        description: { type: 'string', description: 'Additional details (optional)' },
        dueDate: { type: 'string', description: 'Absolute due date in YYYY-MM-DD format (optional). Takes precedence over dueDateRelative.' },
        dueDateRelative: { type: 'string', description: "Relative due date, format 'WEDDING_DATE[+-]<days>' e.g. 'WEDDING_DATE-60' (optional)." },
      },
      required: ['title'],
    },
  },
  {
    name: 'get_wedding_invoices',
    description: 'Get invoices linked to this wedding (via quote or contract): status, total, amount paid, and outstanding balance for each. Read-only — cannot record payments; planners can use record_invoice_payment for that.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_wedding_providers',
    description: 'Get the service providers (vendors) assigned to this wedding with category, agreed price, amount paid, outstanding balance, and contact info. Read-only.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_wedding_itinerary',
    description: 'Get this wedding\'s public-facing itinerary: ordered items (ceremony, reception, etc.) with type, local date/time, notes, and location. Read-only. Returns status "no_itinerary" if none is set up yet.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_wedding_schedule',
    description: 'Get this wedding\'s detailed run-of-show schedule: time blocks (possibly parallel) with ordered stages, calculated times, durations, notes, and assigned provider. More granular than get_wedding_itinerary. Read-only. Returns status "no_schedule" if none exists yet.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_tasting_menu',
    description: 'Get this wedding\'s tasting menu round(s): title, description, tasting date, status, participant count, and each section\'s dishes. Does not include participant scores — use get_tasting_scores for that. Read-only. Returns status "no_menu" if none exists yet.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_tasting_scores',
    description: 'Get this wedding\'s tasting results: per-dish average score, response count, and every participant\'s individual score/notes, plus an overall average per round. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        roundNumber: { type: 'number', description: 'Restrict to a specific tasting round number (optional; omit for all rounds).' },
      },
      required: [],
    },
  },
  {
    name: 'get_guests_by_label',
    description: 'Get guest families for this wedding carrying a specific admin-defined label/tag (e.g. "VIP"), with per-family and aggregate attending/not-attending/pending breakdowns. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        labelName: { type: 'string', description: 'The exact label name to filter by (case-insensitive).' },
      },
      required: ['labelName'],
    },
  },
];

export const PLANNER_TOOL_DEFS = [
  {
    name: 'get_planner_weddings',
    description: 'Get every wedding managed by this planner with couple names, date, family count, and RSVP completion percentage. Does not filter by date range or status.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_quotes',
    description: 'List quotes across the planner\'s whole business: couple names, customer, status, event date, total, currency, expiry date. Follow up with get_quote_detail for line items. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'], description: 'Filter to this exact status (optional).' },
        search: { type: 'string', description: 'Case-insensitive substring filter on couple names or customer name (optional).' },
      },
      required: [],
    },
  },
  {
    name: 'get_quote_detail',
    description: 'Get full detail for one quote by id (from list_quotes): customer contact, status, event date/location, financials, and line items. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        quoteId: { type: 'string', description: 'The exact quote id, from list_quotes.' },
      },
      required: ['quoteId'],
    },
  },
  {
    name: 'list_contracts',
    description: 'List contracts across the planner\'s whole business: title, customer, linked quote total, status, signer, signed date. Does not include the contract\'s full text. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['DRAFT', 'SHARED', 'SIGNING', 'SIGNED', 'CANCELLED'], description: 'Filter to this exact status (optional).' },
        search: { type: 'string', description: 'Case-insensitive substring filter on title, customer name, or signer name (optional).' },
      },
      required: [],
    },
  },
  {
    name: 'list_invoices',
    description: 'List invoices across the planner\'s ENTIRE business (all weddings), with a totalCollected summary. For just the current wedding, use get_wedding_invoices instead. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'], description: 'Filter to this exact status (optional).' },
        search: { type: 'string', description: 'Case-insensitive substring filter on invoice number, customer name, or couple names (optional).' },
      },
      required: [],
    },
  },
  {
    name: 'record_invoice_payment',
    description:
      'Record a real, non-reversible payment against one invoice and update its status. Confirm-gated: the first ' +
      'call (confirm omitted/false) validates the invoice and returns a preview (status "confirmation_required") ' +
      'with the current outstanding balance, without writing; only re-call with confirm: true after the user ' +
      'explicitly confirms amount and date.',
    inputSchema: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string', description: 'The exact invoice id to record the payment against.' },
        amount: { type: 'number', description: 'The payment amount, in the invoice\'s own currency, as a positive number.' },
        paymentDate: { type: 'string', description: 'The date the payment was made/received, in YYYY-MM-DD format.' },
        method: { type: 'string', enum: ['CASH', 'BANK_TRANSFER', 'PAYPAL', 'BIZUM', 'REVOLUT', 'OTHER'], description: 'How the payment was made (optional, defaults to BANK_TRANSFER).' },
        reference: { type: 'string', description: 'Optional free-text payment reference/note.' },
        confirm: { type: 'boolean', description: CONFIRM_DESC },
      },
      required: ['invoiceId', 'amount', 'paymentDate'],
    },
  },
];

export function getToolDefs(ctx: ApiKeyContext) {
  return ctx.role === 'planner'
    ? [...PLANNER_TOOL_DEFS, ...ADMIN_TOOL_DEFS]
    : ADMIN_TOOL_DEFS;
}
