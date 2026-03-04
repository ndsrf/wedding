/**
 * Invitation Template Import API
 *
 * POST /api/admin/invitation-template/import
 *
 * Accepts a multipart/form-data upload with a single "file" field containing
 * a .nupcinv archive.  Extracts the design, uploads bundled images to the
 * correct wedding-scoped folder, and creates a new InvitationTemplate record.
 *
 * Returns the newly created template (same shape as other template endpoints).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { importInvitationTemplate } from '@/lib/invitation-template/export-import';
import { invalidateWeddingPageCache } from '@/lib/cache/rsvp-page';
import { revalidateWeddingRSVPPages } from '@/lib/cache/revalidate-rsvp';
import { Prisma } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json(
        { error: 'Wedding ID not found in user context' },
        { status: 400 }
      );
    }

    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Accept .nupcinv files (or application/octet-stream from browser)
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

    // Import: parse archive, upload images, migrate blocks
    const { design, templateName, warnings } = await importInvitationTemplate(
      buffer,
      user.wedding_id
    );

    if (warnings.length > 0) {
      console.warn('[InvitationImport] Warnings during import:', warnings);
    }

    // Pre-render HTML
    let pre_rendered_html = null;
    try {
      const { preRenderTemplate } = await import('@/lib/invitation-template/pre-renderer');
      pre_rendered_html = preRenderTemplate(design);
    } catch (err) {
      console.error('Failed to pre-render imported template:', err);
    }

    // Persist new template
    const template = await prisma.invitationTemplate.create({
      data: {
        wedding_id: user.wedding_id,
        name: templateName,
        design: design as unknown as Prisma.InputJsonValue,
        pre_rendered_html: pre_rendered_html as unknown as Prisma.InputJsonValue,
        based_on_preset: null,
        is_system_template: false,
      },
    });

    // Invalidate caches
    invalidateWeddingPageCache(user.wedding_id);
    void revalidateWeddingRSVPPages(user.wedding_id);

    return NextResponse.json(
      { template, warnings },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error importing invitation template:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('UNAUTHORIZED') || message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    // Surface parse/validation errors to the client
    if (
      message.startsWith('Invalid .nupcinv') ||
      message.startsWith('Failed to parse .nupcinv')
    ) {
      return NextResponse.json({ error: message }, { status: 422 });
    }

    return NextResponse.json({ error: 'Failed to import invitation template' }, { status: 500 });
  }
}
