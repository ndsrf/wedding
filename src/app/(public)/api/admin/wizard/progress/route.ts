/**
 * API endpoint to update wizard progress
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import type { APIResponse } from '@/types/api';

export async function PATCH(request: Request): Promise<NextResponse<APIResponse<void>>> {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'No wedding associated with this user',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { currentStep } = body;

    if (typeof currentStep !== 'number' || currentStep < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid current step',
        },
        { status: 400 }
      );
    }

    // Update wizard progress
    await prisma.wedding.update({
      where: { id: user.wedding_id },
      data: {
        wizard_current_step: currentStep,
        updated_at: new Date(),
        updated_by: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: undefined,
    });
  } catch (error) {
    console.error('Error updating wizard progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update wizard progress',
      },
      { status: 500 }
    );
  }
}
