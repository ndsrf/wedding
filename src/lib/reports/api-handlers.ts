/**
 * Shared Report API Handlers
 *
 * Business logic for per-wedding report endpoints.
 * Used by both admin (/api/admin/reports/*) and planner (/api/planner/weddings/[id]/reports/*).
 *
 * Each handler accepts a weddingId and returns a NextResponse.
 * Route files are thin auth-and-dispatch wrappers that call these handlers.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import {
  fetchAttendeeList,
  exportAttendeeList,
  fetchGuestsPerAdmin,
  exportGuestsPerAdmin,
  fetchSeatingPlan,
  exportSeatingPlan,
  fetchAgeAverage,
  exportAgeAverage,
} from '@/lib/reports/export';
import {
  executeNaturalLanguageQuery,
  executeValidatedSQL,
} from '@/lib/reports/nl-query';
import type { ExportFormat } from '@/lib/excel/export';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fileResponse(buffer: Buffer, mimeType: string, filename: string): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function getFormat(req: NextRequest): ExportFormat | 'json' | null {
  return req.nextUrl.searchParams.get('format') as ExportFormat | 'json' | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Standard report handlers
// ─────────────────────────────────────────────────────────────────────────────

export async function attendeesReportHandler(
  req: NextRequest,
  weddingId: string,
): Promise<NextResponse> {
  const format = getFormat(req);
  if (!format || format === 'json') {
    const data = await fetchAttendeeList(weddingId);
    return NextResponse.json(data);
  }
  const result = await exportAttendeeList(weddingId, format as ExportFormat);
  return fileResponse(result.buffer, result.mimeType, result.filename);
}

export async function guestsPerAdminReportHandler(
  req: NextRequest,
  weddingId: string,
): Promise<NextResponse> {
  const format = getFormat(req);
  if (!format || format === 'json') {
    const data = await fetchGuestsPerAdmin(weddingId);
    return NextResponse.json(data);
  }
  const result = await exportGuestsPerAdmin(weddingId, format as ExportFormat);
  return fileResponse(result.buffer, result.mimeType, result.filename);
}

export async function seatingPlanReportHandler(
  req: NextRequest,
  weddingId: string,
): Promise<NextResponse> {
  const format = getFormat(req);
  if (!format || format === 'json') {
    const data = await fetchSeatingPlan(weddingId);
    return NextResponse.json(data);
  }
  const result = await exportSeatingPlan(weddingId, format as ExportFormat);
  return fileResponse(result.buffer, result.mimeType, result.filename);
}

export async function ageAverageReportHandler(
  req: NextRequest,
  weddingId: string,
): Promise<NextResponse> {
  const format = getFormat(req);
  if (!format || format === 'json') {
    const data = await fetchAgeAverage(weddingId);
    return NextResponse.json(data);
  }
  const result = await exportAgeAverage(weddingId, format as ExportFormat);
  return fileResponse(result.buffer, result.mimeType, result.filename);
}

// ─────────────────────────────────────────────────────────────────────────────
// Natural-language query handler
// ─────────────────────────────────────────────────────────────────────────────

type NLQueryExportFormat = 'json' | 'xlsx' | 'csv';

/**
 * Handles the natural-language query POST endpoint.
 *
 * @param req         The incoming request
 * @param weddingId   Bound as $1 in every generated query
 * @param contextId   Bound as $2 (admin_id or planner_id acting as context)
 */
export async function nlQueryReportHandler(
  req: NextRequest,
  weddingId: string,
  contextId: string,
): Promise<NextResponse> {
  const body = await req.json();
  const { question, sql: providedSql, format = 'json' } = body as {
    question?: string;
    sql?: string;
    format?: NLQueryExportFormat;
  };

  if (!question && !providedSql) {
    return NextResponse.json({ error: 'Either question or sql is required' }, { status: 400 });
  }

  const result = providedSql
    ? await executeValidatedSQL(providedSql, weddingId, contextId)
    : await executeNaturalLanguageQuery(question!, weddingId, contextId);

  if (format === 'json') {
    return NextResponse.json({ data: result.data, sql: result.sql, columns: result.columns });
  }

  // File export
  const rows: (string | number | boolean | null)[][] = [
    result.columns,
    ...result.data.map((row) =>
      result.columns.map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'bigint') return Number(val);
        if (typeof val === 'object') return JSON.stringify(val);
        return val as string | number | boolean;
      }),
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
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="custom-report-${timestamp}.xlsx"`,
    },
  });
}
