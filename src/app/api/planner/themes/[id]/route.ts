/**
 * Theme Management API Routes - Individual Theme Operations
 *
 * PATCH /api/planner/themes/[id] - Update a custom theme
 * DELETE /api/planner/themes/[id] - Delete a custom theme (if not in use)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/src/lib/auth/middleware';
import { validateThemeConfig } from '@/src/lib/theme/engine';
import { isSystemTheme } from '@/src/lib/theme/presets';
import type {
  APIResponse,
  UpdateThemeResponse,
  DeleteThemeResponse,
} from '@/src/types/api';
import { API_ERROR_CODES } from '@/src/types/api';
import type { ThemeConfig } from '@/src/types/theme';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Zod schema for ThemeConfig validation (partial for updates)
const themeColorsSchema = z.object({
  primary: z.string().min(1).optional(),
  secondary: z.string().min(1).optional(),
  accent: z.string().min(1).optional(),
  background: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  textSecondary: z.string().optional(),
  border: z.string().optional(),
  success: z.string().optional(),
  error: z.string().optional(),
  warning: z.string().optional(),
});

const themeFontsSchema = z.object({
  heading: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
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
  buttonRadius: z.string().min(1).optional(),
  cardShadow: z.string().min(1).optional(),
  spacing: z.string().min(1).optional(),
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
  colors: themeColorsSchema.optional(),
  fonts: themeFontsSchema.optional(),
  styles: themeStylesSchema.optional(),
  images: themeImagesSchema,
});

// Validation schema for updating a theme
const updateThemeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  config: themeConfigSchema.optional(),
  preview_image_url: z.string().url().nullable().optional(),
});

// ============================================================================
// PATCH /api/planner/themes/[id]
// ============================================================================

/**
 * PATCH /api/planner/themes/[id]
 * Update a custom theme (only planner's own themes, not system themes)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<UpdateThemeResponse>> {
  try {
    const { id } = await params;

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

    // Check if trying to modify a system theme
    if (isSystemTheme(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.FORBIDDEN,
            message: 'Cannot modify system themes',
          },
        },
        { status: 403 }
      );
    }

    // Find the theme and verify ownership
    const existingTheme = await prisma.theme.findUnique({
      where: { id },
    });

    if (!existingTheme) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.NOT_FOUND,
            message: 'Theme not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify the theme belongs to the current planner
    if (existingTheme.planner_id !== user.planner_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.FORBIDDEN,
            message: 'Cannot modify themes owned by other planners',
          },
        },
        { status: 403 }
      );
    }

    // Prevent modification of system themes (double check)
    if (existingTheme.is_system_theme) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.FORBIDDEN,
            message: 'Cannot modify system themes',
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateThemeSchema.safeParse(body);

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

    // If config is being updated, merge with existing and validate
    let finalConfig = existingTheme.config as Prisma.JsonObject;
    if (config) {
      finalConfig = {
        ...(existingTheme.config as Prisma.JsonObject),
        ...config,
      };

      // Validate the complete config
      const themeValidation = validateThemeConfig(finalConfig);
      if (!themeValidation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: API_ERROR_CODES.VALIDATION_ERROR,
              message: 'Invalid theme configuration after update',
              details: themeValidation.errors,
            },
          },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Prisma.ThemeUpdateInput = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (config !== undefined) updateData.config = finalConfig as Prisma.InputJsonValue;
    if (preview_image_url !== undefined) updateData.preview_image_url = preview_image_url;

    // Update the theme
    const updatedTheme = await prisma.theme.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedTheme,
        config: updatedTheme.config as unknown as ThemeConfig,
      },
    });
  } catch (error) {
    console.error('Error updating theme:', error);

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
          message: 'Failed to update theme',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/planner/themes/[id]
// ============================================================================

/**
 * DELETE /api/planner/themes/[id]
 * Delete a custom theme if it's not in use by any weddings
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<APIResponse<DeleteThemeResponse>>> {
  try {
    const { id } = await params;

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

    // Check if trying to delete a system theme
    if (isSystemTheme(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.FORBIDDEN,
            message: 'Cannot delete system themes',
          },
        },
        { status: 403 }
      );
    }

    // Find the theme and verify ownership
    const existingTheme = await prisma.theme.findUnique({
      where: { id },
    });

    if (!existingTheme) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.NOT_FOUND,
            message: 'Theme not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify the theme belongs to the current planner
    if (existingTheme.planner_id !== user.planner_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.FORBIDDEN,
            message: 'Cannot delete themes owned by other planners',
          },
        },
        { status: 403 }
      );
    }

    // Prevent deletion of system themes (double check)
    if (existingTheme.is_system_theme) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.FORBIDDEN,
            message: 'Cannot delete system themes',
          },
        },
        { status: 403 }
      );
    }

    // Check if theme is in use by any weddings
    const weddingCount = await prisma.wedding.count({
      where: {
        theme_id: id,
      },
    });

    if (weddingCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.THEME_IN_USE,
            message: `Cannot delete theme: currently used by ${weddingCount} wedding${weddingCount > 1 ? 's' : ''}`,
            wedding_count: weddingCount,
          },
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Delete the theme
    await prisma.theme.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: {
        success: true,
      },
    });
  } catch (error) {
    console.error('Error deleting theme:', error);

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
          message: 'Failed to delete theme',
        },
      },
      { status: 500 }
    );
  }
}
