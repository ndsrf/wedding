/**
 * Remote MCP Server — /mcp
 *
 * Implements the MCP SSE transport (compatible with Claude Desktop):
 *
 *   GET  /mcp                    — open SSE stream; server sends an "endpoint" event
 *                                  with the URL the client should POST messages to
 *   POST /mcp?sessionId=<id>     — receive a JSON-RPC 2.0 message for an active session;
 *                                  responses are pushed back over the SSE stream
 *   POST /mcp                    — stateless mode (no SSE); useful for curl testing
 *   GET  /mcp (no SSE Accept)    — diagnostic JSON (key info + usage)
 *
 * Auth: Authorization: Bearer <npci_api_key> on every request.
 *
 * This module keeps sessions in a process-level Map, which works correctly
 * on a persistent Node.js server. Each session is cleaned up when the SSE
 * connection is closed by the client.
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

// ── Session store (process-level, persistent Node.js server only) ─────────────

interface Session {
  controller: ReadableStreamDefaultController<Uint8Array>;
  ctx: ApiKeyContext;
  pingInterval: ReturnType<typeof setInterval>;
}

const sessions = new Map<string, Session>();

function sseChunk(event: string, data: string): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${data}\n\n`);
}

function ssePing(): Uint8Array {
  return new TextEncoder().encode(': ping\n\n');
}

// ── MCP constants ─────────────────────────────────────────────────────────────

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'nupci', version: '1.0.0' };

const ERR = {
  PARSE: -32700,
  NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
  UNAUTHORIZED: -32001,
};

// ── Tool definitions ──────────────────────────────────────────────────────────

// Kept in sync by hand with the tool() definitions in tools.ts, since MCP's
// tools/list needs plain JSON Schema while the Vercel AI SDK side uses Zod.
// If a tool's description or schema changes in tools.ts, mirror it here too
// — otherwise external MCP clients (e.g. Claude Desktop) see a stale or
// missing definition even though executeTool() (which calls buildTools()
// directly) would still run it correctly.
const FAMILY_ID_DESC =
  'Exact family id to target, bypassing the fuzzy familyName search. Only use this after a previous call ' +
  'returned status "ambiguous" — pass the "id" of the intended family from that response\'s "families" list, ' +
  'together with the same familyName. Omit on the first attempt.';

const ADMIN_TOOL_DEFS = [
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
      'Update RSVP attendance for a family or individual members of this wedding. Writes immediately — only call for an ' +
      'explicit RSVP report or change. Use memberUpdates for named individuals; use attending only for a whole-family ' +
      'default with no members named. If familyName matches multiple families, returns status "ambiguous" with candidate ' +
      'ids instead of updating anything — re-call with familyId set.',
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
      },
      required: ['familyName'],
    },
  },
  {
    name: 'assign_family_to_table',
    description:
      'Seat the attending members of a family at a numbered table, writing immediately. Only members with attending ' +
      'RSVP status are eligible. Clears any previous table assignment for those members first, so this also works to ' +
      'move a family. Fails if the table lacks capacity. If familyName is ambiguous, returns candidate ids — re-call ' +
      'with familyId set.',
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
    description: 'Get invoices linked to this wedding (via quote or contract): status, total, amount paid, and outstanding balance for each. Read-only — cannot record payments.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_wedding_providers',
    description: 'Get the service providers (vendors) assigned to this wedding with category, agreed price, amount paid, outstanding balance, and contact info. Read-only.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
];

const PLANNER_TOOL_DEFS = [
  {
    name: 'get_planner_weddings',
    description: 'Get every wedding managed by this planner with couple names, date, family count, and RSVP completion percentage. Does not filter by date range or status.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
];

function getToolDefs(ctx: ApiKeyContext) {
  return ctx.role === 'planner'
    ? [...PLANNER_TOOL_DEFS, ...ADMIN_TOOL_DEFS]
    : ADMIN_TOOL_DEFS;
}

// ── Platform docs ─────────────────────────────────────────────────────────────

const PLATFORM_DOCS_URI = 'platform://docs';

const PLATFORM_DOCS = `
# Nupci Wedding Management Platform — Quick Reference

## Roles
- **Wedding Admin (Couple)**: manages guests, RSVPs, seating, checklist, providers, and payments for their specific wedding.
- **Wedding Planner**: manages multiple weddings, CRM, quotes, contracts, invoices, and templates.

## Guest Management
Guests are organised as Families (a unit may have multiple members). Each member has a name, type (adult/child/infant), age, and RSVP status. Families have a preferred channel (WhatsApp, Email, SMS) and language (EN, ES, FR, IT, DE).

## RSVP Workflow
1. Planner/admin sends an invitation with a magic link.
2. Guest opens the link (no account needed) and confirms/declines attendance per member.
3. Optionally answers dietary, transport, and custom questions.

## Seating
Tables are numbered with fixed capacity. suggest_tables_for_family ranks by: enough free seats → most shared-admin guests → closest average age.

## Checklist & Reminders
Due dates can be absolute (YYYY-MM-DD) or relative (WEDDING_DATE±days).

## Invoices & Providers
Invoices link to the wedding via quotes or contracts. Providers can be assigned with agreed amounts and payment tracking.
`.trim();

// ── Tool execution ────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ApiKeyContext,
): Promise<unknown> {
  const tools = buildTools({
    weddingId: ctx.wedding_id,
    plannerId: ctx.planner_id,
    role: ctx.role,
  });

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

async function dispatch(method: string, params: unknown, ctx: ApiKeyContext): Promise<unknown> {
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
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Tool execution failed';
        return { content: [{ type: 'text', text: msg }], isError: true };
      }
    }

    case 'resources/list':
      return {
        resources: [{
          uri: PLATFORM_DOCS_URI,
          name: 'Nupci Platform Documentation',
          description: 'Quick reference for platform features and workflows.',
          mimeType: 'text/markdown',
        }],
      };

    case 'resources/read': {
      const { uri } = params as { uri: string };
      if (uri !== PLATFORM_DOCS_URI) throw { code: ERR.INVALID_PARAMS, message: `Unknown resource: ${uri}` };
      return { contents: [{ uri: PLATFORM_DOCS_URI, mimeType: 'text/markdown', text: PLATFORM_DOCS }] };
    }

    default:
      throw { code: ERR.NOT_FOUND, message: `Method not found: ${method}` };
  }
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function authenticate(request: NextRequest): Promise<ApiKeyContext | null> {
  // Accept key from Authorization header OR ?api_key= query param
  const auth = request.headers.get('Authorization');
  const rawKey = auth?.startsWith('Bearer ')
    ? auth.slice(7)
    : new URL(request.url).searchParams.get('api_key') ?? null;
  if (!rawKey) return null;
  return validateApiKey(rawKey);
}

// ── GET — SSE stream or diagnostic ───────────────────────────────────────────

export async function GET(request: NextRequest) {
  const ctx = await authenticate(request);
  const accept = request.headers.get('Accept') ?? '';

  if (!ctx) {
    if (accept.includes('text/event-stream')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Authorization: Bearer <api_key> required' }, { status: 401 });
  }

  // SSE connection (Claude Desktop, other SSE-capable clients)
  if (accept.includes('text/event-stream')) {
    const sessionId = crypto.randomUUID();
    // Include the raw key in the POST URL so Claude Desktop doesn't need
    // to re-send an Authorization header on subsequent POST requests.
    const rawKey = new URL(request.url).searchParams.get('api_key') ?? '';
    const postUrl = rawKey
      ? `/mcp?sessionId=${sessionId}&api_key=${encodeURIComponent(rawKey)}`
      : `/mcp?sessionId=${sessionId}`;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const pingInterval = setInterval(() => {
          try {
            controller.enqueue(ssePing());
          } catch {
            clearInterval(pingInterval);
          }
        }, 25_000);

        sessions.set(sessionId, { controller, ctx, pingInterval });

        // Send the endpoint URL — client will POST messages here
        controller.enqueue(sseChunk('endpoint', JSON.stringify(postUrl)));
      },
      cancel() {
        const session = sessions.get(sessionId);
        if (session) clearInterval(session.pingInterval);
        sessions.delete(sessionId);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Diagnostic JSON (plain curl, browser)
  return NextResponse.json({
    server: SERVER_INFO,
    protocol: PROTOCOL_VERSION,
    role: ctx.role,
    transport: 'SSE — connect with Accept: text/event-stream, then POST JSON-RPC 2.0 to the returned endpoint URL.',
    example: {
      step1: `curl -N -H "Authorization: Bearer <key>" -H "Accept: text/event-stream" https://your-domain.com/mcp`,
      step2: `curl -X POST "https://your-domain.com/mcp?sessionId=<id from step1>" -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`,
      stateless: `curl -X POST https://your-domain.com/mcp -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`,
    },
  });
}

// ── POST — receive JSON-RPC message ──────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: JsonRpcRequest;
  try {
    body = await request.json() as JsonRpcRequest;
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: ERR.PARSE, message: 'Parse error' } },
      { status: 400 },
    );
  }

  // Notifications have no id — nothing to respond to
  if (!('id' in body) || body.id === undefined) {
    return new NextResponse(null, { status: 202 });
  }

  const id = body.id ?? null;

  // ── SSE session mode ────────────────────────────────────────────────────────
  // Session was authenticated at GET /mcp time — no need to re-check auth here.
  const sessionId = new URL(request.url).searchParams.get('sessionId');
  if (sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or expired. Reconnect via GET /mcp with Accept: text/event-stream.' },
        { status: 400 },
      );
    }

    // Dispatch and push response over the SSE stream
    try {
      const result = await dispatch(body.method, body.params, session.ctx);
      const message = JSON.stringify({ jsonrpc: '2.0', id, result });
      session.controller.enqueue(sseChunk('message', message));
    } catch (err: unknown) {
      const isRpcError = typeof err === 'object' && err !== null && 'code' in err && 'message' in err;
      const code = isRpcError ? Number((err as { code: number }).code) : ERR.INTERNAL;
      const message = isRpcError ? String((err as { message: string }).message) : 'Internal error';
      session.controller.enqueue(sseChunk('message', JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })));
    }

    return new NextResponse(null, { status: 202 });
  }

  // ── Stateless mode (curl testing, simple clients) ───────────────────────────
  const ctx = await authenticate(request);
  if (!ctx) {
    return NextResponse.json(
      { jsonrpc: '2.0', id, error: { code: ERR.UNAUTHORIZED, message: 'Authorization: Bearer <api_key> required' } },
      { status: 401 },
    );
  }
  try {
    const result = await dispatch(body.method, body.params, ctx);
    return NextResponse.json(
      { jsonrpc: '2.0', id, result },
      { headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  } catch (err: unknown) {
    const isRpcError = typeof err === 'object' && err !== null && 'code' in err && 'message' in err;
    const code = isRpcError ? Number((err as { code: number }).code) : ERR.INTERNAL;
    const message = isRpcError ? String((err as { message: string }).message) : 'Internal error';
    console.error('[MCP] dispatch error:', err);
    return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
    },
  });
}
