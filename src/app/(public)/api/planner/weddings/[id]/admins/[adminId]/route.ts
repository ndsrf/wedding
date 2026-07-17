/**
 * Planner - Wedding Admin Profile API
 *
 * GET  /api/planner/weddings/:id/admins/:adminId - Get admin profile + documents
 * PATCH /api/planner/weddings/:id/admins/:adminId - Update admin name/phone
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { WEDDING_CONTRACT_SELECT, resolveWeddingDocuments } from '@/lib/wedding-documents';

const updateAdminSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(50).optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; adminId: string }> }
) {
  try {
    const user = await requireRole('planner');
    const { id: weddingId, adminId } = await params;

    const accessError = await validatePlannerAccess(user.planner_id!, weddingId);
    if (accessError) return accessError;

    const [admin, wedding] = await Promise.all([
      prisma.weddingAdmin.findFirst({
        where: { id: adminId, wedding_id: weddingId },
        select: { id: true, name: true, email: true, phone: true },
      }),
      prisma.wedding.findUnique({
        where: { id: weddingId },
        select: {
          id: true,
          wedding_date: true,
          customer_id: true,
          planner_id: true,
          contract: { select: WEDDING_CONTRACT_SELECT },
        },
      }),
    ]);

    if (!admin) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, { status: 404 });
    }

    if (!wedding) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Wedding not found' } }, { status: 404 });
    }

    const [planner, { contract: contractData, quote: quoteData, invoices: invoiceList, paymentSchedule: scheduleList }] = await Promise.all([
      prisma.weddingPlanner.findUnique({
        where: { id: wedding.planner_id },
        select: { phone: true, bank_account: true, accepts_bizum: true, accepts_revolut: true },
      }),
      resolveWeddingDocuments(wedding),
    ]);

    const plannerPayment = {
      bank_account: planner?.bank_account ?? null,
      accepts_bizum: planner?.accepts_bizum ?? false,
      accepts_revolut: planner?.accepts_revolut ?? false,
      phone: planner?.phone ?? null,
    };

    return NextResponse.json({
      success: true,
      data: { admin, contract: contractData, quote: quoteData, invoices: invoiceList, paymentSchedule: scheduleList, plannerPayment },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (message.includes('FORBIDDEN')) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    console.error('Error fetching admin profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; adminId: string }> }
) {
  try {
    const user = await requireRole('planner');
    const { id: weddingId, adminId } = await params;

    const accessError = await validatePlannerAccess(user.planner_id!, weddingId);
    if (accessError) return accessError;

    const admin = await prisma.weddingAdmin.findFirst({
      where: { id: adminId, wedding_id: weddingId },
      select: { id: true },
    });

    if (!admin) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateAdminSchema.parse(body);

    const updated = await prisma.weddingAdmin.update({
      where: { id: adminId },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.phone !== undefined && { phone: validated.phone }),
      },
      select: { id: true, name: true, email: true, phone: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '';
    if (message.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (message.includes('FORBIDDEN')) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    console.error('Error updating admin profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
