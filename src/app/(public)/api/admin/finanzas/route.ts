/**
 * GET /api/admin/finanzas
 * Returns all data needed for the Cuenta de Resultados (P&L) page:
 * - Wedding planned_guests + attending_count (confirmed)
 * - Providers with category price_type, budgeted_price, total_price, payments
 * - Gifts (ingresos)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) {
      return NextResponse.json({ error: 'No wedding assigned' }, { status: 403 });
    }

    const [wedding, providers, gifts, attendingCount, totalGuestCount] = await Promise.all([
      prisma.wedding.findUnique({
        where: { id: user.wedding_id },
        select: { planned_guests: true, planned_gift_per_person: true, couple_names: true },
      }),
      prisma.weddingProvider.findMany({
        where: { wedding_id: user.wedding_id },
        include: {
          category: { select: { id: true, name: true, price_type: true } },
          payments: { select: { amount: true } },
        },
      }),
      prisma.gift.findMany({
        where: {
          wedding_id: user.wedding_id,
          status: { in: ['RECEIVED', 'CONFIRMED'] },
        },
        select: { amount: true, status: true, family_id: true },
      }),
      prisma.familyMember.count({
        where: { family: { wedding_id: user.wedding_id }, attending: true },
      }),
      prisma.familyMember.count({
        where: { family: { wedding_id: user.wedding_id } },
      }),
    ]);

    return NextResponse.json({
      data: {
        planned_guests: wedding?.planned_guests ?? null,
        planned_gift_per_person: wedding?.planned_gift_per_person ? Number(wedding.planned_gift_per_person) : null,
        total_guests: totalGuestCount,
        attending_count: attendingCount,
        providers: providers.map((p: {
          id: string;
          category_id: string;
          budgeted_price: unknown;
          total_price: unknown;
          category: { name: string; price_type: string };
          payments: Array<{ amount: unknown }>;
        }) => ({
          id: p.id,
          category_id: p.category_id,
          category_name: p.category.name,
          price_type: p.category.price_type,
          budgeted_price: p.budgeted_price ? Number(p.budgeted_price) : null,
          total_price: p.total_price ? Number(p.total_price) : null,
          paid: p.payments.reduce((sum: number, pay: { amount: unknown }) => sum + Number(pay.amount), 0),
        })),
        gifts: gifts.map((g: { amount: unknown; status: string }) => ({
          amount: Number(g.amount),
          status: g.status,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching finanzas data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
