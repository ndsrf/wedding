/**
 * Shared PDF generation handlers for tasting reports and menu PDFs.
 * Used by both admin and planner routes.
 */

import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { prisma } from '@/lib/db/prisma';
import { toAbsoluteUrl } from '@/lib/images/processor';
import { TastingReportPDF, type TastingReportLabels } from '@/lib/pdf/tasting-report-pdf';
import { TastingMenuPDF } from '@/lib/pdf/tasting-menu-pdf';

// ─── Sanitization ─────────────────────────────────────────────────────────────

/**
 * Strip control characters (except \n and \t) and null bytes that cause
 * react-pdf / PDF spec violations. Trims and caps length.
 */
function sanitize(s: string | null | undefined, maxLen = 500): string | null {
  if (!s) return null;
  const cleaned = s
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars
    .replace(/\uFFFD/g, '')                              // replacement char
    .trim();
  return cleaned.slice(0, maxLen) || null;
}

// ─── i18n labels ─────────────────────────────────────────────────────────────

const LABELS: Record<string, TastingReportLabels> = {
  ES: {
    generatedOn: 'Informe generado el',
    ratings: 'Valoraciones',
    rating: 'valoración',
    ratingsPlural: 'valoraciones',
    footer: 'Informe de Degustación',
    participants: 'Participantes',
    weddingDate: 'Fecha de boda',
    tastingDate: 'Fecha de degustación',
  },
  EN: {
    generatedOn: 'Report generated on',
    ratings: 'Ratings',
    rating: 'rating',
    ratingsPlural: 'ratings',
    footer: 'Tasting Report',
    participants: 'Participants',
    weddingDate: 'Wedding date',
    tastingDate: 'Tasting date',
  },
  FR: {
    generatedOn: 'Rapport généré le',
    ratings: 'Évaluations',
    rating: 'évaluation',
    ratingsPlural: 'évaluations',
    footer: 'Rapport de Dégustation',
    participants: 'Participants',
    weddingDate: 'Date du mariage',
    tastingDate: 'Date de dégustation',
  },
  IT: {
    generatedOn: 'Report generato il',
    ratings: 'Valutazioni',
    rating: 'valutazione',
    ratingsPlural: 'valutazioni',
    footer: 'Report Degustazione',
    participants: 'Partecipanti',
    weddingDate: 'Data del matrimonio',
    tastingDate: 'Data degustazione',
  },
  DE: {
    generatedOn: 'Bericht erstellt am',
    ratings: 'Bewertungen',
    rating: 'Bewertung',
    ratingsPlural: 'Bewertungen',
    footer: 'Degustationsbericht',
    participants: 'Teilnehmer',
    weddingDate: 'Hochzeitsdatum',
    tastingDate: 'Degustationsdatum',
  },
};

function getLabels(language: string): TastingReportLabels {
  return LABELS[language] ?? LABELS.ES;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function getWeddingContext(weddingId: string) {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: {
      couple_names: true,
      wedding_date: true,
      default_language: true,
      planner: { select: { name: true, logo_url: true } },
    },
  });
  return {
    planner: wedding?.planner ?? null,
    language: (wedding?.default_language as string) ?? 'ES',
    coupleNames: wedding?.couple_names ?? null,
    weddingDate: wedding?.wedding_date ?? null,
  };
}

function buildPdfResponse(buffer: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

// ─── Tasting Report ──────────────────────────────────────────────────────────

export async function generateTastingReportHandler(weddingId: string) {
  const [menuData, weddingCtx] = await Promise.all([
    prisma.tastingMenu.findUnique({
      where: { wedding_id: weddingId },
      select: {
        id: true,
        title: true,
        description: true,
        tasting_date: true,
        participants: {
          select: { name: true },
          orderBy: { name: 'asc' },
        },
        sections: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            name: true,
            order: true,
            dishes: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                name: true,
                description: true,
                image_url: true,
                order: true,
                scores: {
                  select: {
                    score: true,
                    notes: true,
                    participant: { select: { name: true } },
                  },
                  orderBy: { created_at: 'asc' },
                },
              },
            },
          },
        },
      },
    }),
    getWeddingContext(weddingId),
  ]);

  if (!menuData) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'No tasting menu found' } },
      { status: 404 },
    );
  }

  const { planner, language, coupleNames, weddingDate } = weddingCtx;

  const sections = menuData.sections.map((section) => ({
    id: section.id,
    name: sanitize(section.name) ?? '',
    dishes: section.dishes.map((dish) => {
      const scores = dish.scores ?? [];
      const avg =
        scores.length > 0
          ? Math.round((scores.reduce((sum, s) => sum + s.score, 0) / scores.length) * 10) / 10
          : null;
      return {
        id: dish.id,
        name: sanitize(dish.name) ?? '',
        description: sanitize(dish.description, 300),
        // Only dish images — skip score photos to avoid many HTTP fetches
        image_url: dish.image_url ? toAbsoluteUrl(dish.image_url) ?? null : null,
        average_score: avg,
        score_count: scores.length,
        scores: scores.map((s) => ({
          score: s.score,
          notes: sanitize(s.notes, 300),
          participant: { name: sanitize(s.participant.name) ?? '' },
        })),
      };
    }),
  }));

  const report = {
    title: sanitize(menuData.title) ?? '',
    description: sanitize(menuData.description, 300),
    tasting_date: menuData.tasting_date?.toISOString() ?? null,
    sections,
    participants: menuData.participants.map((p) => sanitize(p.name) ?? '').filter(Boolean),
  };

  const plannerInfo = {
    name: sanitize(planner?.name) ?? 'Wedding Planner',
    logoUrl: planner?.logo_url ? toAbsoluteUrl(planner.logo_url) ?? null : null,
  };

  const weddingInfo = {
    coupleNames: sanitize(coupleNames),
    weddingDate: weddingDate?.toISOString() ?? null,
  };

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(
      React.createElement(TastingReportPDF, {
        report,
        planner: plannerInfo,
        wedding: weddingInfo,
        labels: getLabels(language),
      }) as never,
    );
  } catch (err) {
    console.error('[tasting-report-pdf] renderToBuffer failed:', err);
    return NextResponse.json(
      { success: false, error: { code: 'PDF_ERROR', message: 'Failed to generate PDF' } },
      { status: 500 },
    );
  }

  return buildPdfResponse(buffer, `tasting-report-${menuData.id}.pdf`);
}

// ─── Menu PDF ────────────────────────────────────────────────────────────────

export async function generateTastingMenuPDFHandler(weddingId: string) {
  const [menuData, { planner, coupleNames, weddingDate }] = await Promise.all([
    prisma.tastingMenu.findUnique({
      where: { wedding_id: weddingId },
      select: {
        id: true,
        sections: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            name: true,
            dishes: {
              where: { is_selected: true },
              orderBy: { order: 'asc' },
              select: {
                id: true,
                name: true,
                description: true,
                image_url: true,
              },
            },
          },
        },
      },
    }),
    getWeddingContext(weddingId),
  ]);

  if (!menuData) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'No tasting menu found' } },
      { status: 404 },
    );
  }

  const sections = menuData.sections
    .filter((s) => s.dishes.length > 0)
    .map((section) => ({
      id: section.id,
      name: sanitize(section.name) ?? '',
      dishes: section.dishes.map((dish) => ({
        id: dish.id,
        name: sanitize(dish.name) ?? '',
        description: sanitize(dish.description, 300),
        image_url: dish.image_url ? toAbsoluteUrl(dish.image_url) ?? null : null,
      })),
    }));

  const weddingInfo = {
    coupleNames: sanitize(coupleNames),
    weddingDate: weddingDate?.toISOString() ?? null,
  };

  const plannerInfo = {
    name: sanitize(planner?.name) ?? 'Wedding Planner',
    logoUrl: planner?.logo_url ? toAbsoluteUrl(planner.logo_url) ?? null : null,
  };

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(
      React.createElement(TastingMenuPDF, {
        sections,
        wedding: weddingInfo,
        planner: plannerInfo,
      }) as never,
    );
  } catch (err) {
    console.error('[tasting-menu-pdf] renderToBuffer failed:', err);
    return NextResponse.json(
      { success: false, error: { code: 'PDF_ERROR', message: 'Failed to generate PDF' } },
      { status: 500 },
    );
  }

  return buildPdfResponse(buffer, `wedding-menu-${menuData.id}.pdf`);
}
