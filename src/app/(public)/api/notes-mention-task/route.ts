import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAnyRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';

const SECTION_NAMES: Record<string, string> = {
  EN: 'Reminders',
  ES: 'Recordatorios',
  DE: 'Erinnerungen',
  FR: 'Rappels',
  IT: 'Promemoria',
};

// Task title and context label in each supported language
const TASK_TITLE: Record<string, string> = {
  EN: 'Mention in the notes block: @{name}',
  ES: 'Mención en el bloque de notas: @{name}',
  DE: 'Erwähnung im Notizblock: @{name}',
  FR: 'Mention dans le bloc de notes : @{name}',
  IT: 'Menzione nel blocco note: @{name}',
};

const CONTEXT_LABEL: Record<string, string> = {
  EN: 'Notes block context:',
  ES: 'Contexto del bloque de notas:',
  DE: 'Notizblock-Kontext:',
  FR: 'Contexte du bloc de notes :',
  IT: 'Contesto del blocco note:',
};

function localizedTitle(lang: string, name: string): string {
  const template = TASK_TITLE[lang] ?? TASK_TITLE.EN;
  return template.replace('{name}', name);
}

function localizedDescription(lang: string, contextText: string): string | null {
  if (!contextText.trim()) return null;
  const label = CONTEXT_LABEL[lang] ?? CONTEXT_LABEL.EN;
  return `${label}\n\n"${contextText.trim()}"`;
}

const bodySchema = z.object({
  wedding_id: z.string().min(1),
  mentioned_name: z.string().max(200),
  context_text: z.string().max(2000).default(''),
  assigned_to: z.enum(['WEDDING_PLANNER', 'COUPLE', 'OTHER']),
  due_date: z.string().datetime().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAnyRole(['planner', 'wedding_admin']);

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { wedding_id, mentioned_name, context_text, assigned_to, due_date } = parsed.data;

    // Determine the user's preferred language (uppercased to match Prisma enum keys)
    const userLang = (user.preferred_language ?? 'EN').toUpperCase();

    // Verify access and fetch the wedding's default language (for the section name)
    const wedding = await (async () => {
      if (user.role === 'wedding_admin') {
        return prisma.wedding.findFirst({
          where: { id: wedding_id, wedding_admins: { some: { id: user.id } } },
          select: { id: true, default_language: true },
        });
      }
      // planner (including sub-accounts): use planner_id for ownership check
      return prisma.wedding.findFirst({
        where: { id: wedding_id, planner_id: user.planner_id! },
        select: { id: true, default_language: true },
      });
    })();

    if (!wedding) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Build task title and description in the user's language
    const title = localizedTitle(userLang, mentioned_name);
    const description = localizedDescription(userLang, context_text);

    // Find or create the localized Reminders section (uses wedding language to stay
    // consistent with the section NupciBot creates)
    const sectionLang = (wedding.default_language ?? 'EN').toString().toUpperCase();
    const sectionName = SECTION_NAMES[sectionLang] ?? SECTION_NAMES.EN;

    let section = await prisma.checklistSection.findFirst({
      where: { wedding_id, name: sectionName, template_id: null },
    });

    if (!section) {
      const lastSection = await prisma.checklistSection.findFirst({
        where: { wedding_id, template_id: null },
        orderBy: { order: 'desc' },
      });
      section = await prisma.checklistSection.create({
        data: {
          wedding_id,
          name: sectionName,
          order: (lastSection?.order ?? 0) + 1,
        },
      });
    }

    // Get max task order in this section
    const lastTask = await prisma.checklistTask.findFirst({
      where: { wedding_id, section_id: section.id },
      orderBy: { order: 'desc' },
    });

    const task = await prisma.checklistTask.create({
      data: {
        wedding_id,
        section_id: section.id,
        title,
        description,
        assigned_to,
        due_date: due_date ? new Date(due_date) : null,
        status: 'PENDING',
        order: (lastTask?.order ?? 0) + 1,
      },
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('notes-mention-task POST:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
