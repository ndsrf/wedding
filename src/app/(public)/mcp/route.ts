/**
 * Remote MCP Server — POST /mcp
 *
 * Implements the Model Context Protocol (JSON-RPC 2.0) over HTTP.
 * Auth: Authorization: Bearer <npci_api_key>
 *
 * Supported methods:
 *   initialize, ping, tools/list, tools/call, resources/list, resources/read
 *   notifications/* → 202 (no body)
 *
 * All wedding-admin tools are available with a wedding_admin key.
 * The get_planner_weddings tool is available with a planner key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, type ApiKeyContext } from '@/lib/auth/api-key';
import { buildTools } from '@/lib/ai/tools';

// ── Types ─────────────────────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: unknown;
}

interface JsonRpcSuccess {
  jsonrpc: '2.0';
  id: string | number | null;
  result: unknown;
}

interface JsonRpcError {
  jsonrpc: '2.0';
  id: string | number | null;
  error: { code: number; message: string; data?: unknown };
}


// ── MCP Constants ─────────────────────────────────────────────────────────────

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'nupci', version: '1.0.0' };

// JSON-RPC error codes
const ERR = {
  PARSE: -32700,
  INVALID: -32600,
  NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
  UNAUTHORIZED: -32001,
};

// ── Tool Definitions ──────────────────────────────────────────────────────────

const ADMIN_TOOL_DEFS = [
  {
    name: 'get_guest_list',
    description: 'Get a summary of the wedding guest list including family names, contact info, and RSVP status.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_rsvp_status',
    description: 'Get aggregate RSVP statistics: total families, submitted RSVPs, pending, and completion percentage.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'update_family_rsvp',
    description: 'Update the RSVP attendance for a family or individual members. Use memberUpdates for named individuals; use attending for a whole-family default.',
    inputSchema: {
      type: 'object',
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
      type: 'object',
      properties: {
        familyName: { type: 'string', description: 'The name of the family to seat' },
        tableNumber: { type: 'number', description: 'Table number to assign the family to' },
        memberNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific members to assign (omit to assign all attending members)',
        },
      },
      required: ['familyName', 'tableNumber'],
    },
  },
  {
    name: 'suggest_tables_for_family',
    description: 'Find the best table(s) for a family based on available seats, shared admin group, and average age similarity.',
    inputSchema: {
      type: 'object',
      properties: {
        familyName: { type: 'string', description: 'The name of the family' },
        topN: { type: 'number', description: 'How many suggestions to return (default 3)' },
      },
      required: ['familyName'],
    },
  },
  {
    name: 'add_reminder',
    description: "Add a reminder or task to the wedding checklist. Supports absolute dates (YYYY-MM-DD) or relative dates (e.g. 'WEDDING_DATE-60').",
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The reminder title' },
        description: { type: 'string', description: 'Additional details (optional)' },
        dueDate: { type: 'string', description: 'Absolute due date in YYYY-MM-DD format (optional)' },
        dueDateRelative: { type: 'string', description: "Relative due date, e.g. 'WEDDING_DATE-60' for 2 months before (optional)" },
      },
      required: ['title'],
    },
  },
  {
    name: 'get_wedding_invoices',
    description: 'Get a summary of invoices and payments for this wedding.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_wedding_providers',
    description: 'Get the list of service providers (vendors) assigned to this wedding with payment status.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
];

const PLANNER_TOOL_DEFS = [
  {
    name: 'get_planner_weddings',
    description: 'Get a list of all weddings managed by this planner with dates, guest counts, and RSVP completion.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
];

function getToolDefs(ctx: ApiKeyContext) {
  return ctx.role === 'planner'
    ? [...PLANNER_TOOL_DEFS, ...ADMIN_TOOL_DEFS]
    : ADMIN_TOOL_DEFS;
}

// ── Platform docs resource ────────────────────────────────────────────────────

const PLATFORM_DOCS_URI = 'platform://docs';

const PLATFORM_DOCS = `
# Nupci Wedding Management Platform — Quick Reference

## Roles
- **Wedding Admin (Couple)**: Manages guests, RSVPs, seating, invitations, checklist, providers, and payments for their specific wedding.
- **Wedding Planner**: Manages multiple weddings, CRM, quotes, contracts, invoices, and templates.

## Guest Management
- Guests are organised as **Families** (a family unit may have multiple members).
- Each member has a name, type (adult/child/infant), age, and RSVP status.
- Families have a preferred channel (WhatsApp, Email, SMS) and language (EN, ES, FR, IT, DE).

## RSVP Workflow
1. Planner or admin sends invitation with a magic link via WhatsApp/Email/SMS.
2. Guest opens the link (no account needed) and confirms/declines attendance for each member.
3. Optionally answers dietary, transport, and custom questions.

## Seating
- Tables are numbered and have a fixed capacity.
- Attending members can be assigned to tables.
- suggest_tables_for_family ranks tables by: enough free seats → most shared-admin guests → closest average age.

## Checklist & Reminders
- Reminders are checklist tasks in the "Reminders" section.
- Due dates can be absolute (YYYY-MM-DD) or relative (WEDDING_DATE±days).

## Invoices & Providers
- Invoices are linked to the wedding via quotes or contracts.
- Providers (vendors) can be assigned with agreed amounts and payment tracking.
`.trim();

// ── Tool execution ────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ApiKeyContext,
): Promise<unknown> {
  const toolCtx = {
    weddingId: ctx.wedding_id,
    plannerId: ctx.planner_id,
    role: ctx.role,
  };

  const tools = buildTools(toolCtx);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tool = (tools as any)[name];

  if (!tool?.execute) {
    throw { code: ERR.NOT_FOUND, message: `Unknown tool: ${name}` };
  }

  return tool.execute(args ?? {}, {
    toolCallId: 'remote-mcp',
    messages: [],
    abortSignal: new AbortController().signal,
  });
}

// ── JSON-RPC dispatcher ───────────────────────────────────────────────────────

async function dispatch(
  method: string,
  params: unknown,
  ctx: ApiKeyContext,
): Promise<unknown> {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {}, resources: {} },
        serverInfo: SERVER_INFO,
      };

    case 'ping':
      return {};

    case 'tools/list':
      return { tools: getToolDefs(ctx) };

    case 'tools/call': {
      const { name, arguments: toolArgs = {} } = params as { name: string; arguments?: Record<string, unknown> };
      if (!name) throw { code: ERR.INVALID_PARAMS, message: 'tools/call requires params.name' };
      try {
        const result = await executeTool(name, toolArgs as Record<string, unknown>, ctx);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        // Return tool error as isError result (not a JSON-RPC error)
        const msg = err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) : 'Tool execution failed';
        return {
          content: [{ type: 'text', text: msg }],
          isError: true,
        };
      }
    }

    case 'resources/list':
      return {
        resources: [
          {
            uri: PLATFORM_DOCS_URI,
            name: 'Nupci Platform Documentation',
            description: 'Quick reference for platform features and workflows.',
            mimeType: 'text/markdown',
          },
        ],
      };

    case 'resources/read': {
      const { uri } = params as { uri: string };
      if (uri !== PLATFORM_DOCS_URI) {
        throw { code: ERR.INVALID_PARAMS, message: `Unknown resource: ${uri}` };
      }
      return {
        contents: [
          { uri: PLATFORM_DOCS_URI, mimeType: 'text/markdown', text: PLATFORM_DOCS },
        ],
      };
    }

    default:
      throw { code: ERR.NOT_FOUND, message: `Method not found: ${method}` };
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth: Bearer API key only
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json<JsonRpcError>(
      { jsonrpc: '2.0', id: null, error: { code: ERR.UNAUTHORIZED, message: 'Authorization: Bearer <api_key> required' } },
      { status: 401 },
    );
  }

  const ctx = await validateApiKey(authHeader.slice(7));
  if (!ctx) {
    return NextResponse.json<JsonRpcError>(
      { jsonrpc: '2.0', id: null, error: { code: ERR.UNAUTHORIZED, message: 'Invalid or expired API key' } },
      { status: 401 },
    );
  }

  let body: JsonRpcRequest;
  try {
    body = await request.json() as JsonRpcRequest;
  } catch {
    return NextResponse.json<JsonRpcError>(
      { jsonrpc: '2.0', id: null, error: { code: ERR.PARSE, message: 'Parse error' } },
      { status: 400 },
    );
  }

  // Notifications have no id — return 202 with no body
  if (!('id' in body) || body.id === undefined) {
    return new NextResponse(null, { status: 202 });
  }

  const id = body.id ?? null;

  try {
    const result = await dispatch(body.method, body.params, ctx);
    return NextResponse.json<JsonRpcSuccess>(
      { jsonrpc: '2.0', id, result },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        },
      },
    );
  } catch (err: unknown) {
    const isRpcError = typeof err === 'object' && err !== null && 'code' in err && 'message' in err;
    const code = isRpcError ? Number((err as { code: number }).code) : ERR.INTERNAL;
    const message = isRpcError ? String((err as { message: string }).message) : 'Internal error';
    console.error('[MCP] dispatch error:', err);
    return NextResponse.json<JsonRpcError>({ jsonrpc: '2.0', id, error: { code, message } });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}
