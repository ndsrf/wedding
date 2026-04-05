/**
 * Wedding Admin - Me API Route
 *
 * GET /api/admin/me - Get current admin profile (name, email, phone)
 * PATCH /api/admin/me - Update admin name and phone
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(50).optional().nullable(),
});

export async function GET() {
  try {
    const user = await requireRole('wedding_admin');

    const admin = await prisma.weddingAdmin.findFirst({
      where: { id: user.id },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: admin });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('UNAUTHORIZED')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (message.startsWith('FORBIDDEN')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    console.error('Error fetching admin profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');

    const body = await request.json();
    const validated = updateProfileSchema.parse(body);

    const updated = await prisma.weddingAdmin.update({
      where: { id: user.id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.phone !== undefined && { phone: validated.phone }),
      },
      select: { id: true, name: true, email: true, phone: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('UNAUTHORIZED')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (message.startsWith('FORBIDDEN')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    console.error('Error updating admin profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
