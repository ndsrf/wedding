import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { unlink } from 'fs/promises';
import path from 'path';

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

    // Fetch payment to get document_url before deletion
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Delete from database
    await prisma.payment.delete({
      where: { id: paymentId },
    });

    // Delete associated file if exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentWithDoc = payment as any;
    if (paymentWithDoc.document_url) {
      try {
        const filePath = path.join(process.cwd(), 'public', paymentWithDoc.document_url);
        await unlink(filePath);
      } catch (error) {
        console.error('Failed to delete document file:', error);
        // Continue - don't fail the request if file deletion fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}