/**
 * Theme Management API Routes
 *
 * GET /api/planner/themes - List system and planner's custom themes
 * POST /api/planner/themes - Create a custom theme
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { validateThemeConfig } from '@/lib/theme/engine';
import { getAllSystemThemes } from '@/lib/theme/presets';
import type {
  ListThemesResponse,
  CreateThemeResponse,
} from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import type { ThemeConfig } from '@/types/theme';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Zod schema for ThemeConfig validation
const themeColorsSchema = z.object({
  primary: z.string().min(1, 'Primary color is required'),
  secondary: z.string().min(1, 'Secondary color is required'),
  accent: z.string().min(1, 'Accent color is required'),
  background: z.string().min(1, 'Background color is required'),
  text: z.string().min(1, 'Text color is required'),
  textSecondary: z.string().optional(),
  border: z.string().optional(),
  success: z.string().optional(),
  error: z.string().optional(),
  warning: z.string().optional(),
});

const themeFontsSchema = z.object({
  heading: z.string().min(1, 'Heading font is required'),
  body: z.string().min(1, 'Body font is required'),
  size: z
    .object({
      base: z.string().optional(),
      heading1: z.string().optional(),
      heading2: z.string().optional(),
      heading3: z.string().optional(),
    })
    .optional(),
  weight: z
    .object({
      normal: z.number().optional(),
      bold: z.number().optional(),
      heading: z.number().optional(),
    })
    .optional(),
});

const themeStylesSchema = z.object({
  buttonRadius: z.string().min(1, 'Button radius is required'),
  cardShadow: z.string().min(1, 'Card shadow is required'),
  spacing: z.string().min(1, 'Spacing is required'),
  borderRadius: z.string().optional(),
  borderWidth: z.string().optional(),
  inputStyle: z
    .object({
      height: z.string().optional(),
      padding: z.string().optional(),
      borderRadius: z.string().optional(),
    })
    .optional(),
});

const themeImagesSchema = z
  .object({
    logo: z.string().url().optional(),
    banner: z.string().url().optional(),
    background: z.string().url().optional(),
    favicon: z.string().url().optional(),
  })
  .optional();

const themeConfigSchema = z.object({
  colors: themeColorsSchema,
  fonts: themeFontsSchema,
  styles: themeStylesSchema,
  images: themeImagesSchema,
});

// Validation schema for creating a theme
const createThemeSchema = z.object({
  name: z.string().min(1, 'Theme name is required').max(100, 'Name too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  config: themeConfigSchema,
  preview_image_url: z.string().url('Invalid preview image URL').optional(),
});

// ============================================================================
// GET /api/planner/themes
// ============================================================================

/**
 * GET /api/planner/themes
 * List all available themes (system themes + planner's custom themes)
 */
export async function GET(): Promise<NextResponse<ListThemesResponse>> {
  try {
    // Require planner authentication
    const user = await requireRole('planner');

    if (!user.planner_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.FORBIDDEN,
            message: 'Planner ID not found in session',
          },
        },
        { status: 403 }
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
        planner_id: user.planner_id,
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

// ============================================================================
// POST /api/planner/themes
// ============================================================================

/**
 * POST /api/planner/themes
 * Create a new custom theme for the planner
 */
export async function POST(request: NextRequest): Promise<NextResponse<CreateThemeResponse>> {
  try {
    // Require planner authentication
    const user = await requireRole('planner');

    if (!user.planner_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.FORBIDDEN,
            message: 'Planner ID not found in session',
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createThemeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid theme data',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { name, description, config, preview_image_url } = validationResult.data;

    // Additional validation using theme engine validator
    const themeValidation = validateThemeConfig(config);
    if (!themeValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid theme configuration',
            details: themeValidation.errors,
          },
        },
        { status: 400 }
      );
    }

    // Create the theme in database
    const theme = await prisma.theme.create({
      data: {
        planner_id: user.planner_id,
        name,
        description,
        config: config as unknown as Prisma.InputJsonValue, // Prisma expects Json type
        preview_image_url: preview_image_url || null,
        is_system_theme: false,
        is_default: false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...theme,
          config: theme.config as unknown as ThemeConfig,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating theme:', error);

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
          message: 'Failed to create theme',
        },
      },
      { status: 500 }
    );
  }
}
