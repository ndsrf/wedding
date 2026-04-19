-- CreateTable: wedding_api_keys
-- API keys for programmatic access (MCP server, Claude Desktop integration).
-- Keys are stored as SHA-256 hashes; the raw key is only returned at creation time.
-- One key per user (existing keys are replaced on generate). Keys expire after 30 days.

CREATE TABLE "wedding_api_keys" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "key_hash"     TEXT NOT NULL,
    "role"         TEXT NOT NULL,
    "wedding_id"   TEXT,
    "planner_id"   TEXT,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "expires_at"   TIMESTAMP(3),

    CONSTRAINT "wedding_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique constraint on hashed key (used for fast lookup on every API request)
CREATE UNIQUE INDEX "wedding_api_keys_key_hash_key" ON "wedding_api_keys"("key_hash");
