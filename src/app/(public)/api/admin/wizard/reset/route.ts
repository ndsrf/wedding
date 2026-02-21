/**
 * API endpoint to reset wizard to allow restarting from the beginning
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import type { APIResponse } from '@/types/api';

export async function POST(_request: Request): Promise<NextResponse<APIResponse<void>>> {
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

    // Reset wizard flags to allow restarting from the beginning
    await prisma.wedding.update({
      where: { id: user.wedding_id },
      data: {
        wizard_completed: false,
        wizard_skipped: false,
        wizard_current_step: 0,
        wizard_completed_at: null,
        updated_at: new Date(),
        updated_by: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: undefined,
    });
  } catch (error) {
    console.error('Error resetting wizard:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'WIZARD_RESET_FAILED',
          message: error instanceof Error ? error.message : 'Failed to reset wizard',
        },
      },
      { status: 500 }
    );
  }
}
