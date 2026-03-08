/**
 * Master Admin - RAG Re-index API Route
 *
 * POST /api/master/rag/reindex
 * Triggers fan-out re-indexing of all Vercel Blob documents.
 * Returns immediately with { queued: N } — ingestion runs in background.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { fanOutReindex } from '@/lib/ai/ingestion';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

export async function POST(_request: NextRequest) {
  try {
    await requireRole('master_admin');

    // fanOutReindex() lists blobs, creates a job record, then fires per-file ingestion
    // as fire-and-forget. The await here only waits for the job record creation and
    // file listing — the actual ingestion runs in background.
    const { total } = await fanOutReindex();

    const response: APIResponse<{ queued: number }> = {
      success: true,
      data: { queued: total },
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '';

    if (errorMessage.includes('UNAUTHORIZED')) {
      return NextResponse.json(
        { success: false, error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' } },
        { status: 401 },
      );
    }

    if (errorMessage.includes('FORBIDDEN')) {
      return NextResponse.json(
        { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Master admin role required' } },
        { status: 403 },
      );
    }

    console.error('[RAG] Reindex error:', error);
    return NextResponse.json(
      { success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to trigger reindex' } },
      { status: 500 },
    );
  }
}
