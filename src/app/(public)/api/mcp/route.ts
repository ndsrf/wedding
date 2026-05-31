/**
 * Unified MCP Tool Dispatcher
 *
 * POST /api/mcp
 * Auth: Bearer API key
 * Body: { tool: string, args?: Record<string, unknown> }
 *
 * Replaces the previous per-tool routes under /api/admin/mcp/* and
 * /api/planner/mcp/*. All tool business logic lives in tool-handlers.ts
 * and is shared with NupciBot (Vercel AI SDK adapter in tools.ts).
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/api-key';
import { callHandler } from '@/lib/ai/tool-handlers';

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Bearer token required' }, { status: 401 });
  }

  const apiKeyCtx = await validateApiKey(authHeader.slice(7));
  if (!apiKeyCtx) {
    return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { tool?: string; args?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { tool, args = {} } = body;
  if (!tool || typeof tool !== 'string') {
    return NextResponse.json({ error: '"tool" field is required' }, { status: 400 });
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────
  try {
    const result = await callHandler(tool, {
      role: apiKeyCtx.role,
      weddingId: apiKeyCtx.wedding_id,
      plannerId: apiKeyCtx.planner_id,
    }, args);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith('Unknown tool:')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error('[MCP] dispatch error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
