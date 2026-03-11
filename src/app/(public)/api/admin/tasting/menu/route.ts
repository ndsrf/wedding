/**
 * Wedding Menu Selection API
 *
 * PUT /api/admin/tasting/menu - Update wedding menu selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { updateMenuSelectionHandler } from '@/lib/menu/api-handlers';

export async function PUT(req: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) {
      return NextResponse.json(
        { success: false, error: { message: 'No wedding associated' } },
        { status: 400 },
      );
    }
    const body = await req.json();
    return updateMenuSelectionHandler(user.wedding_id, body);
  } catch (error) {
    console.error('Error updating wedding menu:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to update menu' } },
      { status: 500 },
    );
  }
}
