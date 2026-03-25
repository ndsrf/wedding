import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const contract = await prisma.contract.findFirst({
      where: { id, planner_id: user.planner_id },
    });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Return the stored audit URL if we have one (covers both manual-signed and
    // DocuSeal-signed contracts where the audit PDF was downloaded at webhook time)
    if (contract.audit_url) {
      return NextResponse.json({ data: { audit_url: contract.audit_url } });
    }

    // Manually signed without a stored audit URL — nothing to return
    if (!contract.signing_request_id) {
      return NextResponse.json({ error: 'No audit record found for this contract' }, { status: 404 });
    }

    // DocuSeal-signed but audit PDF not yet downloaded — fetch live from DocuSeal API
    const apiBase = (process.env.DOCUSEAL_API_URL ?? 'https://api.docuseal.com').replace(/\/$/, '');
    const apiKey = process.env.DOCUSEAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'DocuSeal API key not configured' }, { status: 500 });
    }

    const res = await fetch(`${apiBase}/submissions/${contract.signing_request_id}`, {
      headers: { 'X-Auth-Token': apiKey },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch submission from DocuSeal' }, { status: 502 });
    }

    const submission = await res.json() as { audit_log_url?: string; documents?: Array<{ url?: string }> };

    const auditUrl = submission.audit_log_url ?? null;

    return NextResponse.json({ data: { audit_url: auditUrl } });
  } catch (error) {
    console.error('audit-pdf error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
