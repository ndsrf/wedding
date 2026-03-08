/**
 * Master Admin - RAG Ingestion Status API Route
 *
 * GET /api/master/rag/status
 * Returns the latest RagIngestionJob progress.
 * Returns { inProgress: false, total: 0 } when no job exists.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

export interface RagStatusResponse {
  total: number;
  processed: number;
  failed: number;
  inProgress: boolean;
  triggeredAt: string | null;
}

export async function GET(_request: NextRequest) {
  try {
    await requireRole('master_admin');

    const job = await prisma.ragIngestionJob.findFirst({
      orderBy: { triggeredAt: 'desc' },
    });

    if (!job) {
      const response: APIResponse<RagStatusResponse> = {
        success: true,
        data: { total: 0, processed: 0, failed: 0, inProgress: false, triggeredAt: null },
      };
      return NextResponse.json(response, { status: 200 });
    }

    const response: APIResponse<RagStatusResponse> = {
      success: true,
      data: {
        total: job.totalFiles,
        processed: job.processed,
        failed: job.failed,
        inProgress: job.completedAt === null,
        triggeredAt: job.triggeredAt.toISOString(),
      },
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

    console.error('[RAG] Status error:', error);
    return NextResponse.json(
      { success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to fetch status' } },
      { status: 500 },
    );
  }
}
