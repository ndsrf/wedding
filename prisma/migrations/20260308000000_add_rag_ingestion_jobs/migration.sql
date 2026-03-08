-- Migration: add_rag_ingestion_jobs
-- Adds rag_ingestion_jobs table and DocType enum if they don't exist.

-- Create DocType enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocType') THEN
        CREATE TYPE "DocType" AS ENUM ('WEDDING_DOCUMENT', 'WAYS_OF_WORKING', 'SYSTEM_MANUAL');
    END IF;
END
$$;

-- Create rag_ingestion_jobs table
CREATE TABLE IF NOT EXISTS "rag_ingestion_jobs" (
    "id" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "rag_ingestion_jobs_pkey" PRIMARY KEY ("id")
);

-- Create index for triggeredAt
CREATE INDEX IF NOT EXISTS "rag_ingestion_jobs_triggeredAt_idx" ON "rag_ingestion_jobs"("triggeredAt");
