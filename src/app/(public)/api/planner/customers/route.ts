import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const createCustomerSchema = z.object({
  name: z.string().min(1),
  couple_names: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  id_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const full = searchParams.get('full') === 'true';
    const quoteStatus = searchParams.get('quote_status') ?? '';
    const contractStatus = searchParams.get('contract_status') ?? '';
    const invoiceStatus = searchParams.get('invoice_status') ?? '';

    if (full) {
      // Full customer list with related data for clients management page.
      // Status filters are applied in the database WHERE clause so only matching
      // customers are fetched, avoiding transferring and filtering in-process.
      const customers = await prisma.customer.findMany({
        where: {
          planner_id: user.planner_id,
          ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
          ...(quoteStatus ? { quotes: { some: { status: quoteStatus as never } } } : {}),
          ...(contractStatus ? { contracts: { some: { status: contractStatus as never } } } : {}),
          ...(invoiceStatus ? { invoices: { some: { status: invoiceStatus as never } } } : {}),
        },
        orderBy: { name: 'asc' },
        include: {
          quotes: {
            select: { id: true, couple_names: true, status: true, total: true, currency: true, created_at: true },
            orderBy: { created_at: 'desc' },
          },
          contracts: {
            select: { id: true, title: true, status: true, created_at: true },
            orderBy: { created_at: 'desc' },
          },
          invoices: {
            select: {
              id: true,
              invoice_number: true,
              status: true,
              total: true,
              amount_paid: true,
              currency: true,
              due_date: true,
              created_at: true,
            },
            orderBy: { created_at: 'desc' },
          },
          weddings: {
            select: { id: true, couple_names: true, wedding_date: true, status: true },
            orderBy: { wedding_date: 'desc' },
          },
        },
      });

      return NextResponse.json({ data: customers });
    }

    // Simple search (used for dropdown autocomplete in forms)
    const customers = await prisma.customer.findMany({
      where: {
        planner_id: user.planner_id,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      take: 20,
    });

    return NextResponse.json({ data: customers });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const data = createCustomerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: {
        planner_id: user.planner_id,
        name: data.name,
        couple_names: data.couple_names ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        id_number: data.id_number ?? null,
        address: data.address ?? null,
        notes: data.notes ?? null,
      },
    });

    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
