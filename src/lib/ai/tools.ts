/**
 * Vercel AI SDK Tool Adapter for NupciBot.
 *
 * Wraps each handler from tool-handlers.ts in a Vercel AI SDK tool() call,
 * adding the Zod input schema and description needed by streamText.
 *
 * Business logic lives entirely in tool-handlers.ts so it can be reused by
 * the unified MCP endpoint (src/app/(public)/api/mcp/route.ts).
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import type { ToolSet } from 'ai';
import { retrieveChunks } from './retrieval';
import {
  type ToolContext,
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
} from './tool-handlers';

export type { ToolContext };

export function buildTools(ctx: ToolContext): ToolSet {
  return {
    // ── RAG Knowledge Base Search (NupciBot-only, no MCP equivalent) ──────
    search_knowledge_base: tool({
      description:
        'Search the platform documentation and wedding knowledge base. ' +
        'MANDATORY for any questions about how features work, navigation, or business workflows. ' +
        'Examples: "how to create a quote", "how to manage providers", "digital signatures", "guest rsvp setup". ' +
        'Returns specific instructions and deep links.',
      inputSchema: zodSchema(
        z.object({ query: z.string().describe('The search query (English or Spanish) to find relevant documentation') }),
      ),
      execute: async ({ query }: { query: string }) => {
        try {
          const chunks = await retrieveChunks({ query, weddingId: ctx.weddingId, plannerId: ctx.plannerId, role: ctx.role });
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

    // ── Guest List ─────────────────────────────────────────────────────────
    get_guest_list: tool({
      description: 'Get a summary of the wedding guest list including family names, contact info, and RSVP status.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        try { return await handleGetGuestList(ctx); }
        catch (err) { console.error('[TOOLS] get_guest_list error:', err); return { error: 'Failed to retrieve guest list' }; }
      },
    }),

    // ── RSVP Status ────────────────────────────────────────────────────────
    get_rsvp_status: tool({
      description:
        'Get aggregate RSVP statistics. ' +
        'totalFamilies = number of contact groups; totalPeople = number of individual people invited. ' +
        'attending/notAttending/pendingPeople are all individual person counts.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        try { return await handleGetRsvpStatus(ctx); }
        catch (err) { console.error('[TOOLS] get_rsvp_status error:', err); return { error: 'Failed to retrieve RSVP status' }; }
      },
    }),

    // ── Guests by Label ────────────────────────────────────────────────────
    get_guests_by_label: tool({
      description:
        'Get the count of individual people (not families) that belong to families tagged with a specific label. ' +
        'Label matching is case-insensitive. Use this whenever the user asks "how many people/guests have label X".',
      inputSchema: zodSchema(
        z.object({ labelName: z.string().describe('The label name to filter by (case-insensitive)') }),
      ),
      execute: async ({ labelName }: { labelName: string }) => {
        try { return await handleGetGuestsByLabel(ctx, { labelName }); }
        catch (err) { console.error('[TOOLS] get_guests_by_label error:', err); return { error: 'Failed to retrieve guests by label' }; }
      },
    }),

    // ── Update Family RSVP ─────────────────────────────────────────────────
    update_family_rsvp: tool({
      description:
        'Update the RSVP attendance for a family or specific individual members within a family. ' +
        'Use memberUpdates for named individuals; use attending as a whole-family default.',
      inputSchema: zodSchema(
        z.object({
          familyName: z.string().describe('The name of the family to update'),
          attending: z.boolean().optional().describe('Whole-family default (omit when using memberUpdates for specific members)'),
          memberUpdates: z.array(
            z.object({ memberName: z.string(), attending: z.boolean() }),
          ).optional().describe('Per-member attendance updates — required when specific member names are mentioned'),
        }),
      ),
      execute: async ({ familyName, attending, memberUpdates }: { familyName: string; attending?: boolean; memberUpdates?: Array<{ memberName: string; attending: boolean }> }) => {
        try { return await handleUpdateFamilyRsvp(ctx, { familyName, attending, memberUpdates }); }
        catch (err) { console.error('[TOOLS] update_family_rsvp error:', err); return { error: 'Failed to update RSVP status' }; }
      },
    }),

    // ── Assign Family to Table ─────────────────────────────────────────────
    assign_family_to_table: tool({
      description: 'Assign the attending members of a family to a specific table. Clears any previous table assignment first.',
      inputSchema: zodSchema(
        z.object({
          familyName: z.string().describe('The name of the family to seat'),
          tableNumber: z.number().int().describe('The table number to assign the family to'),
          memberNames: z.array(z.string()).optional().describe('Specific member names to assign (omit to assign all attending members)'),
        }),
      ),
      execute: async ({ familyName, tableNumber, memberNames }: { familyName: string; tableNumber: number; memberNames?: string[] }) => {
        try { return await handleAssignFamilyToTable(ctx, { familyName, tableNumber, memberNames }); }
        catch (err) { console.error('[TOOLS] assign_family_to_table error:', err); return { error: 'Failed to assign family to table' }; }
      },
    }),

    // ── Suggest Tables for a Family ────────────────────────────────────────
    suggest_tables_for_family: tool({
      description:
        'Find the best table(s) for a family. Ranks by: enough free seats, most shared-admin guests, closest average age.',
      inputSchema: zodSchema(
        z.object({
          familyName: z.string().describe('The name of the family to find a table for'),
          topN: z.number().int().optional().default(3).describe('How many table suggestions to return (default 3)'),
        }),
      ),
      execute: async ({ familyName, topN }: { familyName: string; topN?: number }) => {
        try { return await handleSuggestTablesForFamily(ctx, { familyName, topN }); }
        catch (err) { console.error('[TOOLS] suggest_tables_for_family error:', err); return { error: 'Failed to suggest tables' }; }
      },
    }),

    // ── Add Reminder ───────────────────────────────────────────────────────
    add_reminder: tool({
      description:
        'Add a reminder or task to the wedding checklist under the "Reminders" section.',
      inputSchema: zodSchema(
        z.object({
          title: z.string().describe('The title of the reminder or task'),
          description: z.string().optional().describe('Additional details about the reminder'),
          dueDate: z.string().optional().describe('The absolute due date in YYYY-MM-DD format'),
          dueDateRelative: z.string().optional().describe('Relative due date, e.g. "WEDDING_DATE-60" for 2 months before'),
        }),
      ),
      execute: async ({ title, description, dueDate, dueDateRelative }: { title: string; description?: string; dueDate?: string; dueDateRelative?: string }) => {
        try { return await handleAddReminder(ctx, { title, description, dueDate, dueDateRelative }); }
        catch (err) { console.error('[TOOLS] add_reminder error:', err); return { error: 'Failed to add reminder' }; }
      },
    }),

    // ── Planner Weddings ───────────────────────────────────────────────────
    get_planner_weddings: tool({
      description: 'Get a list of all weddings managed by this planner with dates, guest counts, and RSVP completion.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        try { return await handleGetPlannerWeddings(ctx); }
        catch (err) { console.error('[TOOLS] get_planner_weddings error:', err); return { error: 'Failed to retrieve weddings' }; }
      },
    }),

    // ── Wedding Invoices (wedding-scoped) ──────────────────────────────────
    get_wedding_invoices: tool({
      description: 'Get a summary of invoices and payments for the current wedding.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        try { return await handleGetWeddingInvoices(ctx); }
        catch (err) { console.error('[TOOLS] get_wedding_invoices error:', err); return { error: 'Failed to retrieve invoices' }; }
      },
    }),

    // ── Wedding Providers ──────────────────────────────────────────────────
    get_wedding_providers: tool({
      description: 'Get the list of providers (vendors) assigned to the current wedding, including their category and payment status.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        try { return await handleGetWeddingProviders(ctx); }
        catch (err) { console.error('[TOOLS] get_wedding_providers error:', err); return { error: 'Failed to retrieve providers' }; }
      },
    }),

    // ── Wedding Itinerary ──────────────────────────────────────────────────
    get_wedding_itinerary: tool({
      description:
        'Get the list of locations and events in the wedding itinerary (ceremony venue, reception hall, etc.). ' +
        'Use for questions about where the wedding takes place, venue names, addresses, or event times.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        try { return await handleGetWeddingItinerary(ctx); }
        catch (err) { console.error('[TOOLS] get_wedding_itinerary error:', err); return { error: 'Failed to retrieve wedding itinerary' }; }
      },
    }),

    // ── Wedding Schedule ───────────────────────────────────────────────────
    get_wedding_schedule: tool({
      description:
        'Get the full wedding day schedule with blocks and stages including calculated start/end times. ' +
        'Use for questions about the timeline, what time something starts, or which provider is assigned to a stage.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        try { return await handleGetWeddingSchedule(ctx); }
        catch (err) { console.error('[TOOLS] get_wedding_schedule error:', err); return { error: 'Failed to retrieve wedding schedule' }; }
      },
    }),

    // ── Tasting Menu ───────────────────────────────────────────────────────
    get_tasting_menu: tool({
      description:
        'Get the tasting menu(s): all rounds, sections, and dishes with selection status. ' +
        'Use for questions about the menu content, dishes, courses, or tasting date.',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        try { return await handleGetTastingMenu(ctx); }
        catch (err) { console.error('[TOOLS] get_tasting_menu error:', err); return { error: 'Failed to retrieve tasting menu' }; }
      },
    }),

    // ── Tasting Scores ─────────────────────────────────────────────────────
    get_tasting_scores: tool({
      description:
        'Get tasting scores per dish with per-dish averages and participant notes. ' +
        'Use for questions about ratings, feedback, or which dish scored highest/lowest.',
      inputSchema: zodSchema(
        z.object({
          roundNumber: z.number().int().optional().describe('Tasting round to retrieve (default: all rounds)'),
        }),
      ),
      execute: async ({ roundNumber }: { roundNumber?: number }) => {
        try { return await handleGetTastingScores(ctx, { roundNumber }); }
        catch (err) { console.error('[TOOLS] get_tasting_scores error:', err); return { error: 'Failed to retrieve tasting scores' }; }
      },
    }),

    // ── List Quotes ────────────────────────────────────────────────────────
    list_quotes: tool({
      description:
        'List all quotes for this planner with status, couple names, and totals. ' +
        'Filter by status (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED) or search by name.',
      inputSchema: zodSchema(
        z.object({
          status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
          search: z.string().optional().describe('Partial match against couple/customer name'),
        }),
      ),
      execute: async ({ status, search }: { status?: string; search?: string }) => {
        try { return await handleListQuotes(ctx, { status, search }); }
        catch (err) { console.error('[TOOLS] list_quotes error:', err); return { error: 'Failed to retrieve quotes' }; }
      },
    }),

    // ── Get Quote Detail ───────────────────────────────────────────────────
    get_quote_detail: tool({
      description: 'Get the full breakdown of a specific quote including all line items.',
      inputSchema: zodSchema(z.object({ quoteId: z.string().describe('The quote ID to look up') })),
      execute: async ({ quoteId }: { quoteId: string }) => {
        try { return await handleGetQuoteDetail(ctx, { quoteId }); }
        catch (err) { console.error('[TOOLS] get_quote_detail error:', err); return { error: 'Failed to retrieve quote detail' }; }
      },
    }),

    // ── List Contracts ─────────────────────────────────────────────────────
    list_contracts: tool({
      description:
        'List all contracts with their status and signing information. ' +
        'Filter by status (DRAFT, SHARED, SIGNING, SIGNED, CANCELLED) or search by title/customer.',
      inputSchema: zodSchema(
        z.object({
          status: z.enum(['DRAFT', 'SHARED', 'SIGNING', 'SIGNED', 'CANCELLED']).optional(),
          search: z.string().optional().describe('Partial match against contract title or customer name'),
        }),
      ),
      execute: async ({ status, search }: { status?: string; search?: string }) => {
        try { return await handleListContracts(ctx, { status, search }); }
        catch (err) { console.error('[TOOLS] list_contracts error:', err); return { error: 'Failed to retrieve contracts' }; }
      },
    }),

    // ── List Invoices (planner-wide) ───────────────────────────────────────
    list_invoices: tool({
      description:
        'List all invoices with status, amounts, and outstanding balances across all clients. ' +
        'Filter by status (DRAFT, ISSUED, PARTIAL, PAID, OVERDUE, CANCELLED) or search by customer/invoice number.',
      inputSchema: zodSchema(
        z.object({
          status: z.enum(['DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
          search: z.string().optional().describe('Partial match against customer name or invoice number'),
        }),
      ),
      execute: async ({ status, search }: { status?: string; search?: string }) => {
        try { return await handleListInvoices(ctx, { status, search }); }
        catch (err) { console.error('[TOOLS] list_invoices error:', err); return { error: 'Failed to retrieve invoices' }; }
      },
    }),

    // ── Record Invoice Payment ─────────────────────────────────────────────
    record_invoice_payment: tool({
      description:
        'Record a payment received against an invoice. Updates amount_paid and invoice status automatically. ' +
        'Always confirm invoice number and amount with the user before calling.',
      inputSchema: zodSchema(
        z.object({
          invoiceId: z.string().describe('The invoice ID'),
          amount: z.number().positive().describe('Payment amount in the invoice currency'),
          paymentDate: z.string().describe('Payment date in YYYY-MM-DD format'),
          method: z.enum(['CASH', 'BANK_TRANSFER', 'PAYPAL', 'BIZUM', 'REVOLUT', 'OTHER']).optional().default('BANK_TRANSFER'),
          reference: z.string().optional().describe('Reference number or transaction ID'),
        }),
      ),
      execute: async ({ invoiceId, amount, paymentDate, method, reference }: { invoiceId: string; amount: number; paymentDate: string; method?: string; reference?: string }) => {
        try { return await handleRecordInvoicePayment(ctx, { invoiceId, amount, paymentDate, method, reference }); }
        catch (err) { console.error('[TOOLS] record_invoice_payment error:', err); return { error: 'Failed to record payment' }; }
      },
    }),
  };
}
