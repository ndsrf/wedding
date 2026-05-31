/**
 * MCP — Wedding Design System
 * GET /api/admin/mcp/design-system  → returns the current design system (or null)
 * PUT /api/admin/mcp/design-system  → saves a new design system
 * Auth: Bearer API key (wedding_admin role)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKeyAuth } from '@/lib/auth/api-key';
import { handleMcpError } from '@/lib/auth/mcp-error';
import { prisma } from '@/lib/db/prisma';
import type { WeddingDesignSystem } from '@/types/wedding-design-system';
import type { Prisma } from '@prisma/client';

async function withAuth(request: NextRequest) {
  const ctx = await requireApiKeyAuth(request, 'wedding_admin');
  if (!ctx.wedding_id) throw new Error('FORBIDDEN: No wedding context');
  return ctx.wedding_id;
}

export async function GET(request: NextRequest) {
  try {
    const weddingId = await withAuth(request);
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { design_system: true },
    });
    return NextResponse.json({ designSystem: wedding?.design_system ?? null });
  } catch (error) {
    return handleMcpError(error, 'design-system:GET');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const weddingId = await withAuth(request);
    const body = await request.json() as { designSystem: WeddingDesignSystem };

    if (!body.designSystem || typeof body.designSystem !== 'object') {
      return NextResponse.json({ error: 'designSystem is required' }, { status: 400 });
    }

    const ds = body.designSystem;
    if (!ds.palette || !ds.fonts || !ds.style) {
      return NextResponse.json(
        { error: 'designSystem must have palette, fonts, and style fields' },
        { status: 400 },
      );
    }

    await prisma.wedding.update({
      where: { id: weddingId },
      data: { design_system: ds as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({ success: true, designSystem: ds });
  } catch (error) {
    return handleMcpError(error, 'design-system:PUT');
  }
}
