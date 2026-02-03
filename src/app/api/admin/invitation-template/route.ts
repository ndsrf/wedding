/**
 * Invitation Template API
 *
 * GET: List user templates + system template seeds
 * POST: Create new invitation template
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { getAllSystemSeeds } from '@/lib/invitation-template/seeds';
import { Prisma } from '@prisma/client';

// ============================================================================
// GET - List templates and system seeds
// ============================================================================

export async function GET() {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json(
        { error: 'Wedding ID not found in user context' },
        { status: 400 }
      );
    }

    // Get system seeds
    const systemSeeds = getAllSystemSeeds();

    // Get user templates
    const userTemplates = await prisma.invitationTemplate.findMany({
      where: { wedding_id: user.wedding_id },
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

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json(
        { error: 'Wedding ID not found in user context' },
        { status: 400 }
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

    // Create template
    const template = await prisma.invitationTemplate.create({
      data: {
        wedding_id: user.wedding_id,
        name: name.trim(),
        design: design as unknown as Prisma.InputJsonValue,
        based_on_preset: based_on_preset || null,
        is_system_template: false,
      },
    });

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
