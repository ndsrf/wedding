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

async function apiPut(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
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
  {
    name: 'list_invitation_templates',
    description:
      'List all invitation templates for this wedding. Returns user-created templates and system seed templates. ' +
      'Read the invitation://schema resource first to understand the TemplateDesign format.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'create_invitation_template',
    description:
      'Create a new invitation template from a TemplateDesign JSON. ' +
      'Read invitation://schema first to generate a valid design. ' +
      'Text blocks require multilingual content for all 5 languages (ES, EN, FR, IT, DE).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Template name (e.g. "Garden Romance Invitation")' },
        design: {
          type: 'object',
          description: 'TemplateDesign JSON object with globalStyle and blocks array. See invitation://schema.',
        },
      },
      required: ['name', 'design'],
    },
  },
  {
    name: 'update_invitation_template',
    description: 'Update an existing invitation template name and/or design.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        templateId: { type: 'string', description: 'ID of the template to update' },
        name: { type: 'string', description: 'New template name (optional)' },
        design: { type: 'object', description: 'Updated TemplateDesign JSON (optional)' },
      },
      required: ['templateId'],
    },
  },
  {
    name: 'get_wedding_design_system',
    description:
      'Get the wedding design system (color palette, fonts, style) used to keep all documents visually consistent. ' +
      'Returns null if no design system has been set yet.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'set_wedding_design_system',
    description:
      'Save the wedding design system (color palette, fonts, style, motifs). ' +
      'Use this after generating a design with Claude Design to persist the visual identity. ' +
      'The same design system should be used for invitations, menus, and seating charts.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        designSystem: {
          type: 'object',
          description: 'WeddingDesignSystem object',
          properties: {
            palette: {
              type: 'object',
              properties: {
                primary: { type: 'string', description: 'Hex color, e.g. "#8B7355"' },
                secondary: { type: 'string' },
                accent: { type: 'string' },
                background: { type: 'string' },
                text: { type: 'string' },
              },
              required: ['primary', 'secondary', 'accent', 'background', 'text'],
            },
            fonts: {
              type: 'object',
              properties: {
                heading: { type: 'string', description: 'Font family name, must be one of the available fonts' },
                body: { type: 'string' },
                accent: { type: 'string' },
              },
              required: ['heading', 'body'],
            },
            style: { type: 'string', description: 'Style descriptor, e.g. "rustic-botanical", "modern-elegant"' },
            motifs: { type: 'array', items: { type: 'string' }, description: 'Visual motifs, e.g. ["floral", "botanical"]' },
            backgroundImageUrl: { type: 'string', description: 'URL of a background image or pattern (optional)' },
          },
          required: ['palette', 'fonts', 'style'],
        },
      },
      required: ['designSystem'],
    },
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

    // ── Invitation Template Tools ────────────────────────────────────────────
    case 'list_invitation_templates':
      return apiGet('/api/admin/mcp/invitation-templates');

    case 'create_invitation_template':
      return apiPost('/api/admin/mcp/invitation-templates', args);

    case 'update_invitation_template': {
      const { templateId, ...rest } = args;
      return apiPut(`/api/admin/mcp/invitation-templates/${String(templateId)}`, rest);
    }

    // ── Wedding Design System Tools ──────────────────────────────────────────
    case 'get_wedding_design_system':
      return apiGet('/api/admin/mcp/design-system');

    case 'set_wedding_design_system':
      return apiPut('/api/admin/mcp/design-system', args);

    // ── Planner Tools ────────────────────────────────────────────────────────
    case 'get_planner_weddings':
      return apiGet('/api/planner/mcp/weddings');

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
}

// ── Resources ──────────────────────────────────────────────────────────────────

const INVITATION_SCHEMA_URI = 'invitation://schema';

const INVITATION_SCHEMA_DOCS = `
# Nupci Invitation Template — Design Schema Reference

Use this reference to generate valid \`TemplateDesign\` JSON when calling \`create_invitation_template\`.

## Top-Level Structure

\`\`\`json
{
  "globalStyle": {
    "backgroundColor": "#FDFBF7",
    "backgroundImage": "/themes/garden-birds/botanical-pattern.svg",
    "paperBackgroundImage": "https://..."
  },
  "blocks": [ /* array of TemplateBlock */ ]
}
\`\`\`

- \`backgroundColor\`: hex color for the canvas background
- \`backgroundImage\`: optional URL to a tiling SVG/PNG pattern (use a system theme path or omit)
- \`paperBackgroundImage\`: optional URL to a user-uploaded paper texture

---

## Block Types

Each block needs a unique \`id\` (generate a UUID v4) and a \`type\`.

### TextBlock

\`\`\`json
{
  "id": "uuid",
  "type": "text",
  "content": {
    "ES": "Texto en español",
    "EN": "Text in English",
    "FR": "Texte en français",
    "IT": "Testo in italiano",
    "DE": "Text auf Deutsch"
  },
  "style": {
    "fontFamily": "Crimson Text, serif",
    "fontSize": "2rem",
    "color": "#2C2416",
    "textAlign": "center",
    "fontStyle": "italic",
    "fontWeight": "normal",
    "textDecoration": "none"
  }
}
\`\`\`

**Important:** \`content\` MUST include all 5 languages: ES, EN, FR, IT, DE.
Template variables available: \`{{couple_names}}\`, \`{{wedding_date}}\`

### ImageBlock

\`\`\`json
{
  "id": "uuid",
  "type": "image",
  "src": "https://...",
  "alt": "Wedding photo",
  "alignment": "center",
  "zoom": 100
}
\`\`\`

- \`alignment\`: "left" | "center" | "right"
- \`zoom\`: 10–200 (percentage)

### SpacerBlock

\`\`\`json
{ "id": "uuid", "type": "spacer", "height": "2rem" }
\`\`\`

Use to add vertical space between blocks. Height accepts any CSS value (rem, px, em).

### DividerBlock (visual separator)

\`\`\`json
{
  "id": "uuid",
  "type": "embed",
  "html": "<div style=\\"width:80%;margin:0 auto;border-top:1px solid #D4AF37;\\"></div>",
  "height": "1px"
}
\`\`\`

### EmbedBlock (HTML/SVG for decorative elements)

\`\`\`json
{
  "id": "uuid",
  "type": "embed",
  "html": "<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 400 80\\">...</svg>",
  "height": "80px"
}
\`\`\`

Use \`EmbedBlock\` for: ornamental borders, floral SVG dividers, decorative frames, gradient bands,
custom typography effects, or any rich HTML/CSS/SVG from Claude Design.
The HTML is rendered as-is inside the invitation canvas.

### LocationBlock

\`\`\`json
{ "id": "uuid", "type": "location" }
\`\`\`

Renders the wedding venue map and address automatically from the wedding data. No extra fields needed.

### CountdownBlock

\`\`\`json
{ "id": "uuid", "type": "countdown" }
\`\`\`

Shows a live countdown to the wedding date. Optionally add \`style\` with fontFamily, fontSize, color.

### AddToCalendarBlock

\`\`\`json
{ "id": "uuid", "type": "add-to-calendar" }
\`\`\`

Adds a calendar button. No configuration needed.

### ButtonBlock

\`\`\`json
{
  "id": "uuid",
  "type": "button",
  "text": { "ES": "RSVP", "EN": "RSVP", "FR": "RSVP", "IT": "RSVP", "DE": "RSVP" },
  "url": "https://...",
  "style": {
    "buttonColor": "#8B7355",
    "textColor": "#FFFFFF",
    "fontFamily": "Lora, serif",
    "alignment": "center"
  }
}
\`\`\`

### GalleryBlock

\`\`\`json
{
  "id": "uuid",
  "type": "gallery",
  "columns": 2,
  "showCaptions": false,
  "showUploadButton": true,
  "autoPlayMs": 0
}
\`\`\`

---

## Available Fonts

Choose from these font families (all pre-loaded by the platform):

**Elegant Serif** (recommended for headings):
Crimson Text, Cormorant Garamond, Lora, EB Garamond, Libre Baskerville

**Script & Cursive** (recommended for couple names):
Alex Brush, Great Vibes, Dancing Script, Parisienne, Sacramento, Allura, Tangerine

**Modern Sans-Serif**:
Inter, Poppins, Montserrat

Always use the full CSS font stack: \`"Great Vibes, cursive"\`, \`"Crimson Text, serif"\`, \`"Inter, sans-serif"\`

---

## System Theme Palettes

Use these as reference for color harmony:

| Theme | primary | accent | background | text |
|-------|---------|--------|-----------|------|
| classic-elegance | #8B7355 | #D4AF37 | #FDFBF7 | #2C2416 |
| garden-romance | #7C9473 | #E8A5A5 | #F9FBF7 | #2C3E2A |
| modern-minimal | #2D3748 | #4299E1 | #FFFFFF | #1A202C |
| rustic-charm | #8B4513 | #CD853F | #FFF8F0 | #3E2723 |
| beach-breeze | #0891B2 | #F59E0B | #F0FDFA | #164E63 |
| garden-birds | #6B8E6F | #E8B86D | #FAF9F5 | #3A4F3C |

---

## Example: Minimal Elegant Invitation

\`\`\`json
{
  "globalStyle": {
    "backgroundColor": "#FDFBF7"
  },
  "blocks": [
    {
      "id": "b1",
      "type": "spacer",
      "height": "2rem"
    },
    {
      "id": "b2",
      "type": "text",
      "content": {
        "ES": "Nos vamos a casar",
        "EN": "We Are Getting Married",
        "FR": "Nous allons nous marier",
        "IT": "Ci sposiamo",
        "DE": "Wir heiraten"
      },
      "style": {
        "fontFamily": "Cormorant Garamond, serif",
        "fontSize": "1.1rem",
        "color": "#5C5347",
        "textAlign": "center",
        "fontStyle": "italic"
      }
    },
    {
      "id": "b3",
      "type": "text",
      "content": {
        "ES": "{{couple_names}}",
        "EN": "{{couple_names}}",
        "FR": "{{couple_names}}",
        "IT": "{{couple_names}}",
        "DE": "{{couple_names}}"
      },
      "style": {
        "fontFamily": "Great Vibes, cursive",
        "fontSize": "3.5rem",
        "color": "#8B7355",
        "textAlign": "center"
      }
    },
    {
      "id": "b4",
      "type": "text",
      "content": {
        "ES": "{{wedding_date}}",
        "EN": "{{wedding_date}}",
        "FR": "{{wedding_date}}",
        "IT": "{{wedding_date}}",
        "DE": "{{wedding_date}}"
      },
      "style": {
        "fontFamily": "Lora, serif",
        "fontSize": "1.2rem",
        "color": "#5C5347",
        "textAlign": "center"
      }
    },
    { "id": "b5", "type": "countdown" },
    { "id": "b6", "type": "location" },
    { "id": "b7", "type": "add-to-calendar" }
  ]
}
\`\`\`
`.trim();

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
    {
      uri: INVITATION_SCHEMA_URI,
      name: 'Invitation Template Schema',
      description: 'Complete reference for generating TemplateDesign JSON: block types, fonts, theme palettes, and examples.',
      mimeType: 'text/markdown',
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === PLATFORM_DOCS_URI) {
    return {
      contents: [{ uri: PLATFORM_DOCS_URI, mimeType: 'text/markdown', text: PLATFORM_DOCS_SUMMARY }],
    };
  }
  if (request.params.uri === INVITATION_SCHEMA_URI) {
    return {
      contents: [{ uri: INVITATION_SCHEMA_URI, mimeType: 'text/markdown', text: INVITATION_SCHEMA_DOCS }],
    };
  }
  throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${request.params.uri}`);
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
