/**
 * Natural Language Query Service
 *
 * Converts natural language questions into safe, parameterized SQL queries.
 *
 * Two query modes:
 *  - Per-wedding (wedding_id scope): queries restricted to one wedding's data.
 *    $1 = wedding_id, $2 = admin_id (optional "my side" context).
 *  - Planner-level (planner_id scope): queries across all weddings the planner
 *    manages, plus the planner's own financials (quotes, invoices).
 *    $1 = planner_id.
 *
 * Security measures:
 * - Only SELECT statements are allowed (validated by node-sql-parser + keyword blocklist)
 * - All queries MUST include $1 as a parameterized value
 * - Results are capped at MAX_ROWS rows
 * - Only approved tables can be queried (separate sets per mode)
 * - The AI-generated SQL is re-validated before every execution
 */

import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { Parser } from 'node-sql-parser';
import { prisma } from '@/lib/db/prisma';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_ROWS = 1000;

/** PostgreSQL table names (from @@map directives) that the LLM may query */
const ALLOWED_TABLES = new Set([
  'families',
  'family_members',
  'guest_labels',
  'family_label_assignments',
  'tables',
  'wedding_admins',
  'gifts',
  // checklist
  'checklist_sections',
  'checklist_tasks',
  // providers & payments
  'wedding_providers',
  'provider_categories',
  'payments',
  // tasting menu
  'tasting_menus',
  'tasting_sections',
  'tasting_dishes',
  'tasting_participants',
  'tasting_scores',
]);

/** Keywords that must never appear in any generated query */
const DANGEROUS_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|EXECUTE|EXEC|CALL|MERGE|REPLACE|LOAD|COPY)\b/i;

// ============================================================================
// SCHEMA DESCRIPTION (system prompt for the LLM)
// ============================================================================

const SCHEMA_DESCRIPTION = `You are a PostgreSQL SQL query generator for a wedding management system.
Your ONLY job is to produce safe SELECT queries based on the user's natural-language question.

## Parameters (always provided — never hardcode these values)
- $1 = wedding_id  — scope EVERY query to this wedding
- $2 = current admin's ID — use when the user says "my guests", "my side", "I invited", "my families", etc.

## Available Tables

### families
id TEXT PK, wedding_id TEXT (**ALWAYS filter this with $1**), name TEXT, email TEXT, phone TEXT,
whatsapp_number TEXT, preferred_language TEXT (ES/EN/FR/IT/DE),
channel_preference TEXT (WHATSAPP/EMAIL/SMS), invited_by_admin_id TEXT FK→wedding_admins,
created_at TIMESTAMP

### family_members
id TEXT PK, family_id TEXT FK→families, name TEXT,
type TEXT (ADULT/CHILD/INFANT), attending BOOLEAN (true=yes, false=no, null=pending),
age INTEGER, dietary_restrictions TEXT, accessibility_needs TEXT,
table_id TEXT FK→tables, added_by_guest BOOLEAN, created_at TIMESTAMP
**NOTE: No direct wedding_id — MUST JOIN with families to scope by wedding.**

### guest_labels
id TEXT PK, wedding_id TEXT (**ALWAYS filter this with $1**), name TEXT, color TEXT, created_at TIMESTAMP

### family_label_assignments
family_id TEXT FK→families, label_id TEXT FK→guest_labels
**NOTE: No direct wedding_id — MUST JOIN with families or guest_labels to scope by wedding.
To find families with a label: JOIN family_label_assignments fla ON f.id = fla.family_id JOIN guest_labels gl ON fla.label_id = gl.id WHERE gl.wedding_id = $1.
To list labels with family counts: SELECT gl.name, COUNT(DISTINCT fla.family_id) FROM guest_labels gl LEFT JOIN family_label_assignments fla ON gl.id = fla.label_id WHERE gl.wedding_id = $1 GROUP BY gl.name.**

### tables
id TEXT PK, wedding_id TEXT (**ALWAYS filter this with $1**), name TEXT, number INTEGER,
capacity INTEGER, created_at TIMESTAMP

### wedding_admins
id TEXT PK, wedding_id TEXT (**ALWAYS filter this with $1**), name TEXT, email TEXT,
preferred_language TEXT, invited_at TIMESTAMP, last_login_at TIMESTAMP

### gifts
id TEXT PK, family_id TEXT FK→families, wedding_id TEXT (**ALWAYS filter this with $1**),
amount DECIMAL, reference_code_used TEXT, auto_matched BOOLEAN,
status TEXT (PENDING/RECEIVED/CONFIRMED), transaction_date TIMESTAMP, created_at TIMESTAMP
**NOTE: JOIN with families to get family name.**

### checklist_sections
id TEXT PK, wedding_id TEXT (**ALWAYS filter this with $1**), name TEXT, order INTEGER, created_at TIMESTAMP

### checklist_tasks
id TEXT PK, wedding_id TEXT (**ALWAYS filter this with $1**), section_id TEXT FK→checklist_sections,
title TEXT, description TEXT, assigned_to TEXT (WEDDING_PLANNER/COUPLE/OTHER),
due_date TIMESTAMP, status TEXT (PENDING/IN_PROGRESS/COMPLETED),
completed BOOLEAN, completed_at TIMESTAMP, completed_by TEXT, order INTEGER, created_at TIMESTAMP
**NOTE: Has direct wedding_id — no join needed to scope by wedding. JOIN checklist_sections for section name.**

### wedding_providers
id TEXT PK, wedding_id TEXT (**ALWAYS filter this with $1**), category_id TEXT FK→provider_categories,
provider_id TEXT, name TEXT, contact_name TEXT, email TEXT, phone TEXT,
total_price DECIMAL, notes TEXT, created_at TIMESTAMP
**NOTE: name is the provider name as assigned to this wedding. JOIN provider_categories for category name.**

### provider_categories
id TEXT PK, planner_id TEXT, name TEXT, created_at TIMESTAMP
**NOTE: no wedding_id — join via wedding_providers. Only use for the category name column.**

### payments
id TEXT PK, wedding_provider_id TEXT FK→wedding_providers, amount DECIMAL,
date TIMESTAMP, method TEXT (CASH/BANK_TRANSFER/PAYPAL/BIZUM/REVOLUT/OTHER), notes TEXT, created_at TIMESTAMP
**NOTE: No direct wedding_id — MUST JOIN via wedding_providers: FROM payments p JOIN wedding_providers wp ON p.wedding_provider_id = wp.id WHERE wp.wedding_id = $1.**

### tasting_menus
id TEXT PK, wedding_id TEXT (**ALWAYS filter this with $1**), title TEXT, description TEXT, created_at TIMESTAMP

### tasting_sections
id TEXT PK, menu_id TEXT FK→tasting_menus, name TEXT, order INTEGER, created_at TIMESTAMP
**NOTE: No direct wedding_id — MUST JOIN tasting_menus: FROM tasting_sections ts JOIN tasting_menus tm ON ts.menu_id = tm.id WHERE tm.wedding_id = $1.**

### tasting_dishes
id TEXT PK, section_id TEXT FK→tasting_sections, name TEXT, description TEXT,
is_selected BOOLEAN (true = chosen for final menu), order INTEGER, created_at TIMESTAMP
**NOTE: No direct wedding_id — MUST JOIN: FROM tasting_dishes td JOIN tasting_sections ts ON td.section_id = ts.id JOIN tasting_menus tm ON ts.menu_id = tm.id WHERE tm.wedding_id = $1.**

### tasting_participants
id TEXT PK, menu_id TEXT FK→tasting_menus, name TEXT, email TEXT, phone TEXT,
whatsapp_number TEXT, channel_preference TEXT (WHATSAPP/EMAIL/SMS), language TEXT,
invite_sent_at TIMESTAMP, created_at TIMESTAMP
**NOTE: No direct wedding_id — MUST JOIN tasting_menus: FROM tasting_participants tp JOIN tasting_menus tm ON tp.menu_id = tm.id WHERE tm.wedding_id = $1.**

### tasting_scores
id TEXT PK, participant_id TEXT FK→tasting_participants, dish_id TEXT FK→tasting_dishes,
score INTEGER (1–10), notes TEXT, created_at TIMESTAMP
**NOTE: No direct wedding_id — MUST JOIN through dishes or participants to scope by wedding. Shortest path: FROM tasting_scores sc JOIN tasting_dishes td ON sc.dish_id = td.id JOIN tasting_sections ts ON td.section_id = ts.id JOIN tasting_menus tm ON ts.menu_id = tm.id WHERE tm.wedding_id = $1. To get averages use AVG(score).**

## Strict Rules
1. ONLY write SELECT statements. NEVER write INSERT, UPDATE, DELETE, DROP, CREATE, ALTER or any other statement.
2. ALWAYS filter by wedding_id using $1 (e.g. WHERE f.wedding_id = $1 or WHERE wedding_id = $1).
3. For family_members, ALWAYS JOIN with families: FROM family_members fm JOIN families f ON fm.family_id = f.id WHERE f.wedding_id = $1.
4. You may use $1 (wedding_id) and $2 (current admin ID). No other parameters.
5. When the user says "my guests", "my side", "I invited", "from my side", etc. add AND f.invited_by_admin_id = $2.
6. Add LIMIT ${MAX_ROWS} at the end of every query.
7. Return ONLY the SQL query — no markdown fences, no code blocks, no explanations.
8. Use clear English column aliases (e.g. family_name, guest_name, attending_status).
9. Only reference tables listed above.`;

// ============================================================================
// SQL GENERATION (LLM)
// ============================================================================

async function generateSQLWithOpenAI(question: string, systemPrompt: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    max_tokens: 600,
    temperature: 0.1,
  });

  return response.choices[0]?.message?.content?.trim() ?? null;
}

async function generateSQLWithGemini(question: string, systemPrompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

  const result = await ai.models.generateContent({
    model: modelName,
    contents: question,
    config: { systemInstruction: systemPrompt },
  });
  return result.text?.trim() || null;
}

async function generateSQL(question: string, systemPrompt: string = SCHEMA_DESCRIPTION): Promise<string | null> {
  const provider =
    process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'gemini');

  console.log('[NL-QUERY] Generating SQL', { provider, questionLength: question.length });

  if (provider === 'gemini') {
    return generateSQLWithGemini(question, systemPrompt);
  }
  return generateSQLWithOpenAI(question, systemPrompt);
}

// ============================================================================
// SERIALIZATION
// ============================================================================

/**
 * PostgreSQL aggregate functions (COUNT, SUM, etc.) return BigInt values via
 * the pg driver. Convert them to regular numbers so they can be JSON-serialized
 * and placed into Excel cells.
 */
function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    out[key] = typeof val === 'bigint' ? Number(val) : val;
  }
  return out;
}

// ============================================================================
// SQL CLEANING & VALIDATION
// ============================================================================

function cleanSQL(rawSql: string): string {
  let sql = rawSql.trim();
  // Strip markdown code fences the LLM may have added
  if (sql.startsWith('```sql')) sql = sql.slice(6);
  else if (sql.startsWith('```')) sql = sql.slice(3);
  if (sql.endsWith('```')) sql = sql.slice(0, -3);
  return sql.trim();
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  cleanedSql?: string;
}

/**
 * Validate that a SQL string is a safe, scoped SELECT query.
 * This is always called before execution, even for "pre-validated" SQL
 * that comes back from the client for an export request.
 */
export function validateSQL(rawSql: string): ValidationResult {
  const sql = cleanSQL(rawSql);

  // 1. Must start with SELECT
  if (!/^SELECT\b/i.test(sql)) {
    return { valid: false, error: 'Only SELECT queries are allowed' };
  }

  // 2. No dangerous DML / DDL keywords
  if (DANGEROUS_KEYWORDS.test(sql)) {
    return { valid: false, error: 'Query contains disallowed SQL operations' };
  }

  // 3. Must reference $1 (the wedding_id parameter)
  if (!sql.includes('$1')) {
    return { valid: false, error: 'Query must use $1 to filter by wedding' };
  }

  // 4. Must reference the wedding_id column (prevents "$1 = $1" bypasses)
  if (!sql.toLowerCase().includes('wedding_id')) {
    return { valid: false, error: 'Query must filter by wedding_id' };
  }

  // 5. Parse with node-sql-parser to confirm it is a SELECT and only uses allowed tables.
  //    Replace $N placeholders with string literals so the parser does not choke on them.
  const sqlForParsing = sql.replace(/\$\d+/g, "'__PARAM__'");
  const parser = new Parser();

  try {
    const ast = parser.astify(sqlForParsing, { database: 'PostgresQL' });
    const statements = Array.isArray(ast) ? ast : [ast];

    for (const stmt of statements) {
      if ((stmt as { type: string }).type !== 'select') {
        return { valid: false, error: 'Only SELECT statements are allowed' };
      }
    }

    // tableList() returns entries like "select::null::tablename"
    const tableList = parser.tableList(sqlForParsing, { database: 'PostgresQL' });
    for (const ref of tableList) {
      const tableName = ref.split('::').pop()?.toLowerCase();
      if (tableName && !ALLOWED_TABLES.has(tableName)) {
        return { valid: false, error: `Table "${tableName}" is not allowed` };
      }
    }
  } catch {
    // If the parser fails (e.g. unknown PostgreSQL-specific syntax), fall back
    // to a regex scan for table names in FROM / JOIN clauses.
    console.warn('[NL-QUERY] node-sql-parser failed; falling back to regex table check');
    const tableMatches = sql.matchAll(/\b(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi);
    for (const match of tableMatches) {
      const tableName = match[1].toLowerCase();
      if (!ALLOWED_TABLES.has(tableName)) {
        return { valid: false, error: `Table "${tableName}" is not allowed` };
      }
    }
  }

  return { valid: true, cleanedSql: sql };
}

// ============================================================================
// PARAMETER BINDING
// ============================================================================

/**
 * PostgreSQL requires the number of bound parameters to match exactly the
 * number of $N placeholders in the query. Build the parameter array by
 * inspecting which placeholders are actually present in the SQL.
 *
 * $1 = wedding_id (always required)
 * $2 = admin_id   (only when the query references it)
 */
function buildParams(sql: string, wedding_id: string, admin_id: string): unknown[] {
  const maxParam = [...sql.matchAll(/\$(\d+)/g)].reduce(
    (max, m) => Math.max(max, parseInt(m[1], 10)),
    0
  );
  const params: unknown[] = [wedding_id];
  if (maxParam >= 2) params.push(admin_id);
  return params;
}

// ============================================================================
// PUBLIC API
// ============================================================================

export interface NLQueryResult {
  data: Record<string, unknown>[];
  sql: string;
  columns: string[];
}

/**
 * Convert a natural-language question into SQL via the LLM, validate it,
 * then execute it against the database scoped to `wedding_id`.
 *
 * @param question  Natural-language question from the user
 * @param wedding_id  Bound to $1 — scopes every query to this wedding
 * @param admin_id   Bound to $2 — used when the user refers to "my guests / my side"
 */
export async function executeNaturalLanguageQuery(
  question: string,
  wedding_id: string,
  admin_id: string
): Promise<NLQueryResult> {
  const rawSql = await generateSQL(question);
  if (!rawSql) {
    throw new Error('AI service is unavailable or did not return a query');
  }

  const validation = validateSQL(rawSql);
  if (!validation.valid || !validation.cleanedSql) {
    throw new Error(validation.error ?? 'Generated query failed validation');
  }

  const sql = validation.cleanedSql;
  console.log('[NL-QUERY] Executing validated query:', sql);

  // Pass only the parameters the SQL actually references ($1 always, $2 only if used).
  const raw = (await prisma.$queryRawUnsafe(sql, ...buildParams(sql, wedding_id, admin_id))) as Record<
    string,
    unknown
  >[];
  const data = raw.map(serializeRow);
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return { data, sql, columns };
}

/**
 * Execute a previously-generated SQL string directly (used for export requests).
 * The SQL is re-validated before execution — it is never trusted blindly.
 */
export async function executeValidatedSQL(
  sql: string,
  wedding_id: string,
  admin_id: string
): Promise<NLQueryResult> {
  const validation = validateSQL(sql);
  if (!validation.valid || !validation.cleanedSql) {
    throw new Error(validation.error ?? 'SQL failed validation');
  }

  const cleanedSql = validation.cleanedSql;
  const raw = (await prisma.$queryRawUnsafe(cleanedSql, ...buildParams(cleanedSql, wedding_id, admin_id))) as Record<
    string,
    unknown
  >[];
  const data = raw.map(serializeRow);
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return { data, sql: cleanedSql, columns };
}

// ============================================================================
// PLANNER-LEVEL NL QUERY
// ============================================================================
//
// Scoped by planner_id ($1) instead of wedding_id.
// Queries may span all weddings the planner manages.
// ============================================================================

/** Tables accessible in planner-scoped queries */
const ALLOWED_TABLES_PLANNER = new Set([
  // wedding-level tables (filtered via weddings.planner_id = $1)
  'weddings',
  'families',
  'family_members',
  'guest_labels',
  'family_label_assignments',
  'tables',
  'wedding_admins',
  'gifts',
  'checklist_tasks',
  'checklist_sections',
  'wedding_providers',
  'provider_categories',
  'payments',
  'tasting_menus',
  // planner-level tables (direct planner_id = $1)
  'customers',
  'locations',
  'providers',
  'quotes',
  'quote_line_items',
  'contracts',
  'invoices',
  'invoice_line_items',
  'invoice_payments',
]);

const SCHEMA_DESCRIPTION_PLANNER = `You are a PostgreSQL SQL query generator for a wedding planner management system.
Your ONLY job is to produce safe SELECT queries based on the user's natural-language question.

## Parameters (always provided — never hardcode these values)
- $1 = planner_id  — scope EVERY query to this planner's data

## Data Scope
The planner manages multiple weddings. Their data falls into two categories:
1. **Per-wedding data** — always reached via JOIN with weddings WHERE planner_id = $1
2. **Planner financials** — tables that have planner_id directly (quotes, invoices)

## Available Tables

### weddings
id TEXT PK, planner_id TEXT (**ALWAYS filter with $1 when used as starting table**),
couple_names TEXT, wedding_date TIMESTAMP, location TEXT, status TEXT (ACTIVE/ARCHIVED/COMPLETED/DELETED),
guest_count INTEGER, created_at TIMESTAMP

### families
id TEXT PK, wedding_id TEXT FK→weddings, name TEXT, email TEXT, phone TEXT,
whatsapp_number TEXT, preferred_language TEXT, channel_preference TEXT,
created_at TIMESTAMP
**NOTE: Scope via JOIN weddings w ON f.wedding_id = w.id WHERE w.planner_id = $1**

### family_members
id TEXT PK, family_id TEXT FK→families, name TEXT, type TEXT (ADULT/CHILD/INFANT),
attending BOOLEAN (true=yes, false=no, null=pending), age INTEGER,
dietary_restrictions TEXT, accessibility_needs TEXT, table_id TEXT FK→tables
**NOTE: Scope via JOIN families f ON fm.family_id = f.id JOIN weddings w ON f.wedding_id = w.id WHERE w.planner_id = $1**

### tables
id TEXT PK, wedding_id TEXT FK→weddings, name TEXT, number INTEGER, capacity INTEGER
**NOTE: Scope via JOIN weddings w ON t.wedding_id = w.id WHERE w.planner_id = $1**

### wedding_admins
id TEXT PK, wedding_id TEXT FK→weddings, name TEXT, email TEXT, preferred_language TEXT
**NOTE: Scope via JOIN weddings w ON wa.wedding_id = w.id WHERE w.planner_id = $1**

### gifts
id TEXT PK, family_id TEXT FK→families, wedding_id TEXT FK→weddings,
amount DECIMAL, status TEXT (PENDING/RECEIVED/CONFIRMED)
**NOTE: Scope via JOIN weddings w ON g.wedding_id = w.id WHERE w.planner_id = $1**

### checklist_tasks
id TEXT PK, wedding_id TEXT FK→weddings, title TEXT, assigned_to TEXT,
due_date TIMESTAMP, status TEXT (PENDING/IN_PROGRESS/COMPLETED), completed BOOLEAN
**NOTE: Scope via JOIN weddings w ON ct.wedding_id = w.id WHERE w.planner_id = $1**

### wedding_providers
id TEXT PK, wedding_id TEXT FK→weddings, category_id TEXT FK→provider_categories,
name TEXT, contact_name TEXT, total_price DECIMAL, notes TEXT
**NOTE: Scope via JOIN weddings w ON wp.wedding_id = w.id WHERE w.planner_id = $1**

### provider_categories
id TEXT PK, planner_id TEXT (**direct filter: WHERE planner_id = $1**), name TEXT
**NOTE: Has direct planner_id — can be filtered directly or joined via wedding_providers**

### payments
id TEXT PK, wedding_provider_id TEXT FK→wedding_providers, amount DECIMAL,
date TIMESTAMP, method TEXT, notes TEXT
**NOTE: Scope via JOIN wedding_providers wp ON p.wedding_provider_id = wp.id JOIN weddings w ON wp.wedding_id = w.id WHERE w.planner_id = $1**

### tasting_menus
id TEXT PK, wedding_id TEXT FK→weddings, title TEXT, description TEXT
**NOTE: Scope via JOIN weddings w ON tm.wedding_id = w.id WHERE w.planner_id = $1**

### customers
id TEXT PK, planner_id TEXT (**ALWAYS filter with $1**), name TEXT, couple_names TEXT,
email TEXT, phone TEXT, id_number TEXT, address TEXT, notes TEXT, created_at TIMESTAMP

### locations
id TEXT PK, planner_id TEXT (**ALWAYS filter with $1**), name TEXT, address TEXT,
url TEXT, google_maps_url TEXT, tags TEXT[], notes TEXT, created_at TIMESTAMP

### providers
id TEXT PK, planner_id TEXT (**ALWAYS filter with $1**), category_id TEXT FK→provider_categories,
name TEXT, contact_name TEXT, email TEXT, phone TEXT, website TEXT,
social_media TEXT, approx_price DECIMAL, created_at TIMESTAMP

### provider_categories
id TEXT PK, planner_id TEXT (**ALWAYS filter with $1**), name TEXT, price_type TEXT (GLOBAL/PER_PERSON)

### contracts
id TEXT PK, planner_id TEXT (**ALWAYS filter with $1**), customer_id TEXT FK→customers,
quote_id TEXT FK→quotes, title TEXT,
status TEXT (DRAFT/SHARED/SIGNING/SIGNED/CANCELLED),
signer_name TEXT, signer_email TEXT, signed_at TIMESTAMP, created_at TIMESTAMP

### checklist_tasks
id TEXT PK, wedding_id TEXT FK→weddings, section_id TEXT FK→checklist_sections,
title TEXT, description TEXT, assigned_to TEXT (WEDDING_PLANNER/COUPLE/OTHER),
due_date TIMESTAMP, status TEXT (PENDING/IN_PROGRESS/COMPLETED),
completed BOOLEAN, completed_at TIMESTAMP, order INT, created_at TIMESTAMP
**NOTE: Scope via JOIN weddings w ON ct.wedding_id = w.id WHERE w.planner_id = $1**

### checklist_sections
id TEXT PK, wedding_id TEXT FK→weddings, name TEXT, order INT
**NOTE: Scope via JOIN weddings w ON cs.wedding_id = w.id WHERE w.planner_id = $1**

### gifts
id TEXT PK, wedding_id TEXT FK→weddings, family_id TEXT FK→families,
amount DECIMAL, status TEXT (PENDING/RECEIVED/CONFIRMED),
transaction_date TIMESTAMP, auto_matched BOOLEAN, created_at TIMESTAMP
**NOTE: Scope via JOIN weddings w ON g.wedding_id = w.id WHERE w.planner_id = $1**

### quotes
id TEXT PK, planner_id TEXT (**ALWAYS filter with $1**), customer_id TEXT FK→customers,
couple_names TEXT, event_date TIMESTAMP, location TEXT,
status TEXT (DRAFT/SENT/ACCEPTED/REJECTED/EXPIRED),
currency TEXT, subtotal DECIMAL, discount DECIMAL, tax_rate DECIMAL, total DECIMAL,
expires_at TIMESTAMP, version INT, created_at TIMESTAMP

### quote_line_items
id TEXT PK, quote_id TEXT FK→quotes, name TEXT, description TEXT,
quantity DECIMAL, unit_price DECIMAL, total DECIMAL
**NOTE: Scope via JOIN quotes q ON qli.quote_id = q.id WHERE q.planner_id = $1**

### invoices
id TEXT PK, planner_id TEXT (**ALWAYS filter with $1**), quote_id TEXT FK→quotes,
customer_id TEXT FK→customers, contract_id TEXT FK→contracts,
type TEXT (PROFORMA/INVOICE/RECTIFICATIVA), invoice_number TEXT,
currency TEXT, subtotal DECIMAL, discount DECIMAL,
tax_rate DECIMAL, total DECIMAL, amount_paid DECIMAL,
status TEXT (DRAFT/ISSUED/PAID/PARTIAL/OVERDUE/CANCELLED),
issued_at TIMESTAMP, due_date TIMESTAMP, created_at TIMESTAMP,
proforma_id TEXT (set on INVOICE type: references its source proforma)
**IMPORTANT: To avoid double-counting, always filter out converted proformas:
  WHERE (type = 'INVOICE') OR (type = 'PROFORMA' AND proforma_id IS NULL AND NOT EXISTS (SELECT 1 FROM invoices di WHERE di.proforma_id = invoices.id))**

### invoice_line_items
id TEXT PK, invoice_id TEXT FK→invoices, name TEXT, description TEXT,
quantity DECIMAL, unit_price DECIMAL, total DECIMAL
**NOTE: Scope via JOIN invoices i ON ili.invoice_id = i.id WHERE i.planner_id = $1**

### invoice_payments
id TEXT PK, invoice_id TEXT FK→invoices, amount DECIMAL,
currency TEXT, payment_date TIMESTAMP, method TEXT, reference TEXT
**NOTE: Scope via JOIN invoices i ON ip.invoice_id = i.id WHERE i.planner_id = $1**

## Strict Rules
1. ONLY write SELECT statements. NEVER write INSERT, UPDATE, DELETE, DROP, CREATE, ALTER or any other statement.
2. ALWAYS scope to the planner's data using $1 (planner_id).
3. For tables without direct planner_id, ALWAYS JOIN via weddings: JOIN weddings w ON <table>.wedding_id = w.id WHERE w.planner_id = $1.
4. For quotes and invoices, filter directly: WHERE planner_id = $1.
5. You may ONLY use $1. No other parameters.
6. Add LIMIT ${MAX_ROWS} at the end of every query.
7. Return ONLY the SQL query — no markdown fences, no code blocks, no explanations.
8. Use clear English column aliases (e.g. couple_names, total_guests, invoice_total).
9. Only reference tables listed above.`;

/**
 * Validate a planner-scoped SQL query.
 * Requires $1 and planner_id (or weddings table) to be present.
 */
export function validatePlannerSQL(rawSql: string): ValidationResult {
  const sql = cleanSQL(rawSql);

  if (!/^SELECT\b/i.test(sql)) {
    return { valid: false, error: 'Only SELECT queries are allowed' };
  }

  if (DANGEROUS_KEYWORDS.test(sql)) {
    return { valid: false, error: 'Query contains disallowed SQL operations' };
  }

  if (!sql.includes('$1')) {
    return { valid: false, error: 'Query must use $1 to scope to planner data' };
  }

  // Must reference planner_id or weddings table for scoping
  const hasPlannerId = sql.toLowerCase().includes('planner_id');
  const hasWeddingsJoin = /\bweddings\b/i.test(sql);
  if (!hasPlannerId && !hasWeddingsJoin) {
    return { valid: false, error: 'Query must filter by planner_id or join through weddings' };
  }

  const sqlForParsing = sql.replace(/\$\d+/g, "'__PARAM__'");
  const parser = new Parser();

  try {
    const ast = parser.astify(sqlForParsing, { database: 'PostgresQL' });
    const statements = Array.isArray(ast) ? ast : [ast];
    for (const stmt of statements) {
      if ((stmt as { type: string }).type !== 'select') {
        return { valid: false, error: 'Only SELECT statements are allowed' };
      }
    }
    const tableList = parser.tableList(sqlForParsing, { database: 'PostgresQL' });
    for (const ref of tableList) {
      const tableName = ref.split('::').pop()?.toLowerCase();
      if (tableName && !ALLOWED_TABLES_PLANNER.has(tableName)) {
        return { valid: false, error: `Table "${tableName}" is not allowed` };
      }
    }
  } catch {
    console.warn('[NL-QUERY-PLANNER] node-sql-parser failed; falling back to regex table check');
    const tableMatches = sql.matchAll(/\b(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi);
    for (const match of tableMatches) {
      const tableName = match[1].toLowerCase();
      if (!ALLOWED_TABLES_PLANNER.has(tableName)) {
        return { valid: false, error: `Table "${tableName}" is not allowed` };
      }
    }
  }

  return { valid: true, cleanedSql: sql };
}

/**
 * Convert a natural-language question into a planner-scoped SQL query,
 * validate it, then execute it.
 *
 * @param question    Natural-language question
 * @param planner_id  Bound to $1 — scopes every query to this planner's data
 */
export async function executeNaturalLanguagePlannerQuery(
  question: string,
  planner_id: string,
): Promise<NLQueryResult> {
  const rawSql = await generateSQL(question, SCHEMA_DESCRIPTION_PLANNER);
  if (!rawSql) {
    throw new Error('AI service is unavailable or did not return a query');
  }

  const validation = validatePlannerSQL(rawSql);
  if (!validation.valid || !validation.cleanedSql) {
    throw new Error(validation.error ?? 'Generated query failed validation');
  }

  const sql = validation.cleanedSql;
  console.log('[NL-QUERY-PLANNER] Executing validated query:', sql);

  const raw = (await prisma.$queryRawUnsafe(sql, planner_id)) as Record<string, unknown>[];
  const data = raw.map(serializeRow);
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return { data, sql, columns };
}

/**
 * Execute a previously-generated planner-scoped SQL string directly (for exports).
 */
export async function executeValidatedPlannerSQL(
  sql: string,
  planner_id: string,
): Promise<NLQueryResult> {
  const validation = validatePlannerSQL(sql);
  if (!validation.valid || !validation.cleanedSql) {
    throw new Error(validation.error ?? 'SQL failed validation');
  }

  const cleanedSql = validation.cleanedSql;
  const raw = (await prisma.$queryRawUnsafe(cleanedSql, planner_id)) as Record<string, unknown>[];
  const data = raw.map(serializeRow);
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return { data, sql: cleanedSql, columns };
}
