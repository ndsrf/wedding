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

// ─── i18n labels ─────────────────────────────────────────────────────────────

const LABELS: Record<string, TastingReportLabels> = {
  ES: {
    generatedOn: 'Informe generado el',
    ratings: 'Valoraciones',
    rating: 'valoración',
    ratingsPlural: 'valoraciones',
    footer: 'Informe de Degustación',
  },
  EN: {
    generatedOn: 'Report generated on',
    ratings: 'Ratings',
    rating: 'rating',
    ratingsPlural: 'ratings',
    footer: 'Tasting Report',
  },
  FR: {
    generatedOn: 'Rapport généré le',
    ratings: 'Évaluations',
    rating: 'évaluation',
    ratingsPlural: 'évaluations',
    footer: 'Rapport de Dégustation',
  },
  IT: {
    generatedOn: 'Report generato il',
    ratings: 'Valutazioni',
    rating: 'valutazione',
    ratingsPlural: 'valutazioni',
    footer: 'Report Degustazione',
  },
  DE: {
    generatedOn: 'Bericht erstellt am',
    ratings: 'Bewertungen',
    rating: 'Bewertung',
    ratingsPlural: 'Bewertungen',
    footer: 'Degustationsbericht',
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
      default_language: true,
      planner: { select: { name: true, logo_url: true } },
    },
  });
  return {
    planner: wedding?.planner ?? null,
    language: wedding?.default_language ?? 'ES',
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
  const [menuData, { planner, language }] = await Promise.all([
    prisma.tastingMenu.findUnique({
      where: { wedding_id: weddingId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            dishes: {
              orderBy: { order: 'asc' },
              include: {
                scores: {
                  include: { participant: { select: { name: true } } },
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

  const sections = menuData.sections.map((section) => ({
    ...section,
    dishes: section.dishes.map((dish) => {
      const scores = dish.scores || [];
      const avg =
        scores.length > 0
          ? Math.round((scores.reduce((sum, s) => sum + s.score, 0) / scores.length) * 10) / 10
          : null;
      return {
        ...dish,
        average_score: avg,
        score_count: scores.length,
        scores: scores.map((s) => ({
          score: s.score,
          notes: s.notes,
          image_url: s.image_url ? toAbsoluteUrl(s.image_url) ?? null : null,
          participant: { name: s.participant.name },
        })),
        image_url: dish.image_url ? toAbsoluteUrl(dish.image_url) ?? null : null,
      };
    }),
  }));

  const report = {
    title: menuData.title,
    description: menuData.description,
    tasting_date: menuData.tasting_date?.toISOString() ?? null,
    sections,
  };

  const plannerInfo = {
    name: planner?.name ?? 'Wedding Planner',
    logoUrl: planner?.logo_url ? toAbsoluteUrl(planner.logo_url) ?? null : null,
  };

  const buffer = await renderToBuffer(
    React.createElement(TastingReportPDF, {
      report,
      planner: plannerInfo,
      labels: getLabels(language),
    }) as never,
  );

  return buildPdfResponse(buffer, `tasting-report-${menuData.id}.pdf`);
}

// ─── Menu PDF ────────────────────────────────────────────────────────────────

export async function generateTastingMenuPDFHandler(weddingId: string) {
  const [menuData, { planner }] = await Promise.all([
    prisma.tastingMenu.findUnique({
      where: { wedding_id: weddingId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            dishes: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                name: true,
                description: true,
                image_url: true,
                is_selected: true,
                order: true,
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

  const sections = menuData.sections.map((section) => ({
    id: section.id,
    name: section.name,
    dishes: section.dishes.map((dish) => ({
      id: dish.id,
      name: dish.name,
      description: dish.description,
      image_url: dish.image_url ? toAbsoluteUrl(dish.image_url) ?? null : null,
      is_selected: dish.is_selected,
    })),
  }));

  const menu = {
    title: menuData.title,
    description: menuData.description,
    tasting_date: menuData.tasting_date?.toISOString() ?? null,
    sections,
  };

  const plannerInfo = {
    name: planner?.name ?? 'Wedding Planner',
    logoUrl: planner?.logo_url ? toAbsoluteUrl(planner.logo_url) ?? null : null,
  };

  const buffer = await renderToBuffer(
    React.createElement(TastingMenuPDF, { menu, planner: plannerInfo }) as never,
  );

  return buildPdfResponse(buffer, `wedding-menu-${menuData.id}.pdf`);
}
