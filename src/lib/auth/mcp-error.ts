import { NextResponse } from 'next/server';

/**
 * Shared error handler for MCP API routes that use requireApiKeyAuth.
 * Maps UNAUTHORIZED/FORBIDDEN prefixes (thrown by requireApiKeyAuth) to HTTP responses.
 */
export function handleMcpError(error: unknown, context: string): NextResponse {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.startsWith('UNAUTHORIZED')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (msg.startsWith('FORBIDDEN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  console.error(`[MCP:${context}]`, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
