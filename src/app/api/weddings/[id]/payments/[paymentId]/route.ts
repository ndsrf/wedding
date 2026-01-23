import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const { id: weddingId, paymentId } = await params;
    const user = await requireAuth();

    // Check access
    if (user.role === 'planner' && user.planner_id) {
       const wedding = await prisma.wedding.findFirst({
        where: { id: weddingId, planner_id: user.planner_id },
      });
      if (!wedding) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    } else if (user.role === 'wedding_admin' && user.wedding_id) {
       if (user.wedding_id !== weddingId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.payment.delete({
      where: { id: paymentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}