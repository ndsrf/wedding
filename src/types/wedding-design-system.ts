/**
 * Wedding Design System
 *
 * Visual identity for a wedding, generated via Claude Design and stored per wedding.
 * Used to ensure consistent branding across invitations, menus, seating charts, etc.
 */

export interface WeddingDesignSystemPalette {
  primary: string;    // Main brand color, e.g. "#8B7355"
  secondary: string;  // Supporting color
  accent: string;     // Highlight color (CTAs, decorative elements)
  background: string; // Canvas/page background
  text: string;       // Primary text color
}

export interface WeddingDesignSystemFonts {
  heading: string;  // Font family for titles, e.g. "Great Vibes, cursive"
  body: string;     // Font family for body text, e.g. "Lora, serif"
  accent?: string;  // Optional third font for decorative use
}

export interface WeddingDesignSystem {
  palette: WeddingDesignSystemPalette;
  fonts: WeddingDesignSystemFonts;
  style: string;              // Free-form style descriptor, e.g. "rustic-botanical", "modern-elegant"
  motifs?: string[];          // Visual motifs used in the design, e.g. ["floral", "botanical"]
  backgroundImageUrl?: string; // URL of a background pattern or texture
}
