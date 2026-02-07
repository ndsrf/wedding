/**
 * API Route: Seed Database
 * POST /api/admin/seed
 *
 * Triggers database seeding to add/update system themes
 */

import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/db/seed';

export async function POST() {
  try {
    console.log('[API] Starting database seed...');
    await seedDatabase();

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully'
    });
  } catch (error) {
    console.error('[API] Seed failed:', error);

    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to seed database'
      }
    }, { status: 500 });
  }
}
