import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { fetchQuotes, exportQuotes } from '@/lib/reports/planner-export';
import type { ExportFormat } from '@/lib/excel/export';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('planner');
    const format = req.nextUrl.searchParams.get('format') as ExportFormat | 'json' | null;

    if (!format || format === 'json') {
      const data = await fetchQuotes(user.planner_id!);
      return Response.json(data);
    }

    const result = await exportQuotes(user.planner_id!, format as ExportFormat);
    return new Response(new Uint8Array(result.buffer), {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating quotes report:', error);
    return Response.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
