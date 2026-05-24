import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { getWeatherWidgetData } from '@/lib/astro-weather';

export async function GET() {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) {
      return NextResponse.json({ error: 'No wedding assigned' }, { status: 400 });
    }

    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
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
    console.error('[schedule weather admin GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
