import { NextResponse, NextRequest, after } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { fanOutReindex } from '@/lib/ai/ingestion';

/**
 * POST /api/master/rag/reindex
 * Trigger fan-out re-indexing of all Vercel Blob documents.
 * Returns immediately via after.
 * Protected: master_admin only.
 */
export async function POST(_req: NextRequest) {
  try {
    await requireRole('master_admin');

    const { total, done } = await fanOutReindex();

    // Use 'after' to ensure ingestion continues after response is sent
    after(async () => {
      try {
        await done;
      } catch (err) {
        console.error('[RAG_REINDEX] Background task failed:', err);
      }
    });

    return NextResponse.json({
      success: true,
      message: `Re-indexing triggered for ${total} documents.`,
      totalDocuments: total,
    });
  } catch (error: unknown) {
    console.error('[RAG_REINDEX_ERROR]', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes('FORBIDDEN') ? 403 : errorMessage.includes('UNAUTHORIZED') ? 401 : 500 }
    );
  }
}

