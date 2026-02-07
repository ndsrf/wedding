/**
 * Wedding Admin - Theme Listing API Route
 *
 * GET /api/admin/themes - List available themes for the wedding
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { getAllSystemThemes } from '@/lib/theme/presets';
import { API_ERROR_CODES, type ListThemesResponse } from '@/types/api';
import type { ThemeConfig } from '@/types/theme';

/**
 * GET /api/admin/themes
 * List all available themes (system themes + planner's custom themes)
 */
export async function GET(): Promise<NextResponse<ListThemesResponse>> {
  try {
    // Require wedding_admin authentication
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.FORBIDDEN,
            message: 'Wedding ID not found in session',
          },
        },
        { status: 403 }
      );
    }

    // Get the wedding to find the planner_id
    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: { planner_id: true },
    });

    if (!wedding) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.NOT_FOUND,
            message: 'Wedding not found',
          },
        },
        { status: 404 }
      );
    }

    // Get system themes
    const systemThemes = getAllSystemThemes();
    const systemThemeObjects = systemThemes.map((theme) => ({
      id: theme.id,
      planner_id: null,
      name: theme.info.name,
      description: theme.info.description,
      is_default: false,
      is_system_theme: true,
      config: theme.config,
      preview_image_url: theme.info.preview_image_url || null,
      created_at: new Date('2024-01-01'), // System themes don't have real creation dates
      updated_at: new Date('2024-01-01'),
    }));

    // Get planner's custom themes from database
    const customThemes = await prisma.theme.findMany({
      where: {
        planner_id: wedding.planner_id,
        is_system_theme: false,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Map custom themes to ensure config has correct type
    const customThemeObjects = customThemes.map((theme) => ({
      ...theme,
      config: theme.config as unknown as ThemeConfig,
    }));

    // Combine system themes and custom themes
    const allThemes = [...systemThemeObjects, ...customThemeObjects];

    return NextResponse.json({
      success: true,
      data: allThemes,
    });
  } catch (error) {
    console.error('Error fetching themes:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.startsWith('UNAUTHORIZED')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.UNAUTHORIZED,
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message.startsWith('FORBIDDEN')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.FORBIDDEN,
            message: 'Insufficient permissions',
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: API_ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to fetch themes',
        },
      },
      { status: 500 }
    );
  }
}
