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
    });
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Check if contract already exists
    const existing = await prisma.contract.findUnique({ where: { quote_id: quoteId } });
    if (existing) return NextResponse.json({ data: existing });

    const body = await request.json();
    const data = createContractSchema.parse(body);

    // Load template content if provided
    let content: object = { type: 'doc', content: [{ type: 'paragraph' }] };
    if (data.contract_template_id) {
      const template = await prisma.contractTemplate.findFirst({
        where: { id: data.contract_template_id, planner_id: user.planner_id },
      });
      if (template) content = template.content as object;
    }

    const contract = await prisma.contract.create({
      data: {
        planner_id: user.planner_id,
        quote_id: quoteId,
        contract_template_id: data.contract_template_id ?? null,
        title: data.title,
        content: content as Prisma.InputJsonValue,
        signer_email: quote.client_email ?? null,
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
