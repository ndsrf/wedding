#!/usr/bin/env node
/**
 * Nupci MCP Server
 *
 * Exposes the Nupci wedding management platform as MCP tools for use
 * with Claude Desktop or any MCP-compatible client.
 *
 * Environment variables:
 *   NUPCI_URL   - Base URL of your Nupci instance (e.g. https://your-domain.com)
 *   NUPCI_API_KEY - API key (generated from the platform settings)
 *   NUPCI_ROLE  - "wedding_admin" (default) or "planner"
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

async function apiGet(path: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new McpError(ErrorCode.InternalError, `API ${res.status}: ${text}`);
  }
  return res.json();
}

async function apiPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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
    description:
      'Get a summary of the wedding guest list including family names, contact info, and RSVP status.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_rsvp_status',
    description:
      'Get aggregate RSVP statistics: total families, submitted RSVPs, pending, and completion percentage.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
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
    description:
      'Assign the attending members of a family to a seating table. Clears any previous assignment first.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        familyName: { type: 'string', description: 'The name of the family to seat' },
        tableNumber: { type: 'number', description: 'Table number to assign the family to' },
        memberNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific member names to assign (optional; omit to assign all attending members)',
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
        dueDateRelative: {
          type: 'string',
          description: 'Relative due date, e.g. "WEDDING_DATE-60" for 2 months before (optional)',
        },
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
];

const PLANNER_TOOLS = [
  {
    name: 'get_planner_weddings',
    description:
      'Get a list of all weddings managed by this planner with dates, guest counts, and RSVP completion.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
];

// Expose all tools — the backend enforces role-based access per API key
const ALL_TOOLS = [...PLANNER_TOOLS, ...ADMIN_TOOLS];

// ── Tool Handlers ──────────────────────────────────────────────────────────────

async function handleTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    // ── Wedding Admin Tools ──────────────────────────────────────────────────
    case 'get_guest_list':
      return apiGet('/api/admin/mcp/guests');

    case 'get_rsvp_status':
      return apiGet('/api/admin/mcp/rsvp-status');

    case 'update_family_rsvp':
      return apiPost('/api/admin/mcp/update-rsvp', args);

    case 'assign_family_to_table':
      return apiPost('/api/admin/mcp/assign-table', args);

    case 'suggest_tables_for_family': {
      const params: Record<string, string> = { familyName: String(args.familyName) };
      if (args.topN) params.topN = String(args.topN);
      return apiGet('/api/admin/mcp/suggest-tables', params);
    }

    case 'add_reminder':
      return apiPost('/api/admin/mcp/reminders', args);

    case 'get_wedding_invoices':
      return apiGet('/api/admin/mcp/invoices');

    case 'get_wedding_providers':
      return apiGet('/api/admin/mcp/providers');

    // ── Planner Tools ────────────────────────────────────────────────────────
    case 'get_planner_weddings':
      return apiGet('/api/planner/mcp/weddings');

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
}

// ── Resources ──────────────────────────────────────────────────────────────────

const PLATFORM_DOCS_URI = 'platform://docs';

const PLATFORM_DOCS_SUMMARY = `
# Nupci Wedding Management Platform — Quick Reference

## Roles
- **Wedding Admin (Couple)**: Manages guests, RSVPs, seating, invitations, checklist, providers, and payments for their specific wedding.
- **Wedding Planner**: Manages multiple weddings, CRM, quotes, contracts, invoices, and templates.

## Guest Management
- Guests are organised as **Families** (a family unit may have multiple members).
- Each member has a name, type (adult/child/infant), age, and RSVP status (attending / not attending / pending).
- Families have a preferred channel (WhatsApp, Email, SMS) and language (EN, ES, FR, IT, DE).

## RSVP Workflow
1. Planner or admin sends invitation with a magic link via WhatsApp/Email/SMS.
2. Guest opens the link (no account needed) and confirms/declines attendance for each family member.
3. Optionally answers dietary, transport, and custom questions.

## Seating
- Tables are numbered and have a fixed capacity.
- Attending members can be assigned to specific tables.
- The \`suggest_tables_for_family\` tool ranks tables by: enough free seats → most shared-admin guests → closest average age.

## Checklist & Reminders
- Reminders are checklist tasks in the "Reminders" section.
- Due dates can be absolute (YYYY-MM-DD) or relative (WEDDING_DATE±days).

## Invoices & Providers
- Invoices are linked to the wedding via quotes or contracts.
- Providers (vendors) can be assigned to a wedding with agreed amounts and payment tracking.

## Pages
- Wedding Admin panel: /admin
- Planner dashboard: /planner
`.trim();

// ── Server ─────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'nupci', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: ALL_TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  try {
    const result = await handleTool(name, args as Record<string, unknown>);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, msg);
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: PLATFORM_DOCS_URI,
      name: 'Nupci Platform Documentation',
      description: 'Quick reference for the Nupci wedding management platform features and workflows.',
      mimeType: 'text/markdown',
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri !== PLATFORM_DOCS_URI) {
    throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${request.params.uri}`);
  }
  return {
    contents: [
      {
        uri: PLATFORM_DOCS_URI,
        mimeType: 'text/markdown',
        text: PLATFORM_DOCS_SUMMARY,
      },
    ],
  };
});

// ── Start ──────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`Nupci MCP server running (url: ${BASE_URL})\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
