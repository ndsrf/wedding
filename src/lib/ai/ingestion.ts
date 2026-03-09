/**
 * Document Ingestion Pipeline
 *
 * Full pipeline: fetch blob → extract text (PDF/DOCX/plain) → chunk → embed → upsert to vector DB.
 * Includes fan-out re-index trigger for Master Admin.
 * Guards with isVectorEnabled() — no-op when vector DB is disabled.
 *
 * Depends on: chunker.ts, embeddings.ts, vector-prisma.ts, prisma.ts, storage
 */

import { isVectorEnabled, vectorPrisma } from '@/lib/db/vector-prisma';
import { chunkText } from './chunker';
import { generateEmbeddings } from './embeddings';
import { prisma } from '@/lib/db/prisma';
import { getProvider } from '@/lib/storage';
import { VercelBlobStorageProvider } from '@/lib/storage/providers/vercel-blob';
import { after } from 'next/server';

export type DocType = 'WEDDING_DOCUMENT' | 'WAYS_OF_WORKING' | 'SYSTEM_MANUAL' | 'REFERENCES';

export interface IngestionParams {
  blobUrl: string;
  sourceName: string;
  docType: DocType;
  fullUrl?: string;
  metadata?: Record<string, unknown>;
  weddingId?: string;
  plannerId?: string;
  weddingProviderId?: string;
  paymentId?: string;
  locationId?: string;
  jobId?: string;
}

// ── Text Extraction ───────────────────────────────────────────────────────────

async function extractText(buffer: Buffer, sourceName: string): Promise<string> {
  const lower = sourceName.toLowerCase();

  if (lower.endsWith('.pdf')) {
    const { PDFParse } = require('pdf-parse');
    const { getData } = require('pdf-parse/worker');
    
    // Use the data URL worker bundled with pdf-parse to avoid ESM/CJS path issues in Node
    PDFParse.setWorker(getData());
    
    const instance = new PDFParse({ data: buffer });
    const result = await instance.getText({ pageJoiner: '\n\n' });
    return result.text ?? '';
  }

  if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
    const mammoth = require('mammoth') as {
      extractRawText: (options: { buffer: Buffer }) => Promise<{ value: string }>;
    };
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? '';
  }

  // Plain text fallback (txt, md, csv, etc.)
  return buffer.toString('utf-8');
}

// ── Core Ingest ───────────────────────────────────────────────────────────────

/**
 * Ingest a single document: fetch → extract text → chunk → embed → upsert.
 * Deletes existing chunks for the same sourceName before inserting new ones.
 * No-op when vector DB is disabled.
 */
export async function ingestDocument(params: IngestionParams): Promise<void> {
  if (!isVectorEnabled() || !vectorPrisma) return;

  const {
    blobUrl,
    sourceName,
    docType,
    fullUrl,
    metadata,
    weddingId,
    plannerId,
    weddingProviderId,
    paymentId,
    locationId,
    jobId,
  } = params;

  console.log(`[INGESTION] Starting ingestion for ${sourceName} (URL: ${blobUrl})`);

  // Fetch file content
  let response;
  try {
    response = await fetch(blobUrl);
  } catch (fetchErr: unknown) {
    console.error(`[INGESTION] Fetch failed for ${blobUrl}:`, fetchErr);
    throw fetchErr;
  }

  if (!response.ok) {
    throw new Error(`[INGESTION] Failed to fetch ${blobUrl}: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  // Extract text
  const text = await extractText(buffer, sourceName);
  if (!text.trim()) {
    console.warn(`[INGESTION] No text extracted from ${sourceName}`);
    return;
  }

  // Chunk
  const chunks = chunkText(text);
  if (chunks.length === 0) return;

  // Generate embeddings
  const embeddings = await generateEmbeddings(chunks);

  // Delete existing chunks for this source (upsert by sourceName)
  await vectorPrisma.documentChunk.deleteMany({ where: { sourceName } });

  // Insert new chunks via raw SQL (pgvector requires ::vector cast)
  for (let i = 0; i < chunks.length; i++) {
    const vectorStr = `[${embeddings[i].join(',')}]`;
    await vectorPrisma.$executeRawUnsafe(
      `INSERT INTO document_chunks (
        id, content, embedding, "sourceName", "fullUrl", "metadata", "docType", 
        "weddingId", "plannerId", "weddingProviderId", "paymentId", "locationId", "createdAt"
      )
       VALUES (
        gen_random_uuid(), $1, $2::vector, $3, $4, $5::jsonb, $6::"DocType", 
        $7, $8, $9, $10, $11, now()
      )`,
      chunks[i],
      vectorStr,
      sourceName,
      fullUrl ?? null,
      metadata ? JSON.stringify(metadata) : null,
      docType,
      weddingId ?? null,
      plannerId ?? null,
      weddingProviderId ?? null,
      paymentId ?? null,
      locationId ?? null,
    );
  }

  console.log(`[INGESTION] Ingested ${chunks.length} chunks for ${sourceName}`);

  // Update job counters if provided
  if (jobId) {
    await prisma.ragIngestionJob.update({
      where: { id: jobId },
      data: { processed: { increment: 1 } },
    });
  }
}

// ── Schedule (fire-and-forget wrapper) ───────────────────────────────────────

/**
 * Schedule a document for ingestion in the background.
 * Wraps ingestDocument for use with Next.js 15 'after' or fire-and-forget patterns.
 * No-op when vector DB is disabled.
 */
export function scheduleIngestion(params: IngestionParams): void {
  if (!isVectorEnabled()) return;

  const promise = ingestDocument(params).catch((err) => {
    console.error(`[INGESTION] Background ingestion failed for ${params.sourceName}:`, err);
  });

  try {
    // Next.js 15+ after() ensures the task completes even after response is sent
    after(() => promise);
  } catch (_e) {
    // Fallback if called outside of request context
  }
}

// ── Fan-out Re-index ─────────────────────────────────────────────────────────

/**
 * Fan-out re-index: list all blobs, create a RagIngestionJob, and enqueue each file.
 * Errors for individual files are caught and counted without halting the pipeline.
 * Only indexes documents (PDF, DOCX, TXT) not images.
 * No-op when vector DB disabled or not using Vercel Blob storage.
 *
 * @returns { total: number, done: Promise<void> } - total number of files queued and completion promise
 */
export async function fanOutReindex(): Promise<{ total: number, done: Promise<void> }> {
  if (!isVectorEnabled()) return { total: 0, done: Promise.resolve() };

  const provider = getProvider();
  if (!(provider instanceof VercelBlobStorageProvider)) {
    console.warn('[INGESTION] fanOutReindex only supported with Vercel Blob storage');
    return { total: 0, done: Promise.resolve() };
  }

  // List all blobs
  const allBlobs = await (provider as VercelBlobStorageProvider).listFiles('');
  
  // Filter for documents (PDF, DOCX, TXT)
  const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
  const blobs = allBlobs.filter(blob => 
    allowedExtensions.some(ext => blob.pathname.toLowerCase().endsWith(ext))
  );
  
  const total = blobs.length;

  // Create a RagIngestionJob to track progress
  const job = await prisma.ragIngestionJob.create({
    data: { totalFiles: total },
  });

  console.log(`[INGESTION] Fan-out reindex: ${total} files, jobId=${job.id}`);

  // Enqueue each file — errors are isolated per file
  const ingestionPromises = blobs.map(async (blob) => {
    const docType = resolveDocType(blob.pathname);
    const ingestionParams: IngestionParams = {
      blobUrl: blob.url,
      sourceName: blob.pathname,
      docType,
      jobId: job.id,
    };

    try {
      await ingestDocument(ingestionParams);
    } catch (err) {
      console.error(`[INGESTION] Failed for ${blob.pathname}:`, err);
      try {
        await prisma.ragIngestionJob.update({
          where: { id: job.id },
          data: { failed: { increment: 1 } },
        });
      } catch {
        // ignore update failure
      }
    }
  });

  // Track completion
  const done = (async () => {
    await Promise.all(ingestionPromises);
    
    // Mark job as complete when all files are done
    await prisma.ragIngestionJob.update({
      where: { id: job.id },
      data: { completedAt: new Date() },
    });
    
    console.log(`[INGESTION] Fan-out reindex job ${job.id} completed.`);
  })();

  try {
    // Next.js 15+ after() ensures the task completes even after response is sent
    after(() => done);
  } catch (_e) {
    // Fallback if called outside of request context
  }

  return { total, done };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Infer DocType from blob pathname convention.
 * Pathnames containing "ways-of-working" → WAYS_OF_WORKING
 * Pathnames containing "system" or "manual" → SYSTEM_MANUAL
 * Default → WEDDING_DOCUMENT
 */
function resolveDocType(pathname: string): DocType {
  const lower = pathname.toLowerCase();
  if (lower.includes('ways-of-working') || lower.includes('waysofworking')) return 'WAYS_OF_WORKING';
  if (lower.includes('system') || lower.includes('manual')) return 'SYSTEM_MANUAL';
  return 'WEDDING_DOCUMENT';
}
