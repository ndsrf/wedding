/**
 * Database Seeding
 * Seeds essential data like system themes on application startup
 */

import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { getAllSystemThemes } from '@/src/lib/theme/presets';

/**
 * Seed all system themes into the database
 * Idempotent - safe to run multiple times
 */
export async function seedSystemThemes(): Promise<void> {
  console.log('[Seed] Seeding system themes...');

  const systemThemes = getAllSystemThemes();
  let created = 0;
  let existing = 0;

  for (const theme of systemThemes) {
    try {
      // Use upsert to create or update the theme
      await prisma.theme.upsert({
        where: { id: theme.id },
        create: {
          id: theme.id,
          planner_id: null,
          name: theme.info.name,
          description: theme.info.description,
          is_system_theme: true,
          is_default: false,
          config: theme.config as unknown as Prisma.InputJsonValue,
          preview_image_url: theme.info.preview_image_url || null,
        },
        update: {
          // Update theme config in case it changed
          name: theme.info.name,
          description: theme.info.description,
          config: theme.config as unknown as Prisma.InputJsonValue,
          preview_image_url: theme.info.preview_image_url || null,
        },
      });

      created++;
    } catch (error) {
      // Check if theme already exists
      const existingTheme = await prisma.theme.findUnique({
        where: { id: theme.id },
      });

      if (existingTheme) {
        existing++;
      } else {
        console.error(`[Seed] Failed to seed theme ${theme.id}:`, error);
        throw error;
      }
    }
  }

  console.log(`[Seed] ✓ System themes seeded: ${created} created/updated, ${existing} already existed`);
}

/**
 * Run all seed operations
 */
export async function seedDatabase(): Promise<void> {
  try {
    await seedSystemThemes();
    console.log('[Seed] ✓ Database seeding complete');
  } catch (error) {
    console.error('[Seed] ✗ Database seeding failed:', error);
    throw error;
  }
}
