/**
 * Planner Invitation Template Export API
 *
 * GET /api/planner/weddings/[id]/invitation-template/[templateId]/export
 *
 * Exports a template as a .nupcinv file (ZIP archive containing the design
 * definition with versioned blocks plus all referenced images).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { exportInvitationTemplate } from '@/lib/invitation-template/export-import';
import type { TemplateDesign } from '@/types/invitation-template';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  try {
    const { id: weddingId, templateId } = await params;
    const user = await requireRole('planner');

    if (!user.planner_id) {
      return NextResponse.json(
        { error: 'Planner ID not found in session' },
        { status: 403 }
      );
    }

    // Verify planner has access to this wedding
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { planner_id: true },
    });

    if (!wedding) {
      return NextResponse.json({ error: 'Wedding not found' }, { status: 404 });
    }

    if (wedding.planner_id !== user.planner_id) {
      return NextResponse.json(
        { error: 'You do not have access to this wedding' },
        { status: 403 }
      );
    }

    // Load template
    const template = await prisma.invitationTemplate.findUnique({ where: { id: templateId } });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (template.wedding_id !== weddingId) {
      return NextResponse.json(
        { error: 'Forbidden: Template does not belong to this wedding' },
        { status: 403 }
      );
    }

    // Build the .nupcinv archive
    const archive = await exportInvitationTemplate(
      template.design as unknown as TemplateDesign,
      template.name
    );

    const safeName = template.name.replace(/[^a-z0-9_\-\s]/gi, '_').trim() || 'invitation';
    const filename = `${safeName}.nupcinv`;

    return new NextResponse(archive, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(archive.length),
      },
    });
  } catch (error) {
    console.error('Error exporting invitation template (planner):', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('UNAUTHORIZED') || message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to export invitation template' }, { status: 500 });
  }
}
