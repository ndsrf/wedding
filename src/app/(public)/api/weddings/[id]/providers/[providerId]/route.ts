import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { deleteFile } from '@/lib/storage';

const updateWeddingProviderSchema = z.object({
  name: z.string().optional().nullable().or(z.literal('')),
  contact_name: z.string().optional().nullable().or(z.literal('')),
  email: z.string().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  website: z.string().optional().nullable().or(z.literal('')),
  social_media: z.string().optional().nullable().or(z.literal('')),
  total_price: z.number().optional().nullable(),
  contract_url: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable().or(z.literal('')),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; providerId: string }> } // providerId here is the WeddingProvider ID
) {
  try {
    const { id: weddingId, providerId } = await params;
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
    const validated = updateWeddingProviderSchema.parse(body);

    const weddingProvider = await prisma.weddingProvider.update({
      where: { id: providerId },
      data: {
        name: validated.name || null,
        contact_name: validated.contact_name || null,
        email: validated.email || null,
        phone: validated.phone || null,
        website: validated.website || null,
        social_media: validated.social_media || null,
        total_price: validated.total_price,
        contract_url: validated.contract_url,
        notes: validated.notes,
      },
      include: {
        provider: { include: { category: true } },
        payments: true
      }
    });

    return NextResponse.json({ data: weddingProvider });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating wedding provider:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; providerId: string }> }
) {
  try {
    const { id: weddingId, providerId } = await params;
    const user = await requireAuth();

    // Check access (Allow delete?)
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

    // Fetch all payments for this provider to clean up associated documents
    const payments = await prisma.payment.findMany({
      where: { wedding_provider_id: providerId },
      select: { id: true, document_url: true },
    });

    // Fetch the provider to get its contract_url
    const provider = await prisma.weddingProvider.findUnique({
      where: { id: providerId },
      select: { contract_url: true },
    });

    // Delete the provider (cascades to delete payments)
    await prisma.weddingProvider.delete({
      where: { id: providerId },
    });

    // Delete associated document files after provider is deleted
    // Delete provider's contract document
    if (provider?.contract_url) {
      try {
        await deleteFile(provider.contract_url);
      } catch (error) {
        console.error(`Failed to delete contract file for provider ${providerId}:`, error);
        // Continue - don't fail the request if file deletion fails
      }
    }

    // Delete payment documents
    for (const payment of payments) {
      if (payment.document_url) {
        try {
          await deleteFile(payment.document_url);
        } catch (error) {
          console.error(`Failed to delete document file for payment ${payment.id}:`, error);
          // Continue - don't fail the request if file deletion fails
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting wedding provider:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}