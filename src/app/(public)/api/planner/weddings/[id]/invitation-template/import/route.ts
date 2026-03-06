/**
 * Planner Invitation Template Import API
 *
 * POST /api/planner/weddings/[id]/invitation-template/import
 *
 * Accepts a multipart/form-data upload with a single "file" field containing
 * a .nupcinv archive. Extracts the design, uploads bundled images, and creates
 * a new InvitationTemplate record for the specified wedding.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { importInvitationTemplate } from '@/lib/invitation-template/export-import';
import { invalidateWeddingPageCache } from '@/lib/cache/rsvp-page';
import { revalidateWeddingRSVPPages } from '@/lib/cache/revalidate-rsvp';
import { Prisma } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: weddingId } = await params;
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

    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (
      file.name &&
      !file.name.toLowerCase().endsWith('.nupcinv') &&
      file.type !== 'application/octet-stream' &&
      file.type !== ''
    ) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a .nupcinv file.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const { design, templateName, warnings } = await importInvitationTemplate(buffer, weddingId);

    if (warnings.length > 0) {
      console.warn('[InvitationImport][Planner] Warnings during import:', warnings);
    }

    let pre_rendered_html = null;
    try {
      const { preRenderTemplate } = await import('@/lib/invitation-template/pre-renderer');
      pre_rendered_html = preRenderTemplate(design);
    } catch (err) {
      console.error('Failed to pre-render imported template (planner):', err);
    }

    const template = await prisma.invitationTemplate.create({
      data: {
        wedding_id: weddingId,
        name: templateName,
        design: design as unknown as Prisma.InputJsonValue,
        pre_rendered_html: pre_rendered_html as unknown as Prisma.InputJsonValue,
        based_on_preset: null,
        is_system_template: false,
      },
    });

    invalidateWeddingPageCache(weddingId);
    void revalidateWeddingRSVPPages(weddingId);

    return NextResponse.json({ template, warnings }, { status: 201 });
  } catch (error) {
    console.error('Error importing invitation template (planner):', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('UNAUTHORIZED') || message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (
      message.startsWith('Invalid .nupcinv') ||
      message.startsWith('Failed to parse .nupcinv')
    ) {
      return NextResponse.json({ error: message }, { status: 422 });
    }

    return NextResponse.json({ error: 'Failed to import invitation template' }, { status: 500 });
  }
}
