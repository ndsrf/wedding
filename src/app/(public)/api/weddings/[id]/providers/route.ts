import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

// POST schema: Assign a category slot (with optional provider)
const assignProviderSchema = z.object({
  category_id: z.string().uuid(),
  provider_id: z.string().uuid().optional().nullable(),
  name: z.string().optional(),
  contact_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  social_media: z.string().optional(),
  total_price: z.number().optional(),
  contract_url: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: weddingId } = await params;
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

    const weddingProviders = await prisma.weddingProvider.findMany({
      where: { wedding_id: weddingId },
      include: {
        category: true,
        provider: true,
        payments: true
      },
    });

    return NextResponse.json({ data: weddingProviders });
  } catch (error) {
    console.error('Error fetching wedding providers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: weddingId } = await params;
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
    const validated = assignProviderSchema.parse(body);

    // If provider_id is given, fetch provider details to copy
    let providerData = {
      name: validated.name,
      contact_name: validated.contact_name,
      email: validated.email,
      phone: validated.phone,
      website: validated.website,
      social_media: validated.social_media,
    };

    if (validated.provider_id) {
      const provider = await prisma.provider.findUnique({
        where: { id: validated.provider_id },
      });
      if (provider) {
        // Copy provider details if not explicitly provided
        providerData = {
          name: validated.name ?? provider.name,
          contact_name: validated.contact_name ?? provider.contact_name ?? undefined,
          email: validated.email ?? provider.email ?? undefined,
          phone: validated.phone ?? provider.phone ?? undefined,
          website: validated.website ?? provider.website ?? undefined,
          social_media: validated.social_media ?? provider.social_media ?? undefined,
        };
      }
    }

    const weddingProvider = await prisma.weddingProvider.create({
      data: {
        wedding_id: weddingId,
        category_id: validated.category_id,
        provider_id: validated.provider_id,
        name: providerData.name,
        contact_name: providerData.contact_name,
        email: providerData.email,
        phone: providerData.phone,
        website: providerData.website,
        social_media: providerData.social_media,
        total_price: validated.total_price,
        contract_url: validated.contract_url,
        notes: validated.notes,
      },
      include: {
        category: true,
        provider: true,
        payments: true
      },
    });

    return NextResponse.json({ data: weddingProvider });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    // Handle unique constraint violation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: 'This category/provider is already assigned to this wedding' }, { status: 409 });
    }
    console.error('Error assigning provider:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
