/**
 * Invitation Template Duplicate API
 *
 * POST /api/admin/invitation-template/[id]/duplicate
 * Creates a copy of an existing invitation template with a "Copy of ..." name.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { invalidateWeddingPageCache } from '@/lib/cache/rsvp-page';
import { revalidateWeddingRSVPPages } from '@/lib/cache/revalidate-rsvp';
import { Prisma } from '@prisma/client';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json(
        { error: 'Wedding ID not found in user context' },
        { status: 400 }
      );
    }

    const template = await prisma.invitationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (template.wedding_id !== user.wedding_id) {
      return NextResponse.json(
        { error: 'Forbidden: No access to this template' },
        { status: 403 }
      );
    }

    // Create duplicate with "Copy of ..." name
    const duplicate = await prisma.invitationTemplate.create({
      data: {
        wedding_id: user.wedding_id,
        name: `Copy of ${template.name}`,
        design: template.design as Prisma.InputJsonValue,
        pre_rendered_html: template.pre_rendered_html as Prisma.InputJsonValue,
        based_on_preset: template.based_on_preset,
        is_system_template: false,
      },
    });

    // Invalidate in-memory cache
    invalidateWeddingPageCache(user.wedding_id);

    // Revalidate ISR cached pages (fire-and-forget for performance)
    void revalidateWeddingRSVPPages(user.wedding_id);

    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    console.error('Error duplicating invitation template:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('UNAUTHORIZED') || message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to duplicate invitation template' },
      { status: 500 }
    );
  }
}
