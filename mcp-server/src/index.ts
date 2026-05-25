#!/usr/bin/env node
/**
 * Nupci MCP Server
 *
 * Exposes the Nupci wedding management platform as MCP tools for use
 * with Claude Desktop or any MCP-compatible client.
 *
 * All tool calls are forwarded to the unified POST /api/mcp endpoint on
 * the Nupci server — business logic lives there, not here. Adding a new
 * tool only requires updating tool-handlers.ts on the server side and
 * adding a tool definition below.
 *
 * Environment variables:
 *   NUPCI_URL    - Base URL of your Nupci instance (e.g. https://your-domain.com)
 *   NUPCI_API_KEY - API key (generated from the platform settings)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// ── Config ─────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NUPCI_URL?.replace(/\/$/, '');
const API_KEY = process.env.NUPCI_API_KEY;

if (!BASE_URL || !API_KEY) {
  process.stderr.write('ERROR: NUPCI_URL and NUPCI_API_KEY environment variables are required.\n');
  process.exit(1);
}

// ── HTTP Client ────────────────────────────────────────────────────────────────

async function callTool(tool: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api/mcp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tool, args }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new McpError(ErrorCode.InternalError, `API ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Tool Definitions ───────────────────────────────────────────────────────────

const ADMIN_TOOLS = [
  {
    name: 'get_guest_list',
    description: 'Get a summary of the wedding guest list including family names, contact info, and RSVP status.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_rsvp_status',
    description:
      'Get aggregate RSVP statistics: total families, total people, submitted RSVPs, pending, and completion percentage.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_guests_by_label',
    description:
      'Get the count of individual people belonging to families tagged with a specific label. Label matching is case-insensitive.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        labelName: { type: 'string', description: 'The label name to filter by (case-insensitive)' },
      },
      required: ['labelName'],
    },
  },
  {
    name: 'update_family_rsvp',
    description:
      'Update the RSVP attendance for a family or individual members. ' +
      'Use memberUpdates for named individuals; use attending for a whole-family default.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        familyName: { type: 'string', description: 'The name of the family to update' },
        attending: { type: 'boolean', description: 'Whole-family attendance (optional)' },
        memberUpdates: {
          type: 'array',
          description: 'Per-member attendance updates',
          items: {
            type: 'object',
            properties: {
              memberName: { type: 'string' },
              attending: { type: 'boolean' },
            },
            required: ['memberName', 'attending'],
          },
        },
      },
      required: ['familyName'],
    },
  },
  {
    name: 'assign_family_to_table',
    description: 'Assign the attending members of a family to a seating table. Clears any previous assignment first.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        familyName: { type: 'string', description: 'The name of the family to seat' },
        tableNumber: { type: 'number', description: 'Table number to assign the family to' },
        memberNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific member names to assign (omit to assign all attending members)',
        },
      },
      required: ['familyName', 'tableNumber'],
    },
  },
  {
    name: 'suggest_tables_for_family',
    description:
      'Find the best table(s) for a family. Ranks by: available seats, shared admin group, and average age similarity.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        familyName: { type: 'string', description: 'The name of the family' },
        topN: { type: 'number', description: 'How many suggestions to return (default 3)' },
      },
      required: ['familyName'],
    },
  },
  {
    name: 'add_reminder',
    description:
      'Add a reminder or task to the wedding checklist. ' +
      'Supports absolute dates (YYYY-MM-DD) or relative dates (e.g. "WEDDING_DATE-60").',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'The reminder title' },
        description: { type: 'string', description: 'Additional details (optional)' },
        dueDate: { type: 'string', description: 'Absolute due date in YYYY-MM-DD format (optional)' },
        dueDateRelative: { type: 'string', description: 'Relative due date, e.g. "WEDDING_DATE-60" (optional)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'get_wedding_invoices',
    description: 'Get a summary of invoices and payments for this wedding.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_wedding_providers',
    description: 'Get the list of service providers (vendors) assigned to this wedding with payment status.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_wedding_itinerary',
    description:
      'Get the wedding itinerary: ceremony venue, reception hall, and other event locations with addresses and times.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_wedding_schedule',
    description:
      'Get the full wedding day schedule with blocks and stages including calculated start/end times and assigned providers.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_tasting_menu',
    description:
      'Get the tasting menu(s) for the wedding: rounds, sections, dishes, selection status, and tasting date.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_tasting_scores',
    description:
      'Get tasting scores submitted by participants for each dish, including per-dish averages and notes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        roundNumber: { type: 'number', description: 'Tasting round to retrieve (omit for all rounds)' },
      },
      required: [],
    },
  },
];

const PLANNER_TOOLS = [
  {
    name: 'get_planner_weddings',
    description: 'Get a list of all weddings managed by this planner with dates, guest counts, and RSVP completion.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'list_quotes',
    description:
      'List all quotes with status, couple names, and totals. Filter by status (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED) or search by name.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'], description: 'Filter by quote status' },
        search: { type: 'string', description: 'Partial match against couple or customer name' },
      },
      required: [],
    },
  },
  {
    name: 'get_quote_detail',
    description: 'Get the full breakdown of a specific quote including all line items.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        quoteId: { type: 'string', description: 'The quote ID to look up' },
      },
      required: ['quoteId'],
    },
  },
  {
    name: 'list_contracts',
    description:
      'List all contracts with status and signing information. Filter by status (DRAFT, SHARED, SIGNING, SIGNED, CANCELLED) or search by title/customer.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['DRAFT', 'SHARED', 'SIGNING', 'SIGNED', 'CANCELLED'], description: 'Filter by contract status' },
        search: { type: 'string', description: 'Partial match against contract title or customer name' },
      },
      required: [],
    },
  },
  {
    name: 'list_invoices',
    description:
      'List all invoices with amounts and outstanding balances. Filter by status (DRAFT, ISSUED, PARTIAL, PAID, OVERDUE, CANCELLED) or search by customer/invoice number.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'], description: 'Filter by invoice status' },
        search: { type: 'string', description: 'Partial match against customer name or invoice number' },
      },
      required: [],
    },
  },
  {
    name: 'record_invoice_payment',
    description:
      'Record a payment received against an invoice. Updates amount_paid and invoice status automatically.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        invoiceId: { type: 'string', description: 'The invoice ID' },
        amount: { type: 'number', description: 'Payment amount in the invoice currency' },
        paymentDate: { type: 'string', description: 'Payment date in YYYY-MM-DD format' },
        method: {
          type: 'string',
          enum: ['CASH', 'BANK_TRANSFER', 'PAYPAL', 'BIZUM', 'REVOLUT', 'OTHER'],
          description: 'Payment method (default: BANK_TRANSFER)',
        },
        reference: { type: 'string', description: 'Reference number or transaction ID (optional)' },
      },
      required: ['invoiceId', 'amount', 'paymentDate'],
    },
  },
];

// Role exposed by the API key governs which tools are meaningful, but we
// advertise all of them — the server enforces access via the key's role.
const ALL_TOOLS = [...PLANNER_TOOLS, ...ADMIN_TOOLS];

// ── Server ─────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'nupci', version: '1.1.0' },
  { capabilities: { tools: {}, resources: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: ALL_TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  try {
    const result = await callTool(name, args as Record<string, unknown>);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    if (error instanceof McpError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, msg);
  }
});

// ── Resources ──────────────────────────────────────────────────────────────────

const PLATFORM_DOCS_URI = 'platform://docs';

const PLATFORM_DOCS_SUMMARY = `
# Nupci Wedding Management Platform — Quick Reference

## Roles
- **Wedding Admin (Couple)**: Manages guests, RSVPs, seating, invitations, checklist, schedule, itinerary, tasting, and payments for their specific wedding.
- **Wedding Planner**: Manages multiple weddings, CRM, quotes, contracts, invoices, providers, and templates.

## Available Tools by Role

### Wedding Admin tools
| Tool | Description |
|------|-------------|
| get_guest_list | All families with members, contact info, and RSVP status |
| get_rsvp_status | Aggregate counts: total families/people, attending, pending |
| get_guests_by_label | Count people whose family has a specific label (case-insensitive) |
| update_family_rsvp | Set attending true/false per family or per individual member |
| assign_family_to_table | Seat a family's attending members at a numbered table |
| suggest_tables_for_family | Rank tables by free seats, shared-admin guests, age similarity |
| add_reminder | Add a checklist task (absolute or relative date, e.g. WEDDING_DATE-60) |
| get_wedding_invoices | Invoices and payment status for the wedding |
| get_wedding_providers | Service providers assigned to the wedding with payment info |
| get_wedding_itinerary | Venue locations with types, addresses, and Google Maps links |
| get_wedding_schedule | Full day-of timeline: blocks, stages, start/end times, providers |
| get_tasting_menu | All tasting rounds, sections, and dishes with selection status |
| get_tasting_scores | Per-dish scores, averages, and participant notes |

### Wedding Planner tools (in addition to the above)
| Tool | Description |
|------|-------------|
| get_planner_weddings | All weddings managed by this planner |
| list_quotes | All quotes with status and totals; filter by status or search by name |
| get_quote_detail | Full line-item breakdown of a specific quote |
| list_contracts | All contracts with signing status; filter by status or search |
| list_invoices | All invoices across clients; filter by status or search |
| record_invoice_payment | Record a payment against an invoice; status auto-updates |

## Guest Management
- Guests are organised as **Families** (a family unit may have multiple members).
- Each member has a name, type (adult/child/infant), age, and RSVP status.
- Families have a preferred channel (WhatsApp, Email, SMS), language (EN, ES, FR, IT, DE), and optional labels.

## RSVP Workflow
1. Planner or admin sends an invitation with a magic link via WhatsApp/Email/SMS.
2. Guest opens the link (no account needed) and confirms/declines attendance per family member.

## Seating
- Tables are numbered with a fixed capacity.
- suggest_tables_for_family ranks by: free seats → most shared-admin guests → closest average age.

## Wedding Schedule
- Day-of timeline organised as **blocks** (e.g. Preparation, Ceremony, Reception) containing **stages**.
- Stages run sequentially within a block (parallel tracks also supported).
- Each stage has a calculated start/end time and an optional assigned provider.
- Use get_wedding_schedule to answer "what time does X start?" or "who is the photographer during the ceremony?"

## Itinerary
- Key venue locations with types: CEREMONY, EVENT, PRE_EVENT, POST_EVENT.
- Each location has a name, address, and optional Google Maps link.
- Use get_wedding_itinerary for venue names, addresses, and event times.

## Tasting
- Tasting menus are structured as: Menu → Rounds → Sections → Dishes.
- Participants score dishes 1–5 and can leave notes.
- is_selected on a dish marks the final menu choice.
- Use get_tasting_menu for menu content; get_tasting_scores for ratings and feedback.

## Quotes, Contracts & Invoices
- **Quotes**: lifecycle DRAFT → SENT → ACCEPTED (or REJECTED/EXPIRED). Linked to a customer; can convert to a wedding.
- **Contracts**: lifecycle DRAFT → SHARED → SIGNING → SIGNED (or CANCELLED). Digital signature via DocuSeal.
- **Invoices**: track total, amount_paid, and outstanding balance. Statuses: DRAFT, ISSUED, PARTIAL, PAID, OVERDUE, CANCELLED. Use record_invoice_payment to log a received payment — status updates automatically.
- Payment methods: CASH, BANK_TRANSFER, PAYPAL, BIZUM, REVOLUT, OTHER (default: BANK_TRANSFER).

## Pages
- Wedding Admin panel: /admin
- Planner dashboard: /planner
`.trim();

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [{
    uri: PLATFORM_DOCS_URI,
    name: 'Nupci Platform Documentation',
    description: 'Quick reference for the Nupci wedding management platform features and workflows.',
    mimeType: 'text/markdown',
  }],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri !== PLATFORM_DOCS_URI) {
    throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${request.params.uri}`);
  }
  return {
    contents: [{ uri: PLATFORM_DOCS_URI, mimeType: 'text/markdown', text: PLATFORM_DOCS_SUMMARY }],
  };
});

// ── Start ──────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`Nupci MCP server v1.1.0 running (url: ${BASE_URL})\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
