/**
 * Theme Engine
 *
 * Generates CSS from ThemeConfig and provides caching functionality
 * for improved performance.
 */

import {
  ThemeConfig,
  ThemeCSS,
  ThemeCSSOptions,
  ThemeCacheEntry,
  DEFAULT_THEME_CONFIG,
  ThemeConfigWithDefaults,
} from '@/types/theme';

// ============================================================================
// THEME CACHE
// ============================================================================

/**
 * In-memory theme cache
 * TTL: 1 hour (3600000 milliseconds)
 */
const CACHE_TTL = 3600000; // 1 hour
const themeCache = new Map<string, ThemeCacheEntry>();

/**
 * Get cached theme CSS if available and not expired
 */
export function getCachedTheme(themeId: string): ThemeCSS | null {
  const cached = themeCache.get(themeId);

  if (!cached) {
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(cached.cached_at.getTime() + cached.ttl);

  if (now > expiresAt) {
    // Cache expired, remove it
    themeCache.delete(themeId);
    return null;
  }

  return cached.css;
}

/**
 * Cache theme CSS
 */
export function cacheTheme(themeId: string, css: ThemeCSS): void {
  const entry: ThemeCacheEntry = {
    theme_id: themeId,
    css,
    cached_at: new Date(),
    ttl: CACHE_TTL,
  };

  themeCache.set(themeId, entry);
}

/**
 * Clear theme cache (useful for testing or manual cache invalidation)
 */
export function clearThemeCache(themeId?: string): void {
  if (themeId) {
    themeCache.delete(themeId);
  } else {
    themeCache.clear();
  }
}

// ============================================================================
// THEME CONFIG MERGING
// ============================================================================

/**
 * Merge theme config with defaults
 * Fills in any missing values with default theme configuration
 */
export function mergeWithDefaults(
  config: ThemeConfig
): ThemeConfigWithDefaults {
  return {
    colors: {
      ...DEFAULT_THEME_CONFIG.colors,
      ...config.colors,
    },
    fonts: {
      heading: config.fonts.heading || DEFAULT_THEME_CONFIG.fonts.heading,
      body: config.fonts.body || DEFAULT_THEME_CONFIG.fonts.body,
      size: {
        ...DEFAULT_THEME_CONFIG.fonts.size,
        ...config.fonts.size,
      },
      weight: {
        ...DEFAULT_THEME_CONFIG.fonts.weight,
        ...config.fonts.weight,
      },
    },
    styles: {
      buttonRadius:
        config.styles.buttonRadius || DEFAULT_THEME_CONFIG.styles.buttonRadius,
      cardShadow:
        config.styles.cardShadow || DEFAULT_THEME_CONFIG.styles.cardShadow,
      spacing: config.styles.spacing || DEFAULT_THEME_CONFIG.styles.spacing,
      borderRadius:
        config.styles.borderRadius || DEFAULT_THEME_CONFIG.styles.borderRadius,
      borderWidth:
        config.styles.borderWidth || DEFAULT_THEME_CONFIG.styles.borderWidth,
      inputStyle: {
        ...DEFAULT_THEME_CONFIG.styles.inputStyle,
        ...config.styles.inputStyle,
      },
    },
    images: {
      ...DEFAULT_THEME_CONFIG.images,
      ...config.images,
    },
  };
}

// ============================================================================
// CSS GENERATION
// ============================================================================

/**
 * Generate CSS custom properties from theme config
 */
function generateCSSVariables(config: ThemeConfigWithDefaults): string {
  const variables: string[] = [];

  // Color variables
  variables.push(`  --color-primary: ${config.colors.primary};`);
  variables.push(`  --color-secondary: ${config.colors.secondary};`);
  variables.push(`  --color-accent: ${config.colors.accent};`);
  variables.push(`  --color-background: ${config.colors.background};`);
  variables.push(`  --color-text: ${config.colors.text};`);
  variables.push(`  --color-text-secondary: ${config.colors.textSecondary};`);
  variables.push(`  --color-border: ${config.colors.border};`);
  variables.push(`  --color-success: ${config.colors.success};`);
  variables.push(`  --color-error: ${config.colors.error};`);
  variables.push(`  --color-warning: ${config.colors.warning};`);

  // Font variables
  variables.push(`  --font-heading: ${config.fonts.heading};`);
  variables.push(`  --font-body: ${config.fonts.body};`);
  variables.push(`  --font-size-base: ${config.fonts.size.base};`);
  variables.push(`  --font-size-h1: ${config.fonts.size.heading1};`);
  variables.push(`  --font-size-h2: ${config.fonts.size.heading2};`);
  variables.push(`  --font-size-h3: ${config.fonts.size.heading3};`);
  variables.push(`  --font-weight-normal: ${config.fonts.weight.normal};`);
  variables.push(`  --font-weight-bold: ${config.fonts.weight.bold};`);
  variables.push(`  --font-weight-heading: ${config.fonts.weight.heading};`);

  // Style variables
  variables.push(`  --button-radius: ${config.styles.buttonRadius};`);
  variables.push(`  --card-shadow: ${config.styles.cardShadow};`);
  variables.push(`  --spacing: ${config.styles.spacing};`);
  variables.push(`  --border-radius: ${config.styles.borderRadius};`);
  variables.push(`  --border-width: ${config.styles.borderWidth};`);
  variables.push(`  --input-height: ${config.styles.inputStyle.height};`);
  variables.push(`  --input-padding: ${config.styles.inputStyle.padding};`);
  variables.push(
    `  --input-border-radius: ${config.styles.inputStyle.borderRadius};`
  );

  // Image variables (as CSS custom properties that can be used in background-image)
  if (config.images.logo) {
    variables.push(`  --image-logo: url('${config.images.logo}');`);
  }
  if (config.images.banner) {
    variables.push(`  --image-banner: url('${config.images.banner}');`);
  }
  if (config.images.background) {
    variables.push(`  --image-background: url('${config.images.background}');`);
  }

  return variables.join('\n');
}

/**
 * Generate complete CSS from theme config
 *
 * @param config - ThemeConfig object
 * @param options - CSS generation options
 * @returns Generated CSS string
 */
export function generateThemeCSS(
  config: ThemeConfig,
  options: ThemeCSSOptions = {}
): ThemeCSS {
  const {
    minify = false,
    includeComments = true,
    scopeSelector = ':root',
  } = options;

  // Merge with defaults
  const fullConfig = mergeWithDefaults(config);

  // Generate CSS variables
  const variables = generateCSSVariables(fullConfig);

  // Build CSS
  const cssLines: string[] = [];

  if (includeComments && !minify) {
    cssLines.push('/* Generated Theme CSS */');
    cssLines.push(
      '/* Do not edit manually - generated from ThemeConfig */'
    );
    cssLines.push('');
  }

  cssLines.push(`${scopeSelector} {`);
  cssLines.push(variables);
  cssLines.push('}');

  // Add base styles that use the theme variables
  if (!minify) {
    cssLines.push('');
    if (includeComments) {
      cssLines.push('/* Base theme styles */');
    }
  }

  cssLines.push('body {');
  cssLines.push('  font-family: var(--font-body);');
  cssLines.push('  font-size: var(--font-size-base);');
  cssLines.push('  font-weight: var(--font-weight-normal);');
  cssLines.push('  color: var(--color-text);');
  cssLines.push('  background-color: var(--color-background);');
  if (fullConfig.images.background) {
    cssLines.push('  background-image: var(--image-background);');
    cssLines.push('  background-size: cover;');
    cssLines.push('  background-attachment: fixed;');
  }
  cssLines.push('}');

  cssLines.push('');
  cssLines.push('h1, h2, h3, h4, h5, h6 {');
  cssLines.push('  font-family: var(--font-heading);');
  cssLines.push('  font-weight: var(--font-weight-heading);');
  cssLines.push('  color: var(--color-text);');
  cssLines.push('}');

  cssLines.push('');
  cssLines.push('h1 { font-size: var(--font-size-h1); }');
  cssLines.push('h2 { font-size: var(--font-size-h2); }');
  cssLines.push('h3 { font-size: var(--font-size-h3); }');

  if (minify) {
    return cssLines.join('').replace(/\s+/g, ' ').trim();
  }

  return cssLines.join('\n');
}

/**
 * Generate theme CSS with caching
 *
 * Checks cache first, generates and caches if not found
 *
 * @param themeId - Unique theme identifier
 * @param config - ThemeConfig object
 * @param options - CSS generation options
 * @returns Generated CSS string
 */
export function generateThemeCSSWithCache(
  themeId: string,
  config: ThemeConfig,
  options: ThemeCSSOptions = {}
): ThemeCSS {
  // Check cache first
  const cached = getCachedTheme(themeId);
  if (cached) {
    return cached;
  }

  // Generate CSS
  const css = generateThemeCSS(config, options);

  // Cache it
  cacheTheme(themeId, css);

  return css;
}

// ============================================================================
// THEME VALIDATION
// ============================================================================

/**
 * Validate theme config structure
 * Ensures all required fields are present and valid
 */
export function validateThemeConfig(config: unknown): {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
} {
  const errors: Array<{ field: string; message: string }> = [];

  if (!config || typeof config !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'config', message: 'Theme config must be an object' }],
    };
  }

  const themeConfig = config as Partial<ThemeConfig>;

  // Validate colors
  if (!themeConfig.colors) {
    errors.push({ field: 'colors', message: 'Colors object is required' });
  } else {
    const requiredColors = ['primary', 'secondary', 'accent', 'background', 'text'];
    requiredColors.forEach((color) => {
      if (!themeConfig.colors![color as keyof typeof themeConfig.colors]) {
        errors.push({
          field: `colors.${color}`,
          message: `Color ${color} is required`,
        });
      }
    });
  }

  // Validate fonts
  if (!themeConfig.fonts) {
    errors.push({ field: 'fonts', message: 'Fonts object is required' });
  } else {
    if (!themeConfig.fonts.heading) {
      errors.push({
        field: 'fonts.heading',
        message: 'Heading font is required',
      });
    }
    if (!themeConfig.fonts.body) {
      errors.push({ field: 'fonts.body', message: 'Body font is required' });
    }
  }

  // Validate styles
  if (!themeConfig.styles) {
    errors.push({ field: 'styles', message: 'Styles object is required' });
  } else {
    const requiredStyles = ['buttonRadius', 'cardShadow', 'spacing'];
    requiredStyles.forEach((style) => {
      if (!themeConfig.styles![style as keyof typeof themeConfig.styles]) {
        errors.push({
          field: `styles.${style}`,
          message: `Style ${style} is required`,
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
