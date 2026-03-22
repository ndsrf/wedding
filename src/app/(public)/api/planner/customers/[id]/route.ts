import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Verify the customer belongs to this planner
    const customer = await prisma.customer.findFirst({
      where: { id, planner_id: user.planner_id },
      include: {
        _count: {
          select: {
            weddings: true,
            quotes: true,
            contracts: true,
            invoices: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const total =
      customer._count.weddings +
      customer._count.quotes +
      customer._count.contracts +
      customer._count.invoices;

    if (total > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with linked records' },
        { status: 409 }
      );
    }

    await prisma.customer.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
