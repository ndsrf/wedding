/**
 * Invitation Template Seed Generator
 *
 * Generates default invitation template designs from system themes.
 * Each preset theme is converted to a TemplateDesign with default blocks.
 */

import { randomUUID } from 'crypto';
import { getAllSystemThemes } from '@/lib/theme/presets';
import type {
  SystemTemplateSeed,
  TemplateDesign,
  TemplateBlock,
  LocalizedContent,
} from '@/types/invitation-template';

// ============================================================================
// SEED TRANSLATIONS
// ============================================================================

const SEED_BLOCK_TRANSLATIONS: Record<'heading' | 'coupleName' | 'date', LocalizedContent> = {
  heading: {
    ES: 'Nos vamos a casar',
    EN: 'We Are Getting Married',
    FR: 'Nous allons nous marier',
    IT: 'Ci sposiamo',
    DE: 'Wir heiraten',
  },
  coupleName: {
    ES: '{{couple_names}}',
    EN: '{{couple_names}}',
    FR: '{{couple_names}}',
    IT: '{{couple_names}}',
    DE: '{{couple_names}}',
  },
  date: {
    ES: '{{wedding_date}}',
    EN: '{{wedding_date}}',
    FR: '{{wedding_date}}',
    IT: '{{wedding_date}}',
    DE: '{{wedding_date}}',
  },
};

// ============================================================================
// SEED GENERATOR
// ============================================================================

/**
 * Generate default blocks for a template based on theme config
 */
function generateDefaultBlocks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  themeConfig: any
): TemplateBlock[] {
  return [
    // Block 1: Heading "We Are Getting Married"
    {
      id: randomUUID(),
      type: 'text',
      content: SEED_BLOCK_TRANSLATIONS.heading,
      style: {
        fontFamily: themeConfig.fonts.heading,
        fontSize: '1.25rem',
        color: themeConfig.colors.textSecondary || themeConfig.colors.text,
        textAlign: 'center',
      },
    },
    // Block 2: Couple Names
    {
      id: randomUUID(),
      type: 'text',
      content: SEED_BLOCK_TRANSLATIONS.coupleName,
      style: {
        fontFamily: themeConfig.fonts.heading,
        fontSize: '3rem',
        color: themeConfig.colors.primary,
        textAlign: 'center',
      },
    },
    // Block 3: Wedding Date
    {
      id: randomUUID(),
      type: 'text',
      content: SEED_BLOCK_TRANSLATIONS.date,
      style: {
        fontFamily: themeConfig.fonts.body,
        fontSize: '1.5rem',
        color: themeConfig.colors.text,
        textAlign: 'center',
      },
    },
    // Block 4: Countdown
    {
      id: randomUUID(),
      type: 'countdown',
    },
    // Block 5: Location
    {
      id: randomUUID(),
      type: 'location',
    },
    // Block 6: Add to Calendar
    {
      id: randomUUID(),
      type: 'add-to-calendar',
    },
  ];
}

/**
 * Generate a TemplateDesign from a system theme
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateTemplateDesignFromTheme(themeConfig: any): TemplateDesign {
  return {
    globalStyle: {
      backgroundColor: themeConfig.colors.background,
      backgroundImage: themeConfig.images?.background,
    },
    blocks: generateDefaultBlocks(themeConfig),
  };
}

/**
 * Get all system theme seeds as template seeds
 */
export function getAllSystemSeeds(): SystemTemplateSeed[] {
  const systemThemes = getAllSystemThemes();

  return systemThemes.map((theme) => ({
    id: theme.id,
    name: theme.info.name,
    description: theme.info.description,
    primaryColor: theme.config.colors.primary,
    accentColor: theme.config.colors.accent,
    design: generateTemplateDesignFromTheme(theme.config),
  }));
}

/**
 * Get a system template seed by preset ID
 */
export function getSystemSeedByPreset(presetId: string): SystemTemplateSeed | null {
  const seeds = getAllSystemSeeds();
  return seeds.find((seed) => seed.id === presetId) || null;
}
