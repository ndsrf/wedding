import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const contract = await prisma.contract.findFirst({
      where: { id, planner_id: user.planner_id },
    });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (contract.status !== 'SIGNING') {
      return NextResponse.json({ error: 'Contract is not in SIGNING status' }, { status: 400 });
    }

    // Try to cancel the DocuSeal submission
    if (contract.signing_request_id) {
      const apiBase = (process.env.DOCUSEAL_API_URL ?? 'https://api.docuseal.com').replace(/\/$/, '');
      const apiKey = process.env.DOCUSEAL_API_KEY;
      if (apiKey) {
        try {
          const archiveRes = await fetch(`${apiBase}/submissions/${contract.signing_request_id}/archive`, {
            method: 'PUT',
            headers: { 'X-Auth-Token': apiKey, 'Content-Type': 'application/json' },
          });
          if (!archiveRes.ok) {
            const body = await archiveRes.text().catch(() => '');
            console.warn(`DocuSeal archive failed (${archiveRes.status}): ${body}`);
          }
        } catch (e) {
          // Non-fatal: log but proceed with moving to draft
          console.warn('Failed to archive DocuSeal submission:', e);
        }
      }
    }

    const updated = await prisma.contract.update({
      where: { id },
      data: {
        status: 'DRAFT',
        signing_request_id: null,
        signing_url: null,
        pdf_url: null, // Clear cached PDF so it gets regenerated
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('move-to-draft error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
