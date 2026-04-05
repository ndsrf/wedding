import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { fetchChecklist, exportChecklist } from '@/lib/reports/planner-export';
import type { ExportFormat } from '@/lib/excel/export';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('planner');
    const format = req.nextUrl.searchParams.get('format') as ExportFormat | 'json' | null;

    if (!format || format === 'json') {
      const data = await fetchChecklist(user.planner_id!);
      return Response.json(data);
    }

    const result = await exportChecklist(user.planner_id!, format as ExportFormat);
    return new Response(new Uint8Array(result.buffer), {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating checklist report:', error);
    return Response.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
