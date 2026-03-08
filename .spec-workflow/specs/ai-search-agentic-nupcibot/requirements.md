# Requirements Document

## Introduction

Nupcibot is an AI-powered assistant embedded in the Wedding Management SaaS platform that enables wedding planners and couples to query documents (contracts, ways-of-working guides, system manuals) and perform agentic actions (e.g., check guest list, look up RSVP status) through a conversational interface. The feature adds a separate vector database (pgvector on Neon) for semantic search with strict multi-tenant data isolation, an asynchronous ingestion pipeline for existing and new Vercel Blob uploads, and an agentic reasoning loop powered by the Vercel AI SDK with citations.

This is delivered in two closely related pieces:

* **NUP-9** – Multi-Tenant RAG Service (Neon + Prisma): infrastructure, schema, ingestion, retrieval
* **NUP-10** – Agentic Capabilities and Citation Engine: tool-calling, action tools, citation rendering, provider agnosticism

## Alignment with Product Vision

Nupcibot directly supports the product's goal of making planners more efficient and couples less overwhelmed. Planners manage up to 20 weddings simultaneously and need instant answers from their ways-of-working guides and client contracts. Couples need help understanding their wedding-specific documents without involving the planner for every question. This feature multiplies planner capacity (a core business objective) and improves couple satisfaction (NPS target >60).

## Requirements

### Requirement 1 — Vector Database Infrastructure

**User Story:** As the platform operator (Master Admin), I want a dedicated vector database with pgvector enabled, so that document embeddings can be stored and searched without affecting the primary operational database.

#### Acceptance Criteria

1. WHEN the platform is set up THEN a separate Neon PostgreSQL database SHALL have the `vector` extension enabled via `CREATE EXTENSION IF NOT EXISTS vector`.
2. WHEN the application starts THEN environment variables `VECTOR_DIMENSIONS`, and either `OPENAI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` SHALL be validated and required.
3. WHEN using OpenAI THEN `VECTOR_DIMENSIONS` SHALL default to `1536`; WHEN using Gemini THEN it SHALL default to `768`.
4. WHEN the vector database is configured THEN a separate Prisma client instance (`vectorPrisma`) SHALL connect exclusively to `VECTOR_DATABASE_URL`, keeping it isolated from the main database connection.

***

### Requirement 2 — DocumentChunk Schema

**User Story:** As a developer, I want a `DocumentChunk` table in the vector database schema, so that text excerpts and their embeddings can be stored with tenant-scoped metadata.

#### Acceptance Criteria

1. WHEN the schema is applied THEN a `DocumentChunk` table SHALL exist with the following fields: `id` (UUID PK), `content` (text), `embedding` (Unsupported `vector(VECTOR_DIMENSIONS)`), `sourceName` (text), `docType` (enum: `WEDDING_DOCUMENT`, `WAYS_OF_WORKING`, `SYSTEM_MANUAL`), `weddingId` (UUID, optional), `plannerId` (UUID, optional), `createdAt` (timestamp).
2. WHEN a chunk is created for a wedding-specific document THEN `weddingId` SHALL be set and `plannerId` MAY also be set to the associated planner.
3. WHEN a chunk is created for a planner's ways-of-working document THEN `plannerId` SHALL be set and `weddingId` SHALL be null.
4. WHEN a chunk is created for a system manual THEN both `weddingId` and `plannerId` SHALL be null.
5. WHEN querying THEN cosine distance (`<=>`) SHALL be used for similarity ranking.

***

### Requirement 3 — Asynchronous Ingestion Pipeline

**User Story:** As a Master Admin, I want to trigger a fan-out ingestion of all existing Vercel Blob files, so that documents already uploaded are searchable by Nupcibot.

#### Acceptance Criteria

1. WHEN the Master Admin clicks "Re-index All Documents" THEN the system SHALL trigger an asynchronous fan-out process that enqueues all existing Vercel Blob files for embedding without blocking the UI.
2. WHEN a new file is uploaded to Vercel Blob THEN the system SHALL automatically enqueue it for ingestion using `waitUntil` (Vercel) or a background worker (Inngest/QStash).
3. WHEN a document is ingested THEN the pipeline SHALL: extract raw text → chunk into \~1000-character segments with overlap → generate embedding via the configured provider API → save chunks to Neon via `vectorPrisma.$queryRaw`.
4. WHEN the text extraction or embedding call fails THEN the pipeline SHALL log the error and skip the file without crashing the entire fan-out process.
5. WHEN a document is re-ingested THEN existing chunks for that `sourceName` SHALL be deleted before new chunks are inserted to prevent duplicates.
6. WHEN the ingestion is in progress THEN the Master Admin dashboard SHALL display a progress indicator showing files processed vs. total.

***

### Requirement 4 — Multi-Tenant Retrieval Logic

**User Story:** As a developer, I want a retrieval function that enforces tenant isolation, so that a couple's bot never sees another couple's documents and a planner never sees another planner's documents.

#### Acceptance Criteria

1. WHEN a Couple user queries Nupcibot THEN the retrieval SHALL filter chunks matching: `(weddingId = currentWeddingId) OR (plannerId = associatedPlannerId AND docType = 'WAYS_OF_WORKING') OR (docType = 'SYSTEM_MANUAL')`.
2. WHEN a Planner user queries Nupcibot THEN the retrieval SHALL filter chunks matching: `(plannerId = currentPlannerId) OR (docType = 'SYSTEM_MANUAL')`.
3. WHEN retrieval runs THEN the top 5 chunks by cosine similarity SHALL be returned.
4. WHEN no relevant chunks are found THEN the retrieval function SHALL return an empty array (the LLM will respond based on system prompt alone).
5. IF a request attempts to retrieve chunks outside the authenticated user's tenant scope THEN the system SHALL return a 403 error.

***

### Requirement 5 — Agentic Tool-Calling Architecture

**User Story:** As a couple or planner, I want Nupcibot to be able to perform actions on my behalf (e.g., look up guest list, check RSVP status), so that I don't have to navigate the dashboard for simple queries.

#### Acceptance Criteria

1. WHEN the agentic system is initialized THEN it SHALL define a `search_knowledge_base` tool that wraps the RAG retrieval logic from Requirement 4.
2. WHEN the agentic system is initialized THEN it SHALL define at least the following "Action" tools: `get_guest_list` (returns family/RSVP summary for the wedding) and `get_rsvp_status` (returns attendance counts and completion percentage).
3. WHEN the LLM receives a user message THEN it SHALL enter a reasoning loop using Vercel AI SDK Core (`streamText` or `generateText` with tool definitions) to decide which tool(s) to call.
4. WHEN the LLM calls a tool THEN the tool SHALL execute with the authenticated user's context (weddingId / plannerId) enforced server-side, not passed from the client.
5. WHEN a tool call completes THEN its result SHALL be fed back into the reasoning loop until the LLM produces a final text response.
6. WHEN the LLM cannot answer safely THEN it SHALL respond that it does not have enough information rather than hallucinating.

***

### Requirement 6 — Citation System

**User Story:** As a couple or planner reading a Nupcibot response, I want to see which documents the answer came from, so that I can verify the information myself.

#### Acceptance Criteria

1. WHEN the `search_knowledge_base` tool returns results THEN it SHALL include both `content` and `sourceName` for each chunk.
2. WHEN the LLM system prompt is constructed THEN it SHALL instruct: "You are a professional wedding assistant. Answer based on the provided context. Every response that uses documents MUST end with a 'References' section listing the unique filenames used."
3. WHEN Nupcibot renders a response in the chat UI THEN any "References" section SHALL be displayed as a clean, distinct list below the main answer text.
4. WHEN no documents were used THEN no "References" section SHALL appear.

***

### Requirement 7 — Provider-Agnostic LLM Integration

**User Story:** As the platform operator, I want to switch between OpenAI and Gemini via environment variables, so that we avoid provider lock-in and can optimize cost/performance.

#### Acceptance Criteria

1. WHEN `AI_PROVIDER=openai` is set THEN the system SHALL use the OpenAI provider with `OPENAI_API_KEY` and `OPENAI_MODEL` (default: `gpt-4o-mini`).
2. WHEN `AI_PROVIDER=gemini` is set THEN the system SHALL use the Google Generative AI provider with `GOOGLE_GENERATIVE_AI_API_KEY` and `GEMINI_MODEL` (default: `gemini-1.5-flash`).
3. WHEN the AI provider is switched THEN no application code outside of the provider initialization module SHALL need to change.
4. WHEN embeddings are generated THEN the embedding model SHALL also be determined by `AI_PROVIDER` (OpenAI `text-embedding-3-small` or Gemini `text-embedding-004`).

***

### Requirement 8 — Nupcibot Chat UI

**User Story:** As a couple or planner, I want a chat interface accessible from my dashboard, so that I can ask Nupcibot questions in natural language.

#### Acceptance Criteria

1. WHEN the user opens the Nupcibot chat THEN a persistent chat panel or modal SHALL appear with a message input and scrollable message history.
2. WHEN the user submits a message THEN the response SHALL stream progressively into the UI (not appear all at once after a delay).
3. WHEN Nupcibot is typing THEN a loading indicator SHALL be visible.
4. WHEN a message includes a "References" section THEN citations SHALL be visually distinguished from the main answer (e.g., smaller text, separator).
5. WHEN the chat is opened on mobile THEN it SHALL be fully usable with touch interactions and not cover critical navigation.
6. WHEN the user is a Couple THEN the chat SHALL only be accessible from the Wedding Admin panel; WHEN the user is a Planner THEN it SHALL be accessible from the Planner dashboard.

***

### Requirement 9 — User Personas and Access Control

**User Story:** As a platform operator, I want Nupcibot's knowledge and actions to be scoped to the authenticated user's role, so that data isolation is maintained at the AI layer as well.

#### Acceptance Criteria

1. WHEN a Couple (Wedding Admin) uses Nupcibot THEN the bot SHALL only access: wedding-specific contracts, the associated planner's ways-of-working, and system manuals.
2. WHEN a Planner uses Nupcibot THEN the bot SHALL only access: documents for all weddings they manage, their own ways-of-working, and system manuals.
3. WHEN an Action tool is called THEN it SHALL re-authenticate the user server-side using the active session before executing any database query.
4. IF a user attempts to query about a wedding they do not own THEN the system SHALL refuse and return an appropriate error.

***

## Non-Functional Requirements

### Code Architecture and Modularity

* **Separate database (add a new variable for this connection) -** if the variable is not set then the whole functionality is turned off
* **Single Responsibility Principle**: RAG retrieval, ingestion pipeline, LLM orchestration, and citation rendering are each isolated in their own module under `src/lib/ai/`.
* **Modular Design**: Provider selection (OpenAI vs. Gemini) encapsulated in a single `src/lib/ai/provider.ts` file; all other modules import the provider interface, not the concrete SDK.
* **Dependency Management**: The vector Prisma client is a separate singleton (`src/lib/db/vector-prisma.ts`) to avoid polluting the main Prisma client.
* **Clear Interfaces**: Tool definitions follow the Vercel AI SDK `tool()` schema contract; retrieval always returns `{ content: string; sourceName: string }[]`.

### Performance

* Embedding API calls during ingestion SHALL be batched (max 20 chunks per API request) to avoid rate limits.
* Chat responses SHALL start streaming within 2 seconds of the user submitting a message.
* Retrieval queries (cosine similarity over `DocumentChunk`) SHALL complete in under 300ms for up to 100,000 chunks per tenant.
* Ingestion of a single document (up to 50 pages / \~100 chunks) SHALL complete within 30 seconds.

### Security

* The vector database credentials (`VECTOR_DATABASE_URL`) SHALL never be exposed to the client.
* Tool execution context (weddingId, plannerId) SHALL always be derived from the server-side session, never from client-supplied parameters.
* All API routes for Nupcibot SHALL require authentication via the existing `requireAuth` middleware.
* User input sent to the LLM SHALL be sanitized to remove prompt-injection patterns before being appended to the system prompt.

### Reliability

* If the AI provider API is unavailable THEN Nupcibot SHALL return a user-friendly error message without crashing the dashboard.
* Ingestion failures for individual files SHALL be logged and retryable independently without re-processing the entire document library.
* The vector database connection pool SHALL be configured with a maximum of 5 connections to avoid exhausting Neon free-tier limits.

### Usability

* The chat interface SHALL require no onboarding; users SHALL be able to start asking questions immediately.
* Error messages from Nupcibot (e.g., "I couldn't find that information") SHALL be written in the same language as the user's current locale setting.
* The ingestion progress indicator on the Master Admin dashboard SHALL auto-update without requiring a page refresh.