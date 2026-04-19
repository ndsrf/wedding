/**
 * MCP — Wedding Providers
 * GET /api/admin/mcp/providers
 * Auth: Bearer API key (wedding_admin role)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKeyAuth } from '@/lib/auth/api-key';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireApiKeyAuth(request, 'wedding_admin');
    if (!ctx.wedding_id) {
      return NextResponse.json({ error: 'No wedding context' }, { status: 403 });
    }

    const weddingProviders = await prisma.weddingProvider.findMany({
      where: { wedding_id: ctx.wedding_id },
      include: {
        category: { select: { name: true } },
        provider: { select: { name: true, phone: true, email: true } },
        payments: { select: { amount: true, date: true } },
      },
      orderBy: { created_at: 'asc' },
    });

    return NextResponse.json(weddingProviders.map((wp) => {
      const totalPaid = wp.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const agreedAmount = wp.total_price ? Number(wp.total_price) : null;
      return {
        providerName: wp.provider?.name || wp.name || 'Unknown',
        category: wp.category.name,
        agreedAmount,
        totalPaid,
        outstanding: agreedAmount !== null ? agreedAmount - totalPaid : null,
        phone: wp.provider?.phone || wp.phone,
        email: wp.provider?.email || wp.email,
      };
    }));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[MCP] providers error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
