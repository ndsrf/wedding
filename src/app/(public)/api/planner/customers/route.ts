import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  id_number: z.string().optional().nullable(),
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
      // Full customer list with related data for clients management page
      const customers = await prisma.customer.findMany({
        where: {
          planner_id: user.planner_id,
          ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
        },
        orderBy: { name: 'asc' },
        include: {
          quotes: {
            select: { id: true, couple_names: true, status: true, total: true, currency: true, created_at: true },
            ...(quoteStatus ? { where: { status: quoteStatus as never } } : {}),
            orderBy: { created_at: 'desc' },
          },
          contracts: {
            select: { id: true, title: true, status: true, created_at: true },
            ...(contractStatus ? { where: { status: contractStatus as never } } : {}),
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
            ...(invoiceStatus ? { where: { status: invoiceStatus as never } } : {}),
            orderBy: { created_at: 'desc' },
          },
          weddings: {
            select: { id: true, couple_names: true, wedding_date: true, status: true },
            orderBy: { wedding_date: 'desc' },
          },
        },
      });

      // If status filters are active, only return customers that have matching items
      let filtered = customers;
      if (quoteStatus) {
        filtered = filtered.filter((c) => c.quotes.length > 0);
      }
      if (contractStatus) {
        filtered = filtered.filter((c) => c.contracts.length > 0);
      }
      if (invoiceStatus) {
        filtered = filtered.filter((c) => c.invoices.length > 0);
      }

      return NextResponse.json({ data: filtered });
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
        email: data.email ?? null,
        phone: data.phone ?? null,
        id_number: data.id_number ?? null,
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
