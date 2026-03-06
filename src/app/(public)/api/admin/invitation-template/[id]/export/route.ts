/**
 * Invitation Template Export API
 *
 * GET /api/admin/invitation-template/[id]/export
 *
 * Exports a template as a .nupcinv file (ZIP archive containing the design
 * definition with versioned blocks plus all referenced images).
 * The file is streamed as a binary download to the browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { exportInvitationTemplate } from '@/lib/invitation-template/export-import';
import type { TemplateDesign } from '@/types/invitation-template';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json(
        { error: 'Wedding ID not found in user context' },
        { status: 400 }
      );
    }

    // Load template
    const template = await prisma.invitationTemplate.findUnique({ where: { id } });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Verify ownership
    if (template.wedding_id !== user.wedding_id) {
      return NextResponse.json(
        { error: 'Forbidden: No access to this template' },
        { status: 403 }
      );
    }

    // Build the .nupcinv archive
    const archive = await exportInvitationTemplate(
      template.design as unknown as TemplateDesign,
      template.name
    );

    // Sanitise filename for Content-Disposition
    const safeName = template.name.replace(/[^a-z0-9_\-\s]/gi, '_').trim() || 'invitation';
    const filename = `${safeName}.nupcinv`;

    return new NextResponse(archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength) as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(archive.length),
      },
    });
  } catch (error) {
    console.error('Error exporting invitation template:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('UNAUTHORIZED') || message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to export invitation template' }, { status: 500 });
  }
}
