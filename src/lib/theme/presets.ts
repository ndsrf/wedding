/**
 * Theme Presets
 *
 * Pre-built system themes for the wedding management platform.
 * These themes are available to all planners and cannot be modified.
 *
 * Contains 6 distinct visual themes:
 * 1. Classic Elegance - Timeless and sophisticated
 * 2. Garden Romance - Soft florals and natural beauty
 * 3. Modern Minimal - Clean and contemporary
 * 4. Rustic Charm - Warm and cozy
 * 5. Beach Breeze - Light and airy
 * 6. Garden Birds - Enchanting botanical reveal
 */

import {
  ThemePreset,
  ThemeConfig,
  ThemePresetInfo,
  PRESET_THEMES,
  THEME_PRESET_INFO,
} from '@/types/theme';

// ============================================================================
// SYSTEM THEMES EXPORT
// ============================================================================

/**
 * Get all system theme presets
 * Returns array of all pre-built themes
 */
export function getAllSystemThemes(): Array<{
  id: ThemePreset;
  config: ThemeConfig;
  info: ThemePresetInfo;
}> {
  return Object.values(ThemePreset).map((preset) => ({
    id: preset,
    config: PRESET_THEMES[preset],
    info: THEME_PRESET_INFO[preset],
  }));
}

/**
 * Get system theme by ID
 * Returns null if theme not found
 */
export function getSystemThemeById(
  id: ThemePreset | string
): { config: ThemeConfig; info: ThemePresetInfo } | null {
  const preset = id as ThemePreset;

  if (!PRESET_THEMES[preset]) {
    return null;
  }

  return {
    config: PRESET_THEMES[preset],
    info: THEME_PRESET_INFO[preset],
  };
}

/**
 * Check if a theme preset ID is a system theme
 */
export function isSystemTheme(id: string): boolean {
  return Object.values(ThemePreset).includes(id as ThemePreset);
}

/**
 * Get system theme IDs
 * Returns array of all system theme preset IDs
 */
export function getSystemThemeIds(): ThemePreset[] {
  return Object.values(ThemePreset);
}

// ============================================================================
// SYSTEM THEME SEEDS FOR DATABASE
// ============================================================================

/**
 * Get system themes formatted for database seeding
 * Returns array of theme objects ready to be inserted into database
 */
export function getSystemThemeSeedData(): Array<{
  name: string;
  description: string;
  is_system_theme: boolean;
  is_default: boolean;
  config: ThemeConfig;
  planner_id: null;
}> {
  return getAllSystemThemes().map((theme, index) => ({
    name: theme.info.name,
    description: theme.info.description,
    is_system_theme: true,
    is_default: index === 0, // First theme (Classic Elegance) is default
    config: theme.config,
    planner_id: null, // System themes don't belong to any planner
  }));
}

// ============================================================================
// THEME RECOMMENDATIONS
// ============================================================================

/**
 * Get recommended themes based on tags/keywords
 * Simple matching algorithm for future enhancement
 */
export function getRecommendedThemes(
  keywords: string[]
): Array<{
  id: ThemePreset;
  config: ThemeConfig;
  info: ThemePresetInfo;
  score: number;
}> {
  const themes = getAllSystemThemes();

  // Calculate relevance score based on tag matching
  const themesWithScores = themes.map((theme) => {
    let score = 0;
    keywords.forEach((keyword) => {
      const lowerKeyword = keyword.toLowerCase();
      if (theme.info.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword))) {
        score++;
      }
      if (theme.info.name.toLowerCase().includes(lowerKeyword)) {
        score += 2; // Name match is worth more
      }
      if (theme.info.description.toLowerCase().includes(lowerKeyword)) {
        score++;
      }
    });
    return { ...theme, score };
  });

  // Sort by score descending and return
  return themesWithScores.sort((a, b) => b.score - a.score);
}

// ============================================================================
// THEME PREVIEW UTILITIES
// ============================================================================

/**
 * Get theme preview data for UI display
 * Returns essential information for theme selection interfaces
 */
export function getThemePreviewData(themeId: ThemePreset | string): {
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  tags: string[];
} | null {
  const theme = getSystemThemeById(themeId as ThemePreset);

  if (!theme) {
    return null;
  }

  return {
    name: theme.info.name,
    description: theme.info.description,
    primaryColor: theme.config.colors.primary,
    secondaryColor: theme.config.colors.secondary,
    accentColor: theme.config.colors.accent,
    tags: theme.info.tags,
  };
}

/**
 * Get all theme preview data
 * Useful for theme selection grids/lists in UI
 */
export function getAllThemePreviewData(): Array<{
  id: ThemePreset;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  tags: string[];
}> {
  return getAllSystemThemes().map((theme) => ({
    id: theme.id,
    name: theme.info.name,
    description: theme.info.description,
    primaryColor: theme.config.colors.primary,
    secondaryColor: theme.config.colors.secondary,
    accentColor: theme.config.colors.accent,
    tags: theme.info.tags,
  }));
}

// ============================================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

export { ThemePreset, PRESET_THEMES, THEME_PRESET_INFO };
