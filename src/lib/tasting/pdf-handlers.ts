/**
 * Shared PDF generation handlers for tasting reports and menu PDFs.
 * Used by both admin and planner routes.
 */

import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { prisma } from '@/lib/db/prisma';
import { toAbsoluteUrl } from '@/lib/images/processor';
import { TastingReportPDF } from '@/lib/pdf/tasting-report-pdf';
import { TastingMenuPDF } from '@/lib/pdf/tasting-menu-pdf';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getPlannerForWedding(weddingId: string) {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: {
      planner: { select: { name: true, logo_url: true } },
    },
  });
  return wedding?.planner ?? null;
}

// ─── Tasting Report ──────────────────────────────────────────────────────────

export async function generateTastingReportHandler(weddingId: string) {
  const [menuData, planner] = await Promise.all([
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
    getPlannerForWedding(weddingId),
  ]);

  if (!menuData) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'No tasting menu found' } },
      { status: 404 },
    );
  }

  // Compute average scores per dish
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
    React.createElement(TastingReportPDF, { report, planner: plannerInfo }) as never,
  );

  const filename = `tasting-report-${menuData.id}.pdf`;
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

// ─── Menu PDF ────────────────────────────────────────────────────────────────

export async function generateTastingMenuPDFHandler(weddingId: string) {
  const [menuData, planner] = await Promise.all([
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
    getPlannerForWedding(weddingId),
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

  const filename = `wedding-menu-${menuData.id}.pdf`;
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
