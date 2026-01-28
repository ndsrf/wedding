import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

const createPaymentSchema = z.object({
  wedding_provider_id: z.string().uuid(),
  amount: z.number(),
  date: z.string().datetime().optional(), // ISO string
  method: z.enum(['CASH', 'BANK_TRANSFER', 'PAYPAL', 'BIZUM', 'REVOLUT', 'OTHER']),
  notes: z.string().optional(),
  document_url: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: weddingId } = await params;
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

    const body = await request.json();
    const validated = createPaymentSchema.parse(body);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payment = await (prisma.payment.create as any)({
      data: {
        wedding_provider_id: validated.wedding_provider_id,
        amount: validated.amount,
        date: validated.date ? new Date(validated.date) : new Date(),
        method: validated.method,
        notes: validated.notes,
        document_url: validated.document_url,
      },
    });

    return NextResponse.json({ data: payment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}