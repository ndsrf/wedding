import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/master/rag/status
 * Return current ingestion progress from the latest RagIngestionJob record.
 * Protected: master_admin only.
 */
export async function GET() {
  try {
    await requireRole('master_admin');

    // Get the latest job record
    const latestJob = await prisma.ragIngestionJob.findFirst({
      orderBy: { triggeredAt: 'desc' },
    });

    if (!latestJob) {
      return NextResponse.json({
        success: true,
        job: null,
        message: 'No re-indexing jobs found.',
      });
    }

    const progress = latestJob.totalFiles > 0 
      ? Math.round(((latestJob.processed + latestJob.failed) / latestJob.totalFiles) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      job: {
        id: latestJob.id,
        triggeredAt: latestJob.triggeredAt,
        totalFiles: latestJob.totalFiles,
        processed: latestJob.processed,
        failed: latestJob.failed,
        completedAt: latestJob.completedAt,
        progress,
        isCompleted: !!latestJob.completedAt,
      },
    });
  } catch (error: unknown) {
    console.error('[RAG_STATUS_ERROR]', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes('FORBIDDEN') ? 403 : errorMessage.includes('UNAUTHORIZED') ? 401 : 500 }
    );
  }
}
