import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const createProviderSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(1),
  contact_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  social_media: z.string().optional(),
  approx_price: z.number().optional(),
});

export async function GET(_request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const providers = await prisma.provider.findMany({
      where: { planner_id: user.planner_id },
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: providers });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const validated = createProviderSchema.parse(body);

    const provider = await prisma.provider.create({
      data: {
        planner_id: user.planner_id,
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

    // Sync new provider to all existing non-deleted weddings (non-blocking)
    prisma.wedding
      .findMany({
        where: { planner_id: user.planner_id, status: { not: 'DELETED' } },
        select: { id: true },
      })
      .then((weddings) =>
        prisma.weddingProvider.createMany({
          data: weddings.map((w) => ({
            wedding_id: w.id,
            category_id: validated.category_id,
            provider_id: provider.id,
            name: provider.name,
            contact_name: provider.contact_name ?? null,
            email: provider.email ?? null,
            phone: provider.phone ?? null,
            website: provider.website ?? null,
            social_media: provider.social_media ?? null,
          })),
          skipDuplicates: true,
        })
      )
      .catch((err) => console.error('Failed to sync provider to weddings:', err));

    return NextResponse.json({ data: provider });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating provider:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}