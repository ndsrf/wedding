/**
 * Guest Lookup API
 * POST /api/guest/lookup
 *
 * Looks up a guest family by their phone number or email address
 * within a specific wedding (identified by short_url_initials).
 *
 * Phone numbers are normalised and country-prefixed using the same
 * processPhoneNumber() helper used throughout the rest of the platform,
 * so a bare local number (e.g. "612345678") is automatically expanded
 * to the full international form (e.g. "+34612345678") using the
 * wedding's configured country.
 *
 * Returns the family's short_url_code so the client can redirect
 * to /inv/[initials]/[shortCode].
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { processPhoneNumber } from '@/lib/phone-utils';

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

  // Find wedding by initials (normalised to upper-case)
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
    // ── Email lookup (case-insensitive) ───────────────────────────────────
    family = await prisma.family.findFirst({
      where: {
        wedding_id: wedding.id,
        email: { equals: trimmedContact, mode: 'insensitive' },
      },
      select: { short_url_code: true },
    });
  } else {
    // ── Phone lookup ──────────────────────────────────────────────────────
    // processPhoneNumber mirrors the logic used when saving guest records:
    //   1. normalise (strip spaces/dashes, keep leading +)
    //   2. add wedding-country prefix when no international prefix present
    //      e.g. "612345678" + "ES" → "+34612345678"
    const processedPhone = processPhoneNumber(trimmedContact, wedding.wedding_country);

    if (!processedPhone) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Search phone field first, then whatsapp_number as fallback
    family = await prisma.family.findFirst({
      where: { wedding_id: wedding.id, phone: processedPhone },
      select: { short_url_code: true },
    });

    if (!family) {
      family = await prisma.family.findFirst({
        where: { wedding_id: wedding.id, whatsapp_number: processedPhone },
        select: { short_url_code: true },
      });
    }
  }

  if (!family?.short_url_code) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ shortCode: family.short_url_code });
}
