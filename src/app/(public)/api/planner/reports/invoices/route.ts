/**
 * Invoices Report API — Planner
 * GET /api/planner/reports/invoices
 *
 * Returns all proforma and definitive invoices for the authenticated planner.
 * Supports ?format=json|xlsx|csv
 */

import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { fetchInvoicesSummary, exportInvoicesSummary } from '@/lib/reports/planner-export';
import type { ExportFormat } from '@/lib/excel/export';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('planner');
    const format = req.nextUrl.searchParams.get('format') as ExportFormat | 'json' | null;

    if (!format || format === 'json') {
      const data = await fetchInvoicesSummary(user.planner_id!);
      return Response.json(data);
    }

    const result = await exportInvoicesSummary(user.planner_id!, format as ExportFormat);
    return new Response(new Uint8Array(result.buffer), {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating invoices report:', error);
    return Response.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
