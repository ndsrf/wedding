import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { LocationType } from '@prisma/client';

const createLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  location_type: z.nativeEnum(LocationType),
  url: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
  google_maps_url: z.string().url().optional().or(z.literal('')),
  address: z.string().optional(),
});

export async function GET(_request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const locations = await prisma.location.findMany({
      where: { planner_id: user.planner_id },
      orderBy: [
        { location_type: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ data: locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const validated = createLocationSchema.parse(body);

    const location = await prisma.location.create({
      data: {
        planner_id: user.planner_id,
        name: validated.name,
        location_type: validated.location_type,
        url: validated.url || null,
        notes: validated.notes,
        google_maps_url: validated.google_maps_url || null,
        address: validated.address,
      },
    });

    return NextResponse.json({ data: location });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error creating location:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
