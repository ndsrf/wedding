/**
 * Natural Language Query Report API — Planner
 *
 * POST /api/planner/weddings/[id]/reports/query
 *
 * Planner-scoped equivalent of /api/admin/reports/query.
 * The wedding_id comes from the URL [id] param instead of the session.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireRole } from '@/lib/auth/middleware';
import {
  executeNaturalLanguageQuery,
  executeValidatedSQL,
} from '@/lib/reports/nl-query';

type ExportFormat = 'json' | 'xlsx' | 'csv';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');
    const { id: wedding_id } = await context.params;

    if (!wedding_id) {
      return NextResponse.json(
        { error: 'Wedding ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { question, sql: providedSql, format = 'json' } = body as {
      question?: string;
      sql?: string;
      format?: ExportFormat;
    };

    if (!question && !providedSql) {
      return NextResponse.json(
        { error: 'Either question or sql is required' },
        { status: 400 }
      );
    }

    // Planners don't have a per-wedding admin context; pass planner id as
    // admin_id so $2 is always a valid (though unused) binding.
    const admin_id = user.id;

    const result = providedSql
      ? await executeValidatedSQL(providedSql, wedding_id, admin_id)
      : await executeNaturalLanguageQuery(question!, wedding_id, admin_id);

    if (format === 'json') {
      return NextResponse.json({
        data: result.data,
        sql: result.sql,
        columns: result.columns,
      });
    }

    const rows: (string | number | boolean | null)[][] = [
      result.columns,
      ...result.data.map((row) =>
        result.columns.map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return '';
          if (typeof val === 'bigint') return Number(val);
          if (typeof val === 'object') return JSON.stringify(val);
          return val as string | number | boolean;
        })
      ),
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    worksheet['!cols'] = result.columns.map((_, colIdx) => {
      const maxLen = Math.max(...rows.map((row) => String(row[colIdx] ?? '').length));
      return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Custom Report');

    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      return new NextResponse(Buffer.from(csv, 'utf-8'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="custom-report-${timestamp}.csv"`,
        },
      });
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="custom-report-${timestamp}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('[NL-QUERY] Planner API error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to execute query';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
