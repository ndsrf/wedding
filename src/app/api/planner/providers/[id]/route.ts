import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const updateProviderSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(1),
  contact_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  social_media: z.string().optional(),
  approx_price: z.number().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const validated = updateProviderSchema.parse(body);

    const existing = await prisma.provider.findUnique({
      where: { id },
    });

    if (!existing || existing.planner_id !== user.planner_id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const provider = await prisma.provider.update({
      where: { id },
      data: {
        category_id: validated.category_id,
        name: validated.name,
        contact_name: validated.contact_name,
        email: validated.email || null,
        phone: validated.phone,
        website: validated.website || null,
        social_media: validated.social_media,
        approx_price: validated.approx_price,
      },
    });

    return NextResponse.json({ data: provider });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating provider:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.provider.findUnique({
      where: { id },
    });

    if (!existing || existing.planner_id !== user.planner_id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    await prisma.provider.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting provider:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}