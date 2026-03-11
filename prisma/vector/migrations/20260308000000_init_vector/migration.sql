-- Migration: init_vector
-- Enables pgvector and creates DocType enum and document_chunks table.

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('WEDDING_DOCUMENT', 'WAYS_OF_WORKING', 'SYSTEM_MANUAL');

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "sourceName" TEXT NOT NULL,
    "docType" "DocType" NOT NULL,
    "weddingId" TEXT,
    "plannerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);
