/**
 * Planner Invitation Template Detail API
 *
 * GET: Get single template
 * PUT: Update template
 * DELETE: Delete template
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { invalidateWeddingPageCache } from '@/lib/cache/rsvp-page';
import { revalidateWeddingRSVPPages } from '@/lib/cache/revalidate-rsvp';
import { Prisma } from '@prisma/client';

// ============================================================================
// GET - Get single template
// ============================================================================

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
      return NextResponse.json(
        { error: 'Wedding not found' },
        { status: 404 }
      );
    }

    if (wedding.planner_id !== user.planner_id) {
      return NextResponse.json(
        { error: 'You do not have access to this wedding' },
        { status: 403 }
      );
    }

    const template = await prisma.invitationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Verify template belongs to the wedding
    if (template.wedding_id !== weddingId) {
      return NextResponse.json(
        { error: 'Template does not belong to this wedding' },
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

export async function PUT(
  req: NextRequest,
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
      select: {
        planner_id: true,
        couple_names: true,
        wedding_date: true,
        wedding_time: true,
        location: true,
      },
    });

    if (!wedding) {
      return NextResponse.json(
        { error: 'Wedding not found' },
        { status: 404 }
      );
    }

    if (wedding.planner_id !== user.planner_id) {
      return NextResponse.json(
        { error: 'You do not have access to this wedding' },
        { status: 403 }
      );
    }

    const template = await prisma.invitationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Verify template belongs to the wedding
    if (template.wedding_id !== weddingId) {
      return NextResponse.json(
        { error: 'Template does not belong to this wedding' },
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

      // Pre-render HTML for all languages
      try {
        const { preRenderTemplate } = await import('@/lib/invitation-template/pre-renderer');
        updateData.pre_rendered_html = preRenderTemplate(design) as unknown as Prisma.InputJsonValue;
      } catch (err) {
        console.error('Failed to pre-render template during update:', err);
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const updated = await prisma.invitationTemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    // Invalidate in-memory cache
    invalidateWeddingPageCache(weddingId);

    // Revalidate ISR cached pages (fire-and-forget for performance)
    void revalidateWeddingRSVPPages(weddingId);

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

export async function DELETE(
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
      return NextResponse.json(
        { error: 'Wedding not found' },
        { status: 404 }
      );
    }

    if (wedding.planner_id !== user.planner_id) {
      return NextResponse.json(
        { error: 'You do not have access to this wedding' },
        { status: 403 }
      );
    }

    const template = await prisma.invitationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Verify template belongs to the wedding
    if (template.wedding_id !== weddingId) {
      return NextResponse.json(
        { error: 'Template does not belong to this wedding' },
        { status: 403 }
      );
    }

    await prisma.invitationTemplate.delete({
      where: { id: templateId },
    });

    // Invalidate in-memory cache
    invalidateWeddingPageCache(weddingId);

    // Revalidate ISR cached pages (fire-and-forget for performance)
    void revalidateWeddingRSVPPages(weddingId);

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
