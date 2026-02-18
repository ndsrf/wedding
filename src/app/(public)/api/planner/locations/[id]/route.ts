import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { LocationType } from '@prisma/client';

const updateLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  location_type: z.nativeEnum(LocationType),
  url: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
  google_maps_url: z.string().url().optional().or(z.literal('')),
  address: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            weddings: true,
            itinerary_items: true,
          },
        },
      },
    });

    if (!location || location.planner_id !== user.planner_id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ data: location });
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const validated = updateLocationSchema.parse(body);

    const existing = await prisma.location.findUnique({
      where: { id },
    });

    if (!existing || existing.planner_id !== user.planner_id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const location = await prisma.location.update({
      where: { id },
      data: {
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
    console.error('Error updating location:', error);
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

    const existing = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            weddings: true,
            itinerary_items: true,
          },
        },
      },
    });

    if (!existing || existing.planner_id !== user.planner_id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    // Check if location is in use
    if (existing._count.weddings > 0 || existing._count.itinerary_items > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete location that is in use by weddings or itinerary items',
          details: {
            weddings: existing._count.weddings,
            itinerary_items: existing._count.itinerary_items,
          },
        },
        { status: 400 }
      );
    }

    await prisma.location.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
