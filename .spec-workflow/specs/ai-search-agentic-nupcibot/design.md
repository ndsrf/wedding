# Design Document

## Overview

This design extends the existing `src/lib/ai/` module to add a full RAG (Retrieval-Augmented Generation) + agentic layer to Nupcibot. The existing `nupcibot.ts` already provides a working chat service using raw OpenAI/Gemini SDKs; this design wraps that with vector-based document retrieval (pgvector on a separate Neon database), a Vercel AI SDK streaming layer for the chat API, tool-calling for agentic actions, and a citation renderer in the UI.

The entire feature is **opt-in via environment variable**: if `VECTOR_DATABASE_URL` is not set, Nupcibot continues working as today with no document search. When the variable is set, RAG retrieval and agentic tools are enabled automatically.

## Steering Document Alignment

### Technical Standards (tech.md)

- **TypeScript** throughout with strict types; Zod for all API input validation.
- Provider selection via `AI_PROVIDER` env var — consistent with existing `nupcibot.ts` and `wedding-assistant.ts` pattern; this design refactors the duplicated provider logic into a single `src/lib/ai/provider.ts`.
- Vercel AI SDK (`ai` package) used for streaming and tool-calling — provider-agnostic per the existing commitment to avoid vendor lock-in.
- `requireAuth` / `requireRole` / `hasWeddingAccess` from `src/lib/auth/middleware.ts` reused in all new API routes.
- File size `<300` lines, function size `<50` lines per structure.md guidelines.

### Project Structure (structure.md)

- New AI sub-modules go into `src/lib/ai/` (already exists).
- Vector Prisma client goes into `src/lib/db/` (follows singleton pattern of `src/lib/db/prisma.ts`).
- New API routes follow the role-prefixed convention: `/api/admin/`, `/api/planner/`, `/api/master/`.
- React components under `src/components/admin/` (chat UI lives there).
- No new top-level directories needed.

## Code Reuse Analysis

### Existing Components to Leverage

- **`src/lib/ai/nupcibot.ts`**: The `generateNupciBotReply()` function and `ChatMessage` type are reused as the fallback when VECTOR_DATABASE_URL is not set. The provider selection logic (`AI_PROVIDER` env var) is extracted into the new `provider.ts` and `nupcibot.ts` is updated to import from it.
- **`src/lib/ai/wedding-assistant.ts`**: Provider pattern (OpenAI/Gemini dual support) is replaced by the new shared `provider.ts` — avoiding the current code duplication.
- **`src/lib/db/prisma.ts`**: The `PrismaPg` + `Pool` singleton pattern is cloned for `vector-prisma.ts`.
- **`src/lib/auth/middleware.ts`**: `requireAuth()`, `requireRole()`, `hasWeddingAccess()` used in all new API routes without modification.
- **`src/lib/storage/providers/vercel-blob.ts`**: The `listFiles(prefix)` method used by the ingestion fan-out to enumerate all blobs.
- **`src/lib/storage/index.ts`**: `getStorageProvider()` used to read file contents during ingestion.

### Integration Points

- **Vercel Blob**: Fan-out ingestion reads all blobs via `VercelBlobStorageProvider.listFiles('')`, then fetches each file buffer for text extraction.
- **Main Prisma DB**: The `get_guest_list` and `get_rsvp_status` action tools query the main `prisma` client (families, members) scoped by `weddingId` from session — no schema changes to the main DB.
- **Existing Nupcibot chat UI** (`src/components/admin/NupcibotChat.tsx`): Extended to support streaming responses and citation rendering; the non-RAG fallback path is preserved.
- **Document upload routes**: Any route that calls `storageProvider.uploadFile()` for wedding documents will be updated to trigger `scheduleIngestion()` via `waitUntil`.

## Architecture

```mermaid
graph TD
    UI[NupcibotChat Component] -->|POST streaming| ChatAPI[/api/admin or planner/nupcibot/chat]
    ChatAPI --> RagChat[src/lib/ai/rag-chat.ts]
    RagChat --> Tools[src/lib/ai/tools.ts]
    RagChat --> Provider[src/lib/ai/provider.ts]
    Tools --> Retrieval[src/lib/ai/retrieval.ts]
    Tools --> MainDB[(Main PostgreSQL via prisma)]
    Retrieval --> VectorDB[(Neon pgvector via vectorPrisma)]
    VectorDB -.->|disabled if no env var| Off[Feature off]

    MasterAdmin[Master Admin UI] -->|POST| ReindexAPI[/api/master/rag/reindex]
    ReindexAPI --> Ingestion[src/lib/ai/ingestion.ts]
    Ingestion --> Chunker[src/lib/ai/chunker.ts]
    Ingestion --> Embeddings[src/lib/ai/embeddings.ts]
    Embeddings --> Provider
    Ingestion --> VectorDB

    UploadRoute[Document Upload Route] -->|waitUntil| Ingestion
```

### Modular Design Principles

- **Single File Responsibility**: `chunker.ts` only splits text; `embeddings.ts` only calls the embedding API; `retrieval.ts` only queries pgvector; `tools.ts` only defines AI SDK tool schemas; `rag-chat.ts` only orchestrates the agentic loop.
- **Component Isolation**: The chat component handles streaming UI only — no business logic.
- **Service Layer Separation**: API routes authenticate and delegate to `rag-chat.ts`; `rag-chat.ts` does not import Next.js types.
- **Feature Flag**: `isVectorEnabled()` in `vector-prisma.ts` gates all RAG paths — callers check this first.

## Components and Interfaces

### `src/lib/db/vector-prisma.ts`

- **Purpose**: Separate Prisma client for the vector database. Exports `vectorPrisma` singleton and `isVectorEnabled()` guard.
- **Interfaces**:
  ```ts
  export function isVectorEnabled(): boolean
  export const vectorPrisma: VectorPrismaClient | null
  ```
- **Dependencies**: `VECTOR_DATABASE_URL` env var, `@prisma/client` (vector schema), `PrismaPg`, `pg.Pool`
- **Reuses**: Same pool + adapter pattern as `src/lib/db/prisma.ts`

---

### `prisma/vector.prisma`

- **Purpose**: Separate Prisma schema targeting the Neon vector database.
- **Key model**:
  ```prisma
  model DocumentChunk {
    id         String   @id @default(uuid())
    content    String
    embedding  Unsupported("vector(1536)")
    sourceName String
    docType    DocType
    weddingId  String?
    plannerId  String?
    createdAt  DateTime @default(now())
  }

  enum DocType {
    WEDDING_DOCUMENT
    WAYS_OF_WORKING
    SYSTEM_MANUAL
  }
  ```
- **Generated client**: `@prisma/client/vector` (via `output` in generator block)

---

### `src/lib/ai/provider.ts`

- **Purpose**: Single factory that returns a ready-to-use chat/embedding client for the configured provider. Eliminates duplication between `nupcibot.ts` and `wedding-assistant.ts`.
- **Interfaces**:
  ```ts
  export type AiProvider = 'openai' | 'gemini'
  export function getProvider(): AiProvider
  export function getChatModel(): LanguageModel       // Vercel AI SDK LanguageModel
  export function getEmbeddingModel(): EmbeddingModel // Vercel AI SDK EmbeddingModel
  ```
- **Dependencies**: `@ai-sdk/openai`, `@ai-sdk/google`, `AI_PROVIDER`, `OPENAI_API_KEY`, `GEMINI_API_KEY`
- **Reuses**: Env var detection pattern from existing `nupcibot.ts`

---

### `src/lib/ai/chunker.ts`

- **Purpose**: Split raw text into overlapping ~1000-character chunks.
- **Interfaces**:
  ```ts
  export function chunkText(text: string, chunkSize?: number, overlap?: number): string[]
  ```
- **Dependencies**: None (pure function)

---

### `src/lib/ai/embeddings.ts`

- **Purpose**: Generate embedding vectors for an array of text strings using the configured provider.
- **Interfaces**:
  ```ts
  export async function generateEmbeddings(texts: string[]): Promise<number[][]>
  ```
- **Dependencies**: `src/lib/ai/provider.ts` (`getEmbeddingModel()`), Vercel AI SDK `embedMany()`

---

### `src/lib/ai/ingestion.ts`

- **Purpose**: Full pipeline — fetch blob → extract text → chunk → embed → upsert to vector DB. Includes fan-out trigger for Master Admin re-index.
- **Interfaces**:
  ```ts
  export async function ingestDocument(params: {
    blobUrl: string
    sourceName: string
    docType: DocType
    weddingId?: string
    plannerId?: string
  }): Promise<void>

  export async function scheduleIngestion(params: IngestParams): Promise<void> // uses waitUntil

  export async function fanOutReindex(): Promise<{ total: number }> // enqueues all blobs
  ```
- **Dependencies**: `vector-prisma.ts`, `chunker.ts`, `embeddings.ts`, `VercelBlobStorageProvider`, `pdf-parse` or `mammoth` for text extraction

---

### `src/lib/ai/retrieval.ts`

- **Purpose**: Cosine similarity search over DocumentChunk with tenant-scoped SQL WHERE clause.
- **Interfaces**:
  ```ts
  export interface RetrievedChunk {
    content: string
    sourceName: string
    score: number
  }

  export async function retrieveChunks(params: {
    query: string
    weddingId?: string
    plannerId?: string
    role: 'wedding_admin' | 'planner'
    topK?: number
  }): Promise<RetrievedChunk[]>
  ```
- **Dependencies**: `vector-prisma.ts`, `embeddings.ts`

---

### `src/lib/ai/tools.ts`

- **Purpose**: Vercel AI SDK `tool()` definitions for `search_knowledge_base`, `get_guest_list`, `get_rsvp_status`.
- **Interfaces**:
  ```ts
  export function buildTools(ctx: ToolContext): Record<string, Tool>

  interface ToolContext {
    weddingId?: string
    plannerId?: string
    role: 'wedding_admin' | 'planner'
  }
  ```
- **Dependencies**: `ai` (Vercel AI SDK), `retrieval.ts`, `src/lib/db/prisma.ts`
- **Tool signatures**:
  - `search_knowledge_base({ query: string })` → `RetrievedChunk[]`
  - `get_guest_list()` → `{ families: { name, rsvpStatus, memberCount }[] }`
  - `get_rsvp_status()` → `{ total, confirmed, pending, declined, completionPct }`

---

### `src/lib/ai/rag-chat.ts`

- **Purpose**: Agentic chat orchestration — assembles system prompt, invokes `streamText` with tools, returns a ReadableStream for the API route.
- **Interfaces**:
  ```ts
  export async function streamRagChat(params: {
    userMessage: string
    history: ChatMessage[]
    language: string
    userName?: string
    weddingId?: string
    plannerId?: string
    role: 'wedding_admin' | 'planner'
  }): Promise<ReadableStream>
  ```
- **Dependencies**: `ai` (Vercel AI SDK `streamText`), `provider.ts`, `tools.ts`
- **Reuses**: `ChatMessage` type and `buildSystemPrompt` (from nupcibot.ts, refactored)

---

### `src/app/api/admin/nupcibot/chat/route.ts`

- **Purpose**: Streaming POST endpoint for Wedding Admin Nupcibot chat.
- **Method**: `POST`
- **Auth**: `requireRole('wedding_admin')`
- **Body**: `{ message: string, history: ChatMessage[], language?: string }`
- **Response**: `text/event-stream` (Vercel AI SDK `StreamingTextResponse`)
- **Behaviour**: If `isVectorEnabled()` → use `streamRagChat`; else → call existing `generateNupciBotReply` and return as plain JSON.

---

### `src/app/api/planner/nupcibot/chat/route.ts`

- **Purpose**: Same as above but scoped to Planner role with `plannerId` context.
- **Auth**: `requireRole('planner')`

---

### `src/app/api/master/rag/reindex/route.ts`

- **Purpose**: Trigger full fan-out re-index of all Vercel Blob documents.
- **Method**: `POST`
- **Auth**: `requireRole('master_admin')`
- **Response**: `{ queued: number }` — count of files enqueued

---

### `src/app/api/master/rag/status/route.ts`

- **Purpose**: Return current ingestion progress (stored as a simple counter in a `RagIngestionJob` table or Redis key).
- **Method**: `GET`
- **Auth**: `requireRole('master_admin')`
- **Response**: `{ total: number, processed: number, failed: number, inProgress: boolean }`

---

### `src/components/admin/NupcibotChat.tsx` (extended)

- **Purpose**: Chat panel with streaming support and citation rendering. Replaces the current non-streaming fetch in the existing component.
- **Props**: No change to external API — enhancement is internal.
- **Behaviour**:
  - Uses `useChat` hook from `ai/react` (Vercel AI SDK) for streaming.
  - Parses `[REFERENCES]` blocks in the assistant message and renders them as a distinct footer list below the bubble.
  - Falls back to current behaviour when server returns non-streaming JSON.
- **Dependencies**: `ai/react`, existing `src/components/ui/` primitives

## Data Models

### `DocumentChunk` (vector DB)

```
DocumentChunk {
  id:         String (UUID, PK)
  content:    String (raw text of the chunk)
  embedding:  vector(1536) | vector(768)  [Prisma Unsupported]
  sourceName: String (original filename / blob URL path)
  docType:    DocType enum (WEDDING_DOCUMENT | WAYS_OF_WORKING | SYSTEM_MANUAL)
  weddingId:  String? (UUID, references Wedding in main DB)
  plannerId:  String? (UUID, references WeddingPlanner in main DB)
  createdAt:  DateTime
}
```

### `RagIngestionJob` (main DB — lightweight status tracking)

```
RagIngestionJob {
  id:          String (UUID, PK)
  triggeredAt: DateTime
  totalFiles:  Int
  processed:   Int  (default 0)
  failed:      Int  (default 0)
  completedAt: DateTime?
}
```

> This model is added to `prisma/schema.prisma` (main DB) so the Master Admin status endpoint can query it without needing the vector DB.

### `RetrievedChunk` (in-memory, service type)

```ts
{
  content:    string
  sourceName: string
  score:      number  (0–1, cosine similarity)
}
```

## Error Handling

### Error Scenarios

1. **`VECTOR_DATABASE_URL` not set**
   - **Handling**: `isVectorEnabled()` returns `false`; all RAG code paths are skipped; Nupcibot answers using existing `generateNupciBotReply` without document context.
   - **User Impact**: Chat works normally; no error shown; no "References" section appears.

2. **AI provider API unavailable (timeout/rate-limit)**
   - **Handling**: `rag-chat.ts` catches the error and returns a translated error message via the stream.
   - **User Impact**: User sees "I'm having trouble right now, please try again in a moment." in their language.

3. **Ingestion failure for individual file**
   - **Handling**: `ingestDocument()` catches errors per-file, increments `RagIngestionJob.failed`, logs the error with `sourceName`, and continues to the next file.
   - **User Impact**: Progress indicator shows partial completion; failed files can be identified in logs.

4. **Prompt injection in user message**
   - **Handling**: `rag-chat.ts` strips common injection patterns (`ignore previous instructions`, `system:`, etc.) from user input before passing to the LLM.
   - **User Impact**: Transparent; message is sanitized silently.

5. **Vector DB connection exhausted**
   - **Handling**: Pool max is capped at 5; connection errors surface as 503 in the chat API. Error is logged.
   - **User Impact**: User sees error message in chat; dashboard is unaffected.

6. **Retrieval returns no chunks**
   - **Handling**: `retrieveChunks()` returns empty array; LLM system prompt instructs to answer from general knowledge or say it doesn't know.
   - **User Impact**: Bot answers without a "References" section.

## Testing Strategy

### Unit Testing

- `chunker.ts`: Test that 1000-char chunks are produced, overlap is respected, edge cases (empty string, `<1000` chars) handled.
- `retrieval.ts`: Mock `vectorPrisma.$queryRaw` to verify correct SQL WHERE clause for each role/tenant combination.
- `tools.ts`: Mock `prisma.family.findMany` and `retrieveChunks` to verify tool return shapes.
- `ingestion.ts`: Mock blob fetch, chunker, embeddings, and vectorPrisma to verify upsert logic and error isolation.

### Integration Testing

- `POST /api/admin/nupcibot/chat`: Test with a mocked `streamText` that tools are called correctly for a wedding-specific question.
- `POST /api/master/rag/reindex`: Verify `fanOutReindex()` is called and queued count returned.
- Tenant isolation: Verify a wedding_admin cannot retrieve chunks from another wedding (test retrieval SQL filter).

### End-to-End Testing

- **Admin chat with RAG**: Admin asks "What is the cancellation policy?" — verify the response includes a "References" section with the correct document name.
- **Admin chat without RAG**: With `VECTOR_DATABASE_URL` unset, verify chat still works and returns an answer.
- **Master Admin re-index**: Click "Re-index All Documents", verify progress indicator updates.
- **Planner chat**: Planner asks a question — verify it uses `plannerId` scope, not a specific `weddingId`.
