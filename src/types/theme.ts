/**
 * Theme Configuration Types
 *
 * TypeScript type definitions for the theme system.
 * Includes ThemeConfig (stored in JSONB) and related types.
 */

// ============================================================================
// THEME CONFIGURATION
// ============================================================================

/**
 * ThemeConfig - JSONB configuration object for customizing wedding themes
 * This is stored in the Theme.config field as JSONB in the database
 */
export interface ThemeConfig {
  colors: ThemeColors;
  fonts: ThemeFonts;
  styles: ThemeStyles;
  images?: ThemeImages;
}

export interface ThemeColors {
  primary: string; // Primary brand color (e.g., "#8B4513" for rustic brown)
  secondary: string; // Secondary accent color
  accent: string; // Highlight/accent color for CTAs
  background: string; // Page background color
  text: string; // Primary text color
  textSecondary?: string; // Secondary text color (optional, for muted text)
  border?: string; // Border color (optional)
  success?: string; // Success state color (optional)
  error?: string; // Error state color (optional)
  warning?: string; // Warning state color (optional)
}

export interface ThemeFonts {
  heading: string; // Font family for headings (e.g., "Playfair Display, serif")
  body: string; // Font family for body text (e.g., "Lato, sans-serif")
  size?: {
    // Optional font size customization
    base?: string; // Base font size (e.g., "16px")
    heading1?: string; // H1 size (e.g., "2.5rem")
    heading2?: string; // H2 size (e.g., "2rem")
    heading3?: string; // H3 size (e.g., "1.5rem")
  };
  weight?: {
    // Optional font weight customization
    normal?: number; // Normal weight (e.g., 400)
    bold?: number; // Bold weight (e.g., 700)
    heading?: number; // Heading weight (e.g., 600)
  };
}

export interface ThemeStyles {
  buttonRadius: string; // Button border radius (e.g., "8px", "9999px" for pill)
  cardShadow: string; // Card shadow (e.g., "0 4px 6px rgba(0,0,0,0.1)")
  spacing: string; // Base spacing unit (e.g., "8px", "1rem")
  borderRadius?: string; // General border radius for cards, inputs, etc.
  borderWidth?: string; // Border width (e.g., "1px", "2px")
  inputStyle?: {
    // Optional input customization
    height?: string; // Input height (e.g., "44px" for touch-friendly)
    padding?: string; // Input padding
    borderRadius?: string; // Input border radius
  };
}

export interface ThemeImages {
  logo?: string; // URL to custom logo image
  banner?: string; // URL to banner/hero image
  background?: string; // URL to background image or pattern
  favicon?: string; // URL to favicon (optional)
}

// ============================================================================
// THEME PRESETS
// ============================================================================

/**
 * Pre-built theme identifiers
 */
export enum ThemePreset {
  CLASSIC_ELEGANCE = 'classic-elegance',
  GARDEN_ROMANCE = 'garden-romance',
  MODERN_MINIMAL = 'modern-minimal',
  RUSTIC_CHARM = 'rustic-charm',
  BEACH_BREEZE = 'beach-breeze',
}

/**
 * Theme preset metadata (for displaying in UI)
 */
export interface ThemePresetInfo {
  id: ThemePreset;
  name: string;
  description: string;
  preview_image_url?: string;
  tags: string[]; // e.g., ["elegant", "traditional", "formal"]
}

// ============================================================================
// THEME ENGINE TYPES
// ============================================================================

/**
 * CSS Variables generated from ThemeConfig
 */
export interface ThemeCSSVariables {
  // Color variables
  '--color-primary': string;
  '--color-secondary': string;
  '--color-accent': string;
  '--color-background': string;
  '--color-text': string;
  '--color-text-secondary'?: string;
  '--color-border'?: string;
  '--color-success'?: string;
  '--color-error'?: string;
  '--color-warning'?: string;

  // Font variables
  '--font-heading': string;
  '--font-body': string;
  '--font-size-base'?: string;
  '--font-size-h1'?: string;
  '--font-size-h2'?: string;
  '--font-size-h3'?: string;
  '--font-weight-normal'?: string;
  '--font-weight-bold'?: string;
  '--font-weight-heading'?: string;

  // Style variables
  '--button-radius': string;
  '--card-shadow': string;
  '--spacing': string;
  '--border-radius'?: string;
  '--border-width'?: string;
  '--input-height'?: string;
  '--input-padding'?: string;
  '--input-border-radius'?: string;

  // Image variables (as background-image URLs)
  '--image-logo'?: string;
  '--image-banner'?: string;
  '--image-background'?: string;
}

/**
 * Generated CSS string from ThemeConfig
 */
export type ThemeCSS = string;

// ============================================================================
// THEME VALIDATION
// ============================================================================

/**
 * Theme configuration validation result
 */
export interface ThemeValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

// ============================================================================
// THEME UTILITY TYPES
// ============================================================================

/**
 * Partial theme config for updates (all fields optional)
 */
export type PartialThemeConfig = {
  colors?: Partial<ThemeColors>;
  fonts?: Partial<ThemeFonts>;
  styles?: Partial<ThemeStyles>;
  images?: Partial<ThemeImages>;
};

/**
 * Theme config with defaults applied
 */
export type ThemeConfigWithDefaults = Required<
  Omit<ThemeConfig, 'images'>
> & {
  images: ThemeImages;
  colors: Required<ThemeColors>;
  fonts: Required<ThemeFonts> & {
    size: Required<NonNullable<ThemeFonts['size']>>;
    weight: Required<NonNullable<ThemeFonts['weight']>>;
  };
  styles: Required<ThemeStyles> & {
    inputStyle: Required<NonNullable<ThemeStyles['inputStyle']>>;
  };
};

// ============================================================================
// THEME SERVICE TYPES
// ============================================================================

/**
 * Options for theme engine CSS generation
 */
export interface ThemeCSSOptions {
  minify?: boolean; // Minify generated CSS
  includeComments?: boolean; // Include comments in generated CSS
  scopeSelector?: string; // CSS selector to scope theme (e.g., ".theme-classic")
}

/**
 * Theme cache entry
 */
export interface ThemeCacheEntry {
  theme_id: string;
  css: ThemeCSS;
  cached_at: Date;
  ttl: number; // Time-to-live in milliseconds
}

// ============================================================================
// DEFAULT THEME VALUES (for reference)
// ============================================================================

/**
 * Default theme configuration values
 * These are used as fallbacks when theme properties are not specified
 */
export const DEFAULT_THEME_CONFIG: ThemeConfigWithDefaults = {
  colors: {
    primary: '#4A5568',
    secondary: '#718096',
    accent: '#3182CE',
    background: '#FFFFFF',
    text: '#1A202C',
    textSecondary: '#718096',
    border: '#E2E8F0',
    success: '#38A169',
    error: '#E53E3E',
    warning: '#DD6B20',
  },
  fonts: {
    heading: 'Georgia, serif',
    body: 'system-ui, -apple-system, sans-serif',
    size: {
      base: '16px',
      heading1: '2.5rem',
      heading2: '2rem',
      heading3: '1.5rem',
    },
    weight: {
      normal: 400,
      bold: 700,
      heading: 600,
    },
  },
  styles: {
    buttonRadius: '8px',
    cardShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    spacing: '1rem',
    borderRadius: '8px',
    borderWidth: '1px',
    inputStyle: {
      height: '44px',
      padding: '0.75rem 1rem',
      borderRadius: '8px',
    },
  },
  images: {
    logo: undefined,
    banner: undefined,
    background: undefined,
    favicon: undefined,
  },
};

// ============================================================================
// PRESET THEME CONFIGURATIONS
// ============================================================================

/**
 * Pre-built theme configurations for the 5 system themes
 */
export const PRESET_THEMES: Record<ThemePreset, ThemeConfig> = {
  [ThemePreset.CLASSIC_ELEGANCE]: {
    colors: {
      primary: '#8B7355',
      secondary: '#C9B8A8',
      accent: '#D4AF37',
      background: '#FDFBF7',
      text: '#2C2416',
      textSecondary: '#5C5347',
      border: '#E8DFD4',
    },
    fonts: {
      heading: 'Playfair Display, serif',
      body: 'Lora, serif',
    },
    styles: {
      buttonRadius: '4px',
      cardShadow: '0 2px 8px rgba(139, 115, 85, 0.15)',
      spacing: '1rem',
      borderRadius: '4px',
    },
  },

  [ThemePreset.GARDEN_ROMANCE]: {
    colors: {
      primary: '#7C9473',
      secondary: '#B8C5B3',
      accent: '#E8A5A5',
      background: '#F9FBF7',
      text: '#2C3E2A',
      textSecondary: '#5A6E56',
      border: '#D9E3D6',
    },
    fonts: {
      heading: 'Cormorant Garamond, serif',
      body: 'Quicksand, sans-serif',
    },
    styles: {
      buttonRadius: '12px',
      cardShadow: '0 4px 12px rgba(124, 148, 115, 0.12)',
      spacing: '1.25rem',
      borderRadius: '12px',
    },
    images: {
      background: '/themes/garden/floral-pattern.svg',
    },
  },

  [ThemePreset.MODERN_MINIMAL]: {
    colors: {
      primary: '#2D3748',
      secondary: '#718096',
      accent: '#4299E1',
      background: '#FFFFFF',
      text: '#1A202C',
      textSecondary: '#718096',
      border: '#E2E8F0',
    },
    fonts: {
      heading: 'Inter, sans-serif',
      body: 'Inter, sans-serif',
      weight: {
        normal: 400,
        bold: 600,
        heading: 700,
      },
    },
    styles: {
      buttonRadius: '6px',
      cardShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      spacing: '1rem',
      borderRadius: '6px',
      borderWidth: '1px',
    },
  },

  [ThemePreset.RUSTIC_CHARM]: {
    colors: {
      primary: '#8B4513',
      secondary: '#D2691E',
      accent: '#CD853F',
      background: '#FFF8F0',
      text: '#3E2723',
      textSecondary: '#6D4C41',
      border: '#D7CCC8',
    },
    fonts: {
      heading: 'Merriweather, serif',
      body: 'Open Sans, sans-serif',
    },
    styles: {
      buttonRadius: '8px',
      cardShadow: '0 3px 10px rgba(139, 69, 19, 0.2)',
      spacing: '1rem',
      borderRadius: '8px',
      borderWidth: '2px',
    },
    images: {
      background: '/themes/rustic/wood-texture.jpg',
    },
  },

  [ThemePreset.BEACH_BREEZE]: {
    colors: {
      primary: '#0891B2',
      secondary: '#06B6D4',
      accent: '#F59E0B',
      background: '#F0FDFA',
      text: '#164E63',
      textSecondary: '#0E7490',
      border: '#CFFAFE',
    },
    fonts: {
      heading: 'Poppins, sans-serif',
      body: 'Nunito, sans-serif',
    },
    styles: {
      buttonRadius: '9999px', // Pill shape
      cardShadow: '0 4px 14px rgba(8, 145, 178, 0.15)',
      spacing: '1rem',
      borderRadius: '16px',
    },
    images: {
      background: '/themes/beach/waves-pattern.svg',
    },
  },
};

/**
 * Theme preset display information
 */
export const THEME_PRESET_INFO: Record<ThemePreset, ThemePresetInfo> = {
  [ThemePreset.CLASSIC_ELEGANCE]: {
    id: ThemePreset.CLASSIC_ELEGANCE,
    name: 'Classic Elegance',
    description: 'Timeless and sophisticated with traditional elegance',
    tags: ['elegant', 'traditional', 'formal', 'classic'],
  },
  [ThemePreset.GARDEN_ROMANCE]: {
    id: ThemePreset.GARDEN_ROMANCE,
    name: 'Garden Romance',
    description: 'Soft florals and natural beauty for outdoor celebrations',
    tags: ['romantic', 'floral', 'natural', 'outdoor'],
  },
  [ThemePreset.MODERN_MINIMAL]: {
    id: ThemePreset.MODERN_MINIMAL,
    name: 'Modern Minimal',
    description: 'Clean lines and contemporary design',
    tags: ['modern', 'minimal', 'clean', 'contemporary'],
  },
  [ThemePreset.RUSTIC_CHARM]: {
    id: ThemePreset.RUSTIC_CHARM,
    name: 'Rustic Charm',
    description: 'Warm and cozy with natural textures',
    tags: ['rustic', 'natural', 'warm', 'country'],
  },
  [ThemePreset.BEACH_BREEZE]: {
    id: ThemePreset.BEACH_BREEZE,
    name: 'Beach Breeze',
    description: 'Light and airy with coastal vibes',
    tags: ['beach', 'coastal', 'light', 'casual'],
  },
};
