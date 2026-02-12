/**
 * Planner Invitation Template API
 *
 * GET: List templates + system seeds for a wedding
 * POST: Create new invitation template for a wedding
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { getAllSystemSeeds } from '@/lib/invitation-template/seeds';
import { invalidateWeddingPageCache } from '@/lib/cache/rsvp-page';
import { revalidateWeddingRSVPPages } from '@/lib/cache/revalidate-rsvp';
import { Prisma } from '@prisma/client';

// ============================================================================
// GET - List templates and system seeds
// ============================================================================

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');

    if (!user.planner_id) {
      return NextResponse.json(
        { error: 'Planner ID not found in session' },
        { status: 403 }
      );
    }

    const { id: weddingId } = await params;

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

    // Get system seeds
    const systemSeeds = getAllSystemSeeds();

    // Get user templates
    const userTemplates = await prisma.invitationTemplate.findMany({
      where: { wedding_id: weddingId },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({
      systemSeeds,
      userTemplates,
    });
  } catch (error) {
    console.error('Error fetching invitation templates:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('UNAUTHORIZED') || message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch invitation templates' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create new template
// ============================================================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');

    if (!user.planner_id) {
      return NextResponse.json(
        { error: 'Planner ID not found in session' },
        { status: 403 }
      );
    }

    const { id: weddingId } = await params;

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

    const body = await req.json();
    const { name, design, based_on_preset } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Template name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!design || typeof design !== 'object') {
      return NextResponse.json(
        { error: 'Template design is required' },
        { status: 400 }
      );
    }

    if (!design.globalStyle || !Array.isArray(design.blocks)) {
      return NextResponse.json(
        { error: 'Design must have globalStyle and blocks array' },
        { status: 400 }
      );
    }

    // Pre-render HTML for all languages
    let pre_rendered_html = null;
    try {
      const { preRenderTemplate } = await import('@/lib/invitation-template/pre-renderer');
      pre_rendered_html = preRenderTemplate(design);
    } catch (err) {
      console.error('Failed to pre-render template:', err);
      // Don't fail the whole request if pre-rendering fails
    }

    // Create template
    const template = await prisma.invitationTemplate.create({
      data: {
        wedding_id: weddingId,
        name: name.trim(),
        design: design as unknown as Prisma.InputJsonValue,
        pre_rendered_html: pre_rendered_html as unknown as Prisma.InputJsonValue,
        based_on_preset: based_on_preset || null,
        is_system_template: false,
      },
    });

    // Invalidate in-memory cache
    invalidateWeddingPageCache(weddingId);

    // Revalidate ISR cached pages (fire-and-forget for performance)
    void revalidateWeddingRSVPPages(weddingId);

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating invitation template:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('UNAUTHORIZED') || message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to create invitation template' },
      { status: 500 }
    );
  }
}
