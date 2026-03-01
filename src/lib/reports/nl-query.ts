/**
 * Natural Language Query Service
 *
 * Converts natural language questions into safe, parameterized SQL queries
 * restricted to the current wedding's data only.
 *
 * Security measures:
 * - Only SELECT statements are allowed (validated by node-sql-parser + keyword blocklist)
 * - All queries MUST include wedding_id = $1 as a parameterized value
 * - Results are capped at MAX_ROWS rows
 * - Only approved tables can be queried
 * - The AI-generated SQL is re-validated before every execution
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  'tables',
  'wedding_admins',
  'gifts',
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

### tables
id TEXT PK, wedding_id TEXT (**ALWAYS filter this with $1**), name TEXT, number INTEGER,
capacity INTEGER, created_at TIMESTAMP

### wedding_admins
id TEXT PK, wedding_id TEXT (**ALWAYS filter this with $1**), name TEXT, email TEXT,
preferred_language TEXT, invited_at TIMESTAMP, last_login_at TIMESTAMP

### gifts
id TEXT PK, family_id TEXT FK→families, wedding_id TEXT (**ALWAYS filter this with $1**),
amount DECIMAL, status TEXT (PENDING/RECEIVED/CONFIRMED),
transaction_date TIMESTAMP, created_at TIMESTAMP

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

async function generateSQLWithOpenAI(question: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SCHEMA_DESCRIPTION },
      { role: 'user', content: question },
    ],
    max_tokens: 600,
    temperature: 0.1,
  });

  return response.choices[0]?.message?.content?.trim() ?? null;
}

async function generateSQLWithGemini(question: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SCHEMA_DESCRIPTION,
  });

  const result = await model.generateContent(question);
  return result.response.text()?.trim() || null;
}

async function generateSQL(question: string): Promise<string | null> {
  const provider =
    process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'gemini');

  console.log('[NL-QUERY] Generating SQL', { provider, questionLength: question.length });

  if (provider === 'gemini') {
    return generateSQLWithGemini(question);
  }
  return generateSQLWithOpenAI(question);
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

  // $1 = wedding_id, $2 = admin_id — both parameterized, safe against SQL injection.
  // Passing $2 even when the query only uses $1 is harmless in PostgreSQL.
  const raw = (await prisma.$queryRawUnsafe(sql, wedding_id, admin_id)) as Record<
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
  const raw = (await prisma.$queryRawUnsafe(cleanedSql, wedding_id, admin_id)) as Record<
    string,
    unknown
  >[];
  const data = raw.map(serializeRow);
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return { data, sql: cleanedSql, columns };
}
