/**
 * Guest Lookup API
 * POST /api/guest/lookup
 *
 * Looks up a guest family by their phone number or email address
 * within a specific wedding (identified by short_url_initials).
 *
 * Used by the public /w/[code] landing page to let guests find
 * their personalised invitation without needing the direct link.
 *
 * Returns the family's short_url_code so the client can redirect
 * to /inv/[initials]/[shortCode].
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { normalizePhoneNumber, processPhoneNumber } from '@/lib/phone-utils';

export async function POST(request: NextRequest) {
  let body: { initials?: string; contact?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { initials, contact } = body;

  if (!initials || typeof initials !== 'string' || !contact || typeof contact !== 'string') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const trimmedContact = contact.trim();
  if (!trimmedContact) {
    return NextResponse.json({ error: 'Contact is required' }, { status: 400 });
  }

  // Find wedding by initials (case-insensitive via toUpperCase normalisation)
  const wedding = await prisma.wedding.findFirst({
    where: {
      short_url_initials: initials.toUpperCase(),
      is_disabled: false,
    },
    select: {
      id: true,
      wedding_country: true,
    },
  });

  if (!wedding) {
    return NextResponse.json({ error: 'Wedding not found' }, { status: 404 });
  }

  const isEmail = trimmedContact.includes('@');

  let family: { short_url_code: string | null } | null = null;

  if (isEmail) {
    // ── Email lookup ──────────────────────────────────────────────────────
    family = await prisma.family.findFirst({
      where: {
        wedding_id: wedding.id,
        email: { equals: trimmedContact, mode: 'insensitive' },
      },
      select: { short_url_code: true },
    });
  } else {
    // ── Phone lookup ──────────────────────────────────────────────────────
    // Build a set of normalised variants to maximise match chances:
    //   • raw normalised input  (e.g. "612345678")
    //   • with wedding-country prefix (e.g. "+34612345678")
    const normalized = normalizePhoneNumber(trimmedContact);
    const withPrefix = processPhoneNumber(trimmedContact, wedding.wedding_country);

    const variants = [...new Set([normalized, withPrefix].filter(Boolean))] as string[];

    if (variants.length === 0) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Try phone field
    family = await prisma.family.findFirst({
      where: {
        wedding_id: wedding.id,
        OR: variants.map((phone) => ({ phone })),
      },
      select: { short_url_code: true },
    });

    // Fallback: try whatsapp_number field
    if (!family) {
      family = await prisma.family.findFirst({
        where: {
          wedding_id: wedding.id,
          OR: variants.map((p) => ({ whatsapp_number: p })),
        },
        select: { short_url_code: true },
      });
    }
  }

  if (!family?.short_url_code) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ shortCode: family.short_url_code });
}
