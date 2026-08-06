/**
 * PATCH /api/auth/preferred-language
 *
 * Persists the current user's language choice (made via the header
 * LanguageSwitcher) to their account record, so backend processes that
 * need to know "this person's language" — e.g. the nightly RSVP summary
 * email's subject, which is sent to the wedding planner in their own
 * language — see the language the user actually browses the app in,
 * instead of whatever was set once at account creation and never updated
 * since. The switcher itself only sets a NEXT_LOCALE cookie for the UI;
 * this keeps the DB record in sync with that choice.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { Language } from '@prisma/client';

const bodySchema = z.object({
  language: z.nativeEnum(Language),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }
    const { language } = parsed.data;

    switch (user.role) {
      case 'planner':
        if (user.planner_id && user.id === user.planner_id) {
          // Primary planner account — this is the wedding's official
          // "planner language", used e.g. by alert email subjects.
          await prisma.weddingPlanner.update({
            where: { id: user.id },
            data: { preferred_language: language },
          });
        } else {
          // Sub-account staff login — only their own display language,
          // not the parent company's.
          await prisma.plannerSubAccount.update({
            where: { id: user.id },
            data: { preferred_language: language },
          });
        }
        break;
      case 'wedding_admin':
        await prisma.weddingAdmin.update({
          where: { id: user.id },
          data: { preferred_language: language },
        });
        break;
      case 'master_admin':
        await prisma.masterAdmin.update({
          where: { id: user.id },
          data: { preferred_language: language },
        });
        break;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : '';
    if (message.startsWith('UNAUTHORIZED')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('[preferred-language PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
