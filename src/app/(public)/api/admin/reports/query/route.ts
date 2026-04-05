/**
 * Natural Language Query Report API — Admin
 * POST /api/admin/reports/query
 */

import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { nlQueryReportHandler } from '@/lib/reports/api-handlers';

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) {
      return Response.json({ error: 'No wedding associated with this account' }, { status: 400 });
    }
    return nlQueryReportHandler(req, user.wedding_id, user.id);
  } catch (error) {
    console.error('[NL-QUERY] API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to execute query';
    return Response.json({ error: message }, { status: 500 });
  }
}
