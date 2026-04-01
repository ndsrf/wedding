import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { getCached, setCached, invalidateCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';

const createLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  url: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
  google_maps_url: z.string().url().optional().or(z.literal('')),
  address: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(_request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cacheKey = CACHE_KEYS.plannerLocations(user.planner_id);
    const cached = await getCached<unknown[]>(cacheKey);
    if (cached) {
      return NextResponse.json({ data: cached }, {
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'no-cache' },
      });
    }

    const rawLocations = await prisma.location.findMany({
      where: { planner_id: user.planner_id },
      orderBy: [{ name: 'asc' }],
      include: {
        _count: {
          select: {
            weddings: true,
            itinerary_items: true,
          },
        },
        weddings: {
          where: { deleted_at: null },
          select: { id: true, couple_names: true, wedding_date: true, status: true },
          orderBy: { wedding_date: 'asc' },
        },
        itinerary_items: {
          where: { wedding: { deleted_at: null } },
          select: {
            wedding: {
              select: { id: true, couple_names: true, wedding_date: true, status: true },
            },
          },
        },
      },
    });

    // Merge main-event weddings + itinerary weddings, deduplicated by id
    const locations = rawLocations.map(({ itinerary_items, weddings, ...rest }) => {
      const map = new Map(weddings.map((w) => [w.id, w]));
      for (const item of itinerary_items) {
        if (item.wedding && !map.has(item.wedding.id)) {
          map.set(item.wedding.id, item.wedding);
        }
      }
      const allWeddings = Array.from(map.values()).sort(
        (a, b) => new Date(a.wedding_date).getTime() - new Date(b.wedding_date).getTime()
      );
      return { ...rest, weddings: allWeddings };
    });

    await setCached(cacheKey, locations, CACHE_TTL.WEDDING_DETAILS);
    return NextResponse.json({ data: locations }, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'no-cache' },
    });
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
        url: validated.url || null,
        notes: validated.notes,
        google_maps_url: validated.google_maps_url || null,
        address: validated.address,
        tags: validated.tags ?? [],
      },
    });

    await invalidateCache(CACHE_KEYS.plannerLocations(user.planner_id));
    return NextResponse.json({ data: location });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating location:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
