import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { prisma } from '@/lib/db/prisma';
import { getWeatherWidgetData } from '@/lib/astro-weather';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'No planner' }, { status: 403 });

    const { id: weddingId } = await params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;

    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: {
        wedding_date: true,
        location: true,
        main_event_location: {
          select: { name: true, google_maps_url: true, address: true },
        },
      },
    });

    if (!wedding?.wedding_date) {
      return NextResponse.json({ error: 'Wedding date not set' }, { status: 404 });
    }

    const loc = wedding.main_event_location;
    const locationInfo = loc
      ? { name: loc.name, googleMapsUrl: loc.google_maps_url, address: loc.address }
      : wedding.location
        ? { name: wedding.location }
        : null;

    if (!locationInfo) {
      return NextResponse.json({ error: 'No location configured' }, { status: 404 });
    }

    const data = await getWeatherWidgetData(locationInfo, wedding.wedding_date);
    if (!data) {
      return NextResponse.json({ error: 'Could not fetch weather data' }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const msg = (err as Error).message ?? '';
    if (msg.includes('Unauthorized') || msg.includes('Forbidden')) {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error('[schedule weather planner GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
