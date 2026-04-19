/**
 * MCP — Add Reminder to Checklist
 * POST /api/admin/mcp/reminders
 * Auth: Bearer API key (wedding_admin role)
 * Body: { title: string, description?: string, dueDate?: string, dueDateRelative?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKeyAuth } from '@/lib/auth/api-key';
import { prisma } from '@/lib/db/prisma';
import { convertRelativeDateToAbsolute } from '@/lib/checklist/date-converter';
import type { RelativeDateFormat } from '@/lib/checklist/date-converter';

interface ReminderBody {
  title: string;
  description?: string;
  dueDate?: string;
  dueDateRelative?: string;
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireApiKeyAuth(request, 'wedding_admin');
    if (!ctx.wedding_id) {
      return NextResponse.json({ error: 'No wedding context' }, { status: 403 });
    }

    const { title, description, dueDate, dueDateRelative } = await request.json() as ReminderBody;
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    const wedding = await prisma.wedding.findUnique({
      where: { id: ctx.wedding_id },
      select: { wedding_date: true, default_language: true },
    });
    if (!wedding) return NextResponse.json({ error: 'Wedding not found' }, { status: 404 });

    const sectionNames: Record<string, string> = {
      EN: 'Reminders', ES: 'Recordatorios', DE: 'Erinnerungen', FR: 'Rappels', IT: 'Promemoria',
    };
    const localizedSectionName = sectionNames[wedding.default_language] || 'Reminders';

    let section = await prisma.checklistSection.findFirst({
      where: { wedding_id: ctx.wedding_id, name: localizedSectionName, template_id: null },
    });

    if (!section) {
      const lastSection = await prisma.checklistSection.findFirst({
        where: { wedding_id: ctx.wedding_id, template_id: null },
        orderBy: { order: 'desc' },
      });
      section = await prisma.checklistSection.create({
        data: { wedding_id: ctx.wedding_id, name: localizedSectionName, order: (lastSection?.order ?? 0) + 1 },
      });
    }

    let absoluteDate: Date | null = null;
    if (dueDate) {
      absoluteDate = new Date(dueDate);
    } else if (dueDateRelative && wedding.wedding_date) {
      try {
        absoluteDate = convertRelativeDateToAbsolute(dueDateRelative as RelativeDateFormat, wedding.wedding_date);
      } catch { /* ignore */ }
    }

    const lastTask = await prisma.checklistTask.findFirst({
      where: { wedding_id: ctx.wedding_id, section_id: section.id },
      orderBy: { order: 'desc' },
    });

    const task = await prisma.checklistTask.create({
      data: {
        wedding_id: ctx.wedding_id,
        section_id: section.id,
        title,
        description,
        due_date: absoluteDate,
        due_date_relative: dueDateRelative,
        order: (lastTask?.order ?? 0) + 1,
        assigned_to: 'COUPLE',
      },
    });

    return NextResponse.json({
      status: 'success',
      message: `Reminder "${title}" added to the "${localizedSectionName}" section.`,
      task: { id: task.id, title: task.title, dueDate: task.due_date?.toISOString(), dueDateRelative: task.due_date_relative },
    }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[MCP] reminders error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
