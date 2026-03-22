import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  legal_name: z.string().optional().nullable(),
  vat_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')),
});

export async function GET() {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const planner = await prisma.weddingPlanner.findUnique({
      where: { id: user.planner_id },
      select: {
        id: true,
        name: true,
        email: true,
        legal_name: true,
        vat_number: true,
        address: true,
        phone: true,
        whatsapp: true,
        instagram: true,
        website: true,
        logo_url: true,
        signature_url: true,
      },
    });

    if (!planner) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ data: planner });
  } catch (error) {
    console.error('GET /api/planner/company-profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
    }

    const updated = await prisma.weddingPlanner.update({
      where: { id: user.planner_id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        email: true,
        legal_name: true,
        vat_number: true,
        address: true,
        phone: true,
        whatsapp: true,
        instagram: true,
        website: true,
        logo_url: true,
        signature_url: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PATCH /api/planner/company-profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
