import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const itemSchema = z.object({
  order: z.number().int().min(0),
  days_offset: z.number().int().default(0),
  reference_date: z.enum(['WEDDING_DATE', 'SIGNING_DATE', 'FIXED_DATE']).default('WEDDING_DATE'),
  fixed_date: z.string().datetime().optional().nullable(),
  description: z.string().min(1),
  amount_type: z.enum(['FIXED', 'PERCENTAGE']).default('FIXED'),
  amount_value: z.number().min(0),
});

const putSchema = z.object({
  wedding_date: z.string().datetime().optional().nullable(),
  signing_date: z.string().datetime().optional().nullable(),
  items: z.array(itemSchema),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const contract = await prisma.contract.findFirst({
      where: { id, planner_id: user.planner_id },
      include: { payment_schedule_items: { orderBy: { order: 'asc' } } },
    });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      data: {
        wedding_date: contract.payment_schedule_wedding_date,
        signing_date: contract.payment_schedule_signing_date,
        items: contract.payment_schedule_items,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const contract = await prisma.contract.findFirst({
      where: { id, planner_id: user.planner_id },
    });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const { wedding_date, signing_date, items } = putSchema.parse(body);

    await prisma.$transaction([
      prisma.contract.update({
        where: { id },
        data: {
          payment_schedule_wedding_date: wedding_date ? new Date(wedding_date) : null,
          payment_schedule_signing_date: signing_date ? new Date(signing_date) : null,
        },
      }),
      prisma.contractPaymentScheduleItem.deleteMany({ where: { contract_id: id } }),
      ...items.map((item) =>
        prisma.contractPaymentScheduleItem.create({
          data: {
            contract_id: id,
            order: item.order,
            days_offset: item.days_offset,
            reference_date: item.reference_date,
            fixed_date: item.fixed_date ? new Date(item.fixed_date) : null,
            description: item.description,
            amount_type: item.amount_type,
            amount_value: item.amount_value,
          },
        }),
      ),
    ]);

    const updated = await prisma.contract.findFirst({
      where: { id },
      include: { payment_schedule_items: { orderBy: { order: 'asc' } } },
    });

    return NextResponse.json({
      data: {
        wedding_date: updated?.payment_schedule_wedding_date,
        signing_date: updated?.payment_schedule_signing_date,
        items: updated?.payment_schedule_items ?? [],
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
