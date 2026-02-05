/**
 * Invitation Template Detail API
 *
 * GET: Get single template
 * PUT: Update template
 * DELETE: Delete template
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { invalidateWeddingPageCache } from '@/lib/cache/rsvp-page';
import { Prisma } from '@prisma/client';

// ============================================================================
// GET - Get single template
// ============================================================================

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching invitation template:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('UNAUTHORIZED') || message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch invitation template' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Update template
// ============================================================================

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await req.json();
    const { name, design } = body;

    // Build update object
    const updateData: Prisma.InvitationTemplateUpdateInput = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Template name must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (design !== undefined) {
      if (typeof design !== 'object' || !design.globalStyle || !Array.isArray(design.blocks)) {
        return NextResponse.json(
          { error: 'Design must have globalStyle and blocks array' },
          { status: 400 }
        );
      }
      updateData.design = design as unknown as Prisma.InputJsonValue;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const updated = await prisma.invitationTemplate.update({
      where: { id },
      data: updateData,
    });

    invalidateWeddingPageCache(template.wedding_id);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating invitation template:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('UNAUTHORIZED') || message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to update invitation template' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete template
// ============================================================================

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    await prisma.invitationTemplate.delete({
      where: { id },
    });

    invalidateWeddingPageCache(template.wedding_id);

    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error) {
    console.error('Error deleting invitation template:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('UNAUTHORIZED') || message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to delete invitation template' },
      { status: 500 }
    );
  }
}
