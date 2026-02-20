/**
 * Guest RSVP API - Main Route
 * GET /api/guest/[token]
 *
 * Returns family RSVP page data including family members, wedding details, and theme.
 * Validates magic token and tracks link_opened event with channel attribution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRSVPPageData } from '@/lib/guests/rsvp';
import type { GetGuestRSVPPageResponse } from '@/types/api';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const params = await context.params;
  const token = params.token;
  const channel = request.nextUrl.searchParams.get('channel');
  const userAgent = request.headers.get('user-agent');

  const result = await getRSVPPageData(token, channel, false, userAgent);

  if (!result.success) {
    return NextResponse.json<GetGuestRSVPPageResponse>(
      {
        success: false,
        error: result.error,
      },
      { status: result.error?.code === 'TOKEN_EXPIRED' ? 410 : 404 }
    );
  }

  return NextResponse.json<GetGuestRSVPPageResponse>({
    success: true,
    data: result.data,
  });
}