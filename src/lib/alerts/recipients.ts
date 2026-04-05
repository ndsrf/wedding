/**
 * Alert System — recipient resolution
 *
 * Resolves who should receive an alert given a rule + context.
 * Returns a flat list of ResolvedRecipient objects, one per person
 * (duplicates across multiple rules are de-duped by the trigger layer).
 */

import { prisma } from '@/lib/db/prisma';
import type { AlertRule } from '@prisma/client';
import type { AlertContext, ResolvedRecipient } from './types';

export async function resolveRecipients(
  rule: AlertRule,
  context: AlertContext,
): Promise<ResolvedRecipient[]> {
  const recipients: ResolvedRecipient[] = [];

  // ── 1. Master admins ────────────────────────────────────────────────────────
  if (rule.notify_master_admin) {
    const masters = await prisma.masterAdmin.findMany({
      select: { id: true, name: true, email: true, preferred_language: true },
    });
    for (const m of masters) {
      recipients.push({
        type: 'MASTER_ADMIN',
        id: m.id,
        name: m.name,
        email: m.email,
        language: m.preferred_language,
      });
    }
  }

  // ── 2. Wedding planner ──────────────────────────────────────────────────────
  if (rule.notify_planner) {
    const plannerId = rule.planner_id ?? context.planner_id;
    if (plannerId) {
      const planner = await prisma.weddingPlanner.findUnique({
        where: { id: plannerId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          whatsapp: true,
          preferred_language: true,
        },
      });
      if (planner) {
        recipients.push({
          type: 'WEDDING_PLANNER',
          id: planner.id,
          name: planner.name,
          email: planner.email,
          phone: planner.phone ?? undefined,
          whatsapp: planner.whatsapp ?? undefined,
          language: planner.preferred_language,
        });
      }
    } else if (context.wedding_id) {
      // Resolve planner from wedding
      const wedding = await prisma.wedding.findUnique({
        where: { id: context.wedding_id },
        select: {
          planner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              whatsapp: true,
              preferred_language: true,
            },
          },
        },
      });
      const planner = wedding?.planner;
      if (planner) {
        recipients.push({
          type: 'WEDDING_PLANNER',
          id: planner.id,
          name: planner.name,
          email: planner.email,
          phone: planner.phone ?? undefined,
          whatsapp: planner.whatsapp ?? undefined,
          language: planner.preferred_language,
        });
      }
    }
  }

  // ── 3. The couple (WeddingAdmins) ───────────────────────────────────────────
  if (rule.notify_couple && context.wedding_id) {
    const admins = await prisma.weddingAdmin.findMany({
      where: { wedding_id: context.wedding_id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        preferred_language: true,
      },
    });
    for (const admin of admins) {
      recipients.push({
        type: 'COUPLE',
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone ?? undefined,
        language: admin.preferred_language,
      });
    }
  }

  // ── 4. Specific guests (Family IDs) ────────────────────────────────────────
  if (rule.notify_guest_ids.length > 0) {
    const families = await prisma.family.findMany({
      where: { id: { in: rule.notify_guest_ids } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsapp_number: true,
        preferred_language: true,
      },
    });
    for (const f of families) {
      recipients.push({
        type: 'GUEST',
        id: f.id,
        name: f.name,
        email: f.email ?? undefined,
        phone: f.phone ?? undefined,
        whatsapp: f.whatsapp_number ?? undefined,
        language: f.preferred_language,
      });
    }
  }

  return recipients;
}
