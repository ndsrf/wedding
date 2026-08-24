/**
 * Regression test for the "search_knowledge_base missing from /mcp's
 * tools/list" bug: the /mcp route (src/app/(public)/mcp/route.ts) hand-maintains
 * a JSON-Schema copy of the tool definitions built by buildTools() (src/lib/ai/tools.ts)
 * so that Claude Desktop / other MCP clients can discover them via tools/list.
 * That hand-maintained copy can silently drift from the real tool set.
 *
 * This asserts, for both roles, that the set of tool names advertised by
 * getToolDefs() exactly matches the set of tool names actually returned by
 * buildTools() — so a tool added to one but not the other fails the build.
 */

// Neither getToolDefs() nor buildTools() touches the database at construction
// time (prisma is only called inside a tool's execute()), but api-key.ts and
// tool-handlers.ts import the real prisma singleton, which throws at import
// time without DATABASE_URL. Mock it out so this pure "do the two tool lists
// agree" check doesn't need a real database.
jest.mock('@/lib/db/prisma', () => ({ prisma: {} }));

// The 'ai' package ships an ESM-only dist that Jest's CJS runner can't parse.
// tools.ts only needs tool()/zodSchema() at construction time (this test never
// calls a tool's execute()), so a minimal pass-through mock is enough.
jest.mock('ai', () => ({
  tool: (def: unknown) => def,
  zodSchema: (schema: unknown) => schema,
}));

// retrieval.ts transitively imports embeddings.ts -> provider.ts -> the
// @ai-sdk/* packages, which are ESM-only for the same reason as 'ai' above.
jest.mock('@/lib/ai/retrieval', () => ({ retrieveChunks: jest.fn() }));

import { getToolDefs } from '@/app/(public)/mcp/route';
import { buildTools } from '@/lib/ai/tools';
import type { ApiKeyContext } from '@/lib/auth/api-key';

const WEDDING_ID = '00000000-0000-0000-0000-000000000001';
const PLANNER_ID = '00000000-0000-0000-0000-000000000002';

function names(defs: { name: string }[]): string[] {
  return [...defs.map((d) => d.name)].sort();
}

describe('mcp route tools/list stays in sync with buildTools()', () => {
  it('advertises exactly the tools buildTools() returns for a wedding_admin', () => {
    const ctx: ApiKeyContext = { role: 'wedding_admin', wedding_id: WEDDING_ID, planner_id: PLANNER_ID };
    const advertised = names(getToolDefs(ctx));
    const actual = names(Object.keys(buildTools({ role: 'wedding_admin', weddingId: WEDDING_ID, plannerId: PLANNER_ID })).map((name) => ({ name })));

    expect(advertised).toEqual(actual);
  });

  it('advertises exactly the tools buildTools() returns for a planner', () => {
    const ctx: ApiKeyContext = { role: 'planner', wedding_id: WEDDING_ID, planner_id: PLANNER_ID };
    const advertised = names(getToolDefs(ctx));
    const actual = names(Object.keys(buildTools({ role: 'planner', weddingId: WEDDING_ID, plannerId: PLANNER_ID })).map((name) => ({ name })));

    expect(advertised).toEqual(actual);
  });

  it('never advertises planner-only tools to a wedding_admin', () => {
    const ctx: ApiKeyContext = { role: 'wedding_admin', wedding_id: WEDDING_ID, planner_id: PLANNER_ID };
    const advertised = names(getToolDefs(ctx));

    expect(advertised).not.toContain('get_planner_weddings');
    expect(advertised).not.toContain('record_invoice_payment');
    expect(advertised).not.toContain('list_invoices');
  });

  it('includes search_knowledge_base for both roles (regression: was missing entirely)', () => {
    expect(names(getToolDefs({ role: 'wedding_admin', wedding_id: WEDDING_ID, planner_id: PLANNER_ID }))).toContain('search_knowledge_base');
    expect(names(getToolDefs({ role: 'planner', wedding_id: WEDDING_ID, planner_id: PLANNER_ID }))).toContain('search_knowledge_base');
  });
});
