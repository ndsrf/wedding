import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma, Language } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const createSchema = z.object({
  name: z.string().min(1).max(120),
  content: z.record(z.string(), z.unknown()),
  is_default: z.boolean().optional(),
  language: z.nativeEnum(Language).optional(),
});

export async function GET(_request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const templates = await prisma.contractTemplate.findMany({
      where: { planner_id: user.planner_id },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ data: templates });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const data = createSchema.parse(body);

    // If no language provided, default to the planner's preferred_language
    let language: Language = Language.ES;
    if (data.language) {
      language = data.language;
    } else {
      const planner = await prisma.weddingPlanner.findUnique({
        where: { id: user.planner_id },
        select: { preferred_language: true },
      });
      if (planner?.preferred_language) {
        language = planner.preferred_language;
      }
    }

    if (data.is_default) {
      // Unset current default
      await prisma.contractTemplate.updateMany({
        where: { planner_id: user.planner_id, is_default: true },
        data: { is_default: false },
      });
    }

    const template = await prisma.contractTemplate.create({
      data: {
        planner_id: user.planner_id,
        name: data.name,
        language,
        content: data.content as Prisma.InputJsonValue,
        is_default: data.is_default ?? false,
      },
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
