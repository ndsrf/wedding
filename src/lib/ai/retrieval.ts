/**
 * Multi-Tenant Retrieval Service
 *
 * Cosine similarity search over DocumentChunk with role-aware tenant scoping.
 * Couple scope: wedding docs + planner ways-of-working + system manuals.
 * Planner scope: all their weddings + system manuals.
 * Returns top-5 chunks by default.
 *
 * Depends on: vector-prisma.ts, embeddings.ts
 */

import { isVectorEnabled, vectorPrisma } from '@/lib/db/vector-prisma';
import { generateEmbeddings } from './embeddings';

export interface RetrievedChunk {
  content: string;
  sourceName: string;
  fullUrl?: string;
  metadata?: Record<string, unknown>;
  docType: string;
  weddingProviderId?: string;
  paymentId?: string;
  locationId?: string;
  score: number;
}

export interface RetrievalParams {
  query: string;
  weddingId?: string;
  plannerId?: string;
  role: 'wedding_admin' | 'planner';
  topK?: number;
}

type RawChunkRow = {
  content: string;
  sourceName: string;
  fullUrl: string | null;
  metadata: Record<string, unknown> | null;
  docType: string;
  weddingProviderId: string | null;
  paymentId: string | null;
  locationId: string | null;
  score: number;
};

/**
 * Retrieve the most relevant document chunks for a query, filtered by tenant scope.
 *
 * wedding_admin scope: chunks where weddingId matches OR (plannerId matches AND docType=WAYS_OF_WORKING) OR docType=SYSTEM_MANUAL
 * planner scope: chunks where plannerId matches OR docType=SYSTEM_MANUAL
 *
 * Returns [] when vector DB is disabled or no chunks found.
 * Never throws on empty results.
 */
export async function retrieveChunks(params: RetrievalParams): Promise<RetrievedChunk[]> {
  if (!isVectorEnabled() || !vectorPrisma) return [];

  const { query, weddingId, plannerId, role, topK = 5 } = params;
  console.log(`[RETRIEVAL] Querying for: "${query}" | role: ${role} | weddingId: ${weddingId} | plannerId: ${plannerId}`);

  // Embed the query
  const [queryVector] = await generateEmbeddings([query]);
  const vectorStr = `[${queryVector.join(',')}]`;

  let rows: RawChunkRow[];

  try {
    if (role === 'wedding_admin') {
      // Couple scope: own wedding docs + planner ways-of-working + system manuals + references
      rows = await vectorPrisma.$queryRawUnsafe<RawChunkRow>(
        `SELECT 
          content, "sourceName", "fullUrl", metadata, "docType", 
          "weddingProviderId", "paymentId", "locationId",
          (embedding <=> $1::vector) AS score
         FROM document_chunks
         WHERE (
           ("weddingId" = $2)
           OR (
             "plannerId" = $3 
             AND "docType" IN ('WAYS_OF_WORKING'::"DocType", 'WEDDING_DOCUMENT'::"DocType", 'REFERENCES'::"DocType")
             AND ("weddingId" IS NULL OR "weddingId" = $2)
           )
           OR (
             "docType" = 'SYSTEM_MANUAL'::"DocType"
             AND (metadata->>'role' = 'admin' OR metadata->>'role' IS NULL)
           )
         )
         ORDER BY score ASC
         LIMIT $4`,
        vectorStr,
        weddingId ?? '',
        plannerId ?? '',
        topK,
      );
    } else {
      // Planner scope: own docs across weddings + system manuals + references
      // If weddingId is present, the planner is "inside" a wedding and should see admin docs too.
      rows = await vectorPrisma.$queryRawUnsafe<RawChunkRow>(
        `SELECT 
          content, "sourceName", "fullUrl", metadata, "docType", 
          "weddingProviderId", "paymentId", "locationId",
          (embedding <=> $1::vector) AS score
         FROM document_chunks
         WHERE (
           ("plannerId" = $2)
           OR (
             "docType" = 'SYSTEM_MANUAL'::"DocType"
             AND (
               metadata->>'role' = 'planner' 
               OR (metadata->>'role' = 'admin' AND $4 IS NOT NULL)
               OR metadata->>'role' IS NULL
             )
           )
           OR ("docType" = 'REFERENCES'::"DocType")
         )
         ORDER BY score ASC
         LIMIT $3`,
        vectorStr,
        plannerId ?? '',
        topK,
        weddingId ?? null,
      );
    }
    console.log(`[RETRIEVAL] Found ${rows?.length ?? 0} matches:`, rows?.map(r => r.sourceName));
  } catch (err) {
    console.error('[RETRIEVAL] Error executing raw query:', err);
    throw err;
  }

  if (!rows || rows.length === 0) return [];

  return rows.map((row) => ({
    content: row.content,
    sourceName: row.sourceName,
    fullUrl: row.fullUrl ?? undefined,
    metadata: row.metadata ?? undefined,
    docType: row.docType,
    weddingProviderId: row.weddingProviderId ?? undefined,
    paymentId: row.paymentId ?? undefined,
    locationId: row.locationId ?? undefined,
    score: Number(row.score),
  }));
}
