/**
 * Shared PDF generation handlers for tasting reports and menu PDFs.
 * Used by both admin and planner routes.
 */

import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import path from 'path';
import { readFile, access } from 'fs/promises';
import sharp from 'sharp';
import { prisma } from '@/lib/db/prisma';
import { TastingReportPDF, type TastingReportLabels } from '@/lib/pdf/tasting-report-pdf';
import { TastingMenuPDF } from '@/lib/pdf/tasting-menu-pdf';

// ─── Sanitization ─────────────────────────────────────────────────────────────

function sanitize(s: string | null | undefined, maxLen = 500): string | null {
  if (!s) return null;
  const cleaned = s
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\uFFFD/g, '')
    .trim();
  return cleaned.slice(0, maxLen) || null;
}

// ─── Image pre-fetching ───────────────────────────────────────────────────────

/**
 * Fetch/read an image, resize to maxPx with sharp, and return a base64
 * data-URI string that react-pdf's Image component can render.
 * Resizing prevents OOM when many full-resolution participant photos are
 * loaded simultaneously during renderToBuffer.
 */
async function resolveImageForPdf(url: string, maxPx = 1200): Promise<string | null> {
  try {
    let rawBuf: Buffer;

    if (url.startsWith('http://') || url.startsWith('https://')) {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        console.warn(`[pdf-image] HTTP ${res.status} for ${url}`);
        return null;
      }
      rawBuf = Buffer.from(await res.arrayBuffer());
    } else {
      const rel = url.startsWith('/') ? url.slice(1) : url;
      const absPath = path.join(process.cwd(), 'public', rel);
      try { await access(absPath); } catch {
        console.warn(`[pdf-image] Local file not found: ${absPath}`);
        return null;
      }
      rawBuf = await readFile(absPath);
    }

    if (!rawBuf.length) return null;

    const resized = await sharp(rawBuf)
      .resize(maxPx, maxPx, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 95 })
      .toBuffer();

    return `data:image/jpeg;base64,${resized.toString('base64')}`;
  } catch (err) {
    console.warn(`[pdf-image] Failed to resolve ${url}:`, err);
    return null;
  }
}

/**
 * Pre-load all unique image URLs in parallel and return a lookup map
 * (raw DB URL → data URI string). Pass raw DB URLs as keys.
 */
async function prefetchImages(
  urls: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(urls.filter((u): u is string => Boolean(u)))];
  const results = await Promise.all(unique.map((u) => resolveImageForPdf(u)));
  const map = new Map<string, string>();
  unique.forEach((url, i) => { if (results[i]) map.set(url, results[i]!); });
  return map;
}

// ─── i18n labels ─────────────────────────────────────────────────────────────

const LABELS: Record<string, TastingReportLabels> = {
  ES: {
    ratings: 'Valoraciones',
    rating: 'valoración',
    ratingsPlural: 'valoraciones',
    footer: 'Informe de Degustación',
    participants: 'Participantes',
    weddingDate: 'Fecha de boda',
    tastingDate: 'Fecha de degustación',
  },
  EN: {
    ratings: 'Ratings',
    rating: 'rating',
    ratingsPlural: 'ratings',
    footer: 'Tasting Report',
    participants: 'Participants',
    weddingDate: 'Wedding date',
    tastingDate: 'Tasting date',
  },
  FR: {
    ratings: 'Évaluations',
    rating: 'évaluation',
    ratingsPlural: 'évaluations',
    footer: 'Rapport de Dégustation',
    participants: 'Participants',
    weddingDate: 'Date du mariage',
    tastingDate: 'Date de dégustation',
  },
  IT: {
    ratings: 'Valutazioni',
    rating: 'valutazione',
    ratingsPlural: 'valutazioni',
    footer: 'Report Degustazione',
    participants: 'Partecipanti',
    weddingDate: 'Data del matrimonio',
    tastingDate: 'Data degustazione',
  },
  DE: {
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

export async function generateTastingReportHandler(weddingId: string, menuId?: string) {
  const menuSelect = {
    id: true,
    title: true,
    description: true,
    tasting_date: true,
    participants: {
      select: { name: true },
      orderBy: { name: 'asc' as const },
    },
    sections: {
      orderBy: { order: 'asc' as const },
      select: {
        id: true,
        name: true,
        order: true,
        dishes: {
          orderBy: { order: 'asc' as const },
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
                image_url: true,
                participant: { select: { name: true } },
              },
              orderBy: { created_at: 'asc' as const },
            },
          },
        },
      },
    },
  };

  const [menuData, weddingCtx] = await Promise.all([
    menuId
      ? prisma.tastingMenu.findFirst({ where: { id: menuId, wedding_id: weddingId }, select: menuSelect })
      : prisma.tastingMenu.findFirst({
          where: { wedding_id: weddingId },
          orderBy: { round_number: 'asc' },
          select: menuSelect,
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

  // Pre-load all images in parallel using raw DB URLs as cache keys.
  // Local paths are read from disk; remote URLs are fetched over HTTPS.
  const rawDishUrls = menuData.sections.flatMap((s) => s.dishes.map((d) => d.image_url));
  const rawScoreUrls = menuData.sections.flatMap((s) =>
    s.dishes.flatMap((d) => d.scores.map((sc) => sc.image_url)),
  );
  const rawLogoUrl = planner?.logo_url ?? null;
  const imageCache = await prefetchImages([rawLogoUrl, ...rawDishUrls, ...rawScoreUrls]);

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
        image_url: dish.image_url ? (imageCache.get(dish.image_url) ?? null) : null,
        average_score: avg,
        score_count: scores.length,
        scores: scores.map((s) => ({
          score: s.score,
          notes: sanitize(s.notes, 300),
          image_url: s.image_url ? (imageCache.get(s.image_url) ?? null) : null,
          participant: { name: sanitize(s.participant.name) ?? '' },
        })),
      };
    }),
  }));

  const report = {
    title: sanitize(menuData.title) ?? '',
    tasting_date: menuData.tasting_date?.toISOString() ?? null,
    sections,
    participants: menuData.participants.map((p) => sanitize(p.name) ?? '').filter(Boolean),
  };

  const plannerInfo = {
    name: sanitize(planner?.name) ?? 'Wedding Planner',
    logoUrl: rawLogoUrl ? (imageCache.get(rawLogoUrl) ?? null) : null,
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
  // For the menu PDF we consolidate selected dishes from ALL rounds
  const [allMenus, { planner, coupleNames, weddingDate }] = await Promise.all([
    prisma.tastingMenu.findMany({
      where: { wedding_id: weddingId },
      orderBy: { round_number: 'asc' },
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

  // Consolidate sections from all rounds by section name (case-insensitive, trimmed)
  type PdfSection = { id: string; name: string; dishes: Array<{ id: string; name: string; description: string | null; image_url: string | null }> };
  const sectionMap = new Map<string, PdfSection>();
  const sectionOrder: string[] = [];
  for (const menu of allMenus) {
    for (const s of menu.sections) {
      const key = s.name.trim().toLowerCase();
      if (!sectionMap.has(key)) {
        sectionMap.set(key, { id: s.id, name: s.name.trim(), dishes: [] });
        sectionOrder.push(key);
      }
      sectionMap.get(key)!.dishes.push(...s.dishes);
    }
  }
  const consolidatedSections = sectionOrder.map(k => sectionMap.get(k)!);

  if (consolidatedSections.length === 0 && allMenus.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'No tasting menu found' } },
      { status: 404 },
    );
  }

  // Pre-fetch all images in parallel using raw DB URLs as cache keys
  const rawDishUrls = consolidatedSections.flatMap((s) => s.dishes.map((d) => d.image_url));
  const rawLogoUrl = planner?.logo_url ?? null;
  const imageCache = await prefetchImages([rawLogoUrl, ...rawDishUrls]);

  const sections = consolidatedSections
    .filter((s) => s.dishes.length > 0)
    .map((section) => ({
      id: section.id,
      name: sanitize(section.name) ?? '',
      dishes: section.dishes.map((dish) => ({
        id: dish.id,
        name: sanitize(dish.name) ?? '',
        description: sanitize(dish.description, 300),
        image_url: dish.image_url ? (imageCache.get(dish.image_url) ?? null) : null,
      })),
    }));

  const weddingInfo = {
    coupleNames: sanitize(coupleNames),
    weddingDate: weddingDate?.toISOString() ?? null,
  };

  const plannerInfo = {
    name: sanitize(planner?.name) ?? 'Wedding Planner',
    logoUrl: rawLogoUrl ? (imageCache.get(rawLogoUrl) ?? null) : null,
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

  return buildPdfResponse(buffer, `wedding-menu-${allMenus[0]?.id ?? 'combined'}.pdf`);
}
