import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { contractRoomId } from '@/lib/collaboration/liveblocks';

const createContractSchema = z.object({
  title: z.string().min(1),
  contract_template_id: z.string().uuid().optional().nullable(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: quoteId } = await params;

    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, planner_id: user.planner_id },
      include: { customer: { select: { email: true } } },
    });
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Check if a DRAFT contract already exists for this quote (reuse if so)
    const existing = await prisma.contract.findFirst({
      where: { quote_id: quoteId, status: 'DRAFT' },
    });
    if (existing) return NextResponse.json({ data: existing });

    const body = await request.json();
    const data = createContractSchema.parse(body);

    // Load template content (and payment schedule items) if provided
    let content: object = { type: 'doc', content: [{ type: 'paragraph' }] };
    let templateScheduleItems: Array<{
      order: number;
      days_offset: number;
      reference_date: 'WEDDING_DATE' | 'SIGNING_DATE' | 'FIXED_DATE';
      fixed_date: Date | null;
      description: string;
      amount_type: 'FIXED' | 'PERCENTAGE';
      amount_value: Prisma.Decimal;
    }> = [];

    if (data.contract_template_id) {
      const template = await prisma.contractTemplate.findFirst({
        where: { id: data.contract_template_id, planner_id: user.planner_id },
        include: { payment_schedule_items: { orderBy: { order: 'asc' } } },
      });
      if (template) {
        content = template.content as object;
        templateScheduleItems = template.payment_schedule_items;
      }
    }

    const contract = await prisma.contract.create({
      data: {
        planner_id: user.planner_id,
        customer_id: quote.customer_id ?? null,
        quote_id: quoteId,
        contract_template_id: data.contract_template_id ?? null,
        title: data.title,
        content: content as Prisma.InputJsonValue,
        signer_email: quote.customer?.email ?? null,
        // Pre-fill wedding date from quote event_date if available
        payment_schedule_wedding_date: quote.event_date ?? null,
        // Copy schedule items from template
        ...(templateScheduleItems.length > 0 && {
          payment_schedule_items: {
            create: templateScheduleItems.map((item) => ({
              order: item.order,
              days_offset: item.days_offset,
              reference_date: item.reference_date,
              fixed_date: item.fixed_date,
              description: item.description,
              amount_type: item.amount_type,
              amount_value: item.amount_value,
            })),
          },
        }),
      },
    });

    // Set the Liveblocks room ID
    const roomId = contractRoomId(contract.id);
    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: { liveblocks_room_id: roomId },
    });

    return NextResponse.json({ data: updated }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
