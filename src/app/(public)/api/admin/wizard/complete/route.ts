/**
 * API endpoint to mark wizard as completed or skipped
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import type { APIResponse } from '@/types/api';

export async function POST(request: Request): Promise<NextResponse<APIResponse<void>>> {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_WEDDING',
            message: 'No wedding associated with this user',
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { skipped } = body;

    // Mark wizard as completed or skipped
    await prisma.wedding.update({
      where: { id: user.wedding_id },
      data: {
        wizard_completed: true,
        wizard_skipped: skipped || false,
        wizard_completed_at: new Date(),
        updated_at: new Date(),
        updated_by: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: undefined,
    });
  } catch (error) {
    console.error('Error completing wizard:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'WIZARD_COMPLETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to complete wizard',
        },
      },
      { status: 500 }
    );
  }
}
