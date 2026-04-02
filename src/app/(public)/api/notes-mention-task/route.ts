import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAnyRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import enMessages from '@/messages/en/common.json';
import esMessages from '@/messages/es/common.json';
import frMessages from '@/messages/fr/common.json';
import itMessages from '@/messages/it/common.json';
import deMessages from '@/messages/de/common.json';

// Section names that NupciBot uses — must match exactly so tasks land in the same section
const SECTION_NAMES: Record<string, string> = {
  EN: 'Reminders',
  ES: 'Recordatorios',
  DE: 'Erinnerungen',
  FR: 'Rappels',
  IT: 'Promemoria',
};

interface NoteMessages {
  mentionTaskTitle: string;
  mentionTaskContextLabel: string;
}

// Each import may have minor structural differences across languages, so we
// cast to the narrow interface we actually need
const MESSAGES: Record<string, NoteMessages> = {
  en: enMessages.notes as NoteMessages,
  es: esMessages.notes as NoteMessages,
  fr: frMessages.notes as NoteMessages,
  it: itMessages.notes as NoteMessages,
  de: deMessages.notes as NoteMessages,
};

function getMessages(lang: string): NoteMessages {
  return MESSAGES[lang.toLowerCase()] ?? MESSAGES.en;
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

    // Verify access and fetch the wedding's default language
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

    // Build title and description in the user's preferred language using the same
    // strings as the UI translation files — single source of truth
    const m = getMessages(user.preferred_language ?? 'EN');
    const title = m.mentionTaskTitle.replace('{name}', mentioned_name);
    const description = context_text.trim()
      ? `${m.mentionTaskContextLabel}\n\n"${context_text.trim()}"`
      : null;

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
